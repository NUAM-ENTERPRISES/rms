import React, { useState, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmationDialog, ConfirmationDialog } from "@/components/ui";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit,
  Trash2,
  Calendar,
  Building2,
  Target,
  Clock,
  MapPin,
  UserCheck,
  User,
  FileText,
  Send,
  AlertCircle,
  UserPlus,
  Layers,
  Briefcase,
  CheckCircle2,
  Users,
  Utensils,
  Home,
  Bus,
  GraduationCap,
} from "lucide-react";
import MatchScoreSummary from "@/features/projects/components/MatchScoreSummary";
import {
  useGetProjectQuery,
  useDeleteProjectMutation,
  useGetNominatedCandidatesQuery,
  useSendForVerificationMutation,
  useSendForInterviewMutation,
  useSendForScreeningMutation,
  useAssignToProjectMutation,
  useGetEligibleCandidatesQuery,
} from "@/features/projects";
import { useGetConsolidatedCandidatesQuery } from "@/features/candidates";
import ProjectCandidatesBoard from "@/features/projects/components/ProjectCandidatesBoard";
import ProcessingCandidatesTab from "@/features/projects/components/ProcessingCandidatesTab";
import { useCan } from "@/hooks/useCan";
import { useAppSelector } from "@/app/hooks";
import { ProjectCountryCell } from "@/components/molecules/domain";

// Helper function to format date
const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Helper function to format datetime
const formatDateTime = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Minimal colorful badge classes for match scores
const getMinimalScoreBadgeClass = (score?: number) => {
  if (typeof score !== "number") return "bg-slate-50 text-slate-700";
  if (score >= 90) return "bg-green-50 text-green-700";
  if (score >= 80) return "bg-blue-50 text-blue-700";
  if (score >= 70) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
};

// Format a single work experience item for display. Some records use
// explicit yearsOfExperience while others provide start/end dates.
const formatWorkExperienceEntry = (exp: any) => {
  const title = exp.designation || exp.position || exp.role || "";
  const company = exp.companyName || exp.company || "";

  // If yearsOfExperience provided, show it, otherwise compute from dates
  let yearsLabel = "";
  if (typeof exp.yearsOfExperience === "number") {
    yearsLabel = ` (${exp.yearsOfExperience} years)`;
  } else if (exp.startDate) {
    try {
      const start = new Date(exp.startDate);
      const end = exp.endDate ? new Date(exp.endDate) : new Date();
      const diffMs = Math.max(0, end.getTime() - start.getTime());
      const years = Math.round((diffMs / (1000 * 60 * 60 * 24 * 365)) * 10) / 10;
      if (!Number.isNaN(years) && years > 0) {
        yearsLabel = ` (${years} years)`;
      }
    } catch (e) {
      // ignore and leave blank
    }
  }

  // Prefer showing title and company first, then years
  const parts = [] as string[];
  if (title) parts.push(title);
  if (company) parts.push(`at ${company}`);
  return `${parts.join(" ")}${yearsLabel}`.trim();
};

