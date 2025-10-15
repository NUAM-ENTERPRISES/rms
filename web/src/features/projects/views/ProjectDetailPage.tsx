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
import { DeleteConfirmationDialog } from "@/components/ui";

import {
  Edit,
  Trash2,
  Calendar,
  Building2,
  Users,
  Target,
  Clock,
  Phone,
  Mail,
  MapPin,
  UserCheck,
  Info,
  Search,
  MoreHorizontal,
  Eye,
  UserPlus,
  UserMinus,
  BarChart3,
  User,
} from "lucide-react";
import {
  useGetProjectQuery,
  useDeleteProjectMutation,
  useGetEligibleCandidatesQuery,
} from "@/features/projects";
import ProjectDetailTabs from "@/features/projects/components/ProjectDetailTabs";
import { useCan } from "@/hooks/useCan";
import { ProjectCountryCell } from "@/components/molecules/domain";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Helper function to format date - following FE guidelines: DD MMM YYYY
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

// Priority badge component
// Unused component - keeping for future use
// const PriorityBadge = ({ priority }: { priority: string }) => {
// Commented out unused component
//   const priorityConfig = {
//     low: {
//       color: "bg-green-100 text-green-800 border-green-200",
//       icon: CheckCircle,
//     },
//     medium: {
//       color: "bg-yellow-100 text-yellow-800 border-yellow-200",
//       icon: AlertTriangle,
//     },
//     high: {
//       color: "bg-orange-100 text-orange-800 border-orange-200",
//       icon: AlertCircle,
//     },
//     urgent: {
//       color: "bg-red-100 text-red-800 border-red-200",
//       icon: AlertTriangle,
//     },
//   };
//   const config =
//     priorityConfig[priority as keyof typeof priorityConfig] ||
//     priorityConfig.medium;
//   const Icon = config.icon;
//   return (
//     <Badge className={`${config.color} border gap-1 px-2 py-1`}>
//       <Icon className="h-3 w-3" />
//       {priority.charAt(0).toUpperCase() + priority.slice(1)}
//     </Badge>
//   );
// };

// Status badge component
// Unused component - keeping for future use
// const StatusBadge = ({ status }: { status: string }) => {
// Commented out unused component
//   const statusConfig = {
//     active: {
//       color: "bg-emerald-100 text-emerald-800 border-emerald-200",
//       icon: CheckCircle,
//     },
//     completed: {
//       color: "bg-blue-100 text-blue-800 border-blue-200",
//       icon: CheckCircle,
//     },
//     cancelled: { color: "bg-red-100 text-red-800 border-red-200", icon: X },
//     pending: {
//       color: "bg-amber-100 text-amber-800 border-amber-200",
//       icon: Clock,
//     },
//   };
//   const config =
//     statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
//   const Icon = config.icon;
//   return (
//     <Badge className={`${config.color} border gap-1 px-2 py-1`}>
//       <Icon className="h-3 w-3" />
//       {status.charAt(0).toUpperCase() + status.slice(1)}
//     </Badge>
//   );
// };

// Real candidate data is now fetched from project.candidateProjects
// Removed mock data - using real API data

