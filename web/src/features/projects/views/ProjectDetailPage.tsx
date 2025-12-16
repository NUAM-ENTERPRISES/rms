import { useState } from "react";
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
  UserPlus,
  Layers,
  Briefcase,
} from "lucide-react";
import {
  useGetProjectQuery,
  useDeleteProjectMutation,
  useGetNominatedCandidatesQuery,
  useSendForVerificationMutation,
  useSendForInterviewMutation,
  useGetCandidateProjectStatusesQuery,
  useAssignToProjectMutation,
} from "@/features/projects";
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
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Get project statuses for filter options
  const { data: statusesData } = useGetCandidateProjectStatusesQuery();

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
        statusId: selectedStatus !== "all" ? selectedStatus : undefined,
        page: 1,
        limit: 100,
      },
      { skip: !shouldLoadNominated }
    );

  const [sendForVerification] = useSendForVerificationMutation();
  const [sendForInterview, { isLoading: isSendingInterview }] =
    useSendForInterviewMutation();
  const [assignToProject, { isLoading: isAssigning }] =
    useAssignToProjectMutation();

  // Local state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [verifyConfirm, setVerifyConfirm] = useState<{
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

  const [interviewConfirm, setInterviewConfirm] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    type: "mock" | "interview" | "training";
    notes: string;
  }>({
    isOpen: false,
    candidateId: "",
    candidateName: "",
    type: "interview",
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
    setVerifyConfirm({
      isOpen: true,
      candidateId,
      candidateName,
      roleNeededId: projectData?.data?.rolesNeeded?.[0]?.id,
      notes: "",
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
      type: "interview",
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

      const mappedType =
        interviewConfirm.type === "mock"
          ? "mock_interview_assigned"
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
        type: "interview",
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

  const handleViewCandidate = (candidateId: string) => {
    navigate(`/candidates/${candidateId}`);
  };

  const handleBoardSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleBoardStatusChange = (value: string) => {
    setSelectedStatus(value);
  };

  // Get data
  const projectCandidates = Array.isArray(
    projectCandidatesData?.data?.candidates
  )
    ? projectCandidatesData?.data?.candidates
    : [];
  const pagination = projectCandidatesData?.data?.pagination;

  const projectStatuses = Array.isArray(statusesData?.data?.statuses)
    ? statusesData.data.statuses
    : [];

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

                {/* Country Flag — Clean & Elevated */}
                <div className="flex-shrink-0">
                  <ProjectCountryCell
                    countryCode={project.countryCode}
                    size="4xl"
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
                nominatedCandidates={projectCandidates}
                isLoadingNominated={isLoadingCandidates}
                searchTerm={searchTerm}
                selectedStatus={selectedStatus}
                onSearchChange={handleBoardSearchChange}
                onStatusChange={handleBoardStatusChange}
                statuses={projectStatuses}
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
            {project.documentRequirements?.length > 0 && (
              <Card className="border-0 shadow-md bg-white/95 backdrop-blur-sm rounded-xl">
                <CardHeader className="pb-2 px-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-600" /> Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {project.documentRequirements.map((req: any, i: number) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded-md border border-orange-300"
                      >
                        {req.docType
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                        {req.mandatory && "*"}
                      </span>
                    ))}
                  </div>
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
              <CardContent className="space-y-2 px-3 pb-3">
                {project.rolesNeeded.map((role) => (
                  <div
                    key={role.id}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 text-xs truncate">
                        {role.designation}
                      </span>
                      <Badge className="text-xs h-5 bg-gradient-to-r from-purple-600 to-pink-600 flex-shrink-0">
                        {role.quantity} pos
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 truncate">
                      {role.minExperience
                        ? `${role.minExperience}+ yrs`
                        : "Any"}{" "}
                      {role.shiftType && `• ${role.shiftType}`}
                    </p>
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

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteProjectConfirm}
        title={projectData?.data?.title || ""}
        itemType="project"
        isLoading={isDeleting}
      />

      {/* Verification Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={verifyConfirm.isOpen}
        onClose={() =>
          setVerifyConfirm({
            isOpen: false,
            candidateId: "",
            candidateName: "",
            roleNeededId: undefined,
            notes: "",
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <Select
                value={verifyConfirm.roleNeededId}
                onValueChange={(v) =>
                  setVerifyConfirm((prev) => ({ ...prev, roleNeededId: v }))
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
            type: "interview",
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
              <label
                htmlFor="interview-type"
                className="text-sm font-medium text-gray-700"
              >
                Type
              </label>
              <Select
                value={interviewConfirm.type}
                onValueChange={(value) =>
                  setInterviewConfirm((prev) => ({
                    ...prev,
                    type: value as any,
                  }))
                }
              >
                <SelectTrigger id="interview-type" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mock">Mock Interview</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="training">Send for Training</SelectItem>
                </SelectContent>
              </Select>

              {interviewConfirm.type === "training" && (
                <p className="text-xs text-slate-500 mt-2">
                  Assign basic training to candidate (no mock interview
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
        confirmText={
          interviewConfirm.type === "training"
            ? "Send for Training"
            : interviewConfirm.type === "mock"
            ? "Send for Mock Interview"
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
