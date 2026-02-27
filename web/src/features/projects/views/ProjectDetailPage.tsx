import React, { useState, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Card,
  CardContent,
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
  ShieldCheck,
  ClipboardCheck,
  Activity,
  RefreshCcw,
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
  useCheckBulkCandidateEligibilityQuery,
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
  } = useGetProjectQuery(projectId!, {
    refetchOnFocus: true,
  });
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  // Board filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleCatalogId, setSelectedRoleCatalogId] = useState<string>("all");

  const [showDetails, setShowDetails] = useState(false);

  // Get eligible candidates
  const { data: eligibleResponse, refetch: refetchEligible } = useGetEligibleCandidatesQuery({
    projectId: projectId!,
    search: searchTerm || undefined,
    roleCatalogId:
      selectedRoleCatalogId !== "all" ? selectedRoleCatalogId : undefined,
    limit: 10,
  }, {
    refetchOnFocus: true,
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
  }, {
    refetchOnFocus: true,
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
      { 
        skip: !shouldLoadNominated,
        refetchOnFocus: true,
      }
    );

  const [sendForVerification] = useSendForVerificationMutation();
  const [sendForInterview, { isLoading: isSendingInterview }] =
    useSendForInterviewMutation();
    const [sendForScreening, { isLoading: isSendingScreening }] =
      useSendForScreeningMutation();
  const [assignToProject, { isLoading: isAssigning }] =
    useAssignToProjectMutation();

  const handleRefreshAll = async () => {
    try {
      await Promise.all([
        refetchProject?.(),
        refetchNominated?.(),
        refetchEligible?.(),
        consolidatedCandidatesQuery?.refetch?.(),
      ]);
      toast.success("Project data refreshed");
    } catch (e) {
      toast.error("Failed to refresh data");
    }
  };

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

  // Eligibility query for the verify modal
  const verifyCandidateIds = React.useMemo(
    () => (verifyConfirm.candidateId ? [verifyConfirm.candidateId] : []),
    [verifyConfirm.candidateId]
  );
  const { data: verifyEligibilityResponse } = useCheckBulkCandidateEligibilityQuery(
    { projectId: projectId!, candidateIds: verifyCandidateIds },
    { skip: !projectId || verifyCandidateIds.length === 0 }
  );
  const verifyEligibilityData = React.useMemo(() => {
    if (!verifyEligibilityResponse?.data || !Array.isArray(verifyEligibilityResponse.data)) return null;
    return verifyEligibilityResponse.data.find((d) => d.candidateId === verifyConfirm.candidateId) || null;
  }, [verifyEligibilityResponse, verifyConfirm.candidateId]);

  // Eligibility query for the assign modal
  const assignCandidateIds = React.useMemo(
    () => (assignConfirm.candidateId ? [assignConfirm.candidateId] : []),
    [assignConfirm.candidateId]
  );
  const { data: assignEligibilityResponse } = useCheckBulkCandidateEligibilityQuery(
    { projectId: projectId!, candidateIds: assignCandidateIds },
    { skip: !projectId || assignCandidateIds.length === 0 }
  );
  const assignEligibilityData = React.useMemo(() => {
    if (!assignEligibilityResponse?.data || !Array.isArray(assignEligibilityResponse.data)) return null;
    return assignEligibilityResponse.data.find((d) => d.candidateId === assignConfirm.candidateId) || null;
  }, [assignEligibilityResponse, assignConfirm.candidateId]);

  // Handle assignment
  const showAssignConfirmation = (
    candidateId: string,
    candidateName: string
  ) => {
    // Find the candidate to determine top matched role
    const candidate = [...projectCandidates, ...eligibleCandidates, ...allCandidates].find(
      (c) => (c.candidateId || c.id) === candidateId
    );
    // Determine best role: highest scoring roleMatch
    let bestRoleNeededId = projectData?.data?.rolesNeeded?.[0]?.id;
    if (candidate?.roleMatches && candidate.roleMatches.length > 0) {
      const sorted = [...candidate.roleMatches].sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));
      const topRoleDesignation = sorted[0]?.designation;
      if (topRoleDesignation) {
        const matchedRole = projectData?.data?.rolesNeeded?.find(
          (r: any) => r.designation === topRoleDesignation
        );
        if (matchedRole) bestRoleNeededId = matchedRole.id;
      }
    } else if (candidate?.matchScore && typeof candidate.matchScore === 'object') {
      const ms = candidate.matchScore as any;
      const roleName = ms.roleName || ms.roleDepartmentLabel;
      if (roleName) {
        const matchedRole = projectData?.data?.rolesNeeded?.find(
          (r: any) => r.designation === roleName
        );
        if (matchedRole) bestRoleNeededId = matchedRole.id;
      }
    }
    setAssignConfirm({
      isOpen: true,
      candidateId,
      candidateName,
      roleNeededId: bestRoleNeededId,
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
        <div className="w-full mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="relative overflow-hidden bg-white/95 rounded-2xl p-6 lg:p-8 shadow-xl ring-1 ring-slate-200/50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1 space-y-3">
                <div className="h-8 w-72 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-4 w-40 bg-slate-50 rounded-md animate-pulse" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-28 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-10 w-10 bg-slate-100 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="mt-6 h-1 bg-slate-100 rounded-full" />
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          </div>
          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-5">
              <div className="relative overflow-hidden bg-white/80 rounded-xl p-4 border border-slate-100 shadow-sm">
                <div className="flex gap-3 mb-4">
                  <div className="h-10 flex-1 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-10 w-48 bg-slate-100 rounded-lg animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-3">
                      <div className="h-4 w-24 bg-slate-100 rounded-md animate-pulse" />
                      {[1, 2].map((j) => (
                        <div key={j} className="bg-white rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="h-9 w-9 bg-slate-100 rounded-full animate-pulse" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3 w-24 bg-slate-100 rounded-md animate-pulse" />
                              <div className="h-2.5 w-16 bg-slate-50 rounded-md animate-pulse" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              </div>
            </div>
            <div className="lg:col-span-4 space-y-5">
              <div className="relative overflow-hidden bg-white/95 rounded-xl p-4 shadow-md">
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-3 space-y-2">
                      <div className="h-5 w-5 bg-slate-100 rounded-md animate-pulse mx-auto" />
                      <div className="h-6 w-10 bg-slate-100 rounded-md animate-pulse mx-auto" />
                      <div className="h-3 w-14 bg-slate-50 rounded-md animate-pulse mx-auto" />
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              </div>
              <div className="relative overflow-hidden bg-white/95 rounded-xl p-4 shadow-md">
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <div className="h-3 w-20 bg-slate-100 rounded-md animate-pulse" />
                      <div className="h-3 w-16 bg-slate-50 rounded-md animate-pulse" />
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm rounded-2xl max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 px-8">
            <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Project Not Found</h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <Button onClick={() => navigate("/projects")} className="font-semibold px-6">
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const project = projectData.data;

  // Get data
  const pagination = projectCandidatesData?.data?.pagination;

  const projectResumeEditable = Boolean(project.resumeEditable);
  const projectGroomingRequirement = project.groomingRequired;
  const projectHideContactInfo = Boolean(project.hideContactInfo);
  const projectRequiredScreening = Boolean(project.requiredScreening);

  // normalize document requirements to a safe array so we never read .length on undefined
  const documentRequirements = Array.isArray(project.documentRequirements)
    ? project.documentRequirements
    : [];

  // Access control
  if (!canReadProjects) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm rounded-2xl max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 px-8">
            <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <ShieldCheck className="h-8 w-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              You don&apos;t have permission to view this project.
            </p>
            <Button variant="outline" onClick={() => navigate("/projects")} className="font-semibold px-6">
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full mx-auto space-y-6">
        {/* Header */}
        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden ring-1 ring-slate-200/50">
          <CardContent className="p-5 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              {/* Left Side — Title + Status + Country */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Country flag */}
                <div className="flex-shrink-0 mt-1">
                  <ProjectCountryCell
                    countryCode={project.countryCode}
                    countryName={project.country?.name}
                    size="2xl"
                    fallbackText="—"
                    className="shadow-md ring-3 ring-white/90 rounded-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 leading-tight tracking-tight truncate">
                      {project.title}
                    </h1>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${
                        project.status === 'active'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : project.status === 'completed'
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                    {project.client && (
                      <span className="flex items-center gap-1.5 font-medium">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {project.client.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      Due {formatDate(project.deadline)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                      {project.rolesNeeded.reduce((s: number, r: any) => s + r.quantity, 0)} positions
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side — Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(true)}
                  className="text-slate-500 hover:text-blue-600 font-medium h-9 px-3 text-xs"
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Details
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshAll}
                  disabled={isLoading || isLoadingCandidates}
                  className="text-slate-500 hover:text-blue-600 font-medium h-9 w-9 p-0"
                  title="Refresh all data"
                >
                  <RefreshCcw
                    className={`h-3.5 w-3.5 ${
                      isLoading || isLoadingCandidates ? "animate-spin" : ""
                    }`}
                  />
                </Button>
                {canManageProjects && !isProcessingExecutive && (
                  <>
                    <div className="w-px h-6 bg-slate-200" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/projects/${project.id}/edit`)}
                      className="font-semibold h-9 text-xs border-slate-200 hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="font-semibold h-9 text-xs shadow-sm hover:shadow-md transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
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
          <div className="space-y-4 text-sm lg:space-y-4 lg:col-span-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2 px-3 pb-6 lg:px-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {/* Quick Stats Strip */}
            <div className="grid grid-cols-4 gap-2">
              {[
                {
                  icon: Briefcase,
                  value: project.rolesNeeded.reduce((s: number, r: any) => s + r.quantity, 0),
                  label: "Positions",
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                  ring: "ring-blue-100",
                },
                {
                  icon: UserCheck,
                  value: pagination?.total || 0,
                  label: "Nominated",
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                  ring: "ring-emerald-100",
                },
                {
                  icon: Layers,
                  value: project.rolesNeeded.length,
                  label: "Roles",
                  color: "text-purple-600",
                  bg: "bg-purple-50",
                  ring: "ring-purple-100",
                },
                {
                  icon: Clock,
                  value: Math.max(0, Math.ceil((new Date(project.deadline).getTime() - Date.now()) / 86400000)),
                  label: "Days Left",
                  color: "text-orange-600",
                  bg: "bg-orange-50",
                  ring: "ring-orange-100",
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center p-2.5 ${stat.bg} rounded-xl ring-1 ${stat.ring} transition-shadow hover:shadow-sm`}
                >
                  <stat.icon className={`h-4 w-4 ${stat.color} mb-1`} />
                  <span className={`text-lg font-extrabold ${stat.color} tabular-nums leading-none`}>
                    {stat.value}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium mt-1 leading-none truncate">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Project Overview Card */}
            <Card className="border-0 shadow-md bg-white/95 backdrop-blur-sm rounded-xl overflow-hidden">
              <CardContent className="p-0">

                {/* Grouped Details Sections */}
                {/* Schedule & Location */}
                <div className="px-3.5 py-2.5 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Schedule & Location</p>
                  {[
                    { icon: Calendar, color: "text-blue-500", label: "Deadline", value: formatDateTime(project.deadline) },
                    { icon: Clock, color: "text-slate-500", label: "Created", value: formatDate(project.createdAt) },
                    { icon: MapPin, color: "text-purple-500", label: "Country", value: (<ProjectCountryCell countryCode={project.countryCode} countryName={project.country?.name} size="sm" fallbackText="—" />) },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 py-1 hover:bg-slate-50/80 rounded-md px-1.5 -mx-1 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <item.icon className={`h-3.5 w-3.5 ${item.color} flex-shrink-0`} />
                        <span className="text-[11px] text-slate-500 font-medium">{item.label}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-800 text-right truncate max-w-[50%]">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="mx-3.5 border-t border-slate-100" />

                {/* Project Config */}
                <div className="px-3.5 py-2.5 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Configuration</p>
                  {[
                    { icon: User, color: "text-indigo-500", label: "Creator", value: project.creator.name },
                    { icon: Building2, color: "text-orange-500", label: "Type", value: project.projectType === "ministry" ? "Government" : "Private" },
                    { icon: FileText, color: "text-cyan-500", label: "Resume", value: projectResumeEditable ? "Editable" : "Fixed" },
                    { icon: User, color: "text-pink-500", label: "Grooming", value: projectGroomingRequirement?.[0]?.toUpperCase() || "—" },
                    { icon: Target, color: "text-red-500", label: "Contact", value: projectHideContactInfo ? "Hidden" : "Visible" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 py-1 hover:bg-slate-50/80 rounded-md px-1.5 -mx-1 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <item.icon className={`h-3.5 w-3.5 ${item.color} flex-shrink-0`} />
                        <span className="text-[11px] text-slate-500 font-medium">{item.label}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-800 text-right truncate max-w-[50%]">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="mx-3.5 border-t border-slate-100" />

                {/* Compliance */}
                <div className="px-3.5 py-2.5 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Compliance</p>
                  {[
                    { icon: Activity, color: "text-orange-500", label: "License Exam", value: project.licensingExam?.toUpperCase() || "None" },
                    { icon: ShieldCheck, color: "text-blue-500", label: "Data Flow", value: project.dataFlow ? "Required" : "Not Required" },
                    { icon: ClipboardCheck, color: "text-emerald-500", label: "Eligibility", value: project.eligibility ? "Required" : "Not Required" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 py-1 hover:bg-slate-50/80 rounded-md px-1.5 -mx-1 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <item.icon className={`h-3.5 w-3.5 ${item.color} flex-shrink-0`} />
                        <span className="text-[11px] text-slate-500 font-medium">{item.label}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-800 text-right truncate max-w-[50%]">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Description */}
                {project.description && (
                  <div className="px-3.5 pb-3">
                    <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 italic line-clamp-3">
                      {project.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documents Card */}
            {documentRequirements.length > 0 && (
              <Card className="border-0 shadow-md bg-white/95 backdrop-blur-sm rounded-xl overflow-hidden">
                <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2">
                  <div className="h-6 w-6 rounded-md bg-orange-100 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-orange-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Documents</span>
                  <span className="text-[10px] font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-md ml-auto">
                    {documentRequirements.length}
                  </span>
                </div>
                <div className="px-3 pb-3 space-y-1.5">
                  {documentRequirements.map((req: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 bg-slate-50/80 rounded-lg border border-slate-100/80 hover:bg-slate-50 transition-colors"
                    >
                      <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${req.mandatory ? 'bg-orange-400' : 'bg-slate-300'}`} />
                      <span className="text-[11px] font-semibold text-slate-700 flex-1 truncate">
                        {req.docType
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </span>
                      {req.mandatory && (
                        <span className="text-[9px] font-bold text-orange-600 bg-orange-100/80 px-1.5 py-0.5 rounded flex-shrink-0">
                          REQ
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card className="border-0 shadow-md bg-white/95 backdrop-blur-sm rounded-xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2">
                <div className="h-6 w-6 rounded-md bg-purple-100 flex items-center justify-center">
                  <Target className="h-3.5 w-3.5 text-purple-600" />
                </div>
                <span className="text-xs font-bold text-slate-800">Roles</span>
                <span className="text-[10px] font-semibold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-md ml-auto">
                  {project.rolesNeeded.length}
                </span>
              </div>
              <div className="space-y-2 px-3 pb-3">
                {project.rolesNeeded.map((role) => (
                  <div
                    key={role.id}
                    className="p-2.5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-150 space-y-2 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-800 text-[13px] truncate leading-tight">
                          {role.designation}
                        </span>
                        {role.roleCatalog?.roleDepartment && (
                          <span className="text-[10px] text-slate-400 font-medium truncate">
                            {role.roleCatalog.roleDepartment.label}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md flex-shrink-0">
                        {role.quantity} pos
                      </span>
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
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60">
                      {(role.accommodation || role.food || role.transport) && (
                        <div className="flex items-center gap-2 mr-auto">
                          {role.accommodation && (
                            <div className="flex items-center gap-0.5 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-medium border border-emerald-100">
                              <Home className="h-2.5 w-2.5" />
                              <span>Housing</span>
                            </div>
                          )}
                          {role.food && (
                            <div className="flex items-center gap-0.5 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-medium border border-blue-100">
                              <Utensils className="h-2.5 w-2.5" />
                              <span>Food</span>
                            </div>
                          )}
                          {role.transport && (
                            <div className="flex items-center gap-0.5 text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded text-[10px] font-medium border border-purple-100">
                              <Bus className="h-2.5 w-2.5" />
                              <span>Travel</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 ml-auto">
                        {role.employmentType && (
                          <Badge variant="outline" className="text-[10px] h-4.5 font-medium border-slate-300 text-slate-600 px-1.5">
                            {role.employmentType.toUpperCase()}
                          </Badge>
                        )}
                        {role.visaType && (
                          <Badge variant="outline" className="text-[10px] h-4.5 font-medium border-amber-300 text-amber-700 bg-amber-50 px-1.5">
                            {role.visaType.replace(/_/g, ' ').toUpperCase()} VISA
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Screening Badges */}
                    {(role.backgroundCheckRequired || role.drugScreeningRequired) && (
                      <div className="flex items-center gap-2 pt-1">
                        {role.backgroundCheckRequired && (
                          <span className="text-[9px] text-slate-500 flex items-center gap-1">
                            <ShieldCheck className="h-2.5 w-2.5 text-slate-400" />
                            Security Clearance
                          </span>
                        )}
                        {role.drugScreeningRequired && (
                          <span className="text-[9px] text-slate-500 flex items-center gap-1">
                            <ClipboardCheck className="h-2.5 w-2.5 text-slate-400" />
                            Medical Screening
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Client Card */}
            <Card className="border-0 shadow-md bg-white/95 backdrop-blur-sm rounded-xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2">
                <div className="h-6 w-6 rounded-md bg-teal-100 flex items-center justify-center">
                  <Building2 className="h-3.5 w-3.5 text-teal-600" />
                </div>
                <span className="text-xs font-bold text-slate-800">Client</span>
              </div>
              <div className="px-3 pb-3">
                <div className="flex items-center gap-3 p-2.5 bg-gradient-to-br from-teal-50/80 to-cyan-50/40 rounded-lg border border-teal-100">
                  <div className="h-8 w-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-teal-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800 text-xs truncate">
                      {project.client?.name || "Not assigned"}
                    </div>
                    {project.client && (
                      <span className="text-[10px] text-teal-600 font-medium">
                        {project.client.type}
                      </span>
                    )}
                  </div>
                </div>
              </div>
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
                        {project?.rolesNeeded?.filter((r: any) => r.id === verifyConfirm.roleNeededId).map((r: any) => {
                          const roleElig = verifyEligibilityData?.roleEligibility?.find(
                            (re: any) => re.designation === r.designation
                          );
                          return (
                            <SelectItem key={r.id} value={r.id}>
                              <span className="flex items-center gap-2">
                                {r.designation}
                                {roleElig && roleElig.reasons.length > 0 && (
                                  <AlertCircle className="h-3 w-3 text-amber-500 inline" />
                                )}
                                {roleElig && roleElig.reasons.length === 0 && (
                                  <CheckCircle2 className="h-3 w-3 text-green-500 inline" />
                                )}
                              </span>
                            </SelectItem>
                          );
                        })}
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
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {project?.rolesNeeded?.map((r: any) => {
                        const roleElig = verifyEligibilityData?.roleEligibility?.find(
                          (re: any) => re.designation === r.designation
                        );
                        return (
                          <SelectItem key={r.id} value={r.id}>
                            <span className="flex items-center gap-2">
                              {r.designation}
                              {roleElig && roleElig.reasons.length > 0 && (
                                <AlertCircle className="h-3 w-3 text-amber-500 inline" />
                              )}
                              {roleElig && roleElig.reasons.length === 0 && (
                                <CheckCircle2 className="h-3 w-3 text-green-500 inline" />
                              )}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Eligibility reasons for the selected role */}
              {(() => {
                const selectedRole = project?.rolesNeeded?.find((r: any) => r.id === verifyConfirm.roleNeededId);
                const roleElig = verifyEligibilityData?.roleEligibility?.find(
                  (re: any) => re.designation === selectedRole?.designation
                );
                if (!roleElig) return null;
                return (
                  <div className={`mt-2 p-3 rounded-lg border ${
                    roleElig.reasons.length === 0
                      ? 'bg-green-50 border-green-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className={`flex items-center gap-2 text-xs font-semibold mb-1 ${
                      roleElig.reasons.length === 0 ? 'text-green-700' : 'text-amber-700'
                    }`}>
                      {roleElig.reasons.length === 0 ? (
                        <><CheckCircle2 className="h-3.5 w-3.5" /> Eligible for {roleElig.designation}</>
                      ) : (
                        <><AlertCircle className="h-3.5 w-3.5" /> {roleElig.designation} &mdash; Eligibility Issues</>
                      )}
                    </div>
                    {roleElig.reasons.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 mt-1">
                        {roleElig.reasons.map((reason: string, idx: number) => (
                          <li key={idx} className="text-[11px] text-slate-600 italic">{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-green-600 italic">This candidate meets all requirements for this role.</p>
                    )}
                  </div>
                );
              })()}

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
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {project?.rolesNeeded?.map((r: any) => {
                    const roleElig = assignEligibilityData?.roleEligibility?.find(
                      (re: any) => re.designation === r.designation
                    );
                    return (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="flex items-center gap-2">
                          {r.designation}
                          {roleElig && roleElig.reasons.length > 0 && (
                            <AlertCircle className="h-3 w-3 text-amber-500 inline" />
                          )}
                          {roleElig && roleElig.reasons.length === 0 && (
                            <CheckCircle2 className="h-3 w-3 text-green-500 inline" />
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* Eligibility reasons for the selected role */}
              {(() => {
                const selectedRole = project?.rolesNeeded?.find((r: any) => r.id === assignConfirm.roleNeededId);
                const roleElig = assignEligibilityData?.roleEligibility?.find(
                  (re: any) => re.designation === selectedRole?.designation
                );
                if (!roleElig) return null;
                return (
                  <div className={`mt-2 p-3 rounded-lg border ${
                    roleElig.reasons.length === 0
                      ? 'bg-green-50 border-green-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className={`flex items-center gap-2 text-xs font-semibold mb-1 ${
                      roleElig.reasons.length === 0 ? 'text-green-700' : 'text-amber-700'
                    }`}>
                      {roleElig.reasons.length === 0 ? (
                        <><CheckCircle2 className="h-3.5 w-3.5" /> Eligible for {roleElig.designation}</>
                      ) : (
                        <><AlertCircle className="h-3.5 w-3.5" /> {roleElig.designation} &mdash; Eligibility Issues</>
                      )}
                    </div>
                    {roleElig.reasons.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 mt-1">
                        {roleElig.reasons.map((reason: string, idx: number) => (
                          <li key={idx} className="text-[11px] text-slate-600 italic">{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-green-600 italic">This candidate meets all requirements for this role.</p>
                    )}
                  </div>
                );
              })()}

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