// Lazy-loaded project details modal (code-split)
const ProjectDetailsModal = React.lazy(() => import("@/components/molecules/ProjectDetailsModal"));

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  // Permissions
  const canManageProjects = useCan("manage:projects");
  const canReadProjects = useCan("read:projects");
  const isProcessingExecutive =
    user?.roles?.some?.((role) => role === "Processing Executive") ?? false;

  // RTK Query hooks
  const {
    data: projectData,
    isLoading,
    error,
    refetch: refetchProject,
  } = useGetProjectQuery(projectId!);
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  // Board filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleCatalogId, setSelectedRoleCatalogId] = useState<string>("all");

  const [showDetails, setShowDetails] = useState(false);

  // Get eligible candidates
  const { data: eligibleResponse } = useGetEligibleCandidatesQuery({
    projectId: projectId!,
    search: searchTerm || undefined,
    roleCatalogId:
      selectedRoleCatalogId !== "all" ? selectedRoleCatalogId : undefined,
    limit: 10,
  });
  const eligibleCandidates: any[] = Array.isArray(eligibleResponse?.data)
    ? eligibleResponse.data
    : eligibleResponse?.data && typeof eligibleResponse.data === "object"
    ? (eligibleResponse.data as any).candidates ||
      (eligibleResponse.data as any).data ||
      []
    : [];

  const consolidatedCandidatesQuery = useGetConsolidatedCandidatesQuery({
    projectId: projectId!,
    search: searchTerm || undefined,
    roleCatalogId:
      selectedRoleCatalogId !== "all" ? selectedRoleCatalogId : undefined,
    limit: 10,
  });

  const candidatesData = consolidatedCandidatesQuery.data?.data?.candidates;

  const allCandidates = Array.isArray(candidatesData)
    ? candidatesData
    : [];

  // Get nominated candidates with proper status filtering
  const shouldLoadNominated = !isProcessingExecutive;
  const {
    data: projectCandidatesData,
    isLoading: isLoadingCandidates,
    refetch: refetchNominated,
  } =
    useGetNominatedCandidatesQuery(
      {
        projectId: projectId!,
        search: searchTerm || undefined,
        roleCatalogId:
          selectedRoleCatalogId !== "all" ? selectedRoleCatalogId : undefined,
        page: 1,
        limit: 10, // default to 10 for nominated candidates
      },
      { skip: !shouldLoadNominated }
    );

  const [sendForVerification] = useSendForVerificationMutation();
  const [sendForInterview, { isLoading: isSendingInterview }] =
    useSendForInterviewMutation();
    const [sendForScreening, { isLoading: isSendingScreening }] =
      useSendForScreeningMutation();
  const [assignToProject, { isLoading: isAssigning }] =
    useAssignToProjectMutation();

  // Get data (Moved above early returns to comply with Rules of Hooks)
  const projectCandidates = React.useMemo(() => {
    // Robust extraction for nominated candidates
    if (!projectCandidatesData?.data) return [];
    
    if (Array.isArray(projectCandidatesData.data)) {
      return projectCandidatesData.data;
    }
    
    if (typeof projectCandidatesData.data === "object") {
      const d = projectCandidatesData.data as any;
      return d.candidates || d.data || d.items || [];
    }
    
    return [];
  }, [projectCandidatesData?.data]);

  const projectRoles = React.useMemo(() => {
    const rolesMap = new Map();

    // Helper to add roles to map
    const addRole = (r: any) => {
      // Prioritize roleCatalogId as it's the global filter key
      // and required for Eligible/All candidates tabs.
      const id = (r.roleCatalogId || r.roleCatalog?.id || r.id || r.roleId || "").toString().trim();
      
      const rawName =
        r.label ||
        r.name ||
        r.designation ||
        r.roleCatalog?.label ||
        r.roleCatalog?.name ||
        "Unknown Role";
      
      const name = String(rawName).trim();
      
      if (id && id !== "undefined" && id !== "null") {
        // Skip if ID already exists
        if (rolesMap.has(id)) return;

        // Skip if Name already exists (case-insensitive deduplication)
        // This ensures the filter is clean even if different sources give different IDs for the same name
        const alreadyHasName = Array.from(rolesMap.values()).some(
          (role: any) => role.name.toLowerCase() === name.toLowerCase()
        );
        
        if (!alreadyHasName) {
          rolesMap.set(id, { id, name });
        }
      }
    };

    // 1. From nominated candidates response (current filtered/unfiltered list)
    // The user's JSON shows roles are returned here.
    const dataObj = projectCandidatesData?.data;
    if (dataObj && typeof dataObj === 'object') {
       const roles = (dataObj as any).roles || (dataObj as any).data?.roles;
       if (Array.isArray(roles)) {
         roles.forEach(addRole);
       }
    }

    // 2. From project response (Project's defined requirements)
    const project = projectData?.data;
    if (project && Array.isArray(project.rolesNeeded)) {
      project.rolesNeeded.forEach(addRole);
    }

    // 3. Fallback: from candidates themselves if any
    projectCandidates.forEach((c: any) => {
      if (c.nominatedRole) addRole(c.nominatedRole);
    });

    return Array.from(rolesMap.values()) as Array<{ id: string; name: string }>;
  }, [projectCandidatesData?.data, projectData?.data, projectCandidates]);

  // Local state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [verifyConfirm, setVerifyConfirm] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    roleNeededId?: string;
    notes: string;
    isRoleEditable?: boolean;
  }>({
    isOpen: false,
    candidateId: "",
    candidateName: "",
    roleNeededId: undefined,
    notes: "",
    isRoleEditable: true,
  });

  // Edit role confirmation dialog for verify modal
  const [showEditRoleConfirm, setShowEditRoleConfirm] = useState(false);

  const [interviewConfirm, setInterviewConfirm] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    type: "screening" | "interview" | "training" | "";
    notes: string;
  }>({
    isOpen: false,
    candidateId: "",
    candidateName: "",
    // no default selection
    type: "",
    notes: "",
  });

  const [assignConfirm, setAssignConfirm] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    roleNeededId?: string;
    notes: string;
  }>({
    isOpen: false,
    candidateId: "",
    candidateName: "",
    roleNeededId: undefined,
    notes: "",
  });

  const [screeningConfirm, setScreeningConfirm] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    roleNeededId?: string;
    notes: string;
  }>({
    isOpen: false,
    candidateId: "",
    candidateName: "",
    roleNeededId: undefined,
    notes: "",
  });

  // Handle project deletion
  const handleDeleteProjectConfirm = async () => {
    if (!projectId) return;

    try {
      const result = await deleteProject(projectId).unwrap();
      if (result.success) {
        toast.success("Project deleted successfully");
        navigate("/projects");
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to delete project");
    }
  };

  // Handle verification
  const showVerifyConfirmation = (
    candidateId: string,
    candidateName: string
  ) => {
    // Try to find nominated candidate to prefill nominatedRole if present
    const candidate = [...projectCandidates, ...eligibleCandidates, ...allCandidates].find(
      (c) => (c.candidateId || c.id) === candidateId
    );

    const nominatedRoleId = (candidate as any)?.nominatedRole?.id;

    setVerifyConfirm({
      isOpen: true,
      candidateId,
      candidateName,
      roleNeededId: nominatedRoleId || projectData?.data?.rolesNeeded?.[0]?.id,
      notes: "",
      // If already has nominatedRole, don't allow editing until user confirms
      isRoleEditable: nominatedRoleId ? false : true,
    });
  };

  const showInterviewConfirmation = (
    candidateId: string,
    candidateName: string
  ) => {
    setInterviewConfirm({
      isOpen: true,
      candidateId,
      candidateName,
      type: "",
      notes: "",
    });
  };

  const handleSendForVerification = async () => {
    try {
      await sendForVerification({
        projectId: projectId!,
        candidateId: verifyConfirm.candidateId,
        recruiterId: user?.id,
        roleNeededId: verifyConfirm.roleNeededId,
        notes: verifyConfirm.notes || undefined,
      }).unwrap();
      toast.success("Candidate sent for verification successfully");
      setVerifyConfirm({
        isOpen: false,
        candidateId: "",
        candidateName: "",
        roleNeededId: undefined,
        notes: "",
      });
    } catch (error: any) {
      toast.error(
        error?.data?.message || "Failed to send candidate for verification"
      );
    }
  };

  const handleSendForInterview = async () => {
    try {
      if (!projectId) return;

      if (!interviewConfirm.type) {
        toast.error("Please select one");
        return;
      }

      const mappedType =
        interviewConfirm.type === "screening"
          ? "screening_assigned"
          : interviewConfirm.type === "training"
          ? "training_assigned"
          : "interview_assigned";

      await sendForInterview({
        projectId: projectId!,
        candidateId: interviewConfirm.candidateId,
        type: mappedType as any,
        recruiterId: user?.id,
        notes: interviewConfirm.notes || undefined,
      }).unwrap();

      if (interviewConfirm.type === "training") {
        toast.success("Basic training assigned");
      } else {
        toast.success("Candidate sent for interview successfully");
      }
      setInterviewConfirm({
        isOpen: false,
        candidateId: "",
        candidateName: "",
        type: "",
        notes: "",
      });

      // Refresh project and nominated candidates so UI reflects new subStatus (e.g., training_assigned)
      try {
        refetchProject?.();
        refetchNominated?.();
      } catch (e) {
        // ignore - refetch is best-effort
      }
    } catch (error: any) {
      toast.error(
        error?.data?.message || "Failed to send candidate for interview"
      );
    }
  };

  // Handle assignment
  const showAssignConfirmation = (
    candidateId: string,
    candidateName: string
  ) => {
    setAssignConfirm({
      isOpen: true,
      candidateId,
      candidateName,
      roleNeededId: projectData?.data?.rolesNeeded?.[0]?.id,
      notes: "",
    });
  };

  const showScreeningConfirmation = (
    candidateId: string,
    candidateName: string
  ) => {
    setScreeningConfirm({
      isOpen: true,
      candidateId,
      candidateName,
      roleNeededId: projectData?.data?.rolesNeeded?.[0]?.id,
      notes: "",
    });
  };

  const handleAssignToProject = async () => {
    try {
      await assignToProject({
        candidateId: assignConfirm.candidateId,
        projectId: projectId!,
        recruiterId: user?.id,
        roleNeededId: assignConfirm.roleNeededId,
        notes: assignConfirm.notes || `Assigned by recruiter to project`,
      }).unwrap();
      toast.success("Candidate assigned to project successfully");
      setAssignConfirm({
        isOpen: false,
        candidateId: "",
        candidateName: "",
        roleNeededId: undefined,
        notes: "",
      });
    } catch (error: any) {
      toast.error(
        error?.data?.message || "Failed to assign candidate to project"
      );
    }
  };

  const handleSendForScreening = async () => {
    try {
      await sendForScreening({
        candidateId: screeningConfirm.candidateId,
        projectId: projectId!,
        roleNeededId: screeningConfirm.roleNeededId || "",
        recruiterId: user?.id,
        notes: screeningConfirm.notes || undefined,
      }).unwrap();
      toast.success("Candidate sent for screening successfully");
      setScreeningConfirm({
        isOpen: false,
        candidateId: "",
        candidateName: "",
        roleNeededId: undefined,
        notes: "",
      });
      try {
        refetchProject?.();
        refetchNominated?.();
      } catch (e) {
        // best-effort
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to send candidate for screening");
    }
  };

  const handleViewCandidate = (candidateId: string) => {
    navigate(`/candidates/${candidateId}`);
  };

  const handleBoardSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleBoardRoleChange = (value: string) => {
    setSelectedRoleCatalogId(value);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-64 bg-slate-200 rounded-lg"></div>
                <div className="h-32 bg-slate-200 rounded-lg"></div>
              </div>
              <div className="space-y-4">
                <div className="h-32 bg-slate-200 rounded-lg"></div>
                <div className="h-48 bg-slate-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !projectData?.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Project Not Found
              </CardTitle>
              <CardDescription className="text-slate-600">
                The project you're looking for doesn't exist or you don't have
                access to it.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate("/projects")} className="mt-4">
                Back to Projects
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const project = projectData.data;

  // Get data
  const pagination = projectCandidatesData?.data?.pagination;

  const projectResumeEditable =
    "resumeEditable" in project
      ? Boolean((project as { resumeEditable?: boolean }).resumeEditable)
      : false;
  const projectGroomingRequirement =
    "groomingRequired" in project
      ? (project as { groomingRequired?: string | null }).groomingRequired
      : undefined;
  const projectHideContactInfo =
    "hideContactInfo" in project
      ? Boolean((project as { hideContactInfo?: boolean }).hideContactInfo)
      : false;
  const projectRequiredScreening =
    "requiredScreening" in project
      ? Boolean((project as { requiredScreening?: boolean }).requiredScreening)
      : false;

  // normalize document requirements to a safe array so we never read .length on undefined
  const documentRequirements = Array.isArray(project.documentRequirements)
    ? project.documentRequirements
    : [];

  // Access control
  if (!canReadProjects) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Access Denied
              </CardTitle>
              <CardDescription className="text-slate-600">
                You don't have permission to view this project.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full mx-auto space-y-6">
        {/* Header */}
        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden ring-1 ring-slate-200/50">
          <CardContent className="p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left Side — Title (Black) + Country */}
              <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className="flex-1">
                  {/* Title — Strong Black Text */}
                  <h1 className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight tracking-tight">
                    {project.title}
                  </h1>

                  {/* Optional Subtitle (Client Name) */}
                  {project.client && (
                    <p className="text-sm text-slate-600 mt-2 font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-500" />
                      {project.client.name}
                    </p>
                  )}
                </div>

                {/* Country Flag & View Details — Clean & Elevated */}
                <div className="flex-shrink-0 flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDetails(true)}
                    className="font-semibold"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View details
                  </Button>
                  <ProjectCountryCell
                    countryCode={project.countryCode}
                    size="2xl"
                    fallbackText="Not specified"
                    className="shadow-lg ring-4 ring-white/90 rounded-full"
                  />
                </div>
              </div>

              {/* Right Side — Action Buttons */}
              <div className="flex items-center gap-3">
                {canManageProjects && !isProcessingExecutive && (
                  <>
                    {/* Edit Button — Clean & Professional */}
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => navigate(`/projects/${project.id}/edit`)}
                      className="font-semibold border-slate-300 hover:border-blue-500 hover:text-blue-600 hover:shadow-md transition-all duration-200"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Project
                    </Button>

                    {/* Delete Button — Strong but Clean */}
                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Clean Bottom Accent Line */}
            <div className="mt-6 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full opacity-70"></div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Candidates */}
          <div className="lg:col-span-8">
            {isProcessingExecutive ? (
              <ProcessingCandidatesTab projectId={projectId!} />
            ) : (
              <ProjectCandidatesBoard
                projectId={projectId!}
                project={project}
                nominatedCandidates={projectCandidates}
                isLoadingNominated={isLoadingCandidates}
                searchTerm={searchTerm}
                selectedRole={selectedRoleCatalogId}
                onSearchChange={handleBoardSearchChange}
                onRoleChange={handleBoardRoleChange}
                roles={projectRoles}
                onViewCandidate={handleViewCandidate}
                onAssignCandidate={(candidateId, candidateName) =>
                  showAssignConfirmation(candidateId, candidateName)
                }
                onVerifyCandidate={(candidateId, candidateName) =>
                  showVerifyConfirmation(candidateId, candidateName)
                }
                onSendForInterview={(candidateId, candidateName) =>
                  showInterviewConfirmation(candidateId, candidateName)
                }
                onSendForScreening={(candidateId, candidateName) =>
                  showScreeningConfirmation(candidateId, candidateName)
                }
                requiredScreening={projectRequiredScreening}
                hideContactInfo={projectHideContactInfo}
              />
            )}
          </div>

          {/* Right Column: Project Info + Supporting Cards */}
          <div className="space-y-4 text-sm lg:space-y-5 lg:col-span-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2 px-3 pb-6 lg:px-0">
            {/* Project Overview Card */}
            <Card className="border-0 shadow-md bg-white/95 backdrop-blur-sm rounded-xl">
              <CardContent className="p-3 lg:p-4 space-y-4">
                {/* 4 Stats — Fully Responsive & No Cutoff */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                  {/* Positions */}
                  <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-blue-500/5 to-blue-600/10 rounded-lg border border-blue-200/30">
                    <Briefcase className="h-5 w-5 text-blue-600 mb-1" />
                    <div className="text-xl lg:text-2xl font-bold text-blue-700">
                      {project.rolesNeeded.reduce((s, r) => s + r.quantity, 0)}
                    </div>
                    <div className="text-xs text-center text-slate-600 font-medium mt-0.5">
                      Positions
                    </div>
                  </div>

                  {/* Nominated — NOW NEVER CUTS OFF */}
                  <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-emerald-500/5 to-teal-600/10 rounded-lg border border-emerald-200/30">
                    <UserCheck className="h-5 w-5 text-emerald-600 mb-1" />
                    <div className="text-xl lg:text-2xl font-bold text-emerald-700">
                      {pagination?.total || 0}
                    </div>
                    <div className="text-xs text-center text-slate-600 font-medium mt-0.5 leading-tight">
                      <span className="hidden lg:inline">Nominated</span>
                      <span className="lg:hidden">Noms</span>
                    </div>
                  </div>

                  {/* Roles */}
                  <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-purple-500/5 to-pink-600/10 rounded-lg border border-purple-200/30">
                    <Layers className="h-5 w-5 text-purple-600 mb-1" />
                    <div className="text-xl lg:text-2xl font-bold text-purple-700">
                      {project.rolesNeeded.length}
                    </div>
                    <div className="text-xs text-center text-slate-600 font-medium mt-0.5">
                      Roles
                    </div>
                  </div>

                  {/* Days Left */}
                  <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-orange-500/5 to-red-600/10 rounded-lg border border-orange-200/30">
                    <Calendar className="h-5 w-5 text-orange-600 mb-1" />
                    <div className="text-xl lg:text-2xl font-bold text-orange-700">
                      {Math.max(
                        0,
                        Math.ceil(
                          (new Date(project.deadline).getTime() - Date.now()) /
                            86400000
                        )
                      )}
                    </div>
                    <div className="text-xs text-center text-slate-600 font-medium mt-0.5 leading-tight">
                      <span className="hidden sm:inline">Days Left</span>
                      <span className="sm:hidden">Days</span>
                    </div>
                  </div>
                </div>

                {/* Compact Details List — No overflow */}
                <div className="space-y-1.5 border-t border-slate-200 pt-3">
                  {[
                    {
                      icon: Calendar,
                      color: "text-blue-600",
                      label: "Deadline",
                      value: formatDateTime(project.deadline),
                    },
                    {
                      icon: Clock,
                      color: "text-green-600",
                      label: "Created",
                      value: formatDate(project.createdAt),
                    },
                    {
                      icon: MapPin,
                      color: "text-purple-600",
                      label: "Country",
                      value: (
                        <ProjectCountryCell
                          countryCode={project.countryCode}
                          size="sm"
                          fallbackText="—"
                        />
                      ),
                    },
                    {
                      icon: UserCheck,
                      color: "text-emerald-600",
                      label: "Status",
                      value: (
                        <Badge variant="outline" className="text-xs h-5">
                          {project.status}
                        </Badge>
                      ),
                    },
                    {
                      icon: User,
                      color: "text-indigo-600",
                      label: "Creator",
                      value: project.creator.name,
                    },
                    {
                      icon: Building2,
                      color: "text-orange-600",
                      label: "Type",
                      value:
                        project.projectType === "ministry" ? "Gov" : "Private",
                    },
                    {
                      icon: FileText,
                      color: "text-cyan-600",
                      label: "Resume",
                      value: projectResumeEditable ? "Edit" : "Fixed",
                    },
                    {
                      icon: User,
                      color: "text-pink-600",
                      label: "Grooming",
                      value:
                        projectGroomingRequirement?.[0]?.toUpperCase() || "—",
                    },
                    {
                      icon: Target,
                      color: "text-red-600",
                      label: "Contact",
                      value: projectHideContactInfo ? "Hidden" : "Visible",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 py-1.5 hover:bg-slate-50 rounded px-1"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <item.icon
                          className={`h-3.5 w-3.5 ${item.color} flex-shrink-0`}
                        />
                        <span className="text-xs font-medium text-slate-600 truncate">
                          {item.label}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-900 text-right truncate max-w-[45%]">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Description — Safe & Compact */}
                {project.description && (
                  <p className="text-xs text-slate-600 leading-snug bg-slate-50 p-2.5 rounded-lg border border-slate-200 italic mt-3 line-clamp-3">
                    {project.description}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Other Cards — Same Compact & Responsive Style */}
            {documentRequirements.length > 0 && (
              <Card className="border-0 shadow-md bg-white/95 backdrop-blur-sm rounded-xl">
                <CardHeader className="pb-2 px-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-600" /> Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2">
                  {documentRequirements.map((req: any, i: number) => (
                    <div
                      key={i}
                      className="p-2.5 bg-orange-50/30 rounded-lg border border-orange-100/50 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                            {req.docType
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                          </span>
                        </div>
                        {req.mandatory && (
                          <Badge className="h-4 text-[9px] bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 px-1.5 font-bold">
                            REQUIRED
                          </Badge>
                        )}
                      </div>
                      {req.description && (
                        <div className="flex items-start gap-1.5 pl-3">
                          <AlertCircle className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                          <p className="text-[11px] text-slate-600 leading-relaxed italic">
                            {req.description}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-md bg-white/95 backdrop-blur-sm rounded-xl">
              <CardHeader className="pb-2 px-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-600" /> Roles (
                  {project.rolesNeeded.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-3 pb-3">
                {project.rolesNeeded.map((role) => (
                  <div
                    key={role.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {role.designation}
                      </span>
                      <Badge className="text-[10px] h-5 bg-gradient-to-r from-purple-600 to-pink-600 flex-shrink-0">
                        {role.quantity} pos
                      </Badge>
                    </div>

                    {/* Experience & Age & Gender */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-slate-400" />
                        <span>
                          {role.minExperience || 0}-{role.maxExperience || "Any"} yrs
                        </span>
                      </div>
                      {role.ageRequirement && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>Age: {role.ageRequirement}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-slate-400" />
                        <span className="capitalize">
                          {role.genderRequirement || "All"}
                        </span>
                      </div>
                    </div>

                    {/* Education */}
                    {role.educationRequirementsList &&
                      role.educationRequirementsList.length > 0 && (
                        <div className="flex items-start gap-1 text-[11px] text-slate-600">
                          <GraduationCap className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                          <div className="flex flex-wrap gap-1">
                            {role.educationRequirementsList.map(
                              (edu: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="bg-white px-1.5 py-0.5 rounded border border-slate-200"
                                >
                                  {edu.qualification?.shortName ||
                                    edu.qualification?.name}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Benefits & Type */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <div className="flex gap-2">
                          {role.accommodation && (
                            <Home
                              className="h-3 w-3 text-emerald-600"
                              aria-label="Accommodation provided"
                              role="img"
                            />
                          )}
                          {role.food && (
                            <Utensils
                              className="h-3 w-3 text-orange-600"
                              aria-label="Food provided"
                              role="img"
                            />
                          )}
                          {role.transport && (
                            <Bus
                              className="h-3 w-3 text-blue-600"
                              aria-label="Transport provided"
                              role="img"
                            />
                          )}
                        </div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {role.employmentType || "Permanent"}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/95 backdrop-blur-sm rounded-xl">
              <CardHeader className="pb-2 px-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-teal-600" /> Client
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="p-2.5 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
                  <div className="font-semibold text-slate-900 text-sm truncate">
                    {project.client?.name || "Not assigned"}
                  </div>
                  {project.client && (
                    <Badge className="text-xs mt-1 bg-teal-700 text-white">
                      {project.client.type}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Project Details Modal (code-split) */}
      <Suspense fallback={<div className="px-4 py-6">Loading details...</div>}>
        <ProjectDetailsModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          project={projectData?.data}
        />
      </Suspense>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteProjectConfirm}
        title={projectData?.data?.title || ""}
        itemType="project"
        isLoading={isDeleting}
      />

      {/* Confirm edit role dialog (Verify modal) */}
      <ConfirmationDialog
        isOpen={showEditRoleConfirm}
        onClose={() => setShowEditRoleConfirm(false)}
        onConfirm={() => {
          setVerifyConfirm((prev) => ({ ...prev, isRoleEditable: true }));
          setShowEditRoleConfirm(false);
        }}
        title="Edit assigned role"
        description={`This candidate already has an assigned role. Do you want to edit it?`}
        confirmText="Edit role"
        cancelText="Cancel"
      />

      {/* Direct Screening Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={screeningConfirm.isOpen}
        className="sm:max-w-2xl"
        onClose={() =>
          setScreeningConfirm({
            isOpen: false,
            candidateId: "",
            candidateName: "",
            roleNeededId: undefined,
            notes: "",
          })
        }
        onConfirm={handleSendForScreening}
        title="Send for Direct Screening"
        description={
          <div className="space-y-4">
            <p>
              Are you sure you want to send {screeningConfirm.candidateName} for
              direct screening? This will notify the screening team.
            </p>

            {/* Candidate Details */}
            {(() => {
              const candidate = [...projectCandidates, ...eligibleCandidates, ...allCandidates].find(
                (c) => (c.candidateId || c.id) === screeningConfirm.candidateId
              );
              if (!candidate) return null;
              return (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {/* Match score summary */}
                  <MatchScoreSummary candidate={candidate} />

                  <h4 className="text-sm font-semibold text-slate-700 mt-2">Candidate Profile</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                    {/* Education column */}
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Education</p>
                      <div className="space-y-1">
                        {candidate.qualifications && candidate.qualifications.length > 0 ? (
                          candidate.qualifications.map((qual: any, idx: number) => (
                            <p key={idx} className="text-xs text-slate-700">
                              {qual.qualification?.name || qual.qualification?.shortName || 'N/A'}
                              {qual.qualification?.field ? ` - ${qual.qualification.field}` : ''}
                              {qual.yearOfCompletion ? ` (${qual.yearOfCompletion})` : ''}
                            </p>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500">No education details</p>
                        )}
                      </div>
                    </div>

                    {/* Experience column */}
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Experience</p>
                      <div className="space-y-1">
                        {candidate.workExperiences && candidate.workExperiences.length > 0 ? (
                          candidate.workExperiences.map((exp: any, idx: number) => (
                            <p key={idx} className="text-xs text-slate-700">
                              {formatWorkExperienceEntry(exp)}
                            </p>
                          ))
                        ) : candidate.candidateExperience ? (
                          <p className="text-xs text-slate-700">{candidate.candidateExperience} yrs</p>
                        ) : (
                          <p className="text-xs text-slate-500">No experience details</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Role match scores */}
                  {candidate.roleMatches && candidate.roleMatches.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-2">Role match scores</p>
                      <div className="flex flex-wrap gap-2">
                        {candidate.roleMatches.map((rm: any, idx: number) => {
                          const isAssigned = Boolean(candidate.nominatedRole && candidate.nominatedRole.id === rm.roleId);
                          return (
                            <div
                              key={idx}
                              className={`flex items-center gap-2 rounded-full px-2 py-1 border ${isAssigned ? 'border-primary/30 bg-primary/10' : 'border-slate-100 bg-white/60'}`}
                            >
                              <span className="text-xs text-slate-700 max-w-[160px] truncate">
                                {rm.designation || "Role"}
                              </span>
                              <span className={`${getMinimalScoreBadgeClass(rm.score)} text-xs font-semibold px-2 py-0.5 rounded-full`}>{rm.score ?? "-"}%</span>
                              {isAssigned && <CheckCircle2 className="h-3 w-3 text-primary ml-1" aria-hidden />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <Select
                value={screeningConfirm.roleNeededId}
                onValueChange={(v) =>
                  setScreeningConfirm((prev) => ({ ...prev, roleNeededId: v }))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {project?.rolesNeeded?.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.designation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="text-xs text-red-600 font-medium">
                This candidate should skip document verification because of
                direct screening. Once screening is completed you should do
                document verification.
              </div>

              <label
                htmlFor="screening-notes"
                className="text-sm font-medium text-gray-700"
              >
                Notes (Optional)
              </label>
              <Textarea
                id="screening-notes"
                placeholder="Add any notes for the screening team..."
                value={screeningConfirm.notes}
                onChange={(e) =>
                  setScreeningConfirm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                rows={3}
                className="w-full"
              />
            </div>
          </div>
        }
        confirmText="Send for Screening"
        cancelText="Cancel"
        isLoading={isSendingScreening}
        variant="default"
        icon={
          <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Send className="h-5 w-5 text-purple-600" />
          </div>
        }
      />

      {/* Verification Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={verifyConfirm.isOpen}
        className="sm:max-w-2xl"
        onClose={() =>
          setVerifyConfirm({
            isOpen: false,
            candidateId: "",
            candidateName: "",
            roleNeededId: undefined,
            notes: "",
            isRoleEditable: true,
          })
        }
        onConfirm={handleSendForVerification}
        title="Send for Verification"
        description={
          <div className="space-y-4">
            <p>
              Are you sure you want to send {verifyConfirm.candidateName} for
              verification? This will notify the verification team.
            </p>

            {/* Candidate Details */}
            {(() => {
              const candidate = [...projectCandidates, ...eligibleCandidates, ...allCandidates].find(
                (c) => (c.candidateId || c.id) === verifyConfirm.candidateId
              );
              if (!candidate) return null;
              return (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {/* Match score summary */}
                  <MatchScoreSummary candidate={candidate} />

                  <h4 className="text-sm font-semibold text-slate-700 mt-2">Candidate Profile</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                    {/* Education column */}
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Education</p>
                      <div className="space-y-1">
                        {(candidate.qualifications || candidate.candidateQualifications) && (candidate.qualifications || candidate.candidateQualifications).length > 0 ? (
                          (candidate.qualifications || candidate.candidateQualifications).map((qual: any, idx: number) => (
                            <p key={idx} className="text-xs text-slate-700">
                              {qual.qualification?.name || qual.name || qual.qualification?.shortName || 'N/A'}
                              {qual.qualification?.field || qual.field ? ` - ${qual.qualification?.field || qual.field}` : ''}
                              {qual.graduationYear || qual.yearOfCompletion ? ` (${qual.graduationYear || qual.yearOfCompletion})` : ''}
                            </p>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500">No education details</p>
                        )}
                      </div>
                    </div>

                    {/* Experience column */}
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Experience</p>
                      <div className="space-y-1">
                        {candidate.workExperiences && candidate.workExperiences.length > 0 ? (
                          candidate.workExperiences.map((exp: any, idx: number) => (
                            <p key={idx} className="text-xs text-slate-700">
                              {formatWorkExperienceEntry(exp)}
                            </p>
                          ))
                        ) : candidate.candidateExperience ? (
                          <p className="text-xs text-slate-700">{candidate.candidateExperience} yrs</p>
                        ) : (
                          <p className="text-xs text-slate-500">No experience details</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Role match scores */}
                  {candidate.roleMatches && candidate.roleMatches.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-2">Role match scores</p>
                      <div className="flex flex-wrap gap-2">
                        {candidate.roleMatches.map((rm: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 rounded-full px-2 py-1 border border-slate-100 bg-white/60"
                          >
                            <span className="text-xs text-slate-700 max-w-[160px] truncate">
                              {rm.designation || "Role"}
                            </span>
                            <span
                              className={`${getMinimalScoreBadgeClass(rm.score)} text-xs font-semibold px-2 py-0.5 rounded-full`}
                            >
                              {rm.score ?? "-"}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <div className="flex items-center gap-2">
                {!verifyConfirm.isRoleEditable && verifyConfirm.roleNeededId ? (
                  // Show only assigned role and make select disabled
                  <div className="flex items-center gap-2">
                    <Select value={verifyConfirm.roleNeededId} onValueChange={(v) => setVerifyConfirm((prev) => ({ ...prev, roleNeededId: v }))}>
                      <SelectTrigger className="w-56" disabled>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {project?.rolesNeeded?.filter((r: any) => r.id === verifyConfirm.roleNeededId).map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.designation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={() => setShowEditRoleConfirm(true)} className="h-8 w-8 p-0">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={verifyConfirm.roleNeededId}
                    onValueChange={(v) =>
                      setVerifyConfirm((prev) => ({ ...prev, roleNeededId: v }))
                    }
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {project?.rolesNeeded?.map((r: any) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.designation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <label
                htmlFor="verify-notes"
                className="text-sm font-medium text-gray-700"
              >
                Notes (Optional)
              </label>
              <Textarea
                id="verify-notes"
                placeholder="Add any notes for the verification team..."
                value={verifyConfirm.notes}
                onChange={(e) =>
                  setVerifyConfirm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                rows={3}
                className="w-full"
              />
            </div>
          </div>
        }
        confirmText="Send for Verification"
        cancelText="Cancel"
        isLoading={false}
        variant="default"
        icon={
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Send className="h-5 w-5 text-blue-600" />
          </div>
        }
      />

      {/* Interview Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={interviewConfirm.isOpen}
        onClose={() =>
          setInterviewConfirm({
            isOpen: false,
            candidateId: "",
            candidateName: "",
            type: "",
            notes: "",
          })
        }
        onConfirm={handleSendForInterview}
          title={
            interviewConfirm.type === "training"
              ? "Send for Training"
              : "Send for Interview"
          }
        description={
          <div className="space-y-4">
            <p>
              {interviewConfirm.type === "training" ? (
                <>Are you sure you want to send {interviewConfirm.candidateName} for training? You can optionally add notes.</>
              ) : (
                <>Are you sure you want to send {interviewConfirm.candidateName} for an interview? Please select the type and optionally add notes.</>
              )}
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Type</label>
              <div className="space-y-2">
                {[
                  {
                    value: "screening",
                    label: "Screening",
                    description:
                      "Quick initial screen to verify basic eligibility and documents.",
                  },
                  {
                    value: "interview",
                    label: "Interview",
                    description:
                      "Full interview with the hiring team to assess skills and fit.",
                    // disabled: projectRequiredScreening, // temporarily allow interview even when screening is required
                  },
                  {
                    value: "training",
                    label: "Send for Training",
                    description:
                      "Assign basic training before interviews when candidates need upskilling.",
                  },
                ].map((opt: { value: string; label: string; description: string; disabled?: boolean }) => {
                  const selected = interviewConfirm.type === opt.value;
                  const isDisabled = opt.disabled || false;
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded border transition-colors duration-150 ${
                        isDisabled
                          ? "cursor-not-allowed opacity-60 bg-slate-50"
                          : "cursor-pointer"
                      } ${
                        selected
                          ? "border-primary/40 bg-primary/10"
                          : "border-slate-200 hover:bg-accent/50"
                      }`}
                      onClick={(e) => {
                        if (isDisabled) {
                          e.preventDefault();
                          return;
                        }
                        e.stopPropagation();
                        setInterviewConfirm((prev) => ({ ...prev, type: opt.value as any }));
                      }}
                      aria-label={opt.label}
                    >
                      <input
                        type="radio"
                        name="interview-type"
                        value={opt.value}
                        checked={selected}
                        disabled={isDisabled}
                        onChange={() => setInterviewConfirm((prev) => ({ ...prev, type: opt.value as any }))}
                        className="accent-primary mt-1"
                        aria-describedby={`interview-type-desc-${opt.value}`}
                        onClick={(e) => e.stopPropagation()}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800">
                          {opt.label}
                        </div>
                        <div
                          id={`interview-type-desc-${opt.value}`}
                          className="text-xs text-slate-500 mt-1"
                        >
                          {opt.description}
                        </div>
                        {/* {isDisabled && opt.value === "interview" && projectRequiredScreening && (
                          <div className="text-xs text-red-600 mt-1.5 font-medium">
                            ⚠ Screening is required for this project. Please complete screening before interview.
                          </div>
                        )} */}
                      </div>
                    </label>
                  );
                })}

                {!interviewConfirm.type && (
                  <p className="text-sm text-red-600">Please select one</p>
                )}
              </div>

              {interviewConfirm.type === "training" && (
                <p className="text-xs text-slate-500 mt-2">
                  Assign basic training to candidate (no screening
                  required).
                </p>
              )}

              <label
                htmlFor="interview-notes"
                className="text-sm font-medium text-gray-700"
              >
                Notes (Optional)
              </label>
              <Textarea
                id="interview-notes"
                placeholder="Add any notes for the interview team..."
                value={interviewConfirm.notes}
                onChange={(e) =>
                  setInterviewConfirm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                rows={3}
                className="w-full"
              />
            </div>
          </div>
        }
        className="sm:max-w-2xl"
        confirmDisabled={!interviewConfirm.type}
        confirmText={
          interviewConfirm.type === "training"
            ? "Send for Training"
            : interviewConfirm.type === "screening"
            ? "Send for Screening"
            : "Send for Interview"
        }
        cancelText="Cancel"
        isLoading={isSendingInterview}
        variant="default"
        icon={
          <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Send className="h-5 w-5 text-purple-600" />
          </div>
        }
      />

      {/* Assign Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={assignConfirm.isOpen}
        className="sm:max-w-2xl"
        onClose={() =>
          setAssignConfirm({
            isOpen: false,
            candidateId: "",
            candidateName: "",
            roleNeededId: undefined,
            notes: "",
          })
        }
        onConfirm={handleAssignToProject}
        title="Assign to Project"
        description={
          <div className="space-y-4">
            <p>
              Are you sure you want to assign {assignConfirm.candidateName} to
              this project?
            </p>

            {/* Candidate Details */}
            {(() => {
              const candidate = [...projectCandidates, ...eligibleCandidates, ...allCandidates].find(
                (c) => (c.candidateId || c.id) === assignConfirm.candidateId
              );
              if (!candidate) return null;
              return (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {/* Match score summary */}
                  <MatchScoreSummary candidate={candidate} />

                  <h4 className="text-sm font-semibold text-slate-700 mt-2">Candidate Profile</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Education</p>
                      <div className="space-y-1">
                        {candidate.qualifications && candidate.qualifications.length > 0 ? (
                          candidate.qualifications.map((qual: any, idx: number) => (
                            <p key={idx} className="text-xs text-slate-700">
                              {qual.qualification?.name || qual.qualification?.shortName || 'N/A'}
                              {qual.qualification?.field ? ` - ${qual.qualification.field}` : ''}
                              {qual.yearOfCompletion ? ` (${qual.yearOfCompletion})` : ''}
                            </p>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500">No education details</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Experience</p>
                      <div className="space-y-1">
                        {candidate.workExperiences && candidate.workExperiences.length > 0 ? (
                          candidate.workExperiences.map((exp: any, idx: number) => (
                            <p key={idx} className="text-xs text-slate-700">
                              {formatWorkExperienceEntry(exp)}
                            </p>
                          ))
                        ) : candidate.candidateExperience ? (
                          <p className="text-xs text-slate-700">{candidate.candidateExperience} yrs</p>
                        ) : (
                          <p className="text-xs text-slate-500">No experience details</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Role match scores */}
                  {candidate.roleMatches && candidate.roleMatches.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-2">Role match scores</p>
                      <div className="flex flex-wrap gap-2">
                        {candidate.roleMatches.map((rm: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 rounded-full px-2 py-1 border border-slate-100 bg-white/60"
                          >
                            <span className="text-xs text-slate-700 max-w-[160px] truncate">
                              {rm.designation || "Role"}
                            </span>
                            <span
                              className={`${getMinimalScoreBadgeClass(rm.score)} text-xs font-semibold px-2 py-0.5 rounded-full`}
                            >
                              {rm.score ?? "-"}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <Select
                value={assignConfirm.roleNeededId}
                onValueChange={(v) =>
                  setAssignConfirm((prev) => ({ ...prev, roleNeededId: v }))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {project?.rolesNeeded?.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.designation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <label
                htmlFor="assign-notes"
                className="text-sm font-medium text-gray-700"
              >
                Notes (Optional)
              </label>
              <Textarea
                id="assign-notes"
                placeholder="Add any notes about this assignment..."
                value={assignConfirm.notes}
                onChange={(e) =>
                  setAssignConfirm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                rows={3}
                className="w-full"
              />
            </div>
          </div>
        }
        confirmText="Assign to Project"
        cancelText="Cancel"
        isLoading={isAssigning}
        variant="default"
        icon={
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <UserPlus className="h-5 w-5 text-green-600" />
          </div>
        }
      />
    </div>
  );
}