// Match Score Badge Component
const MatchScoreBadge = ({ score }: { score: number }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 80) return "bg-blue-100 text-blue-800 border-blue-200";
    if (score >= 70) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  return (
    <Badge className={`${getScoreColor(score)} border gap-1 px-2 py-1`}>
      <BarChart3 className="h-3 w-3" />
      {score}%
    </Badge>
  );
};

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // Permissions
  const canManageProjects = useCan("manage:projects");
  const canReadProjects = useCan("read:projects");

  // RTK Query hooks
  const {
    data: projectData,
    isLoading,
    error,
  } = useGetProjectQuery(projectId!);
  const { data: eligibleCandidatesData } = useGetEligibleCandidatesQuery(
    projectId!
  );
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  // Local state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState("eligible");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Handle project deletion
  const handleDeleteProjectClick = () => {
    setShowDeleteConfirm(true);
  };

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

  const handleDeleteProjectCancel = () => {
    setShowDeleteConfirm(false);
  };

  // Handle candidate actions
  const handleUnassignCandidate = (_candidateId: string) => {
    toast.success("Candidate unassigned successfully");
    // TODO: Implement actual unassign logic
  };

  const handleAssignCandidate = (_candidateId: string) => {
    toast.success("Candidate assigned successfully");
    // TODO: Implement actual assign logic
  };

  const handleViewCandidate = (candidateId: string) => {
    navigate(`/candidates/${candidateId}`);
  };

  // Candidate data will be processed after project is loaded

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

  // Get real candidate data from project
  const nominatedCandidates = project?.candidateProjects || [];
  const eligibleCandidates = eligibleCandidatesData?.data || [];

  // Filter nominated candidates
  const filteredNominatedCandidates = nominatedCandidates.filter(
    (candidateProject) =>
      candidateProject.candidate?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      candidateProject.candidate?.email
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  // Filter eligible candidates
  const filteredEligibleCandidates = eligibleCandidates.filter(
    (candidate) =>
      candidate.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
              {project.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{project.status}</Badge>
              <span className="text-sm text-slate-500">
                Created {formatDate(project.createdAt)}
              </span>
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Compact Project Overview */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  Project Overview
                </CardTitle>
              </CardHeader>
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
                      {nominatedCandidates.length}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-600">Deadline:</span>
                    <span className="font-medium text-slate-800">
                      {formatDateTime(project.deadline)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-600">Created:</span>
                    <span className="font-medium text-slate-800">
                      {formatDate(project.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-600">Team:</span>
                    <span className="font-medium text-slate-800">
                      {project.team?.name || "Not assigned"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-600">Country:</span>
                    <div className="font-medium text-slate-800">
                      <ProjectCountryCell
                        countryCode={project.countryCode}
                        size="sm"
                        fallbackText="Not specified"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-600">Status:</span>
                    <Badge variant="outline" className="text-xs">
                      {project.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-600">Created By:</span>
                    <span className="font-medium text-slate-800">
                      {project.creator.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-600">Project Type:</span>
                    <Badge variant="outline" className="text-xs">
                      {project.projectType === "ministry"
                        ? "Ministry/Government"
                        : "Private Sector"}
                    </Badge>
                  </div>
                </div>

                {/* Description at the bottom */}
                {project.description && (
                  <p className="text-slate-600 text-sm leading-relaxed capitalize mt-4 pt-4 border-t border-slate-200">
                    {project.description}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Candidate Management Tabs - Full Width */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                  Candidate Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectDetailTabs projectId={projectId!} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Client Information */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
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
                <div className="text-xs text-slate-500">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-3 w-3" />
                    <span>San Francisco, CA</span>
                  </div>
                </div>
              </CardContent>
            </Card>

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

                    {/* Employment Type and Gender Requirement */}
                    <div className="flex items-center gap-4 text-xs text-slate-600 mb-2">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-slate-600">
                          Employment:
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {role.employmentType === "contract"
                            ? "Contract"
                            : "Permanent"}
                          {role.employmentType === "contract" &&
                            role.contractDurationYears &&
                            ` (${role.contractDurationYears} years)`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-slate-600">
                          Gender:
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {role.genderRequirement === "all"
                            ? "All"
                            : role.genderRequirement === "female"
                            ? "Female Only"
                            : "Male Only"}
                        </Badge>
                      </div>
                    </div>

                    {/* Skills */}
                    {role.skills && (
                      <div className="text-xs text-slate-500 mb-2">
                        <span className="font-medium text-slate-600">
                          Skills:
                        </span>{" "}
                        {typeof role.skills === "string"
                          ? role.skills
                          : Array.isArray(role.skills)
                          ? (role.skills as string[]).join(", ")
                          : "Not specified"}
                      </div>
                    )}

                    {/* Education Requirements */}
                    {role.educationRequirementsList &&
                      role.educationRequirementsList.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <div className="text-xs font-medium text-slate-600 mb-1">
                            Education Requirements:
                          </div>
                          <div className="text-xs text-slate-500">
                            {role.educationRequirementsList
                              .map((req) => req.qualification.name)
                              .join(", ")}
                          </div>
                        </div>
                      )}

                    {/* Required Certifications */}
                    {role.requiredCertifications && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <div className="text-xs font-medium text-slate-600 mb-1">
                          Required Certifications:
                        </div>
                        <div className="text-xs text-slate-500">
                          {typeof role.requiredCertifications === "string"
                            ? role.requiredCertifications
                            : Array.isArray(role.requiredCertifications)
                            ? (role.requiredCertifications as string[]).join(
                                ", "
                              )
                            : "Not specified"}
                        </div>
                      </div>
                    )}

                    {/* Additional Requirements */}
                    {role.additionalRequirements && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <div className="text-xs font-medium text-slate-600 mb-1">
                          Additional Requirements:
                        </div>
                        <div className="text-xs text-slate-500">
                          {role.additionalRequirements}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {role.notes && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <div className="text-xs font-medium text-slate-600 mb-1">
                          Notes:
                        </div>
                        <div className="text-xs text-slate-500">
                          {role.notes}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={handleDeleteProjectCancel}
        onConfirm={handleDeleteProjectConfirm}
        title={projectData?.data?.title || ""}
        itemType="project"
        isLoading={isDeleting}
      />
    </div>
  );
}
