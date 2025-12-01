import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar,
  Video,
  PhoneCall,
  Building2,
  RefreshCw,
} from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { useGetInterviewsQuery, useDeleteInterviewMutation } from "../api";
import ScheduleInterviewDialog from "../components/ScheduleInterviewDialog";
import EditInterviewDialog from "../components/EditInterviewDialog";

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (dateString?: string) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ModeIcon = ({ mode }: { mode: string }) => {
  switch (mode?.toLowerCase()) {
    case "online":   return <Video className="h-4 w-4 text-blue-600" />;
    case "phone":    return <PhoneCall className="h-4 w-4 text-emerald-600" />;
    case "in-person":return <Building2 className="h-4 w-4 text-violet-600" />;
    default:         return <Calendar className="h-4 w-4 text-slate-500" />;
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
      await deleteInterview(id).unwrap();
      refetch();
    }
  };

  const handleEditInterview = (id: string) => {
    setSelectedInterviewId(id);
    setEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-blue-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-600">Loading interviews...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-sm border-0 shadow-lg">
          <CardContent className="pt-8 text-center space-y-4">
            <RefreshCw className="h-10 w-10 text-red-600 mx-auto" />
            <p className="text-lg font-medium text-gray-900">Failed to load</p>
            <Button onClick={() => refetch()} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-10 w-10 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Interviews</h1>
              <p className="text-sm text-gray-600">{totalInterviews} total</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
            </Button>
            {canScheduleInterviews && (
              <Button size="sm" onClick={() => setScheduleDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Schedule
              </Button>
            )}
          </div>
        </div>

        {/* Compact Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search project or candidate..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32 h-9 text-sm">
                    <SelectValue />
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
                  <SelectTrigger className="w-28 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="in-person">In-Person</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compact Table */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 px-6 pt-5">
            <CardTitle className="text-lg">Interview Schedule</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {interviews.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">
                  {searchTerm || typeFilter !== "all" || modeFilter !== "all" || statusFilter !== "all"
                    ? "No interviews match your filters"
                    : "No interviews scheduled yet"}
                </p>
                {canScheduleInterviews && (
                  <Button size="sm" className="mt-4" onClick={() => setScheduleDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Schedule Interview
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="h-10 text-xs font-medium text-gray-700">Project / Candidate</TableHead>
                      <TableHead className="h-10 text-xs font-medium text-gray-700">Date & Time</TableHead>
                      <TableHead className="h-10 text-xs font-medium text-gray-700">Mode</TableHead>
                      <TableHead className="h-10 w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interviews.map((interview) => (
                      <TableRow
                        key={interview.id}
                        className="h-14 hover:bg-gray-50/70 cursor-pointer"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("button")) return;
                          const projectId = interview.candidateProjectMap?.project?.id || interview.project?.id;
                          if (projectId) navigate(`/projects/${projectId}`);
                        }}
                      >
                        <TableCell className="py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-sm text-gray-900">
                                {interview.candidateProjectMap?.project?.title || interview.project?.title || "Unknown"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {interview.candidateProjectMap?.candidate?.name || "Candidate"}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium">{formatDate(interview.scheduledTime)}</div>
                              <div className="text-xs text-gray-500">{formatTime(interview.scheduledTime)}</div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <ModeIcon mode={interview.mode} />
                            <span className="text-sm capitalize">{interview.mode || "—"}</span>
                          </div>
                        </TableCell>

                        <TableCell className="py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {canWriteInterviews && (
                                <>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditInterview(interview.id); }}>
                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); handleDeleteInterview(interview.id); }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Cancel
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

        {/* Compact Footer */}
        {interviews.length > 0 && (
          <div className="text-center text-xs text-gray-600">
            Showing {interviews.length} of {totalInterviews} interviews
          </div>
        )}

        <ScheduleInterviewDialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen} />
        <EditInterviewDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} interviewId={selectedInterviewId} />
      </div>
    </div>
  );
}