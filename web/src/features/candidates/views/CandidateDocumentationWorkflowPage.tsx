import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useGetCandidateDocumentationWorkflowQuery, useGetStatusConfigQuery } from "../api";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Building2,
  Calendar,
  ExternalLink,
  UserCheck,
  XCircle,
  History,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Briefcase,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  FileWarning,
  Hash,
  X
} from "lucide-react";
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
  Select, 
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
import { PDFViewer } from "@/components/molecules/PDFViewer";

export default function CandidateDocumentationWorkflowPage() {
  const { id: candidateId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({
    search: "",
    subStatus: "all",
    page: 1,
    limit: 5
  });

  const [pdfConfig, setPdfConfig] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: "",
    title: ""
  });

  const { data: statusConfigResponse } = useGetStatusConfigQuery({ mainStage: 'documents' });
  const subStatuses = Array.isArray(statusConfigResponse?.data?.subStatuses) 
    ? statusConfigResponse.data.subStatuses 
    : [];

  const { data: response, isLoading, error } = useGetCandidateDocumentationWorkflowQuery({
    candidateId: candidateId!,
    subStatus: filters.subStatus === "all" ? undefined : filters.subStatus,
    search: filters.search || undefined,
    page: filters.page,
    limit: filters.limit
  });

  const candidate = response?.candidate;
  const projects = response?.projects || [];
  const pagination = response?.pagination;

  const getProjectStats = (p: any) => {
    let totalDocs = 0, verified = 0, pending = 0, rejected = 0;
    p.documentVerifications?.forEach((dv: any) => {
      totalDocs++;
      const s = dv.status?.toLowerCase();
      if (s === 'verified') verified++;
      else if (s === 'rejected') rejected++;
      else pending++;
    });
    return { totalDocs, verified, pending, rejected };
  };

  const hasActiveFilters = filters.search || filters.subStatus !== "all";

  if (isLoading) return <LoadingScreen />;
  if (error || !candidate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-slate-800">Error loading documentation details</h2>
        <p className="text-sm text-slate-500">Something went wrong while fetching the data.</p>
        <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "verified":
        return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px] gap-1"><ShieldCheck className="h-3 w-3" /> Verified</Badge>;
      case "rejected":
        return <Badge className="bg-red-50 text-red-700 border border-red-200 font-semibold text-[11px] gap-1"><ShieldX className="h-3 w-3" /> Rejected</Badge>;
      case "resubmission_requested":
        return <Badge className="bg-orange-50 text-orange-700 border border-orange-200 font-semibold text-[11px] gap-1"><ShieldAlert className="h-3 w-3" /> Resubmission</Badge>;
      case "pending":
      default:
        return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[11px] gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl shadow-lg text-white">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl hover:bg-white/10 text-white border border-white/20">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <h1 className="text-2xl font-bold tracking-tight">
                {candidate.firstName} {candidate.lastName}
              </h1>
              <Badge className="bg-white/20 text-white border-white/30 font-semibold px-3 py-1 rounded-full text-xs w-fit">
                <FileText className="h-3 w-3 mr-1" /> Documentation Stage
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-blue-100 mt-2">
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {format(new Date(), "dd MMM yyyy")}</span>
              <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {pagination?.total || 0} Projects</span>
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
            className="pl-10 h-10 border-slate-200 focus-visible:ring-blue-500 rounded-lg bg-slate-50"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 hidden md:block" />
          <Select 
            value={filters.subStatus} 
            onValueChange={(val) => setFilters(prev => ({ ...prev, subStatus: val, page: 1 }))}
          >
            <SelectTrigger className="w-full md:w-[220px] h-10 border-slate-200 rounded-lg bg-slate-50">
              <SelectValue placeholder="All Sub-Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sub-Statuses</SelectItem>
              {subStatuses.map((ss: any) => (
                <SelectItem key={ss.id} value={ss.id}>{ss.label || ss.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <FileWarning className="h-10 w-10 text-slate-300" />
          </div>
          <p className="text-slate-600 font-semibold text-lg">No Projects Found</p>
          <p className="text-slate-400 text-sm mt-1 max-w-sm">No projects match the current filters in the documentation stage.</p>
          <Button onClick={() => setFilters({ search: "", subStatus: "all", page: 1, limit: 5 })} variant="outline" className="mt-5 rounded-lg">
            <X className="h-4 w-4 mr-2" /> Clear Filters
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <Accordion type="single" collapsible className="space-y-3" defaultValue={`project-${projects[0].id}`}>
            {projects.map((p: any, index: number) => (
              <AccordionItem key={p.id} value={`project-${p.id}`} className="border-none">
                <Card className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all rounded-xl bg-white">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]]:bg-gradient-to-r [&[data-state=open]]:from-slate-50 [&[data-state=open]]:to-blue-50/30">
                    <div className="flex flex-1 items-center justify-between text-left gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg font-bold text-sm shrink-0">
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
                             <Badge variant="outline" className="text-[10px] h-5 px-2 font-semibold bg-blue-50 text-blue-600 border-blue-200">
                               {p.subStatus?.label || p.subStatus?.name || "N/A"}
                             </Badge>
                             <Badge variant="outline" className="text-[10px] h-5 px-2 font-semibold bg-slate-50 text-slate-500 border-slate-200 gap-1">
                               <FileText className="h-3 w-3" /> {p.documentVerifications?.length || 0} files
                             </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="hidden md:block shrink-0">
                         <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 group h-8 font-semibold text-xs rounded-lg border-blue-200"
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
                      {/* Per-project stats */}
                      {(() => {
                        const pStats = getProjectStats(p);
                        return (
                          <div className="grid grid-cols-4 gap-2 mt-4 mb-4">
                            <div className="flex items-center gap-2 bg-blue-50/60 rounded-lg px-3 py-2 border border-blue-100">
                              <FileText className="h-3.5 w-3.5 text-blue-500" />
                              <div>
                                <p className="text-[9px] font-semibold text-slate-400 uppercase">Total</p>
                                <p className="text-sm font-bold text-slate-800">{pStats.totalDocs}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 bg-emerald-50/60 rounded-lg px-3 py-2 border border-emerald-100">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              <div>
                                <p className="text-[9px] font-semibold text-slate-400 uppercase">Verified</p>
                                <p className="text-sm font-bold text-emerald-600">{pStats.verified}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 bg-amber-50/60 rounded-lg px-3 py-2 border border-amber-100">
                              <Clock className="h-3.5 w-3.5 text-amber-500" />
                              <div>
                                <p className="text-[9px] font-semibold text-slate-400 uppercase">Pending</p>
                                <p className="text-sm font-bold text-amber-600">{pStats.pending}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 bg-red-50/60 rounded-lg px-3 py-2 border border-red-100">
                              <XCircle className="h-3.5 w-3.5 text-red-500" />
                              <div>
                                <p className="text-[9px] font-semibold text-slate-400 uppercase">Rejected</p>
                                <p className="text-sm font-bold text-red-600">{pStats.rejected}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div>
                        <div className="flex items-center justify-between mb-3">
                           <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Verification Status
                           </h4>
                           <span className="text-[10px] text-slate-400">{p.documentVerifications?.length || 0} documents</span>
                        </div>
                        
                        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                          <div className="max-h-[420px] overflow-y-auto">
                            <Table>
                              <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                <TableRow className="hover:bg-transparent border-b border-slate-200">
                                  <TableHead className="text-[11px] font-semibold text-slate-500 uppercase px-4 h-9 w-[35%]">Document</TableHead>
                                  <TableHead className="text-[11px] font-semibold text-slate-500 uppercase h-9 w-[15%]">Status</TableHead>
                                  <TableHead className="text-[11px] font-semibold text-slate-500 uppercase h-9 w-[28%]">Remarks</TableHead>
                                  <TableHead className="text-[11px] font-semibold text-slate-500 uppercase text-center h-9 w-[8%]">View</TableHead>
                                  <TableHead className="text-[11px] font-semibold text-slate-500 uppercase text-right px-4 h-9 w-[14%]">Date</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {p.documentVerifications?.length > 0 ? (
                                  p.documentVerifications.map((dv: any, dvIndex: number) => (
                                    <TableRow key={dv.id} className={`hover:bg-blue-50/40 transition-colors ${dvIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                    <TableCell className="px-4 py-3">
                                      <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 bg-slate-100 rounded-md text-slate-500 shrink-0">
                                          <FileText className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-[13px] font-semibold text-slate-800 truncate">
                                            {dv.document?.fileName || "Unnamed Document"}
                                          </p>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-semibold text-blue-600 bg-blue-50/80 border-blue-100">
                                              {dv.document?.docType || "N/A"}
                                            </Badge>
                                            <span className="text-[10px] text-slate-400 truncate">
                                              {dv.requirement?.name || dv.notes || "Standard"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {getStatusBadge(dv.status)}
                                    </TableCell>
                                    <TableCell>
                                       {dv.verificationHistory?.length > 0 ? (
                                           <div className="flex items-start gap-1.5">
                                              <div className="mt-0.5">
                                                {dv.status === 'verified' ? <UserCheck className="h-3 w-3 text-emerald-500" /> : 
                                                 dv.status === 'rejected' ? <XCircle className="h-3 w-3 text-red-500" /> : 
                                                 <Clock className="h-3 w-3 text-amber-500" />}
                                              </div>
                                              <div className="min-w-0">
                                                <p className="text-[11px] font-semibold text-slate-700">
                                                  {dv.verificationHistory[0]?.performedByName || dv.verificationHistory[0]?.performer?.name || "System"}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                                                  {dv.notes || dv.rejectionReason || "No remarks provided."}
                                                </p>
                                              </div>
                                           </div>
                                       ) : (
                                           <div className="flex items-center gap-1.5 text-slate-400">
                                              <History className="h-3 w-3" />
                                              <span className="text-[10px]">No history</span>
                                           </div>
                                       )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {dv.document?.fileUrl ? (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 rounded-lg hover:bg-blue-100 text-slate-500 hover:text-blue-600 transition-all"
                                                onClick={() => setPdfConfig({
                                                  isOpen: true,
                                                  url: dv.document.fileUrl,
                                                  title: `${dv.document.fileName || 'Document'} - ${dv.document.docType || 'N/A'}`
                                                })}
                                              >
                                                <Eye className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="left">Preview Document</TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ) : (
                                        <span className="text-[10px] text-slate-300">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right px-4">
                                      <p className="text-[11px] font-medium text-slate-600">
                                        {dv.document?.createdAt ? format(new Date(dv.document.createdAt), "dd MMM yyyy") : "—"}
                                      </p>
                                      <p className="text-[10px] text-slate-400">
                                        {dv.document?.createdAt ? format(new Date(dv.document.createdAt), "HH:mm") : ""}
                                      </p>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={5} className="h-28 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <FileText className="h-6 w-6 text-slate-200" />
                                      <span className="text-sm text-slate-400">No documents found</span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                          </div>
                        </div>
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

      {/* PDF Viewer Modal */}
      <PDFViewer 
        isOpen={pdfConfig.isOpen}
        fileUrl={pdfConfig.url}
        fileName={pdfConfig.title}
        onClose={() => setPdfConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
