import { Link, useNavigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import type { ElementType } from "react";
import { useGetCandidateInterviewWorkflowQuery, useGetStatusConfigQuery } from "../api";
import { CLIENT_INTERVIEW_SUB_STATUS_NAMES } from "@/constants/statuses";
import {
  WorkflowFilterTiles,
  WorkflowPageHeader,
  buildAllStatusTiles,
} from "../components/candidate-workflow-page-ui";
import { Button } from "@/components/ui/button";
import {
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  UserCheck,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  MessageSquare,
  Video,
  MapPin,
  Hash,
  X,
} from "lucide-react";

const CLIENT_INTERVIEW_NAME_SET = new Set<string>(CLIENT_INTERVIEW_SUB_STATUS_NAMES);
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import LoadingScreen from "@/components/atoms/LoadingScreen";
import {
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function getInterviewSubStatusTileIcon(name?: string): ElementType {
  const key = name?.toLowerCase() ?? "";
  if (key.includes("passed") || key.includes("selected")) return UserCheck;
  if (key.includes("failed") || key.includes("not_shortlisted")) return XCircle;
  if (key.includes("scheduled") || key.includes("assigned") || key.includes("rescheduled")) return Clock;
  if (key.includes("shortlisted")) return CheckCircle2;
  return Phone;
}

export default function CandidateInterviewWorkflowPage() {
  const { id: candidateId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({
    search: "",
    subStatus: "all",
    page: 1,
    limit: 5
  });

  const { data: statusConfigResponse } = useGetStatusConfigQuery({ mainStage: "interview" });
  const subStatuses = useMemo(() => {
    const all = Array.isArray(statusConfigResponse?.data?.subStatuses)
      ? statusConfigResponse.data.subStatuses
      : [];
    return all.filter((ss: { name?: string }) =>
      ss.name ? CLIENT_INTERVIEW_NAME_SET.has(ss.name) : false,
    );
  }, [statusConfigResponse]);

  const { data: response, isLoading, error } = useGetCandidateInterviewWorkflowQuery({
    candidateId: candidateId!,
    subStatus: filters.subStatus === "all" ? undefined : filters.subStatus,
    search: filters.search || undefined,
    page: filters.page,
    limit: filters.limit,
  });

  const candidate = response?.candidate;
  const projects = response?.projects || [];
  const pagination = response?.pagination;
  const subStatusCounts = response?.subStatusCounts ?? [];
  const totalAll = response?.totalAll ?? pagination?.total ?? 0;

  const countBySubStatusId = useMemo(() => {
    const counts = subStatusCounts as Array<{ subStatusId: string; count: number }>;
    return counts.reduce<Record<string, number>>((acc, row) => {
      acc[row.subStatusId] = row.count;
      return acc;
    }, {});
  }, [subStatusCounts]);

  const statusTiles = useMemo(
    () => buildAllStatusTiles(subStatuses, countBySubStatusId, totalAll, getInterviewSubStatusTileIcon),
    [subStatuses, countBySubStatusId, totalAll],
  );

  const activeStatusTile = useMemo(
    () => statusTiles.find((tile) => tile.id === filters.subStatus),
    [statusTiles, filters.subStatus],
  );

  const activeFilterLabel =
    filters.subStatus === "all"
      ? "All statuses"
      : activeStatusTile?.label ?? "Filtered";

  const filteredCount =
    filters.subStatus === "all" ? pagination?.total ?? 0 : activeStatusTile?.count ?? 0;

  const hasActiveFilters = filters.search || filters.subStatus !== "all";

  const clearFilters = () => setFilters({ search: "", subStatus: "all", page: 1, limit: 5 });

  if (isLoading) return <LoadingScreen />;
  if (error || !candidate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-slate-800">Error loading interview details</h2>
        <p className="text-sm text-slate-500">Something went wrong while fetching the data.</p>
        <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
      </div>
    );
  }

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome?.toLowerCase()) {
      case "passed":
      case "approved":
      case "selected":
        return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px] gap-1"><UserCheck className="h-3 w-3" /> Passed</Badge>;
      case "failed":
      case "rejected":
        return <Badge className="bg-red-50 text-red-700 border border-red-200 font-semibold text-[10px] gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
      case "pending":
      case "scheduled":
      default:
        return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[10px] gap-1"><Clock className="h-3 w-3" /> {outcome || 'Scheduled'}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 space-y-6 min-h-screen">
      <WorkflowPageHeader
        theme="interview"
        candidateId={candidateId!}
        candidate={candidate}
        breadcrumbSegment="Interview"
        workflowBadge="Client interview workflow"
        description="Track client interviews and shortlisting across nominated projects"
        stageLabel="Client Interview"
        badgeIcon={Phone}
        avatarBadgeIcon={Phone}
        totalAll={totalAll}
        filteredCount={filteredCount}
        activeFilterLabel={activeFilterLabel}
        onBack={() => navigate(-1)}
      />

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-white p-3 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search projects by title..."
            className="pl-10 h-10 border-slate-200 focus-visible:ring-purple-500 rounded-lg bg-slate-50"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
          />
        </div>
        {hasActiveFilters && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-lg text-slate-600 border-slate-200 shrink-0"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear filters
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset search and status filter</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <WorkflowFilterTiles
        sectionLabel="Filter by interview status"
        tiles={statusTiles}
        selectedId={filters.subStatus}
        onSelect={(id) => setFilters((prev) => ({ ...prev, subStatus: id, page: 1 }))}
      />

      {projects.length === 0 ? (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center p-16 text-center bg-white rounded-2xl">
          <div className="p-5 bg-slate-50 rounded-full mb-4">
            <Phone className="h-10 w-10 text-slate-300" />
          </div>
          <p className="text-slate-600 font-semibold text-lg">No Projects Found</p>
          <p className="text-slate-400 text-sm mt-1 max-w-sm">No projects match the current filters in the interview stage.</p>
          <Button onClick={clearFilters} variant="outline" className="mt-5 rounded-lg">
            <X className="h-4 w-4 mr-2" /> Clear Filters
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <Accordion type="single" collapsible className="space-y-3">
            {projects.map((p: any) => (
              <AccordionItem key={p.id} value={`project-${p.id}`} className="border-none">
                <Card className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all rounded-xl bg-white">
                  <div className="flex items-center gap-2 px-5 py-4 [&:has([data-state=open])]:bg-gradient-to-r [&:has([data-state=open])]:from-slate-50 [&:has([data-state=open])]:to-purple-50/30">
                    <AccordionTrigger className="flex-1 px-0 py-0 hover:no-underline">
                      <div className="flex flex-1 items-center text-left gap-3 min-w-0 pr-2">
                        <div className="flex items-center justify-center h-10 w-10 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-lg font-bold text-sm shrink-0">
                          <Hash className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900 truncate">{p.project?.title || "Unnamed Project"}</h3>
                            <span className="text-[10px] text-slate-400 font-medium">by {p.project?.client?.name || "Unknown Client"}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                             <Badge variant="outline" className="text-[10px] h-5 px-2 font-semibold bg-indigo-50 text-indigo-600 border-indigo-200 gap-1">
                               <Briefcase className="h-3 w-3" />
                               {p.roleNeeded?.designation || p.roleNeeded?.roleCatalog?.name || "N/A"}
                             </Badge>
                             <Badge variant="outline" className="text-[10px] h-5 px-2 font-semibold bg-purple-50 text-purple-600 border-purple-200">
                               {p.subStatus?.label || p.subStatus?.name || "N/A"}
                             </Badge>
                             <Badge variant="outline" className="text-[10px] h-5 px-2 font-semibold bg-slate-50 text-slate-500 border-slate-200 gap-1">
                               <Phone className="h-3 w-3" /> {p.interviews?.length || 0} Interviews
                             </Badge>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="hidden md:inline-flex shrink-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50 group h-8 font-semibold text-xs rounded-lg border-purple-200"
                    >
                      <Link to={`/projects/${p.projectId}`}>
                        View Project <ExternalLink className="ml-1.5 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                  
                  <AccordionContent className="p-0">
                    <div className="px-5 pb-5 border-t border-slate-100">
                      {/* Client Interviews Section */}
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                           <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                              <Video className="h-3.5 w-3.5 text-purple-500" /> Client Interviews
                           </h4>
                           <span className="text-[10px] text-slate-400">{p.interviews?.length || 0} interviews</span>
                        </div>
                        
                        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow className="hover:bg-transparent border-b border-slate-200">
                                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase px-4 h-9 w-[25%]">Details</TableHead>
                                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase h-9 w-[15%]">Badge</TableHead>
                                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase h-9 w-[15%]">Status</TableHead>
                                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase h-9 w-[15%]">Scheduled By</TableHead>
                                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase h-9 w-[15%]">Mode</TableHead>
                                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase h-9 w-[15%]">Location/Link</TableHead>
                                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase text-right px-4 h-9 w-[15%]">Scheduled At</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {p.interviews?.length > 0 ? (
                                p.interviews.map((i: any, iIndex: number) => (
                                  <TableRow key={i.id} className={`hover:bg-purple-50/40 transition-colors ${iIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                    <TableCell className="px-4 py-3">
                                      <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 bg-purple-50 rounded-md text-purple-500 shrink-0">
                                          <Video className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-[12px] font-semibold text-slate-800">
                                            Client Interview
                                          </p>
                                          <p className="text-[10px] text-slate-500 mt-0.5">
                                            Client Representative
                                          </p>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 text-[9px] px-1.5 py-0">Interview</Badge>
                                    </TableCell>
                                    <TableCell>
                                      {getOutcomeBadge(i.outcome || i.status)}
                                    </TableCell>
                                    <TableCell>
                                      {i.scheduledBy ? (
                                        <div className="flex items-center gap-1.5">
                                          <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500 border border-slate-200 overflow-hidden shrink-0">
                                            {i.scheduledBy.profileImage ? (
                                              <img src={i.scheduledBy.profileImage} alt={i.scheduledBy.name} className="h-full w-full object-cover" />
                                            ) : (
                                              i.scheduledBy.name?.charAt(0) || "U"
                                            )}
                                          </div>
                                          <span className="text-[10px] font-medium text-slate-600 truncate max-w-[80px]">
                                            {i.scheduledBy.name || "System"}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-xs text-slate-600 capitalize">{i.mode || "Online"}</span>
                                    </TableCell>
                                    <TableCell>
                                      {i.meetingLink ? (
                                        <a href={i.meetingLink} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                                          Join Link <ExternalLink className="h-2.5 w-2.5" />
                                        </a>
                                      ) : i.location ? (
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                          <MapPin className="h-2.5 w-2.5" /> {i.location}
                                        </span>
                                      ) : <span className="text-[10px] text-slate-300">—</span>}
                                    </TableCell>
                                    <TableCell className="text-right px-4">
                                      <p className="text-[11px] font-medium text-slate-600">
                                        {i.scheduledTime ? format(new Date(i.scheduledTime), "dd MMM yyyy") : "—"}
                                      </p>
                                      <p className="text-[10px] text-slate-400">
                                        {i.scheduledTime ? format(new Date(i.scheduledTime), "HH:mm") : ""}
                                      </p>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={6} className="h-20 text-center">
                                    <span className="text-sm text-slate-400">No interviews recorded</span>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      
                      {/* Notes/Outcome Summary */}
                      <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                         <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="h-4 w-4 text-slate-400" />
                            <h5 className="text-xs font-bold text-slate-700 uppercase">Outcome Summary</h5>
                         </div>
                         <p className="text-xs text-slate-500 leading-relaxed">
                            Candidate is currently in the <strong>{p.subStatus?.label || p.subStatus?.name}</strong> sub-status for this project. 
                            The last recorded activity was on {p.updatedAt ? format(new Date(p.updatedAt), "dd MMM yyyy") : "recent date"}.
                         </p>
                      </div>

                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500">
                Page <span className="text-slate-800 font-semibold">{filters.page}</span> of <span className="text-slate-800 font-semibold">{pagination.totalPages}</span>
                <span className="hidden md:inline text-slate-400 ml-2">({pagination.total} projects total)</span>
              </p>
              <div className="flex items-center gap-1.5">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={filters.page === 1}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  className="rounded-lg h-8 px-3 text-xs border-slate-200"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={filters.page === pagination.totalPages}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  className="rounded-lg h-8 px-3 text-xs border-slate-200"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
