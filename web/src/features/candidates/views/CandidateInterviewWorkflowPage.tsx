import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useGetCandidateInterviewWorkflowQuery } from "../api";
import { WorkflowStatusDropdown } from "../components/WorkflowStatusDropdown";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Phone, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Building2,
  Calendar,
  ExternalLink,
  UserCheck,
  XCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  User,
  Star,
  MessageSquare,
  ClipboardList,
  Video,
  MapPin,
  Hash,
  X,
  Target
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import LoadingScreen from "@/components/atoms/LoadingScreen";
import { ImageViewer } from "@/components/molecules/ImageViewer";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

export default function CandidateInterviewWorkflowPage() {
  const { id: candidateId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({
    search: "",
    subStatus: "all",
    page: 1,
    limit: 5
  });

  const { data: response, isLoading, error } = useGetCandidateInterviewWorkflowQuery({
    candidateId: candidateId!,
    subStatus: filters.subStatus === "all" ? undefined : filters.subStatus,
    search: filters.search || undefined,
    page: filters.page,
    limit: filters.limit
  });

  const candidate = response?.candidate;
  const projects = response?.projects || [];
  const pagination = response?.pagination;

  const hasActiveFilters = filters.search || filters.subStatus !== "all";

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
      case "needs_training":
        return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[10px] gap-1"><Target className="h-3 w-3" /> Needs Training</Badge>;
      case "pending":
      case "scheduled":
      default:
        return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[10px] gap-1"><Clock className="h-3 w-3" /> {outcome || 'Scheduled'}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-2xl shadow-lg text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl hover:bg-white/10 text-white border border-white/20 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="relative shrink-0">
              <ImageViewer 
                src={candidate.profileImage}
                title={`${candidate.firstName} ${candidate.lastName}`}
                className="h-16 w-16 rounded-2xl border-2 border-white/30 shadow-lg"
                enableHoverPreview={true}
              />
              <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 border-2 border-white rounded-full shadow-sm z-10" title="Active" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {candidate.firstName} {candidate.lastName}
              </h1>
              <Badge className="bg-white/20 text-white border-white/30 font-semibold px-3 py-1 rounded-full text-xs w-fit">
                <Phone className="h-3 w-3 mr-1" /> Interview Stage
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-purple-100 mt-2">
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {format(new Date(), "dd MMM yyyy")}</span>
              <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {pagination?.total || 0} Projects</span>
              {candidate.email && (
                <span className="flex items-center gap-1.5 opacity-80"><User className="h-3.5 w-3.5" /> {candidate.email}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center bg-white p-3 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search projects by title..." 
            className="pl-10 h-10 border-slate-200 focus-visible:ring-purple-500 rounded-lg bg-slate-50"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-2">
            <Filter className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
              Stage:
            </span>
          </div>
          
          <WorkflowStatusDropdown
            mainStatusName="interview"
            selectedSubStatus={filters.subStatus === "all" ? undefined : filters.subStatus}
            onSubStatusSelect={(val) => setFilters(prev => ({ ...prev, subStatus: val, page: 1 }))}
            label="All Sub-Statuses"
          />

          {hasActiveFilters && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => setFilters({ search: "", subStatus: "all", page: 1, limit: 5 })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear Filters</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {projects.length === 0 ? (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center p-16 text-center bg-white rounded-2xl">
          <div className="p-5 bg-slate-50 rounded-full mb-4">
            <Phone className="h-10 w-10 text-slate-300" />
          </div>
          <p className="text-slate-600 font-semibold text-lg">No Projects Found</p>
          <p className="text-slate-400 text-sm mt-1 max-w-sm">No projects match the current filters in the interview stage.</p>
          <Button onClick={() => setFilters({ search: "", subStatus: "all", page: 1, limit: 5 })} variant="outline" className="mt-5 rounded-lg">
            <X className="h-4 w-4 mr-2" /> Clear Filters
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <Accordion type="single" collapsible className="space-y-3" defaultValue={`project-${projects[0].id}`}>
            {projects.map((p: any) => (
              <AccordionItem key={p.id} value={`project-${p.id}`} className="border-none">
                <Card className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all rounded-xl bg-white">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]]:bg-gradient-to-r [&[data-state=open]]:from-slate-50 [&[data-state=open]]:to-purple-50/30">
                    <div className="flex flex-1 items-center justify-between text-left gap-4">
                      <div className="flex items-center gap-3 min-w-0">
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
                               <Phone className="h-3 w-3" /> {(p.screenings?.length || 0) + (p.interviews?.length || 0)} Rounds
                             </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="hidden md:block shrink-0">
                         <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 group h-8 font-semibold text-xs rounded-lg border-purple-200"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/projects/${p.projectId}`);
                            }}
                         >
                            View Project <ExternalLink className="ml-1.5 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                         </Button>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="p-0">
                    <div className="px-5 pb-5 border-t border-slate-100">
                     
                      {/* Internal Screenings Section */}
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                           <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                              <ClipboardList className="h-3.5 w-3.5 text-blue-500" /> Internal Screenings
                           </h4>
                           <span className="text-[10px] text-slate-400">{p.screenings?.length || 0} screenings</span>
                        </div>
                        
                        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow className="hover:bg-transparent border-b border-slate-200">
                                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase px-4 h-9 w-[25%]">Details</TableHead>
                                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase h-9 w-[15%]">Badge</TableHead>
                                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase h-9 w-[15%]">Status</TableHead>
                                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase h-9 w-[15%]">Scheduled By</TableHead>
                                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase h-9 w-[8%] text-center">Rating</TableHead>
                                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase h-9 w-[22%]">Remarks</TableHead>
                                <TableHead className="text-[11px] font-semibold text-slate-500 uppercase text-right px-4 h-9 w-[15%]">Scheduled At</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {p.screenings?.length > 0 ? (
                                p.screenings.map((s: any, sIndex: number) => (
                                  <TableRow key={s.id} className={`hover:bg-blue-50/40 transition-colors ${sIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                    <TableCell className="px-4 py-3">
                                      <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 bg-blue-50 rounded-md text-blue-500 shrink-0">
                                          <User className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-[12px] font-semibold text-slate-800">
                                            Internal Screening
                                          </p>
                                          <p className="text-[10px] text-slate-500 mt-0.5">
                                            {s.interviewer || "Coordinator"}
                                          </p>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-[9px] px-1.5 py-0">Screening</Badge>
                                    </TableCell>
                                    <TableCell>
                                      {getOutcomeBadge(s.status || s.decision)}
                                    </TableCell>
                                    <TableCell>
                                      {s.scheduledBy ? (
                                        <div className="flex items-center gap-1.5">
                                          <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500 border border-slate-200 overflow-hidden shrink-0">
                                            {s.scheduledBy.profileImage ? (
                                              <img src={s.scheduledBy.profileImage} alt={s.scheduledBy.name} className="h-full w-full object-cover" />
                                            ) : (
                                              s.scheduledBy.name?.charAt(0) || "U"
                                            )}
                                          </div>
                                          <span className="text-[10px] font-medium text-slate-600 truncate max-w-[80px]">
                                            {s.scheduledBy.name || "System"}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-slate-700">
                                      {s.overallRating ? (
                                        <div className="flex items-center justify-center gap-1 text-amber-500">
                                          <Star className="h-3 w-3 fill-current" />
                                          <span className="text-xs">{s.overallRating}</span>
                                        </div>
                                      ) : "—"}
                                    </TableCell>
                                    <TableCell>
                                      <div className="max-w-[180px]">
                                        <p className="text-[10px] text-slate-500 line-clamp-2">
                                          {s.remarks || "No remarks provided."}
                                        </p>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right px-4">
                                      <p className="text-[11px] font-medium text-slate-600">
                                        {s.scheduledTime ? format(new Date(s.scheduledTime), "dd MMM yyyy") : "—"}
                                      </p>
                                      <p className="text-[10px] text-slate-400">
                                        {s.scheduledTime ? format(new Date(s.scheduledTime), "HH:mm") : ""}
                                      </p>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={6} className="h-20 text-center">
                                    <span className="text-sm text-slate-400">No screenings recorded</span>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Client Interviews Section */}
                      <div className="mt-8">
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
                                            {i.type || "Client Interview"}
                                          </p>
                                          <p className="text-[10px] text-slate-500 mt-0.5">
                                            {i.interviewer || "Client Representative"}
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
