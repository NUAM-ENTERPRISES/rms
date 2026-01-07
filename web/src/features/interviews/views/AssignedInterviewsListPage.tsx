import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ClipboardCheck,
  Search,
  Loader2,
  AlertCircle,
  User,
  Briefcase,
  Calendar,
  ChevronRight,
  X,
  CheckSquare,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetAssignedInterviewsQuery } from "../api";
import { useGetProjectsQuery, useGetProjectQuery } from "@/services/projectsApi";
import ScheduleInterviewDialog from "../components/ScheduleInterviewDialog";
import { cn } from "@/lib/utils";

export default function AssignedInterviewsListPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [filters, setFilters] = useState({ 
    search: "", 
    status: "all",
    projectId: "",
    roleNeededId: ""
  });
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDialogInitial, setScheduleDialogInitial] = useState<{
    candidateProjectMapId?: string;
    candidateProjectMapIds?: string[];
    candidateName?: string;
    projectName?: string;
  }>({});

  const { data, isLoading, error } = useGetAssignedInterviewsQuery({
    page: 1,
    limit: 15,
    search: filters.search || undefined,
    projectId: filters.projectId || undefined,
    roleNeededId: filters.roleNeededId || undefined,
  });

  const { data: projectsData } = useGetProjectsQuery({ 
    limit: 100, 
    status: "active" 
  });
  
  const { data: projectDetails } = useGetProjectQuery(filters.projectId || "", {
    skip: !filters.projectId,
  });

  const projects = projectsData?.data?.projects || [];
  const filteredProjects = useMemo(() => {
    if (!projectSearch) return projects;
    const term = projectSearch.toLowerCase();
    return projects.filter((p: any) => p.title?.toLowerCase().includes(term));
  }, [projects, projectSearch]);

  const roles = projectDetails?.data?.rolesNeeded || [];

  const items = data?.data?.items || [];
  const displayed = items;

  const pendingInterviews = useMemo(() => displayed.filter(it => !it.scheduledTime), [displayed]);

  const selected = useMemo(() => {
    if (selectedId) return displayed.find((i) => i.id === selectedId) || null;
    return displayed[0] || null;
  }, [displayed, selectedId]);

  useEffect(() => {
    const s = (location.state as any)?.selectedId;
    if (s) setSelectedId(s);
  }, [location.state]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load assigned interviews.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-950 dark:to-black">
      {/* Compact Colorful Header */}
      <div className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Assigned Interviews
                </h1>
                <p className="text-xs text-muted-foreground">Interviews awaiting scheduling or conduct</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-sm min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search candidates..."
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                className="pl-9 text-sm"
              />
            </div>

            <Select
              value={filters.projectId || "all_projects"}
              onValueChange={(val) => {
                setFilters(p => ({ ...p, projectId: val === "all_projects" ? "" : val, roleNeededId: "" }));
                setProjectSearch("");
              }}
            >
              <SelectTrigger className="w-[200px] text-sm h-10">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <SelectItem value="all_projects">All Projects</SelectItem>
                {filteredProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filters.projectId && (
              <Select
                value={filters.roleNeededId || "all_roles"}
                onValueChange={(val) => setFilters(p => ({ ...p, roleNeededId: val === "all_roles" ? "" : val }))}
              >
                <SelectTrigger className="w-[200px] text-sm h-10">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_roles">All Roles</SelectItem>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id!}>{r.designation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(filters.search || filters.projectId || filters.roleNeededId) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setFilters({ search: "", status: "all", projectId: "", roleNeededId: "" })}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}

            {selectedBulkIds.length > 0 && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md animate-in fade-in zoom-in duration-200"
                onClick={() => {
                  setScheduleDialogInitial({
                    candidateProjectMapIds: selectedBulkIds,
                    candidateName: `${selectedBulkIds.length} Candidates Selected`,
                    projectName: "Multiple Projects",
                  });
                  setScheduleDialogOpen(true);
                }}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Bulk Schedule Interviews ({selectedBulkIds.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Compact List Panel */}
        <div className="w-80 border-r bg-white/60 dark:bg-gray-900/60 flex flex-col">
          {displayed.length > 0 && (
            <div className="p-3 border-b flex items-center justify-between bg-white/40 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={
                    displayed.length > 0 &&
                    displayed.every((it) => selectedBulkIds.includes(it.id))
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedBulkIds(displayed.map((it) => it.id));
                    } else {
                      setSelectedBulkIds([]);
                    }
                  }}
                />
                <label
                  htmlFor="select-all"
                  className="text-xs font-medium cursor-pointer select-none"
                >
                  {selectedBulkIds.length > 0 ? `${selectedBulkIds.length} selected` : "Select All"}
                </label>
              </div>
              {selectedBulkIds.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-[10px] px-2"
                  onClick={() => setSelectedBulkIds([])}
                >
                  Clear
                </Button>
              )}
            </div>
          )}
          <ScrollArea className="flex-1">
            {displayed.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-40 text-indigo-400" />
                <p className="font-medium">No assigned interviews</p>
                <p className="text-xs mt-1">Assignments matching your filters will appear here</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {displayed.map((it) => {
                  const candidate = it.candidate;
                  const role = (it as any).roleNeeded;
                  const project = it.project;
                  const isSelected = it.id === selected?.id;
                  const isScheduled = !!it.scheduledTime;

                  return (
                    <div key={it.id} className="relative flex items-center gap-1 group">
                      <Checkbox
                        checked={selectedBulkIds.includes(it.id)}
                        onCheckedChange={(checked) => {
                          setSelectedBulkIds((prev) =>
                            checked ? [...prev, it.id] : prev.filter((id) => id !== it.id)
                          );
                        }}
                        className="ml-1 opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
                      />
                      <button
                        onClick={() => setSelectedId(it.id)}
                        className={cn(
                          "flex-1 text-left p-3 rounded-lg border transition-all",
                          isSelected
                            ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300 dark:from-indigo-900/30 dark:to-purple-900/30 dark:border-indigo-700"
                            : "bg-white dark:bg-gray-800 border-transparent hover:border-gray-300 dark:hover:border-gray-700"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-indigo-400 to-purple-500 text-white">
                              {candidate
                                ? `${candidate.firstName?.[0] || ""}${candidate.lastName?.[0] || ""}`.toUpperCase()
                                : "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown Candidate"}
                            </p>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 truncate">
                              {role?.designation || "Unknown Role"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {project?.title || "Unknown Project"}
                            </p>
                          </div>
                          <ChevronRight
                            className={cn("h-4 w-4 text-muted-foreground", isSelected && "text-indigo-600")}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge
                            className={cn(
                              "text-xs px-2 py-0.5 font-medium",
                              isScheduled
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                            )}
                          >
                            {isScheduled ? "Scheduled" : "Needs Scheduling"}
                          </Badge>
                          {it.scheduledTime && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(it.scheduledTime), "MMM d, yyyy")}
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Compact Detail Panel */}
        <div className="flex-1 overflow-hidden">
          {selected ? (
            <ScrollArea className="h-full">
              <div className="p-5 max-w-4xl mx-auto space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent">
                      Interview Details
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selected.scheduledTime
                        ? format(new Date(selected.scheduledTime), "MMMM d, yyyy • h:mm a")
                        : "Not scheduled yet"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      className={cn(
                        "px-3 py-1 text-sm font-medium shadow-sm",
                        selected.scheduledTime
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                      )}
                    >
                      {selected.scheduledTime ? "Scheduled" : "Pending"}
                    </Badge>

                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md"
                      onClick={() => {
                        const candidateName = selected.candidate
                          ? `${selected.candidate.firstName} ${selected.candidate.lastName}`
                          : "Unknown Candidate";
                        const projectName = selected.project?.title || "Unknown Project";
                        setScheduleDialogInitial({
                          candidateProjectMapId: selected.id,
                          candidateName,
                          projectName,
                        });
                        setScheduleDialogOpen(true);
                      }}
                    >
                      Schedule Interview
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50/70 to-purple-50/70 dark:from-indigo-900/20 dark:to-purple-900/20">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                            {selected.candidate
                              ? `${selected.candidate.firstName?.[0] || ""}${selected.candidate.lastName?.[0] || ""}`.toUpperCase()
                              : "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-2 text-sm">
                            <User className="h-4 w-4" />
                            Candidate
                          </h3>
                          <p className="font-medium text-sm mt-1">
                            {selected.candidate
                              ? `${selected.candidate.firstName} ${selected.candidate.lastName}`
                              : "Unknown"}
                          </p>
                          {selected.candidate?.email && (
                            <p className="text-xs text-muted-foreground mt-1 break-all">
                              {selected.candidate.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50/70 to-pink-50/70 dark:from-purple-900/20 dark:to-pink-900/20">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-2 text-sm mb-3">
                        <Briefcase className="h-4 w-4" />
                        Project & Role
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Project</p>
                          <p
                            className="font-medium text-purple-800 dark:text-purple-300 hover:underline cursor-pointer"
                            onClick={() => selected.project?.id && navigate(`/projects/${selected.project.id}`)}
                          >
                            {selected.project?.title || "Unknown"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Role</p>
                          <p className="font-medium">
                            {(selected as any).roleNeeded?.designation || "Unknown"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50/70 to-teal-50/70 dark:from-emerald-900/20 dark:to-teal-900/20">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm mb-3">
                      Assignment Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <p className="font-medium capitalize text-emerald-800 dark:text-emerald-300">
                          {(selected as any).subStatus?.label ||
                            (selected as any).subStatus?.name ||
                            (selected.scheduledTime ? "Scheduled" : "Pending")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Scheduled Time</p>
                        <p className="font-medium text-emerald-800 dark:text-emerald-300">
                          {selected.scheduledTime
                            ? format(new Date(selected.scheduledTime), "MMM d, yyyy • h:mm a")
                            : "Not scheduled"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30 text-indigo-500" />
                <p className="font-medium">No interview selected</p>
                <p className="text-sm">Select from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ScheduleInterviewDialog
        open={scheduleDialogOpen}
        onOpenChange={(open) => {
          setScheduleDialogOpen(open);
          if (!open) setSelectedBulkIds([]);
        }}
        initialCandidateProjectMapId={scheduleDialogInitial.candidateProjectMapId}
        initialCandidateProjectMapIds={scheduleDialogInitial.candidateProjectMapIds}
        initialCandidateName={scheduleDialogInitial.candidateName}
        initialProjectName={scheduleDialogInitial.projectName}
      />
    </div>
  );
}