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
import { ClipboardCheck, Loader2, AlertCircle, User, Briefcase, Calendar, ChevronRight, X, Search } from "lucide-react";
import { useGetInterviewsQuery, useUpdateInterviewStatusMutation } from "../api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReviewInterviewModal from "@/components/molecules/ReviewInterviewModal";
import InterviewHistory from "@/components/molecules/InterviewHistory";
import EditInterviewDialog from "../components/EditInterviewDialog";
import { useGetInterviewHistoryQuery } from "../api";
import { toast } from "sonner";

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

  // auto-select id passed via navigation state
  useEffect(() => {
    const s = (location.state as any)?.selectedId;
    if (s) setSelectedId(s);
  }, [location.state]);

  // Keep filter status in sync with URL search params
  useEffect(() => {
    const allowed = new Set(["all", "completed", "passed", "failed"]);
    let s = searchParams.get("status") || "all";
    if (!allowed.has(s)) {
      // sanitize unknown status values by removing param
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

  // Filter to "My" interviews: either current user is interviewer or candidate
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

  // Use all interviews as fallback if myInterviews filter returns empty
  const displayedList = myInterviews.length > 0 ? myInterviews : interviews;

  // Apply search filter
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

  // Fetch interview history for the selected interview
  const { data: historyResp, isLoading: isHistoryLoading } = useGetInterviewHistoryQuery(selected?.id ?? "", { skip: !selected?.id });

  const handleReviewSubmit = async (payload: { interviewStatus: "passed" | "failed" | "completed"; subStatus?: string; reason?: string }) => {
    if (!selected) {
      const err = new Error("No interview selected");
      toast.error(err.message);
      throw err;
    }

    try {
      await updateInterviewStatus({ id: selected.id, data: payload }).unwrap();
      toast.success(`Interview status updated: ${payload.interviewStatus}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to update interview status");
      throw err;
    }
  };

  if (isLoading) return (<div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>);

  if (error) return (
    <div className="p-8">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load interviews. Please try again.</AlertDescription>
      </Alert>
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">My Interviews</h1>
                <p className="text-sm text-muted-foreground">
                  Interviews assigned to you
                  {myInterviews.length === 0 && displayedList.length > 0 && (
                    <span className="text-amber-600"> (showing all)</span>
                  )}
                </p>
              </div>
            </div>
            <div>
              <Button onClick={() => navigate(-1)} variant="ghost">Back</Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search candidates, projects, roles..." value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} className="pl-10" />
            </div>

            <div className="w-40">
              <Select value={filters.status} onValueChange={(val) => {
                setFilters((p) => ({ ...p, status: val }));
                const np = new URLSearchParams(searchParams);
                if (val === "all") {
                  np.delete("status");
                } else {
                  np.set("status", val);
                }
                setSearchParams(np);
              }}>
                <SelectTrigger size="sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(filters.search || filters.status !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => {
                setFilters({ search: "", status: "all" });
                const np = new URLSearchParams(searchParams);
                np.delete("status");
                setSearchParams(np);
              }}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 border-r bg-muted/20">
          <ScrollArea className="h-full">
            {filteredList.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm font-medium mb-1">No interviews</p>
                <p className="text-xs">No interviews were found</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredList.map((it) => {
                  const candidate = it.candidateProjectMap?.candidate;
                  const role = it.candidateProjectMap?.roleNeeded;
                  const isSelected = it.id === (selected?.id || filteredList[0]?.id);

                  return (
                    <button
                      key={it.id}
                      onClick={() => setSelectedId(it.id)}
                      className={cn("relative w-full text-left p-3 rounded-lg border transition-all", "hover:bg-accent/50", isSelected ? "bg-accent border-primary shadow-sm" : "bg-card border-transparent")}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown Candidate"}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{role?.designation || it.candidateProjectMap?.project?.title || "Unknown"}</p>
                        </div>
                        <ChevronRight className={cn("h-4 w-4 flex-shrink-0 transition-transform", isSelected && "text-primary")} />
                      </div>

                      <div className="flex items-start gap-2 mb-2">
                        <div className="flex flex-col">
                          {it.outcome && (
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs capitalize",
                              it.outcome === "passed" ? "bg-green-100 text-green-700 border border-green-100" :
                              it.outcome === "failed" ? "bg-red-100 text-red-700 border border-red-100" :
                              "bg-blue-100 text-blue-700 border border-blue-100"
                            )}>
                              <span>{it.outcome}</span>
                            </div>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            {it.candidateProjectMap?.recruiter && <Badge className="text-xs">{it.candidateProjectMap.recruiter.name}</Badge>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{it.scheduledTime ? format(new Date(it.scheduledTime), "MMM d, yyyy 'at' h:mm a") : "Not scheduled"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex-1 overflow-hidden">
          {selected ? (
            <ScrollArea className="h-full">
              <div className="p-6 max-w-4xl mx-auto space-y-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold">Interview Details</h2>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">{selected.scheduledTime ? `Scheduled for ${format(new Date(selected.scheduledTime), "MMMM d, yyyy 'at' h:mm a")}` : 'Not scheduled'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Button onClick={() => setIsEditOpen(true)} variant="outline" size="sm">Edit</Button>
                      <Button onClick={() => setIsReviewOpen(true)}>Review Interview</Button>
                    </div>
                    <ReviewInterviewModal
                      isOpen={isReviewOpen}
                      onClose={() => setIsReviewOpen(false)}
                      interview={selected}
                      onSubmit={(status) => handleReviewSubmit(status)}
                    />
                    {selected && (
                      <EditInterviewDialog
                        open={isEditOpen}
                        onOpenChange={setIsEditOpen}
                        interviewId={selected.id}
                      />
                    )}
                    <div className="flex flex-col items-end gap-2">
                      {selected.outcome && (
                        <Badge className={cn(
                          "text-xs capitalize",
                          selected.outcome === "passed" ? "bg-green-100 text-green-700 border border-green-100" :
                          selected.outcome === "failed" ? "bg-red-100 text-red-700 border border-red-100" :
                          "bg-blue-100 text-blue-700 border border-blue-100"
                        )}>{selected.outcome}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2"><User className="h-5 w-5 text-primary" />Candidate Information</h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Name</p>
                          <p className="font-medium">{selected.candidateProjectMap?.candidate ? `${selected.candidateProjectMap.candidate.firstName} ${selected.candidateProjectMap.candidate.lastName}` : 'Unknown'}</p>
                        </div>
                        {selected.candidateProjectMap?.candidate?.email && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Email</p>
                            <p className="font-medium text-xs break-all">{selected.candidateProjectMap.candidate.email}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />Project & Role</h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Project</p>
                          <p className="font-medium">{selected.candidateProjectMap?.project?.title || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Role</p>
                          <p className="font-medium">{selected.candidateProjectMap?.roleNeeded?.designation || 'Unknown'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Interview Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Type</p>
                        <p className="font-medium capitalize">{selected.type || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Mode</p>
                        <p className="font-medium capitalize">{selected.mode?.replace('_', ' ') || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Duration</p>
                        <p className="font-medium">{selected.duration ? `${selected.duration} minutes` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Outcome</p>
                        <p className="font-medium capitalize">{selected.outcome || 'Pending'}</p>
                      </div>
                    </div>

                    {selected.meetingLink && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Meeting Link</p>
                        <a href={selected.meetingLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">{selected.meetingLink}</a>
                      </div>
                    )}

                    {selected.notes && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Notes</p>
                        <p className="text-sm whitespace-pre-wrap">{selected.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Interview history */}
                <InterviewHistory items={historyResp?.data ?? []} isLoading={isHistoryLoading} />
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <ClipboardCheck className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No interview selected</p>
                <p className="text-sm">Select an interview from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
