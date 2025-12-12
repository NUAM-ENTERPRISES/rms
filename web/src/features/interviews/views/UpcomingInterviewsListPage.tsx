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
import { useGetUpcomingInterviewsQuery } from "../api";
import { cn } from "@/lib/utils";

export default function UpcomingInterviewsListPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [filters, setFilters] = useState({ search: "", status: "all" });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // auto-select id passed via navigation state
  useEffect(() => {
    const s = (location.state as any)?.selectedId;
    if (s) setSelectedId(s);
  }, [location.state]);

  const { data, isLoading, error } = useGetUpcomingInterviewsQuery({ page: 1, limit: 100, search: filters.search || undefined });
  const items = data?.data?.interviews || [];

  const { allItems } = useMemo(() => {
    let filtered = items.filter((it) => it.scheduledTime && !(it as any).conductedAt);
    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter((it) => {
        const cand = it.candidateProjectMap?.candidate;
          const role = (it as any).candidateProjectMap?.roleNeeded;
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
                <h1 className="text-2xl font-semibold tracking-tight">Upcoming Interviews</h1>
                <p className="text-sm text-muted-foreground">Scheduled interviews and interviews approaching soon</p>
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
                  const role = (it as any).candidateProjectMap?.roleNeeded;
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

                      <div className="flex items-start gap-2 mb-2">
                        <div className="flex flex-col">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs capitalize bg-blue-100 text-blue-700 border border-blue-100">
                            <Calendar className="h-3 w-3" />
                            <span>{it.candidateProjectMap?.subStatus?.label || it.candidateProjectMap?.subStatus?.name || 'Scheduled'}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            {(it as any).recruiter && <Badge className="text-xs">{(it as any).recruiter.name}</Badge>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{it.scheduledTime ? format(new Date(it.scheduledTime), "MMM d, yyyy 'at' h:mm a") : "Not scheduled"}</span>
                        {it.expired && <Badge className="text-xs capitalize bg-rose-50 text-rose-700 border border-rose-100 ml-2">Expired</Badge>}
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
                    <h2 className="text-2xl font-semibold">Upcoming Interview Details</h2>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">{selected.scheduledTime ? `Scheduled for ${format(new Date(selected.scheduledTime), "MMMM d, yyyy 'at' h:mm a")}` : 'Not scheduled'}</p>
                      {selected.expired && (
                        <Badge className="text-xs capitalize bg-rose-50 text-rose-700 border border-rose-100">Expired</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!(selected as any).conductedAt && (
                      <Button onClick={() => navigate(`/interviews/${selected.id}/conduct`)}>Conduct Interview</Button>
                    )}
                    <div className="flex flex-col items-end gap-2">
                      {selected.candidateProjectMap?.subStatus?.label && (
                        <Badge className="text-xs capitalize bg-blue-100 text-blue-700 border border-blue-100">{selected.candidateProjectMap.subStatus.label}</Badge>
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
                          <p className="font-medium">{(selected as any).candidateProjectMap?.roleNeeded?.designation || 'Unknown'}</p>
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
                          <p className="font-medium capitalize">{(selected as any).status || 'Scheduled'}</p>
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
