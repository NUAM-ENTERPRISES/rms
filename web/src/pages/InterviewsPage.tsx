import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  Download,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock3,
  Video,
  PhoneCall,
  Users,
  FileText,
} from "lucide-react";
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

// Helper function to format time
const formatTime = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
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

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    scheduled: {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: Clock,
    },
    completed: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle,
    },
    cancelled: {
      color: "bg-red-100 text-red-800 border-red-200",
      icon: XCircle,
    },
    rescheduled: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: AlertCircle,
    },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} border gap-1 px-2 py-1`}>
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

// Type badge component
const TypeBadge = ({ type }: { type: string }) => {
  const typeConfig = {
    phone: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: PhoneCall,
      label: "Phone",
    },
    video: {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: Video,
      label: "Video",
    },
    onsite: {
      color: "bg-purple-100 text-purple-800 border-purple-200",
      icon: MapPin,
      label: "On-site",
    },
  };

  const config =
    typeConfig[type as keyof typeof typeConfig] || typeConfig.phone;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} border gap-1 px-2 py-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// Mock data for demonstration
const mockInterviews = [
  {
    id: "1",
    candidate: {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      phone: "+1 (555) 123-4567",
      currentRole: "ICU Nurse",
    },
    project: {
      id: "1",
      title: "Emergency Department Nurses",
      client: "St. Mary's Medical Center",
    },
    scheduledDate: "2024-12-15T10:00:00Z",
    duration: 60,
    type: "video",
    status: "scheduled",
    interviewer: "Dr. Sarah Williams",
    location: "Zoom Meeting",
    notes: "Technical interview focusing on emergency care procedures",
    createdAt: "2024-12-01T14:30:00Z",
  },
  {
    id: "2",
    candidate: {
      id: "2",
      name: "Michael Chen",
      email: "michael.chen@email.com",
      phone: "+1 (555) 234-5678",
      currentRole: "Pediatric Nurse",
    },
    project: {
      id: "2",
      title: "ICU Specialists",
      client: "St. Mary's Medical Center",
    },
    scheduledDate: "2024-12-16T14:00:00Z",
    duration: 45,
    type: "phone",
    status: "scheduled",
    interviewer: "Jane Smith",
    location: "Phone Call",
    notes: "Initial screening interview",
    createdAt: "2024-12-02T09:15:00Z",
  },
  {
    id: "3",
    candidate: {
      id: "3",
      name: "Emily Rodriguez",
      email: "emily.rodriguez@email.com",
      phone: "+1 (555) 345-6789",
      currentRole: "Emergency Nurse",
    },
    project: {
      id: "3",
      title: "Pediatric Nurses",
      client: "Children's Hospital",
    },
    scheduledDate: "2024-12-14T16:00:00Z",
    duration: 90,
    type: "onsite",
    status: "scheduled",
    interviewer: "Dr. Robert Johnson",
    location: "Children's Hospital - Main Campus",
    notes: "On-site interview with practical assessment",
    createdAt: "2024-12-01T11:45:00Z",
  },
  {
    id: "4",
    candidate: {
      id: "4",
      name: "David Kim",
      email: "david.kim@email.com",
      phone: "+1 (555) 456-7890",
      currentRole: "ICU Specialist",
    },
    project: {
      id: "2",
      title: "ICU Specialists",
      client: "St. Mary's Medical Center",
    },
    scheduledDate: "2024-12-13T11:00:00Z",
    duration: 60,
    type: "video",
    status: "completed",
    interviewer: "Dr. Sarah Williams",
    location: "Microsoft Teams",
    notes: "Technical interview completed successfully",
    createdAt: "2024-11-30T16:20:00Z",
  },
  {
    id: "5",
    candidate: {
      id: "5",
      name: "Lisa Thompson",
      email: "lisa.thompson@email.com",
      phone: "+1 (555) 567-8901",
      currentRole: "Emergency Department Nurse",
    },
    project: {
      id: "1",
      title: "Emergency Department Nurses",
      client: "St. Mary's Medical Center",
    },
    scheduledDate: "2024-12-12T13:00:00Z",
    duration: 45,
    type: "phone",
    status: "cancelled",
    interviewer: "Jane Smith",
    location: "Phone Call",
    notes: "Candidate requested reschedule due to emergency",
    createdAt: "2024-12-01T10:30:00Z",
  },
];

export default function InterviewsPage() {
  const navigate = useNavigate();
  const canReadInterviews = useCan("read:interviews");
  const canWriteInterviews = useCan("write:interviews");
  const canManageInterviews = useCan("manage:interviews");

  // State for filters and pagination
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    type: "all",
    project: "all",
    page: 1,
    limit: 20,
  });

  // Handle search
  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value, page: 1 }));
  };

  // Handle status filter
  const handleStatusFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, status: value, page: 1 }));
  };

  // Handle type filter
  const handleTypeFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, type: value, page: 1 }));
  };

  // Handle project filter
  const handleProjectFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, project: value, page: 1 }));
  };

  // Filter interviews based on search and filters
  const filteredInterviews = useMemo(() => {
    return mockInterviews.filter((interview) => {
      const matchesSearch =
        !filters.search ||
        interview.candidate.name
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        interview.candidate.email
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        interview.project.title
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        interview.project.client
          .toLowerCase()
          .includes(filters.search.toLowerCase());

      const matchesStatus =
        filters.status === "all" || interview.status === filters.status;
      const matchesType =
        filters.type === "all" || interview.type === filters.type;
      const matchesProject =
        filters.project === "all" || interview.project.id === filters.project;

      return matchesSearch && matchesStatus && matchesType && matchesProject;
    });
  }, [filters]);

  // Get unique projects for filter
  const uniqueProjects = useMemo(() => {
    const projects = mockInterviews.map((interview) => ({
      id: interview.project.id,
      title: interview.project.title,
      client: interview.project.client,
    }));
    return Array.from(new Map(projects.map((p) => [p.id, p])).values());
  }, []);

  // Get upcoming interviews (scheduled for today or future)
  const upcomingInterviews = useMemo(() => {
    const now = new Date();
    return filteredInterviews.filter((interview) => {
      const interviewDate = new Date(interview.scheduledDate);
      return interviewDate >= now && interview.status === "scheduled";
    });
  }, [filteredInterviews]);

  // Get today's interviews
  const todaysInterviews = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return filteredInterviews.filter((interview) => {
      const interviewDate = new Date(interview.scheduledDate);
      return (
        interviewDate >= today &&
        interviewDate < tomorrow &&
        interview.status === "scheduled"
      );
    });
  }, [filteredInterviews]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Interviews</h1>
          <p className="text-slate-600 mt-2">
            Manage and track all scheduled interviews
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canWriteInterviews && (
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
              <Plus className="mr-2 h-4 w-4" />
              Schedule Interview
            </Button>
          )}
          <Button variant="outline" className="border-slate-200">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Interviews
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {filteredInterviews.length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">
                  {upcomingInterviews.length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Today</p>
                <p className="text-2xl font-bold text-orange-600">
                  {todaysInterviews.length}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock3 className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {
                    filteredInterviews.filter((i) => i.status === "completed")
                      .length
                  }
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search interviews by candidate, project, or client..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 border-slate-200"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Select value={filters.status} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-40 border-slate-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.type} onValueChange={handleTypeFilter}>
                <SelectTrigger className="w-40 border-slate-200">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.project}
                onValueChange={handleProjectFilter}
              >
                <SelectTrigger className="w-48 border-slate-200">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {uniqueProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title} - {project.client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interviews Table */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Interviews
          </CardTitle>
          <CardDescription>
            {filteredInterviews.length} interview
            {filteredInterviews.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200">
                  <TableHead>Candidate</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Interviewer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInterviews.map((interview) => (
                  <TableRow
                    key={interview.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold">
                          {interview.candidate.name.charAt(0)}
                        </div>
                        <div>
                          <div
                            className="font-medium text-slate-900 hover:text-blue-600 cursor-pointer transition-colors"
                            onClick={() =>
                              navigate(`/candidates/${interview.candidate.id}`)
                            }
                          >
                            {interview.candidate.name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {interview.candidate.currentRole}
                          </div>
                          <div className="text-xs text-slate-400">
                            {interview.candidate.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-900">
                          {interview.project.title}
                        </div>
                        <div className="text-sm text-slate-500">
                          {interview.project.client}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-slate-900">
                          {formatDate(interview.scheduledDate)}
                        </div>
                        <div className="text-sm text-slate-500">
                          {formatTime(interview.scheduledDate)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {interview.duration} min
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={interview.type} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {interview.interviewer}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {interview.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={interview.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {canWriteInterviews && (
                            <>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="mr-2 h-4 w-4" />
                                Add Notes
                              </DropdownMenuItem>
                            </>
                          )}
                          {canManageInterviews && (
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Empty State */}
          {filteredInterviews.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                No interviews found
              </h3>
              <p className="text-slate-500 mb-6">
                {filters.search ||
                filters.status !== "all" ||
                filters.type !== "all" ||
                filters.project !== "all"
                  ? "Try adjusting your search criteria or filters."
                  : "Get started by scheduling your first interview."}
              </p>
              {!filters.search &&
                filters.status === "all" &&
                filters.type === "all" &&
                filters.project === "all" &&
                canWriteInterviews && (
                  <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule Your First Interview
                  </Button>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Count - Bottom */}
      {filteredInterviews.length > 0 && (
        <div className="flex items-center justify-center pt-6 border-t border-slate-200">
          <p className="text-slate-600">
            Showing {filteredInterviews.length} of {mockInterviews.length}{" "}
            interviews
          </p>
        </div>
      )}
    </div>
  );
}
