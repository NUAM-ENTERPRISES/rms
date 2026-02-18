import { useState, useEffect, useMemo } from "react";
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
import { 
  useGetShortlistedQuery, 
  useUpdateClientDecisionMutation, 
  useUpdateBulkClientDecisionMutation,
  useCreateBulkInterviewsMutation
} from "../api";
import ScheduleInterviewDialog from "../components/ScheduleInterviewDialog";
import { ClientDecisionModal } from "../components/ClientDecisionModal";
import { BulkClientDecisionModal, CandidateDecision } from "../components/BulkClientDecisionModal";
import { BulkScheduleInterviewModal, InterviewSchedule } from "../components/BulkScheduleInterviewModal";
import { toast } from "sonner";

export default function ShortlistedCandidatesPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [filters, setFilters] = useState({ projectId: "all", roleCatalogId: "all" });
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [bulkDecisionModalOpen, setBulkDecisionModalOpen] = useState(false);
  const [bulkScheduleModalOpen, setBulkScheduleModalOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useGetShortlistedQuery({
    page: 1,
    limit: 10,
    search: debouncedSearch || undefined,
    projectId: filters.projectId === "all" ? undefined : filters.projectId,
    roleCatalogId: filters.roleCatalogId === "all" ? undefined : filters.roleCatalogId,
  });

  const [updateClientDecision, { isLoading: isUpdatingDecision }] = useUpdateClientDecisionMutation();
  const [updateBulkClientDecision, { isLoading: isBulkUpdating }] = useUpdateBulkClientDecisionMutation();
  const [createBulkInterviews, { isLoading: isSchedulingBulk }] = useCreateBulkInterviewsMutation();

  const displayed = data?.data?.items ?? [];

  useEffect(() => {
    const s = (location.state as any)?.selectedId;
    if (s) setSelectedId(s);
  }, [location.state]);

  const selected = useMemo(() => {
    if (selectedId) return displayed.find((i) => i.id === selectedId) || null;
    return displayed[0] || null;
  }, [displayed, selectedId]);

  async function handleClientDecision(decision: "shortlisted" | "not_shortlisted" | null, reason: string) {
    if (!selected || !decision) return;
    try {
      const res = await updateClientDecision({
        id: selected.id,
        data: { decision, notes: reason },
      }).unwrap();

      if (res.success) {
        toast.success(decision === 'shortlisted' ? "Candidate shortlisted successfully" : "Candidate marked as not shortlisted");
        setDecisionModalOpen(false);
        refetch();
      }
    } catch (error) {
      toast.error("Failed to update client decision");
    }
  }

  // For this dummy page we reuse shortlist-pending data as a placeholder for "shortlisted" items
  const selectedCandidatesForBulk = useMemo(() => {
    return displayed.filter((item) => selectedBulkIds.includes(item.id));
  }, [displayed, selectedBulkIds]);

  async function handleBulkClientDecision(decisions: CandidateDecision[]) {
    try {
      const res = await updateBulkClientDecision({
        updates: decisions.map((d) => ({
          id: d.id,
          decision: d.decision,
          notes: d.notes,
        })),
      }).unwrap();

      if (res.success) {
        toast.success("Bulk client decisions updated successfully");
        setBulkDecisionModalOpen(false);
        setSelectedBulkIds([]);
        refetch();
      }
    } catch (error) {
      toast.error("Failed to update bulk decisions");
    }
  }

  async function handleBulkSchedule(schedules: InterviewSchedule[]) {
    try {
      await createBulkInterviews(
        schedules.map((s) => ({
          candidateProjectMapId: s.candidateProjectMapId,
          scheduledTime: s.scheduledTime.toISOString(),
          duration: s.duration,
          type: s.type,
          mode: s.mode,
          meetingLink: s.meetingLink,
          notes: s.notes,
        }))
      ).unwrap();

      toast.success(`${schedules.length} Interviews scheduled successfully`);
      setBulkScheduleModalOpen(false);
      setSelectedBulkIds([]);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to schedule bulk interviews");
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-destructive font-medium">Failed to load shortlisted candidates (dummy)</p>
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
              <div className="p-2 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 text-white">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Shortlisted Candidates</h1>
                <p className="text-xs text-muted-foreground">Candidates shortlisted by client — schedule interviews</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8">
                Back
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <ProjectRoleFilter
              value={filters}
              onChange={setFilters}
              className="bg-white/50"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r bg-white/60 flex flex-col">
          {displayed.length > 0 && (
            <div className="p-3 border-b flex items-center justify-between bg-white/40">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-shortlisted"
                  checked={displayed.length > 0 && displayed.every((it) => selectedBulkIds.includes(it.id))}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedBulkIds(displayed.map((it) => it.id));
                    } else {
                      setSelectedBulkIds([]);
                    }
                  }}
                />
                <label htmlFor="select-all-shortlisted" className="text-xs font-medium cursor-pointer select-none">
                  {selectedBulkIds.length > 0 ? `${selectedBulkIds.length} selected` : "Select All"}
                </label>
              </div>
              {selectedBulkIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    className="h-6 text-[10px] px-2 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => setBulkDecisionModalOpen(true)}
                  >
                    Bulk Update
                  </Button>
                  <Button 
                    size="sm" 
                    className="h-6 text-[10px] px-2 bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => setBulkScheduleModalOpen(true)}
                  >
                    Bulk Schedule
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setSelectedBulkIds([])}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
          )}

          <ScrollArea className="flex-1">
            {displayed.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-40 text-teal-400" />
                <p className="font-medium">No shortlisted candidates (dummy)</p>
                <p className="text-xs mt-1">Shortlisted candidates (demo) will appear here</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {displayed.map((it) => {
                  const candidate = it.candidate;
                  const role = it.roleNeeded;
                  const project = it.project;
                  const isSelected = it.id === selected?.id;

                  return (
                    <div key={it.id} className="relative flex items-center gap-1 group">
                      <Checkbox
                        checked={selectedBulkIds.includes(it.id)}
                        onCheckedChange={(checked) => {
                          setSelectedBulkIds((prev) => (checked ? [...prev, it.id] : prev.filter((id) => id !== it.id)));
                        }}
                        className="ml-1 opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
                      />
                      <button
                        onClick={() => setSelectedId(it.id)}
                        className={cn(
                          "flex-1 text-left p-3 rounded-lg border transition-all",
                          isSelected
                            ? "bg-gradient-to-r from-teal-50 to-teal-50 border-teal-300"
                            : "bg-white border-transparent hover:border-gray-300"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <ImageViewer
                            src={candidate?.profileImage}
                            title={candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown Candidate"}
                            className="h-9 w-9 shrink-0"
                            enableHoverPreview={false}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown Candidate"}</p>
                            <p className="text-xs text-teal-600 truncate mt-1">{role?.designation || "Unknown Role"}</p>
                            <p className="text-xs text-muted-foreground truncate">{project?.title || "Unknown Project"}</p>
                          </div>
                          <ChevronRight className={cn("h-4 w-4 text-muted-foreground", isSelected && "text-teal-600")} />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge className={cn("text-xs px-2 py-0.5 font-medium", "bg-emerald-100 text-emerald-800")}>
                            {it.subStatus?.label || "Shortlisted"}
                          </Badge>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(it.updatedAt), "MMM d, yyyy")}
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
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
                    <h2 className="text-2xl font-bold bg-clip-text text-slate-900">Shortlisted Submission</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selected.updatedAt ? format(new Date(selected.updatedAt), "MMMM d, yyyy • h:mm a") : "Shortlisted"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={cn("px-3 py-1 text-sm font-medium shadow-sm", "bg-emerald-100 text-emerald-800")}>
                      {selected.subStatus?.label || "Shortlisted"}
                    </Badge>

                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-amber-200 text-amber-700 hover:bg-amber-50"
                      onClick={() => setDecisionModalOpen(true)}
                    >
                      Update Decision
                    </Button>

                    <Button 
                      size="sm" 
                      className="bg-teal-600 hover:bg-teal-700 text-white shadow-md transition-all active:scale-95" 
                      onClick={() => setScheduleDialogOpen(true)}
                    >
                      Schedule Interview
                    </Button>
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
                            <p className="text-xs text-muted-foreground mb-1 font-medium">Conducted Date</p>
                            <p className="font-semibold text-blue-900">{selected.screening.conductedAt ? format(new Date(selected.screening.conductedAt), "MMM d, yyyy") : (selected.screening.scheduledTime ? format(new Date(selected.screening.scheduledTime), "MMM d, yyyy") : '—')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1 font-medium">Time</p>
                            <p className="font-semibold text-blue-900">{selected.screening.conductedAt ? format(new Date(selected.screening.conductedAt), "h:mm a") : (selected.screening.scheduledTime ? format(new Date(selected.screening.scheduledTime), "h:mm a") : '—')}</p>
                          </div>
                        </div>

                        {selected.screening.overallRating != null && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-muted-foreground font-medium">Overall Rating</p>
                              <p className="font-bold text-blue-900">{selected.screening.overallRating}%</p>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={cn(
                                  "h-2 rounded-full transition-all",
                                  selected.screening.overallRating >= 80 ? 'bg-green-500' :
                                  selected.screening.overallRating >= 60 ? 'bg-blue-500' :
                                  'bg-amber-500'
                                )}
                                style={{ width: `${Math.min(selected.screening.overallRating, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {selected.screening.remarks && (
                          <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                            <p className="text-xs text-muted-foreground font-medium mb-1">Remarks</p>
                            <p className="text-sm text-slate-700 line-clamp-4">{selected.screening.remarks}</p>
                          </div>
                        )}

                        {(selected.screening.strengths || selected.screening.areasOfImprovement) && (
                          <div className="grid grid-cols-1 gap-2">
                            {selected.screening.strengths && (
                              <div className="bg-green-50/50 rounded-lg p-2 border border-green-100">
                                <p className="text-xs text-green-700 font-medium mb-1">✓ Strengths</p>
                                <p className="text-xs text-slate-700 line-clamp-2">{selected.screening.strengths}</p>
                              </div>
                            )}
                            {selected.screening.areasOfImprovement && (
                              <div className="bg-amber-50/50 rounded-lg p-2 border border-amber-100">
                                <p className="text-xs text-amber-700 font-medium mb-1">⚠ Areas for Improvement</p>
                                <p className="text-xs text-slate-700 line-clamp-2">{selected.screening.areasOfImprovement}</p>
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
                        <p className="font-medium capitalize text-emerald-800">{selected.subStatus?.label || "Sent to client"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                        <p className="font-medium text-emerald-800">{selected.updatedAt ? format(new Date(selected.updatedAt), "MMM d, yyyy • h:mm a") : "-"}</p>
                      </div>
                    </div>

                    {selected.latestForward?.sender && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        <p className="mb-0">Forwarded to client by <span className="font-medium text-emerald-800">{selected.latestForward.sender.name}</span> on {selected.latestForward.sentAt ? format(new Date(selected.latestForward.sentAt), "MMM d, yyyy • h:mm a") : '-'}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-30 text-teal-400" />
                <p className="font-medium">No shortlisted candidates</p>
                <p className="text-sm">Select from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ScheduleInterviewDialog
        open={scheduleDialogOpen}
        onOpenChange={(open) => setScheduleDialogOpen(open)}
        initialCandidateProjectMapId={selected?.id}
        initialCandidateName={selected?.candidate ? `${selected.candidate.firstName} ${selected.candidate.lastName}` : "Unknown"}
        initialProjectName={selected?.project?.title || "Unknown"}
      />

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

      <BulkScheduleInterviewModal
        open={bulkScheduleModalOpen}
        onOpenChange={setBulkScheduleModalOpen}
        selectedCandidates={selectedCandidatesForBulk}
        onSubmit={handleBulkSchedule}
        isSubmitting={isSchedulingBulk}
      />
    </div>
  );
}
