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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
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
  Search,
  Filter,
  Send,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import {
  useGetProjectQuery,
  useDeleteProjectMutation,
  useGetNominatedCandidatesQuery,
  useSendForVerificationMutation,
  useGetCandidateProjectStatusesQuery,
  useAssignToProjectMutation,
} from "@/features/projects";
import ProjectDetailTabs from "@/features/projects/components/ProjectDetailTabs";
import CandidateCard from "@/features/projects/components/CandidateCard";
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

  // Submitted Candidates State
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const itemsPerPage = 3; // 3 cards per page

  // Get project statuses first to ensure we have the status data
  const { data: statusesData } = useGetCandidateProjectStatusesQuery();

  // Get nominated candidates with proper status filtering
  const { data: projectCandidatesData, isLoading: isLoadingCandidates } =
    useGetNominatedCandidatesQuery({
      projectId: projectId!,
      search: searchTerm || undefined,
      statusId: selectedStatus !== "all" ? selectedStatus : undefined,
      page: currentPage,
      limit: itemsPerPage,
    });

  const [sendForVerification] = useSendForVerificationMutation();
  const [assignToProject, { isLoading: isAssigning }] =
    useAssignToProjectMutation();

  // Local state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [verifyConfirm, setVerifyConfirm] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    notes: string;
  }>({ isOpen: false, candidateId: "", candidateName: "", notes: "" });

  const [assignConfirm, setAssignConfirm] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    notes: string;
  }>({ isOpen: false, candidateId: "", candidateName: "", notes: "" });

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
    setVerifyConfirm({ isOpen: true, candidateId, candidateName, notes: "" });
  };

  const handleSendForVerification = async () => {
    try {
      await sendForVerification({
        projectId: projectId!,
        candidateId: verifyConfirm.candidateId,
        recruiterId: user?.id,
        notes: verifyConfirm.notes || undefined,
      }).unwrap();
      toast.success("Candidate sent for verification successfully");
      setVerifyConfirm({
        isOpen: false,
        candidateId: "",
        candidateName: "",
        notes: "",
      });
    } catch (error: any) {
      toast.error(
        error?.data?.message || "Failed to send candidate for verification"
      );
    }
  };

  // Handle assignment
  const showAssignConfirmation = (
    candidateId: string,
    candidateName: string
  ) => {
    setAssignConfirm({ isOpen: true, candidateId, candidateName, notes: "" });
  };

  const handleAssignToProject = async () => {
    try {
      await assignToProject({
        candidateId: assignConfirm.candidateId,
        projectId: projectId!,
        recruiterId: user?.id,
        notes: assignConfirm.notes || `Assigned by recruiter to project`,
      }).unwrap();
      toast.success("Candidate assigned to project successfully");
      setAssignConfirm({
        isOpen: false,
        candidateId: "",
        candidateName: "",
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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setCurrentPage(1);
  };

  // Get data
  const projectCandidates = projectCandidatesData?.data?.candidates || [];
  const pagination = projectCandidatesData?.data?.pagination;
  const totalPages = pagination?.totalPages || 1;

  // Get project statuses with proper fallback
  const projectStatuses = Array.isArray(statusesData?.data?.statuses)
    ? statusesData.data.statuses
    : [];

  // Debug logging to check what statuses we're getting
  console.log("Project Statuses:", projectStatuses);
  console.log("Selected Status:", selectedStatus);
  console.log("Filtered Candidates:", projectCandidates);

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
                    size="3xl"
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
          {/* Left Column: Candidate Tables */}
          <div className="space-y-6 lg:col-span-8">
            {/* Nominated Candidates Section */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">
                      Nominated Candidates
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      Candidates submitted for this project
                      {pagination && ` (${pagination.total} total)`}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search candidates..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select
                      value={selectedStatus}
                      onValueChange={handleStatusChange}
                    >
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          <SelectValue placeholder="Filter by status" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {projectStatuses.map((status) => (
                          <SelectItem
                            key={status.id}
                            value={status.id.toString()}
                          >
                            {status.label || status.statusName || status.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingCandidates ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-64 bg-slate-200 rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                ) : projectCandidates.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg font-medium">No candidates found</p>
                    <p className="text-sm mt-1">
                      {searchTerm || selectedStatus !== "all"
                        ? "Try adjusting your filters"
                        : "No candidates have been nominated yet"}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {projectCandidates.map((candidate: any) => {
                        if (!candidate) return null;

                        // Get the actual status to display - prefer subStatus label, then name, then fallbacks
                        const projectStatus =
                          candidate.projectSubStatus?.label ||
                          candidate.projectSubStatus?.name ||
                          candidate.currentProjectStatus?.statusName ||
                          candidate.projectStatus?.statusName ||
                          "nominated";

                        const actualCandidateId =
                          candidate.candidateId || candidate.id;
                        const matchScore = candidate.matchScore;

                        // Check if candidate has a project (is already assigned to this project)
                        const hasProject = !!candidate.project;

                        // Get subStatus name from the backend response
                        const subStatusName = candidate.projectSubStatus?.name;

                        // Check if verification is in progress - don't show assign to project button
                        const isVerificationInProgress =
                          subStatusName === "verification_in_progress_document";

                        // ONLY show send for verification button when subStatus is "nominated_initial"
                        const showSendForVerificationBtn =
                          subStatusName === "nominated_initial";

                        // Show assign to project button only if candidate has no project AND verification is not in progress
                        const showAssignToProjectBtn =
                          !hasProject && !isVerificationInProgress;

                        const actions = [];

                        // Add assign to project action if conditions met
                        if (showAssignToProjectBtn) {
                          actions.push({
                            label: "Assign to Project",
                            action: "assign",
                            variant: "default" as const,
                            icon: UserPlus,
                          });
                        }

                        return (
                          <CandidateCard
                            key={candidate.id}
                            candidate={candidate}
                            onView={() =>
                              handleViewCandidate(actualCandidateId)
                            }
                            onAction={(candidateId, action) => {
                              if (action === "assign") {
                                // Handle assign to project action
                                showAssignConfirmation(
                                  candidateId,
                                  `${candidate.firstName} ${candidate.lastName}`
                                );
                              }
                            }}
                            actions={actions}
                            projectStatus={projectStatus}
                            showMatchScore={
                              matchScore !== undefined && matchScore !== null
                            }
                            matchScore={matchScore}
                            showVerifyButton={showSendForVerificationBtn}
                            onVerify={() =>
                              showVerifyConfirmation(
                                actualCandidateId,
                                `${candidate.firstName} ${candidate.lastName}`
                              )
                            }
                            isAlreadyInProject={hasProject}
                          />
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                      <div className="mt-6 flex items-center justify-between border-t pt-4">
                        <div className="text-sm text-gray-600">
                          Page {currentPage} of {pagination.totalPages} (
                          {pagination.total} candidates)
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage((prev) => Math.max(1, prev - 1))
                            }
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage((prev) =>
                                Math.min(totalPages, prev + 1)
                              )
                            }
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Tabs for Other Candidates */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="px-4">
                <ProjectDetailTabs projectId={projectId!} />
              </CardContent>
            </Card>
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
                      {project.resumeEditable ? "Editable" : "Fixed"}
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
                      {project.groomingRequired === "formal"
                        ? "Formal"
                        : project.groomingRequired === "casual"
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
                      {project.hideContactInfo ? "Hidden" : "Visible"}
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

      {/* Assign Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={assignConfirm.isOpen}
        onClose={() =>
          setAssignConfirm({
            isOpen: false,
            candidateId: "",
            candidateName: "",
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
