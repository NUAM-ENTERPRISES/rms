import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { useAppSelector } from "@/app/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ClipboardCheck, 
  Loader2, 
  AlertCircle, 
  User, 
  Briefcase, 
  Calendar, 
  ChevronRight, 
  X, 
  Search,
  Edit3,
  CheckCircle2
} from "lucide-react";
import { useGetInterviewsQuery, useUpdateInterviewStatusMutation } from "../api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReviewInterviewModal from "@/components/molecules/ReviewInterviewModal";
import InterviewHistory from "@/components/molecules/InterviewHistory";
import EditInterviewDialog from "../components/EditInterviewDialog";
import { useGetInterviewHistoryQuery } from "../api";
import { toast } from "sonner";

const getOutcomeBadgeClass = (outcome?: string) => {
  switch (outcome?.toLowerCase()) {
    case "passed":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300";
    case "failed":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    case "completed":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
};

export default function MyInterviewsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAppSelector((s) => s.auth.user);
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({ search: "", status: "all" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [updateInterviewStatus] = useUpdateInterviewStatusMutation();

  useEffect(() => {
    const s = (location.state as any)?.selectedId;
    if (s) setSelectedId(s);
  }, [location.state]);

  useEffect(() => {
    const allowed = new Set(["all", "completed", "passed", "failed"]);
    let s = searchParams.get("status") || "all";
    if (!allowed.has(s)) {
      const np = new URLSearchParams(searchParams);
      np.delete("status");
      setSearchParams(np, { replace: true });
      s = "all";
    }
    setFilters((p) => ({ ...p, status: s }));
  }, [searchParams]);

  const rawParams = {
    type: searchParams.get("type") || undefined,
    mode: searchParams.get("mode") || undefined,
    status: searchParams.get("status") || undefined,
    page: 1,
    limit: 50,
  } as any;

  const { data, isLoading, error } = useGetInterviewsQuery(
    Object.keys(rawParams).length ? rawParams : undefined
  );

  const interviews = (data?.data?.interviews ?? []) as any[];

  const myInterviews = useMemo(() => {
    if (!currentUser) return interviews;
    return interviews.filter((i) => {
      const interviewerId = i.interviewer;
      const interviewerEmail = i.interviewerEmail || i.interviewer?.email;
      const candidateId = i.candidateProjectMap?.candidate?.id || i.candidate?.id;
      
      const isInterviewer =
        (currentUser.id && interviewerId === currentUser.id) ||
        (currentUser.email && interviewerEmail === currentUser.email);
      const isCandidate = currentUser.id && candidateId === currentUser.id;
      
      return isInterviewer || isCandidate;
    });
  }, [interviews, currentUser]);

  const displayedList = myInterviews.length > 0 ? myInterviews : interviews;

  const filteredList = useMemo(() => {
    if (!filters.search) return displayedList;
    const term = filters.search.toLowerCase();
    return displayedList.filter((it) => {
      const cand = it.candidateProjectMap?.candidate;
      const role = it.candidateProjectMap?.roleNeeded;
      return (
        cand?.firstName?.toLowerCase().includes(term) ||
        cand?.lastName?.toLowerCase().includes(term) ||
        it.candidateProjectMap?.project?.title?.toLowerCase().includes(term) ||
        role?.designation?.toLowerCase().includes(term)
      );
    });
  }, [displayedList, filters.search]);

  const selected = useMemo(() => {
    if (selectedId) return filteredList.find((i) => i.id === selectedId) || null;
    return filteredList[0] || null;
  }, [filteredList, selectedId]);

  const { data: historyResp, isLoading: isHistoryLoading } = useGetInterviewHistoryQuery(selected?.id ?? "", { skip: !selected?.id });

  const handleReviewSubmit = async (payload: { interviewStatus: "passed" | "failed" | "completed"; subStatus?: string; reason?: string }) => {
    if (!selected) return toast.error("No interview selected");

    try {
      await updateInterviewStatus({ id: selected.id, data: payload }).unwrap();
      toast.success(`Interview marked as ${payload.interviewStatus}`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update status");
    }
  };

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  );

  if (error) return (
    <div className="p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load interviews.</AlertDescription>
      </Alert>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-950 dark:to-black">
      {/* Comfortable Header */}
      <div className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  My Interviews
                </h1>
                <p className="text-sm text-muted-foreground">
                  Assigned to you as interviewer or candidate
                </p>
              </div>
            </div>
            <Button onClick={() => navigate(-1)} variant="ghost" size="sm">
              Back
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search candidates, projects, roles..."
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                className="pl-10 text-sm"
              />
            </div>

            <Select value={filters.status} onValueChange={(val) => {
              setFilters((p) => ({ ...p, status: val }));
              const np = new URLSearchParams(searchParams);
              if (val === "all") np.delete("status");
              else np.set("status", val);
              setSearchParams(np);
            }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            {(filters.search || filters.status !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => {
                setFilters({ search: "", status: "all" });
                const np = new URLSearchParams(searchParams);
                np.delete("status");
                setSearchParams(np);
              }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Comfortable List Panel */}
        <div className="w-80 border-r bg-white/60 dark:bg-gray-900/60">
          <ScrollArea className="h-full">
            {filteredList.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-40 text-indigo-400" />
                <p className="font-medium">No interviews found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {filteredList.map((it) => {
                  const candidate = it.candidateProjectMap?.candidate;
                  const role = it.candidateProjectMap?.roleNeeded;
                  const project = it.candidateProjectMap?.project;
                  const isSelected = it.id === selected?.id;

                  return (
                    <button
                      key={it.id}
                      onClick={() => setSelectedId(it.id)}
                      className={cn(
                        "w-full text-left p-3.5 rounded-lg border transition-all",
                        isSelected
                          ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300 dark:from-indigo-900/30 dark:to-purple-900/30 dark:border-indigo-700"
                          : "bg-white dark:bg-gray-800 border-transparent hover:border-gray-300 dark:hover:border-gray-700"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-indigo-400 to-purple-500 text-white">
                            {candidate
                              ? `${candidate.firstName?.[0] || ""}${candidate.lastName?.[0] || ""}`.toUpperCase()
                              : "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown"}
                          </p>
                          <p className="text-sm text-indigo-600 dark:text-indigo-400 truncate">
                            {role?.designation || "Unknown Role"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {project?.title || "Unknown Project"}
                          </p>
                        </div>
                        <ChevronRight className={cn("h-4 w-4 text-muted-foreground", isSelected && "text-indigo-600")} />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {it.outcome && (
                          <Badge className={cn("text-xs px-2.5 py-0.5", getOutcomeBadgeClass(it.outcome))}>
                            {it.outcome.charAt(0).toUpperCase() + it.outcome.slice(1)}
                          </Badge>
                        )}
                        {it.scheduledTime && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(it.scheduledTime), "MMM d, h:mm a")}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Comfortable Detail Panel */}
        <div className="flex-1 overflow-hidden">
          {selected ? (
            <ScrollArea className="h-full">
              <div className="p-6 max-w-4xl mx-auto space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent">
                      Interview Details
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selected.scheduledTime
                        ? format(new Date(selected.scheduledTime), "MMM d, yyyy • h:mm a")
                        : "Not scheduled"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
                      <Edit3 className="h-4 w-4 mr-1.5" />
                      Edit
                    </Button>
                    <Button size="sm" onClick={() => setIsReviewOpen(true)} className="bg-gradient-to-r from-green-600 to-emerald-600">
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Review
                    </Button>
                    {selected.outcome && (
                      <Badge className={cn("px-3 py-1 text-sm font-medium", getOutcomeBadgeClass(selected.outcome))}>
                        {selected.outcome.charAt(0).toUpperCase() + selected.outcome.slice(1)}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50/70 to-purple-50/70 dark:from-indigo-900/20 dark:to-purple-900/20">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-5">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="text-base font-bold bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                            {selected.candidateProjectMap?.candidate
                              ? `${selected.candidateProjectMap.candidate.firstName?.[0] || ""}${selected.candidateProjectMap.candidate.lastName?.[0] || ""}`.toUpperCase()
                              : "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-2 text-base">
                            <User className="h-5 w-5" />
                            Candidate
                          </h3>
                          <p className="font-medium text-base mt-1">
                            {selected.candidateProjectMap?.candidate
                              ? `${selected.candidateProjectMap.candidate.firstName} ${selected.candidateProjectMap.candidate.lastName}`
                              : "Unknown"}
                          </p>
                          {selected.candidateProjectMap?.candidate?.email && (
                            <p className="text-sm text-muted-foreground mt-2 break-all">
                              {selected.candidateProjectMap.candidate.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50/70 to-pink-50/70 dark:from-purple-900/20 dark:to-pink-900/20">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-2 text-base mb-4">
                        <Briefcase className="h-5 w-5" />
                        Project & Role
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-sm">Project</p>
                          <p className="font-medium text-base">{selected.candidateProjectMap?.project?.title || "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Role</p>
                          <p className="font-medium text-base">{selected.candidateProjectMap?.roleNeeded?.designation || "Unknown"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50/70 to-teal-50/70 dark:from-emerald-900/20 dark:to-teal-900/20">
                  <CardContent className="p-6 space-y-5">
                    <h3 className="font-semibold text-emerald-700 dark:text-emerald-400 text-base mb-3">
                      Interview Details
                    </h3>

                    <div className="grid grid-cols-2 gap-5 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Type</p>
                        <p className="font-medium capitalize">{selected.type || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Mode</p>
                        <p className="font-medium capitalize">{selected.mode?.replace("_", " ") || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Duration</p>
                        <p className="font-medium">{selected.duration ? `${selected.duration} min` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Outcome</p>
                        <Badge className={cn("px-3 py-1 text-sm", getOutcomeBadgeClass(selected.outcome))}>
                          {selected.outcome ? selected.outcome.charAt(0).toUpperCase() + selected.outcome.slice(1) : "Pending"}
                        </Badge>
                      </div>
                    </div>

                    {selected.meetingLink && (
                      <div className="pt-5 border-t">
                        <p className="text-muted-foreground mb-1">Meeting Link</p>
                        <a href={selected.meetingLink} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:underline break-all">
                          {selected.meetingLink}
                        </a>
                      </div>
                    )}

                    {selected.notes && (
                      <div className="pt-5 border-t">
                        <p className="text-muted-foreground mb-2">Notes</p>
                        <p className="text-sm whitespace-pre-wrap">{selected.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <InterviewHistory items={historyResp?.data ?? []} isLoading={isHistoryLoading} />
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-30 text-indigo-500" />
                <p className="font-medium">No interview selected</p>
                <p className="text-sm mt-1">Select from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ReviewInterviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        interview={selected}
        onSubmit={handleReviewSubmit}
      />

      {selected && (
        <EditInterviewDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          interviewId={selected.id}
        />
      )}
    </div>
  );
}