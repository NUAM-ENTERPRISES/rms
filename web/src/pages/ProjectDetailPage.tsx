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
  Plus,
  Minus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  UserPlus,
  UserMinus,
  BarChart3,
} from "lucide-react";
import {
  useGetProjectQuery,
  useDeleteProjectMutation,
} from "@/services/projectsApi";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";
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
  DropdownMenuLabel,
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

// Mock data for candidates
const mockAssignedCandidates = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1 (555) 123-4567",
    currentRole: "ICU Nurse",
    experience: 5,
    skills: ["Nursing", "ICU", "Emergency Care"],
    matchScore: 95,
    assignedDate: "2024-11-20T10:00:00Z",
    status: "active",
    assignedRole: "ICU Specialist",
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "michael.chen@email.com",
    phone: "+1 (555) 234-5678",
    currentRole: "Pediatric Nurse",
    experience: 3,
    skills: ["Nursing", "Pediatrics", "Patient Care"],
    matchScore: 88,
    assignedDate: "2024-11-22T14:00:00Z",
    status: "active",
    assignedRole: "Pediatric Nurse",
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily.rodriguez@email.com",
    phone: "+1 (555) 345-6789",
    currentRole: "Emergency Nurse",
    experience: 4,
    skills: ["Nursing", "Emergency Care", "Trauma"],
    matchScore: 92,
    assignedDate: "2024-11-25T09:00:00Z",
    status: "active",
    assignedRole: "Emergency Department Nurse",
  },
];

