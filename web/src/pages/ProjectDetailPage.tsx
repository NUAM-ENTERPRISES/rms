import React, { useState, useEffect } from "react";
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

import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Building2,
  Users,
  Target,
  Clock,
  DollarSign,
  GraduationCap,
  Shield,
  FileText,
  AlertCircle,
  CheckCircle,
  Star,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import {
  useGetProjectQuery,
  useDeleteProjectMutation,
} from "@/services/projectsApi";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";

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
const PriorityBadge = ({ priority }: { priority: string }) => {
  const priorityConfig = {
    low: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle,
    },
    medium: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: AlertTriangle,
    },
    high: {
      color: "bg-orange-100 text-orange-800 border-orange-200",
      icon: AlertCircle,
    },
    urgent: {
      color: "bg-red-100 text-red-800 border-red-200",
      icon: AlertTriangle,
    },
  };

  const config =
    priorityConfig[priority as keyof typeof priorityConfig] ||
    priorityConfig.medium;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} border gap-1 px-2 py-1`}>
      <Icon className="h-3 w-3" />
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    active: {
      color: "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: CheckCircle,
    },
    completed: {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: CheckCircle,
    },
    cancelled: { color: "bg-red-100 text-red-800 border-red-200", icon: X },
    pending: {
      color: "bg-amber-100 text-amber-800 border-amber-200",
      icon: Clock,
    },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} border gap-1 px-2 py-1`}>
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
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
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  // Local state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Handle project deletion
  const handleDeleteProject = async () => {
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Overview */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  Project Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.description && (
                  <div>
                    <h4 className="font-medium text-slate-700 mb-2">
                      Description
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      {project.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Deadline</p>
                      <p className="font-medium text-slate-700">
                        {formatDateTime(project.deadline)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Created</p>
                      <p className="font-medium text-slate-700">
                        {formatDate(project.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Assigned Team</p>
                      <p className="font-medium text-slate-700">
                        {project.team?.name || "Not assigned"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <UserCheck className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Total Positions</p>
                      <p className="font-medium text-slate-700">
                        {project.rolesNeeded.reduce(
                          (sum, role) => sum + role.quantity,
                          0
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Roles Required */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Roles Required
                </CardTitle>
                <CardDescription>
                  {project.rolesNeeded.length} role
                  {project.rolesNeeded.length !== 1 ? "s" : ""} defined
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.rolesNeeded.map((role, index) => (
                  <div
                    key={role.id}
                    className="border border-slate-200 rounded-lg p-4 bg-slate-50/50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-lg font-semibold text-slate-800">
                          {role.designation}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="gap-1">
                            <Users className="h-3 w-3" />
                            {role.quantity} position
                            {role.quantity !== 1 ? "s" : ""}
                          </Badge>
                          <PriorityBadge priority={role.priority} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {role.minExperience !== undefined &&
                        role.maxExperience !== undefined && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-600">
                              {role.minExperience}-{role.maxExperience} years
                              experience
                            </span>
                          </div>
                        )}

                      {role.shiftType && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600 capitalize">
                            {role.shiftType} shift
                          </span>
                        </div>
                      )}

                      {role.skills && (
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            Skills: {role.skills}
                          </span>
                        </div>
                      )}

                      {role.technicalSkills && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            Technical: {role.technicalSkills}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Requirements */}
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="flex flex-wrap gap-2">
                        {role.backgroundCheckRequired && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Shield className="h-3 w-3" />
                            Background Check
                          </Badge>
                        )}
                        {role.drugScreeningRequired && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Shield className="h-3 w-3" />
                            Drug Screening
                          </Badge>
                        )}
                        {role.onCallRequired && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            On-Call
                          </Badge>
                        )}
                      </div>

                      {role.notes && (
                        <p className="text-sm text-slate-600 mt-2 italic">
                          "{role.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Candidates Assigned */}
            {project.candidateProjects &&
              project.candidateProjects.length > 0 && (
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-emerald-600" />
                      Assigned Candidates
                    </CardTitle>
                    <CardDescription>
                      {project.candidateProjects.length} candidate
                      {project.candidateProjects.length !== 1 ? "s" : ""}{" "}
                      assigned
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {project.candidateProjects.map((candidateProject) => (
                        <div
                          key={candidateProject.id}
                          className="flex items-center justify-between p-3 border border-slate-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {candidateProject.candidate.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">
                                {candidateProject.candidate.name}
                              </p>
                              <p className="text-sm text-slate-600">
                                {candidateProject.candidate.currentStatus}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {candidateProject.status}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              Assigned {formatDate(candidateProject.assignedAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Information */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Client Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-800">
                    {project.client.name}
                  </h4>
                  <Badge variant="outline" className="mt-1">
                    {project.client.type}
                  </Badge>
                </div>

                <div className="h-px bg-slate-200 my-4" />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4" />
                    <span>Location information</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4" />
                    <span>Contact number</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4" />
                    <span>Email address</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Statistics */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Project Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {project.rolesNeeded.length}
                    </div>
                    <div className="text-sm text-blue-600">Roles</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {project.rolesNeeded.reduce(
                        (sum, role) => sum + role.quantity,
                        0
                      )}
                    </div>
                    <div className="text-sm text-purple-600">Positions</div>
                  </div>
                </div>

                <div className="h-px bg-slate-200 my-4" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Days Remaining</span>
                    <span className="font-medium text-slate-800">
                      {Math.ceil(
                        (new Date(project.deadline).getTime() -
                          new Date().getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Created By</span>
                    <span className="font-medium text-slate-800">
                      {project.creator.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Last Updated</span>
                    <span className="font-medium text-slate-800">
                      {formatDate(project.updatedAt)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {canManageProjects && (
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => navigate(`/projects/${project.id}/edit`)}
                  >
                    <Edit className="h-4 w-4" />
                    Edit Project
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() =>
                      navigate(`/candidates?projectId=${project.id}`)
                    }
                  >
                    <UserCheck className="h-4 w-4" />
                    Assign Candidates
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96 border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Confirm Deletion
              </CardTitle>
              <CardDescription>
                Are you sure you want to delete this project? This action cannot
                be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  {isDeleting ? "Deleting..." : "Delete Project"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
