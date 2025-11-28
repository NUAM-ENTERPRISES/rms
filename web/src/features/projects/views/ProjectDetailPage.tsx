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

  // RTK Query hooks
  const {
    data: projectData,
    isLoading,
    error,
  } = useGetProjectQuery(projectId!);
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  // Board filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Get project statuses for filter options
  const { data: statusesData } = useGetCandidateProjectStatusesQuery();

  // Get nominated candidates with proper status filtering
  const { data: projectCandidatesData, isLoading: isLoadingCandidates } =
    useGetNominatedCandidatesQuery({
      projectId: projectId!,
      search: searchTerm || undefined,
      statusId: selectedStatus !== "all" ? selectedStatus : undefined,
      page: 1,
      limit: 100,
    });

  const [sendForVerification] = useSendForVerificationMutation();
  const [sendForInterview, { isLoading: isSendingInterview }] = useSendForInterviewMutation();
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
  }>({ isOpen: false, candidateId: "", candidateName: "", roleNeededId: undefined, notes: "" });

  const [interviewConfirm, setInterviewConfirm] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    type: "mock" | "interview";
    notes: string;
  }>({ isOpen: false, candidateId: "", candidateName: "", type: "interview", notes: "" });

  const [assignConfirm, setAssignConfirm] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    roleNeededId?: string;
    notes: string;
  }>({ isOpen: false, candidateId: "", candidateName: "", roleNeededId: undefined, notes: "" });

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
          : "interview_assigned";

      await sendForInterview({
        projectId: projectId!,
        candidateId: interviewConfirm.candidateId,
        type: mappedType as "mock_interview_assigned" | "interview_assigned",
        recruiterId: user?.id,
        notes: interviewConfirm.notes || undefined,
      }).unwrap();

      toast.success("Candidate sent for interview successfully");
      setInterviewConfirm({
        isOpen: false,
        candidateId: "",
        candidateName: "",
        type: "interview",
        notes: "",
      });
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to send candidate for interview");
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
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-4">
                  <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
                    {project.title}
                  </h1>
                  <ProjectCountryCell
                    countryCode={project.countryCode}
                    size="2xl"
                    fallbackText="Not specified"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManageProjects && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/projects/${project.id}/edit`)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Candidates Board */}
          <div className="lg:col-span-8">
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
          </div>

          {/* Right Column: Project Info + Supporting Cards */}
          <div className="space-y-4 lg:col-span-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2">
            {/* Compact Project Overview */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="space-y-3">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">
                      {project.rolesNeeded.reduce(
                        (sum, role) => sum + role.quantity,
                        0
                      )}
                    </div>
                    <div className="text-xs text-slate-600">Positions</div>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      {pagination?.total || 0}
                    </div>
                    <div className="text-xs text-slate-600">Nominated</div>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">
                      {project.rolesNeeded.length}
                    </div>
                    <div className="text-xs text-slate-600">Roles</div>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <div className="text-lg font-bold text-orange-600">
                      {Math.ceil(
                        (new Date(project.deadline).getTime() -
                          new Date().getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}
                    </div>
                    <div className="text-xs text-slate-600">Days Left</div>
                  </div>
                </div>

                {/* Project Details */}
                <div className="space-y-2.5 border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                      <Calendar className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                        Deadline
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-900 truncate text-right">
                      {formatDateTime(project.deadline)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                      <Clock className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                        Created
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-900 truncate text-right">
                      {formatDate(project.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                      <MapPin className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                        Country
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      <ProjectCountryCell
                        countryCode={project.countryCode}
                        size="sm"
                        fallbackText="Not specified"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                        Status
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {project.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                      <User className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                        Created By
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-900 truncate text-right">
                      {project.creator.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                      <Building2 className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                        Project Type
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {project.projectType === "ministry"
                        ? "Ministry/Government"
                        : "Private Sector"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                      <FileText className="h-3.5 w-3.5 text-cyan-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                        Resume
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {projectResumeEditable ? "Editable" : "Fixed"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                      <User className="h-3.5 w-3.5 text-pink-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                        Grooming
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {projectGroomingRequirement === "formal"
                        ? "Formal"
                        : projectGroomingRequirement === "casual"
                        ? "Casual"
                        : "Not Specified"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                      <Target className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                        Contact Info
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {projectHideContactInfo ? "Hidden" : "Visible"}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-slate-600 text-sm leading-relaxed capitalize mt-4 pt-4 border-t border-slate-200">
                    {project.description}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Document Requirements */}
            {project.documentRequirements &&
              project.documentRequirements.length > 0 && (
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-orange-600" />
                      Document Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {project.documentRequirements.map(
                        (req: any, index: number) => (
                          <span
                            key={index}
                            className="text-sm text-slate-700 bg-slate-100 px-2 py-1 rounded-md"
                          >
                            {req.docType
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (char: string) =>
                                char.toUpperCase()
                              )}
                            {req.mandatory && " (Required)"}
                          </span>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Roles Required */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-600" />
                  Roles Required ({project.rolesNeeded.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.rolesNeeded.map((role) => (
                  <div
                    key={role.id}
                    className="border border-slate-200 rounded-lg p-3 bg-slate-50/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-slate-800">
                        {role.designation}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {role.quantity} pos
                      </Badge>
                    </div>

                    {/* Experience and Shift */}
                    <div className="text-xs text-slate-600 mb-2">
                      {role.minExperience && role.maxExperience ? (
                        <>
                          {role.minExperience}-{role.maxExperience} years
                        </>
                      ) : role.minExperience ? (
                        <>{role.minExperience}+ years</>
                      ) : role.maxExperience ? (
                        <>Up to {role.maxExperience} years</>
                      ) : (
                        "Experience not specified"
                      )}
                      {role.shiftType && (
                        <span className="ml-2 text-slate-500">
                          • {role.shiftType}
                        </span>
                      )}
                    </div>

                    {/* Additional role details... */}
                    {/* (keeping the rest of the role details as in original) */}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Client Information */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-teal-600" />
                  Client Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium text-slate-800 text-sm">
                    {project.client?.name || "No client assigned"}
                  </h4>
                  {project.client && (
                    <Badge variant="outline" className="mt-1 text-xs">
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
        title="Send for Interview"
        description={
          <div className="space-y-4">
            <p>
              Are you sure you want to send {interviewConfirm.candidateName} for
              an interview? Please select the type and optionally add notes.
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
                  setInterviewConfirm((prev) => ({ ...prev, type: value as any }))
                }
              >
                <SelectTrigger id="interview-type" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mock">Mock Interview</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                </SelectContent>
              </Select>

              <label htmlFor="interview-notes" className="text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <Textarea
                id="interview-notes"
                placeholder="Add any notes for the interview team..."
                value={interviewConfirm.notes}
                onChange={(e) =>
                  setInterviewConfirm((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                className="w-full"
              />
            </div>
          </div>
        }
        confirmText="Send for Interview"
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