const mockAvailableCandidates = [
  {
    id: "4",
    name: "David Kim",
    email: "david.kim@email.com",
    phone: "+1 (555) 456-7890",
    currentRole: "ICU Specialist",
    experience: 6,
    skills: ["Nursing", "ICU", "Critical Care"],
    matchScore: 78,
    availability: "immediate",
    location: "San Francisco, CA",
  },
  {
    id: "5",
    name: "Lisa Thompson",
    email: "lisa.thompson@email.com",
    phone: "+1 (555) 567-8901",
    currentRole: "Emergency Department Nurse",
    experience: 4,
    skills: ["Nursing", "Emergency Care", "Patient Assessment"],
    matchScore: 72,
    availability: "2_weeks",
    location: "Oakland, CA",
  },
  {
    id: "6",
    name: "James Wilson",
    email: "james.wilson@email.com",
    phone: "+1 (555) 678-9012",
    currentRole: "Pediatric Nurse",
    experience: 2,
    skills: ["Nursing", "Pediatrics", "Child Care"],
    matchScore: 65,
    availability: "1_month",
    location: "San Jose, CA",
  },
  {
    id: "7",
    name: "Maria Garcia",
    email: "maria.garcia@email.com",
    phone: "+1 (555) 789-0123",
    currentRole: "ICU Nurse",
    experience: 7,
    skills: ["Nursing", "ICU", "Ventilator Management"],
    matchScore: 85,
    availability: "immediate",
    location: "San Francisco, CA",
  },
];

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
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  // Local state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState("assigned");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  // Handle candidate actions
  const handleUnassignCandidate = (candidateId: string) => {
    toast.success("Candidate unassigned successfully");
    // TODO: Implement actual unassign logic
  };

  const handleAssignCandidate = (candidateId: string) => {
    toast.success("Candidate assigned successfully");
    // TODO: Implement actual assign logic
  };

  const handleViewCandidate = (candidateId: string) => {
    navigate(`/candidates/${candidateId}`);
  };

  // Filter candidates
  const filteredAssignedCandidates = mockAssignedCandidates.filter(
    (candidate) =>
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAvailableCandidates = mockAvailableCandidates.filter(
    (candidate) =>
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Compact Project Overview */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  Project Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.description && (
                  <p className="text-slate-600 text-sm leading-relaxed capitalize">
                    {project.description}
                  </p>
                )}

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
                      {mockAssignedCandidates.length}
                    </div>
                    <div className="text-xs text-slate-600">Assigned</div>
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
                    <UserCheck className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-600">Status:</span>
                    <Badge variant="outline" className="text-xs">
                      {project.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Candidate Management Tabs */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                  Candidate Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                      value="assigned"
                      className="flex items-center gap-2"
                    >
                      <UserCheck className="h-4 w-4" />
                      Assigned Candidates
                      <Badge variant="secondary" className="ml-1">
                        {mockAssignedCandidates.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                      value="available"
                      className="flex items-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Available Candidates
                      <Badge variant="secondary" className="ml-1">
                        {mockAvailableCandidates.length}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="assigned" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              placeholder="Search candidates..."
                              className="pl-10 w-64"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>
                          <Select
                            value={statusFilter}
                            onValueChange={setStatusFilter}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="text-sm text-slate-600">
                          {filteredAssignedCandidates.length} candidate
                          {filteredAssignedCandidates.length !== 1
                            ? "s"
                            : ""}{" "}
                          assigned
                        </div>
                      </div>

                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Candidate</TableHead>
                              <TableHead>Assigned Role</TableHead>
                              <TableHead>Match Score</TableHead>
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredAssignedCandidates.map((candidate) => (
                              <TableRow key={candidate.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                      {candidate.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-medium text-slate-900">
                                        {candidate.name}
                                      </div>
                                      <div className="text-sm text-slate-500">
                                        {candidate.email}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium text-slate-900">
                                    {candidate.assignedRole}
                                  </div>
                                  <div className="text-sm text-slate-500">
                                    {candidate.currentRole}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <MatchScoreBadge
                                    score={candidate.matchScore}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleViewCandidate(candidate.id)
                                        }
                                      >
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleUnassignCandidate(candidate.id)
                                        }
                                        className="text-red-600"
                                      >
                                        <UserMinus className="mr-2 h-4 w-4" />
                                        Unassign
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="available" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              placeholder="Search candidates..."
                              className="pl-10 w-64"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="text-sm text-slate-600">
                          {filteredAvailableCandidates.length} candidate
                          {filteredAvailableCandidates.length !== 1
                            ? "s"
                            : ""}{" "}
                          available
                        </div>
                      </div>

                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Candidate</TableHead>
                              <TableHead>Current Role</TableHead>
                              <TableHead>Experience</TableHead>
                              <TableHead>Match Score</TableHead>
                              <TableHead>Availability</TableHead>
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredAvailableCandidates.map((candidate) => (
                              <TableRow key={candidate.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                      {candidate.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-medium text-slate-900">
                                        {candidate.name}
                                      </div>
                                      <div className="text-sm text-slate-500">
                                        {candidate.email}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium text-slate-900">
                                    {candidate.currentRole}
                                  </div>
                                  <div className="text-sm text-slate-500">
                                    {candidate.location}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm text-slate-600">
                                    {candidate.experience} years
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <MatchScoreBadge
                                    score={candidate.matchScore}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className="text-xs capitalize"
                                  >
                                    {candidate.availability.replace("_", " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleViewCandidate(candidate.id)
                                        }
                                      >
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleAssignCandidate(candidate.id)
                                        }
                                        className="text-green-600"
                                      >
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Assign to Project
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
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
                    {project.client.name}
                  </h4>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {project.client.type}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-3 w-3" />
                    <span>San Francisco, CA</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="h-3 w-3" />
                    <span>+1 (555) 123-4567</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    <span>contact@client.com</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Roles Required */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-600" />
                  Roles Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.rolesNeeded.slice(0, 3).map((role) => (
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
                    <div className="text-xs text-slate-600">
                      {role.minExperience}-{role.maxExperience} years •{" "}
                      {role.shiftType} shift
                    </div>
                    {role.skills && (
                      <div className="text-xs text-slate-500 mt-1">
                        Skills: {role.skills}
                      </div>
                    )}
                  </div>
                ))}
                {project.rolesNeeded.length > 3 && (
                  <div className="text-center">
                    <Button variant="ghost" size="sm" className="text-xs">
                      View {project.rolesNeeded.length - 3} more roles
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Info */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Info className="h-4 w-4 text-green-600" />
                  Project Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Deadline</span>
                  <span className="font-medium text-slate-800">
                    {formatDate(project.deadline)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Created By</span>
                  <span className="font-medium text-slate-800">
                    {project.creator.name}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Team</span>
                  <span className="font-medium text-slate-800">
                    {project.team?.name || "Not assigned"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Last Updated</span>
                  <span className="font-medium text-slate-800">
                    {formatDate(project.updatedAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
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
