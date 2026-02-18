import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Calendar, ChevronRight, Loader2, RefreshCw, Search, X } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageViewer } from "@/components/molecules/ImageViewer";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ProjectRoleFilter } from "@/components/molecules/ProjectRoleFilter";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useUpdateClientDecisionMutation, useUpdateBulkClientDecisionMutation } from "../api";
import { ClientDecisionModal } from "../components/ClientDecisionModal";
import { BulkClientDecisionModal, CandidateDecision } from "../components/BulkClientDecisionModal";
import { toast } from "sonner";
import { useGetNotShortlistedQuery } from "../api";

export default function NotShortlistedCandidatesPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [bulkDecisionModalOpen, setBulkDecisionModalOpen] = useState(false);

  const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 500); // match Shortlisted page
const [filters, setFilters] = useState({ projectId: "all", roleCatalogId: "all" });

// Fetch server-side (supports pagination, project/role filters and search)
const { data, isLoading, isError, refetch } = useGetNotShortlistedQuery({
  page: 1,
  limit: 10, // keep parity with Shortlisted page
  search: debouncedSearch || undefined,
  projectId: filters.projectId === "all" ? undefined : filters.projectId,
  roleCatalogId: filters.roleCatalogId === "all" ? undefined : filters.roleCatalogId,
  });

  const displayed = data?.data?.items ?? [];
  const total = data?.data?.pagination?.total ?? 0;

  const location = useLocation();

  // mirror Shortlisted page behaviour: accept selectedId from navigation state
  useEffect(() => {
    const s = (location.state as any)?.selectedId;
    if (s) setSelectedId(s);
  }, [location.state]);

  // ensure selectedId follows fetched results
  useEffect(() => {
    if (!selectedId && displayed.length > 0) setSelectedId(displayed[0].id);
    if (selectedId && !displayed.find((d) => d.id === selectedId)) setSelectedId(displayed[0]?.id ?? null);
  }, [displayed, selectedId]);

  const selected = useMemo(() => {
    if (selectedId) return displayed.find((i) => i.id === selectedId) || null;
    return displayed[0] || null;
  }, [displayed, selectedId]);

  const selectedCandidatesForBulk = useMemo(() => {
    return displayed.filter((item) => selectedBulkIds.includes(item.id));
  }, [displayed, selectedBulkIds]);

  // client-decision mutations (single + bulk)
  const [updateClientDecision, { isLoading: isUpdatingDecision }] = useUpdateClientDecisionMutation();
  const [updateBulkClientDecision, { isLoading: isBulkUpdating }] = useUpdateBulkClientDecisionMutation();

  async function handleClientDecision(decision: "shortlisted" | "not_shortlisted" | null, reason: string) {
    if (!selected || !decision) return;

    try {
      const res = await updateClientDecision({ id: selected.id, data: { decision, notes: reason } }).unwrap();

      if (res.success) {
        toast.success(decision === 'shortlisted' ? "Candidate shortlisted successfully" : "Candidate marked as not shortlisted");
        setDecisionModalOpen(false);
        refetch();
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update candidate status");
    }
  }

  async function handleBulkClientDecision(decisions: CandidateDecision[]) {
    if (decisions.length === 0) return;

    try {
      const res = await updateBulkClientDecision({
        updates: decisions.map(d => ({
          id: d.id,
          decision: d.decision,
          notes: d.notes
        }))
      }).unwrap();

      if (res.success) {
        toast.success(`Bulk update applied successfully`);
        setBulkDecisionModalOpen(false);
        setSelectedBulkIds([]);
        refetch();
      }
    } catch (err: any) {
      toast.error(err?.data?.message || 'Bulk update failed');
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-destructive font-medium">Failed to load not-shortlisted candidates</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="border-b bg-white/80 backdrop-blur">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-rose-400 to-rose-600 text-white">
                <X className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Not Shortlisted Candidates</h1>
                <p className="text-xs text-muted-foreground">Candidates marked not shortlisted by client</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8">Back</Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search candidates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <ProjectRoleFilter value={filters} onChange={setFilters} className="bg-white/50" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r bg-white/60 flex flex-col">
          <div className="p-3 border-b flex items-center justify-between bg-white/40">
            <div className="flex items-center gap-2">
              <Checkbox id="select-all-notshortlisted" checked={displayed.length > 0 && displayed.every((it) => selectedBulkIds.includes(it.id))} onCheckedChange={(checked) => checked ? setSelectedBulkIds(displayed.map((it) => it.id)) : setSelectedBulkIds([])} />
              <label htmlFor="select-all-notshortlisted" className="text-xs font-medium cursor-pointer select-none">{selectedBulkIds.length > 0 ? `${selectedBulkIds.length} selected` : 'Select All'}</label>
            </div>
            {selectedBulkIds.length > 0 && (
              <div className="flex items-center gap-2">
                <Button size="sm" className="h-6 text-[10px] px-2 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setBulkDecisionModalOpen(true)}>Bulk Update</Button>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setSelectedBulkIds([])}>Clear</Button>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1">
            {displayed.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-40 text-rose-400" />
                <p className="font-medium">No not-shortlisted candidates</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {displayed.map((it) => (
                  <div key={it.id} className="relative flex items-center gap-1 group">
                    <Checkbox checked={selectedBulkIds.includes(it.id)} onCheckedChange={(checked) => setSelectedBulkIds((prev) => checked ? [...prev, it.id] : prev.filter((id) => id !== it.id))} className="ml-1 opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity" />
                    <button onClick={() => setSelectedId(it.id)} className={cn("flex-1 text-left p-3 rounded-lg border transition-all w-full", it.id === selected?.id ? 'bg-rose-50 border-rose-300' : 'bg-white border-transparent hover:border-gray-300')}>
                      <div className="flex items-start gap-3 w-full">
                        <ImageViewer src={it.candidate?.profileImage} title={`${it.candidate.firstName} ${it.candidate.lastName}`} className="h-9 w-9 shrink-0" enableHoverPreview={false} />
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="font-medium text-sm truncate">{it.candidate ? `${it.candidate.firstName} ${it.candidate.lastName}` : 'Unknown'}</p>
                          <div className="text-xs text-rose-600 mt-1">
                            <p className="truncate leading-relaxed">
                              {it.roleNeeded?.designation || 'Unknown Role'}
                              {it.candidate?.qualifications?.[0]?.qualification?.shortName || it.candidate?.qualifications?.[0]?.qualification?.name ? (
                                <span className="text-muted-foreground ml-1">• {it.candidate.qualifications[0].qualification.shortName || it.candidate.qualifications[0].qualification.name}</span>
                              ) : null}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{it.project?.title || 'Unknown Project'}</p>
                        </div>
                        <ChevronRight className={cn('h-4 w-4 text-muted-foreground shrink-0', it.id === selected?.id && 'text-rose-600')} />
                      </div>

                        <div className="flex items-center justify-between gap-2 mt-3 w-full">
                          <Badge className="text-xs px-2 py-0.5 font-medium bg-rose-50 text-rose-700 shrink-0 max-w-[120px] truncate">{it.subStatus?.label || 'Not Shortlisted'}</Badge>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                            <Calendar className="h-3 w-3" />
                            <span className="whitespace-nowrap">{format(new Date(it.updatedAt), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex-1 overflow-hidden">
          {selected ? (
            <ScrollArea className="h-full">
              <div className="p-5 max-w-4xl mx-auto space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-slate-900">Submission Details</h2>
                    <p className="text-sm text-muted-foreground mt-1">{selected.updatedAt ? format(new Date(selected.updatedAt), 'MMMM d, yyyy • h:mm a') : 'Not shortlisted'}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className="px-3 py-1 text-sm font-medium shadow-sm bg-rose-50 text-rose-800">{selected.subStatus?.label || 'Not Shortlisted'}</Badge>
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all active:scale-95" onClick={() => setDecisionModalOpen(true)}>Update Client Decision</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50/70 to-amber-50/70">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-3 mb-4">
                        <ImageViewer
                          src={selected.candidate?.profileImage}
                          title={selected.candidate ? `${selected.candidate.firstName} ${selected.candidate.lastName}` : "Unknown Candidate"}
                          className="h-12 w-12 shrink-0 rounded-md"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <p className="font-semibold text-lg text-amber-700 truncate">{selected.candidate ? `${selected.candidate.firstName} ${selected.candidate.lastName}` : "Unknown"}</p>
                            <span className="text-xs text-muted-foreground">Candidate</span>
                          </div>

                          {selected.candidate?.email && (
                            <p className="text-xs text-muted-foreground mt-1 break-all">{selected.candidate.email}</p>
                          )}
                          {selected.candidate?.mobileNumber && (
                            <p className="text-xs text-muted-foreground mt-1">{selected.candidate.mobileNumber}</p>
                          )}

                          {selected.recruiter && (
                            <div className="mt-3 p-2 bg-white/60 rounded-md border border-amber-100">
                              <p className="text-xs text-muted-foreground font-medium mb-1">Nominated by</p>
                              <p className="text-xs font-semibold text-amber-800">{selected.recruiter.name || 'Unknown'}</p>
                              {selected.recruiter.email && (
                                <p className="text-xs text-muted-foreground break-all">{selected.recruiter.email}</p>
                              )}
                            </div>
                          )}

                          {selected.candidate?.qualifications?.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-muted-foreground">Qualifications</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {selected.candidate.qualifications.map((q: any) => (
                                  <Badge key={q.id} className="text-xs bg-indigo-50 text-indigo-700">
                                    {q.qualification?.shortName || q.qualification?.name || q.university}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {selected.candidate?.workExperiences?.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-muted-foreground">Recent experience</p>
                              <div className="mt-2 space-y-2 text-sm">
                                {selected.candidate.workExperiences.slice(0, 3).map((we: any) => (
                                  <div key={we.id}>
                                    <div className="font-medium">{we.jobTitle} <span className="text-xs text-muted-foreground">at {we.companyName}</span></div>
                                    <div className="text-xs text-muted-foreground">{we.startDate ? new Date(we.startDate).getFullYear() : ''} — {we.isCurrent ? 'Present' : (we.endDate ? new Date(we.endDate).getFullYear() : '')}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50/70 to-amber-50/70">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-yellow-700 text-sm mb-3">Project & Role</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Project</p>
                          <p className="font-medium text-yellow-800">{selected.project?.title || "Unknown"}</p>
                          {selected.project?.client?.name && (
                            <p className="text-xs text-muted-foreground font-medium italic mt-0.5">Client: {selected.project.client.name}</p>
                          )}
                          {(selected.project?.client?.email || selected.project?.client?.phone) && (
                            <p className="text-xs text-muted-foreground mt-1">{selected.project.client.email ?? ''}{selected.project.client.email && selected.project.client.phone ? ' • ' : ''}{selected.project.client.phone ?? ''}</p>
                          )}
                          {selected.project?.countryCode && (
                            <p className="text-xs text-muted-foreground mt-1">Country: {selected.project.countryCode}</p>
                          )}
                          {selected.project?.resumeEditable && (
                            <Badge className="mt-2 text-xs bg-slate-100 text-slate-800">Resume editable</Badge>
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Role</p>
                          <p className="font-medium">{selected.roleNeeded?.designation || "Unknown"}</p>
                          <div className="text-xs text-muted-foreground mt-1">
                            {selected.roleNeeded?.minExperience || selected.roleNeeded?.maxExperience ? (
                              <span>Experience: {selected.roleNeeded?.minExperience ?? 0} - {selected.roleNeeded?.maxExperience ?? '—'} yrs</span>
                            ) : null}
                            {selected.roleNeeded?.employmentType ? (<span className="ml-2">• {selected.roleNeeded.employmentType}</span>) : null}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {selected.roleNeeded?.backgroundCheckRequired ? (<Badge className="text-xs bg-emerald-50 text-emerald-800">Background check required</Badge>) : null}
                            {selected.roleNeeded?.additionalRequirements && (
                              <div className="mt-2 text-xs">{selected.roleNeeded.additionalRequirements}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50/70 to-cyan-50/70">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-blue-700 text-sm">Screening Interview</h3>
                      {selected.screening ? (
                        <Badge className={cn(
                          "text-xs font-semibold px-3 py-1",
                          selected.screening.decision === 'approved' ? 'bg-green-100 text-green-800' :
                          selected.screening.decision === 'rejected' ? 'bg-red-100 text-red-800' :
                          selected.screening.decision === 'needs_training' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-800'
                        )}>
                          {selected.screening.decision ? selected.screening.decision.replace('_', ' ').toUpperCase() : 'PENDING'}
                        </Badge>
                      ) : (
                        <Badge className="text-xs font-semibold px-3 py-1 bg-gray-100 text-gray-700">NOT CONDUCTED</Badge>
                      )}
                    </div>
                    {selected.screening ? (
                      <div className="text-sm space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Conducted</p>
                            <p className="font-medium">{selected.screening.conductedAt ? format(new Date(selected.screening.conductedAt), 'MMM d, yyyy') : '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Interviewer decision</p>
                            <p className="font-medium">{selected.screening.decision || '-'}</p>
                          </div>
                        </div>

                        {selected.screening.overallRating != null && (
                          <div>
                            <p className="text-xs text-muted-foreground">Overall rating</p>
                            <p className="font-medium">{selected.screening.overallRating}/5</p>
                          </div>
                        )}

                        {selected.screening.remarks && (
                          <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                            <p className="text-sm text-muted-foreground mb-1">Remarks</p>
                            <div className="text-sm">{selected.screening.remarks}</div>
                          </div>
                        )}

                        {(selected.screening.strengths || selected.screening.areasOfImprovement) && (
                          <div className="grid grid-cols-1 gap-2">
                            {selected.screening.strengths && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Strengths</p>
                                <div className="text-sm">{selected.screening.strengths}</div>
                              </div>
                            )}
                            {selected.screening.areasOfImprovement && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Areas for improvement</p>
                                <div className="text-sm">{selected.screening.areasOfImprovement}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">Screening interview not yet conducted</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50/70 to-teal-50/70">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-emerald-700 text-sm mb-3">Assignment Status</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Current Status</p>
                        <p className="font-medium capitalize text-emerald-800">{selected.subStatus?.label || 'Not Shortlisted'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                        <p className="font-medium text-emerald-800">{selected.updatedAt ? format(new Date(selected.updatedAt), 'MMM d, yyyy • h:mm a') : '-'}</p>
                      </div>
                    </div>

                    {selected.latestForward?.sender && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        <p className="mb-0">Forwarded to client by {selected.latestForward.sender.name} on {selected.latestForward.sentAt ? format(new Date(selected.latestForward.sentAt), 'MMM d, yyyy') : '-'}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-30 text-rose-400" />
                <p className="font-medium">No not-shortlisted candidates</p>
                <p className="text-sm">Select from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ClientDecisionModal
        open={decisionModalOpen}
        onOpenChange={setDecisionModalOpen}
        candidateName={selected?.candidate ? `${selected.candidate.firstName} ${selected.candidate.lastName}` : "Unknown Candidate"}
        onSubmit={handleClientDecision}
        isSubmitting={isUpdatingDecision}
      />

      <BulkClientDecisionModal
        open={bulkDecisionModalOpen}
        onOpenChange={setBulkDecisionModalOpen}
        selectedCandidates={selectedCandidatesForBulk}
        onSubmit={handleBulkClientDecision}
        isSubmitting={isBulkUpdating}
      />
    </div>
  );
}
