import { useState } from "react";
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
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Video,
  PhoneCall,
  Building2,
} from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { useGetInterviewsQuery, useDeleteInterviewMutation } from "../api";
import ScheduleInterviewDialog from "../components/ScheduleInterviewDialog";
import EditInterviewDialog from "../components/EditInterviewDialog";

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

// Mode icon component
const ModeIcon = ({ mode }: { mode: string }) => {
  switch (mode?.toLowerCase()) {
    case "online":
      return <Video className="h-4 w-4 text-blue-600" />;
    case "phone":
      return <PhoneCall className="h-4 w-4 text-green-600" />;
    case "in-person":
      return <Building2 className="h-4 w-4 text-purple-600" />;
    default:
      return <Calendar className="h-4 w-4 text-gray-600" />;
  }
};

export default function InterviewsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string>("");

  // API calls
  const {
    data: interviewsData,
    isLoading,
    error,
    refetch,
  } = useGetInterviewsQuery({
    search: searchTerm || undefined,
    type: typeFilter === "all" ? undefined : typeFilter,
    mode: modeFilter === "all" ? undefined : modeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    page: 1,
    limit: 50,
  });

  const [deleteInterview] = useDeleteInterviewMutation();

  const interviews = interviewsData?.data?.interviews || [];
  const totalInterviews = interviewsData?.data?.pagination?.total || 0;

  const canScheduleInterviews = useCan("schedule:interviews");
  const canWriteInterviews = useCan("write:interviews");

  const handleDeleteInterview = async (id: string) => {
    if (window.confirm("Are you sure you want to cancel this interview?")) {
      try {
        await deleteInterview(id).unwrap();
        refetch();
      } catch (error) {
        console.error("Failed to delete interview:", error);
      }
    }
  };

  const handleEditInterview = (id: string) => {
    setSelectedInterviewId(id);
    setEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-slate-600">
                Loading interviews...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600">Failed to load interviews</p>
              <Button onClick={() => refetch()} className="mt-2">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Interviews</h1>
            <p className="text-sm text-slate-600">
              {totalInterviews} interviews • Manage and schedule candidate
              interviews
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="text-slate-600 hover:text-slate-900"
            >
              <Clock className="h-4 w-4" />
            </Button>
            {canScheduleInterviews && (
              <Button
                onClick={() => setScheduleDialogOpen(true)}
                className="h-11 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule Interview
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Search by project title or candidate name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="managerial">Managerial</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={modeFilter} onValueChange={setModeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="in-person">In-Person</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="no-show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interviews Table */}
        <Card>
          <CardHeader>
            <CardTitle>Interview Schedule</CardTitle>
            <CardDescription>
              Manage and track all scheduled interviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            {interviews.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No interviews found
                </h3>
                <p className="text-slate-600 mb-4">
                  {searchTerm ||
                  typeFilter !== "all" ||
                  modeFilter !== "all" ||
                  statusFilter !== "all"
                    ? "Try adjusting your filters to see more results."
                    : "Get started by scheduling your first interview."}
                </p>
                {canScheduleInterviews && (
                  <Button
                    onClick={() => setScheduleDialogOpen(true)}
                    className="h-11 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Interview
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold text-slate-700">
                        Project
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Date & Time
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Mode
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interviews.map((interview) => (
                      <TableRow key={interview.id}>
                        <TableCell>
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded-md transition-colors"
                            onClick={() => {
                              const projectId =
                                interview.candidateProjectMap?.project?.id ||
                                interview.project?.id;
                              if (projectId) {
                                navigate(`/projects/${projectId}`);
                              }
                            }}
                          >
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <div>
                              <div className="font-medium text-slate-900 hover:text-blue-600 transition-colors">
                                {interview.candidateProjectMap?.project
                                  ?.title ||
                                  interview.project?.title ||
                                  "Unknown Project"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <div>
                              <div className="font-medium text-slate-900">
                                {formatDate(interview.scheduledTime)}
                              </div>
                              <div className="text-sm text-slate-600">
                                {formatTime(interview.scheduledTime)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ModeIcon mode={interview.mode} />
                            <span className="text-sm text-slate-600 capitalize">
                              {interview.mode}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {canWriteInterviews && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleEditInterview(interview.id)
                                    }
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Interview
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDeleteInterview(interview.id)
                                    }
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Cancel Interview
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination Info */}
        {interviews.length > 0 && (
          <div className="text-center text-sm text-slate-600">
            Showing {interviews.length} of {totalInterviews} interviews
          </div>
        )}

        {/* Schedule Interview Dialog */}
        <ScheduleInterviewDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
        />

        {/* Edit Interview Dialog */}
        <EditInterviewDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          interviewId={selectedInterviewId}
        />
      </div>
    </div>
  );
}
