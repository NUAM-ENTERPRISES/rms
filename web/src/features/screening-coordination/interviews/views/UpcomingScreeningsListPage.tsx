import { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ClipboardCheck, Loader2, AlertCircle, User, Briefcase, Calendar, ChevronRight, X, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetUpcomingScreeningsQuery } from "../data";
import { EditScreeningDialog } from "../components";
import { cn } from "@/lib/utils";

export default function UpcomingInterviewsListPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [filters, setFilters] = useState({ search: "", status: "all" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // auto-select id passed via navigation state
  useEffect(() => {
    const s = (location.state as any)?.selectedId;
    if (s) setSelectedId(s);
  }, [location.state]);

  const { data, isLoading, error, refetch } = useGetUpcomingScreeningsQuery({ page: 1, limit: 100 });
  const items = data?.data?.items || [];

  const { allItems } = useMemo(() => {
    let filtered = items;
    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter((it) => {
        const cand = it.candidateProjectMap?.candidate;
        const role = it.candidateProjectMap?.roleNeeded;
        return (
          cand?.firstName?.toLowerCase().includes(term) ||
          cand?.lastName?.toLowerCase().includes(term) ||
          it.candidateProjectMap?.project?.title?.toLowerCase().includes(term) ||
          role?.designation?.toLowerCase().includes(term)
        );
      });
    }

    return { allItems: filtered };
  }, [items, filters]);

  const displayed = allItems;

  const selected = useMemo(() => {
    if (selectedId) return displayed.find((i) => i.id === selectedId) || null;
    return displayed[0] || null;
  }, [displayed, selectedId]);

  // Debug: log selected interview
  console.log("Selected interview:", selected, "ID:", selected?.id);

  if (isLoading) return (<div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>);

  if (error) return (
    <div className="p-8">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load upcoming interviews. Please try again.</AlertDescription>
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
                <h1 className="text-2xl font-semibold tracking-tight">Upcoming Screenings</h1>
                <p className="text-sm text-muted-foreground">Scheduled screenings and recent assignments</p>
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

            {(filters.search || filters.status !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => setFilters({ search: "", status: "all" })}>
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
            {displayed.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm font-medium mb-1">No upcoming interviews</p>
                <p className="text-xs">Scheduled interviews will appear here</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {displayed.map((it) => {
                  const candidate = it.candidateProjectMap?.candidate;
                  const role = it.candidateProjectMap?.roleNeeded;
                  const isSelected = it.id === (selected?.id || displayed[0]?.id);

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
                          <p className="text-xs text-muted-foreground truncate">{role?.designation || "Unknown Role"}</p>
                        </div>
                        <ChevronRight className={cn("h-4 w-4 flex-shrink-0 transition-transform", isSelected && "text-primary")} />
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          <Calendar className="h-3 w-3" />
                          <span className="capitalize">{(it.candidateProjectMap as any)?.subStatus?.label || (it.candidateProjectMap as any)?.subStatus?.name || 'Scheduled'}</span>
                        </div>
                        {it.candidateProjectMap?.recruiter && <Badge className="text-xs">{it.candidateProjectMap.recruiter.name}</Badge>}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{it.scheduledTime ? format(new Date(it.scheduledTime), "MMM d, yyyy 'at' h:mm a") : "Not scheduled"}</span>
                      </div>
                      {/* expired badge aligned bottom-right */}
                      {(it as any).isExpired && (
                        <div className="absolute bottom-3 right-3">
                          <div className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-destructive/10 text-destructive border border-destructive/20">Date expired</div>
                        </div>
                      )}
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
                    <h2 className="text-2xl font-semibold">Upcoming Screening Details</h2>
                    <p className="text-sm text-muted-foreground">{selected.scheduledTime ? `Scheduled for ${format(new Date(selected.scheduledTime), "MMMM d, yyyy 'at' h:mm a")}` : 'Not scheduled'}</p>
                  </div>
                      {!selected.conductedAt && (
                    <div className="flex items-center gap-2">
                      <Button onClick={() => navigate(`/screenings/${selected.id}/conduct`)}>Conduct Screening</Button>
                      <Button variant="outline" onClick={() => setEditOpen(true)}>Edit</Button>
                    </div>
                  )}
                  {/* Edit dialog */}
                  {selected && (
                    <EditScreeningDialog open={editOpen} onOpenChange={setEditOpen} interviewId={selected.id} />
                  )}
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
                        <p className="text-xs text-muted-foreground mb-1">Mode</p>
                        <p className="font-medium capitalize">{selected.mode?.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium capitalize">{(selected.candidateProjectMap as any)?.subStatus?.label || (selected.candidateProjectMap as any)?.subStatus?.name || 'Scheduled'}</p>
                          {(selected as any).isExpired && (
                            <div className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-destructive/10 text-destructive border border-destructive/20">Date expired</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {selected.notes && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Notes</p>
                        <p className="text-sm whitespace-pre-wrap">{selected.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <ClipboardCheck className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No upcoming interview selected</p>
                <p className="text-sm">Select an interview from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
