import { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ClipboardCheck, Loader2, AlertCircle, User, Briefcase, Calendar, ChevronRight, X, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ImageViewer from "@/components/molecules/ImageViewer";
import ProjectRoleFilter from "@/components/molecules/ProjectRoleFilter";
import { getAge } from "@/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetUpcomingScreeningsQuery } from "../data";
import { EditScreeningDialog } from "../components";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function UpcomingInterviewsListPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [filters, setFilters] = useState({ search: "", projectId: "all", roleCatalogId: "all" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const s = (location.state as any)?.selectedId;
    if (s) setSelectedId(s);
  }, [location.state]);

  const { data, isLoading, error } = useGetUpcomingScreeningsQuery({
    page: 1,
    limit: 15,
    projectId: filters.projectId === "all" ? undefined : filters.projectId,
    roleCatalogId: filters.roleCatalogId === "all" ? undefined : filters.roleCatalogId,
  });
  const items = data?.data?.items || [];

  const filteredItems = useMemo(() => {
    if (!filters.search) return items;
    const term = filters.search.toLowerCase();
    return items.filter((it) => {
      const cand = it.candidateProjectMap?.candidate;
      const role = it.candidateProjectMap?.roleNeeded;
      return (
        cand?.firstName?.toLowerCase().includes(term) ||
        cand?.lastName?.toLowerCase().includes(term) ||
        it.candidateProjectMap?.project?.title?.toLowerCase().includes(term) ||
        role?.designation?.toLowerCase().includes(term)
      );
    });
  }, [items, filters.search]);

  const selected = useMemo(() => {
    if (selectedId) return filteredItems.find((i) => i.id === selectedId) || null;
    return filteredItems[0] || null;
  }, [filteredItems, selectedId]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
        <Alert variant="destructive" className="max-w-sm rounded-xl shadow-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">Failed to load upcoming screenings</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Compact Header */}
      <header className="border-b bg-white/95 backdrop-blur-2xl shadow-sm sticky top-0 z-20">
        <div className="px-4 py-2.5 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative p-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg shadow-md transform transition-transform duration-200 group-hover:scale-105">
                  <ClipboardCheck className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Upcoming Screenings
                </h1>
                <p className="text-xs text-slate-500">Scheduled & assigned</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs px-3 h-8"
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-600 transition-transform duration-300 group-focus-within:scale-110" />
              <Input
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                className="pl-10 h-8 text-xs rounded-lg border-indigo-200/50 bg-white/90 shadow-inner hover:shadow-md focus:shadow-lg transition-all duration-200 focus:ring-1 focus:ring-indigo-400/30 focus:border-indigo-400"
              />
            </div>

            <ProjectRoleFilter
              value={{ projectId: filters.projectId, roleCatalogId: filters.roleCatalogId }}
              onChange={(v) => setFilters((p) => ({ ...p, projectId: v.projectId, roleCatalogId: v.roleCatalogId }))}
              className="flex-nowrap min-w-[220px]"
            />

            {(filters.search || filters.projectId !== "all" || filters.roleCatalogId !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs rounded-lg hover:bg-indigo-50"
                onClick={() => setFilters({ search: "", projectId: "all", roleCatalogId: "all" })}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )} 
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Compact Left Panel */}
        <div className="w-72 border-r bg-white/90 backdrop-blur-2xl shadow-md overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            {filteredItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <ClipboardCheck className="h-12 w-12 text-indigo-300/70 mb-3" />
                <p className="text-base font-medium text-slate-700">No screenings</p>
                <p className="text-xs text-slate-500 mt-1">Scheduled ones appear here</p>
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {filteredItems.map((it) => {
                  const candidate = it.candidateProjectMap?.candidate;
                  const role = it.candidateProjectMap?.roleNeeded;
                  const isSelected = it.id === (selected?.id || filteredItems[0]?.id);
                  const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown";

                  return (
                    <button
                      key={it.id}
                      onClick={() => setSelectedId(it.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all duration-200 group relative overflow-hidden shadow-sm text-xs",
                        isSelected
                          ? "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-400/50 shadow-md ring-1 ring-indigo-300/30"
                          : "bg-white border-slate-200/70 hover:border-indigo-300 hover:shadow-md"
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-opacity duration-300" />

                      <div className="relative flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <ImageViewer
                            src={candidate?.profileImage}
                            fallbackSrc=""
                            title={candidateName}
                            className="h-9 w-9 rounded-full"
                            enableHoverPreview={false}
                          />

                          <div className="min-w-0">
                            <p className="font-medium truncate group-hover:text-indigo-700 transition-colors">
                              {candidateName}
                            </p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {role?.designation || "Unknown Role"}
                            </p>
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                              {candidate ? (`${getAge(candidate.dateOfBirth) ? `${getAge(candidate.dateOfBirth)} yrs` : 'Age N/A'} • ${candidate.gender ? (candidate.gender.charAt(0) + candidate.gender.slice(1).toLowerCase()) : 'Gender N/A'}`) : null}
                            </p>
                          </div>
                        </div>

                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-all duration-200",
                            isSelected ? "text-indigo-600 translate-x-1" : "text-slate-400 group-hover:text-slate-600"
                          )}
                        />
                      </div>

                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 shadow-sm">
                          <Calendar className="h-3 w-3" />
                          <span className="capitalize">Scheduled</span>
                        </div>
                        {it.candidateProjectMap?.recruiter && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            {it.candidateProjectMap.recruiter.name}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {it.scheduledTime ? format(new Date(it.scheduledTime), "MMM d 'at' h:mm a") : "Not scheduled"}
                        </span>
                      </div>

                      {(it as any).isExpired && (
                        <div className="absolute bottom-2 right-2">
                          <Badge variant="destructive" className="text-xs px-2 py-0.5">
                            Expired
                          </Badge>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Compact Right Panel */}
        <div className="flex-1 overflow-hidden bg-gradient-to-b from-white to-indigo-50/20">
          {selected ? (
            <ScrollArea className="h-full">
              <div className="p-5 max-w-4xl mx-auto space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-indigo-200/50">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent truncate">
                      Screening Details
                    </h2>
                    <p className="text-xs text-slate-600">
                      {selected.scheduledTime
                        ? format(new Date(selected.scheduledTime), "MMM d 'at' h:mm a")
                        : "Not scheduled"}
                    </p>
                  </div>

                  {!selected.conductedAt && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        className="h-8 px-4 text-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg shadow-md transition-all"
                        onClick={() => {
                          if (!selected?.id) {
                            toast.error("Screening ID is missing");
                            return;
                          }
                          navigate(`/screenings/${selected.id}/conduct`);
                        }}
                      >
                        Conduct
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-4 text-xs rounded-lg border-indigo-300 hover:bg-indigo-50 transition-all"
                        onClick={() => setEditOpen(true)}
                      >
                        Edit
                      </Button>

                      {selected && (
                        <EditScreeningDialog
                          open={editOpen}
                          onOpenChange={setEditOpen}
                          screeningId={selected.id}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Candidate & Project */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-50/90 to-purple-50/90 rounded-xl overflow-visible">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Candidate
                      </h3>
                      <div className="flex items-start gap-4">
                        <ImageViewer
                          src={selected.candidateProjectMap?.candidate?.profileImage}
                          fallbackSrc=""
                          title={`${selected.candidateProjectMap?.candidate?.firstName || ''} ${selected.candidateProjectMap?.candidate?.lastName || ''}`.trim() || 'Profile image'}
                          className="h-20 w-20 rounded-lg"
                          enableHoverPreview={true}
                          hoverPosition="right"
                          previewClassName="w-64 h-64"
                        />

                        <div className="space-y-2 text-xs w-full">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-slate-500">Name</p>
                              <p className="font-medium text-slate-900">{selected.candidateProjectMap?.candidate ? `${selected.candidateProjectMap.candidate.firstName} ${selected.candidateProjectMap.candidate.lastName}` : 'Unknown'}</p>
                            </div>

                            {selected.candidateProjectMap?.candidate?.phone && (
                              <div>
                                <p className="text-xs text-slate-500">Phone</p>
                                <p className="font-medium text-slate-900">{selected.candidateProjectMap.candidate.phone}</p>
                              </div>
                            )}

                            {selected.candidateProjectMap?.candidate?.dateOfBirth && (
                              <div>
                                <p className="text-xs text-slate-500">Age</p>
                                <p className="font-medium text-slate-900">{getAge(selected.candidateProjectMap.candidate.dateOfBirth) ? `${getAge(selected.candidateProjectMap.candidate.dateOfBirth)} yrs` : 'N/A'}</p>
                              </div>
                            )}

                            {selected.candidateProjectMap?.candidate?.gender && (
                              <div>
                                <p className="text-xs text-slate-500">Gender</p>
                                <p className="font-medium text-slate-900">{selected.candidateProjectMap.candidate.gender.charAt(0) + selected.candidateProjectMap.candidate.gender.slice(1).toLowerCase()}</p>
                              </div>
                            )}

                            {selected.candidateProjectMap?.candidate?.experience !== undefined && (
                              <div>
                                <p className="text-xs text-slate-500">Experience</p>
                                <p className="font-medium text-slate-900">{selected.candidateProjectMap.candidate.experience} yrs</p>
                              </div>
                            )}

                            {selected.candidateProjectMap?.candidate?.totalExperience !== undefined && (
                              <div>
                                <p className="text-xs text-slate-500">Total Experience</p>
                                <p className="font-medium text-slate-900">{selected.candidateProjectMap.candidate.totalExperience} yrs</p>
                              </div>
                            )}
                          </div>

                          {/* Qualifications */}
                          {selected.candidateProjectMap?.candidate?.qualifications?.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-slate-500">Qualifications</p>
                              <ul className="mt-1 space-y-2 text-xs">
                                {selected.candidateProjectMap.candidate.qualifications.map((q: any) => (
                                  <li key={q.id} className="text-sm">
                                    <div className="font-medium text-slate-900">{q.qualification?.shortName || q.qualification?.name || 'Qualification'}</div>
                                    <div className="text-xs text-slate-500">{q.university ? `${q.university}${q.graduationYear ? ` • ${q.graduationYear}` : ''}` : (q.graduationYear ? `Graduated ${q.graduationYear}` : '')}{q.gpa !== undefined && q.gpa !== null ? ` • GPA ${q.gpa}` : ''}</div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Work experiences */}
                          {selected.candidateProjectMap?.candidate?.workExperiences?.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-slate-500">Work experience</p>
                              <ul className="mt-1 space-y-2 text-xs">
                                {selected.candidateProjectMap.candidate.workExperiences.slice().sort((a: any, b: any) => (new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime())).map((w: any) => (
                                  <li key={w.id} className="text-sm">
                                    <div className="font-medium text-slate-900">{w.jobTitle || 'Role'}{w.companyName ? ` • ${w.companyName}` : ''}</div>
                                    <div className="text-xs text-slate-500">{w.startDate ? format(new Date(w.startDate), 'MMM yyyy') : ''}{w.endDate ? ` — ${format(new Date(w.endDate), 'MMM yyyy')}` : (w.isCurrent ? ' — Present' : '')}</div>
                                    {w.description && <div className="text-xs text-slate-500 mt-1">{w.description}</div>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50/90 to-pink-50/90 rounded-xl overflow-hidden">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-purple-700 mb-3 flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Project & Role
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div>
                          <p className="text-xs text-slate-500">Project</p>
                          <p className="font-medium text-slate-900">{selected.candidateProjectMap?.project?.title || "N/A"}</p>

                          {selected.candidateProjectMap?.project?.client?.name && (
                            <>
                              <p className="text-xs text-slate-500 mt-1">Client</p>
                              <p className="font-medium text-slate-900">{selected.candidateProjectMap.project.client.name}</p>
                            </>
                          )}

                          {selected.candidateProjectMap?.project?.deadline && (
                            <>
                              <p className="text-xs text-slate-500 mt-2">Deadline</p>
                              <p className="font-medium text-slate-900">{format(new Date(selected.candidateProjectMap.project.deadline), "MMM d, yyyy")}</p>
                            </>
                          )}

                          {selected.candidateProjectMap?.project?.country?.name && (
                            <>
                              <p className="text-xs text-slate-500 mt-2">Country</p>
                              <p className="font-medium text-slate-900">{selected.candidateProjectMap.project.country.name}</p>
                            </>
                          )}

                          {selected.candidateProjectMap?.project?.priority && (
                            <>
                              <p className="text-xs text-slate-500 mt-2">Priority</p>
                              <p className="font-medium text-slate-900 capitalize">{selected.candidateProjectMap.project.priority}</p>
                            </>
                          )}

                          {selected.candidateProjectMap?.project?.documentRequirements?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-slate-500">Document requirements</p>
                              <ul className="mt-1 space-y-1 text-xs">
                                {selected.candidateProjectMap.project.documentRequirements.map((d: any) => (
                                  <li key={d.id} className="flex items-center gap-2">
                                    <span className="font-medium text-slate-900">{(d.docType || d.description || d.id).toString().replace(/_/g, ' ')}</span>
                                    {d.mandatory && <span className="ml-2 text-xxs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Required</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">Role</p>
                          <p className="font-medium text-slate-900">{selected.candidateProjectMap?.roleNeeded?.designation || "N/A"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Interview Details */}
                <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50/90 to-teal-50/90 rounded-xl overflow-hidden">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-emerald-700 mb-3">Interview Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-xs text-slate-500">Mode</p>
                        <p className="font-medium capitalize text-slate-900">
                          {selected.mode?.replace('_', ' ') || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Status</p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium capitalize text-slate-900">
                            {(selected.candidateProjectMap as any)?.subStatus?.label ||
                              (selected.candidateProjectMap as any)?.subStatus?.name ||
                              "Scheduled"}
                          </p>
                          {(selected as any).isExpired && (
                            <Badge variant="destructive" className="text-xs px-2.5 py-0.5">
                              Expired
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {selected.notes && (
                      <div className="mt-4 pt-4 border-t border-emerald-200/50">
                        <p className="text-xs text-slate-500 mb-1">Notes</p>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap">
                          {selected.notes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-center bg-gradient-to-b from-white to-indigo-50/20">
              <div className="space-y-4 max-w-sm">
                <ClipboardCheck className="h-16 w-16 text-indigo-300/70 mx-auto" />
                <p className="text-xl font-semibold text-slate-700">No Screening Selected</p>
                <p className="text-sm text-slate-600">
                  Select from the list to view details or conduct
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}