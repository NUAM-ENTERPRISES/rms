import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { 
  useGetCandidateProcessingWorkflowQuery, 
  useGetStatusConfigQuery 
} from "../api";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Settings, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Building2,
  Calendar,
  ExternalLink,
  History,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Briefcase,
  FileWarning,
  Hash,
  X,
  Repeat,
  User,
  ExternalLink as LinkIcon,
  MapPin,
  Activity
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui";

export default function CandidateProcessingWorkflowPage() {
  const { id: candidateId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({
    search: "",
    subStatus: "all",
    step: "all",
    page: 1,
    limit: 5
  });

  const [pdfConfig, setPdfConfig] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: "",
    title: ""
  });

  const { data: statusConfigResponse } = useGetStatusConfigQuery({ mainStage: 'processing' });
  const subStatuses = Array.isArray(statusConfigResponse?.data?.subStatuses) 
    ? statusConfigResponse.data.subStatuses 
    : [];

  const { data: response, isLoading, error } = useGetCandidateProcessingWorkflowQuery({
    candidateId: candidateId!,
    subStatus: filters.subStatus === "all" ? undefined : filters.subStatus,
    step: filters.step === "all" ? undefined : filters.step,
    search: filters.search || undefined,
    page: filters.page,
    limit: filters.limit
  });

  const candidate = response?.candidate;
  const projects = response?.projects || [];
  const pagination = response?.pagination;

  const hasActiveFilters = filters.search || filters.subStatus !== "all" || filters.step !== "all";

  if (isLoading) return <LoadingScreen />;
  if (error || !candidate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-slate-800">Error loading processing details</h2>
        <p className="text-sm text-slate-500">Something went wrong while fetching the data.</p>
        <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-6 rounded-2xl shadow-lg text-white">
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
                <Repeat className="h-3 w-3 mr-1" /> Processing Stage
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-blue-100 mt-2">
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {format(new Date(), "dd MMM yyyy")}</span>
              <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {pagination?.total || 0} Projects</span>
              {candidate.email && (
                <span className="flex items-center gap-1.5 opacity-80"><LinkIcon className="h-3.5 w-3.5" /> {candidate.email}</span>
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
            className="pl-10 h-10 border-slate-200 focus-visible:ring-blue-500 rounded-lg bg-slate-50"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 hidden md:block" />
          <Select 
            value={filters.step} 
            onValueChange={(val) => setFilters(prev => ({ ...prev, step: val, page: 1 }))}
          >
            <SelectTrigger className="w-full md:w-[180px] h-10 border-slate-200 rounded-lg bg-slate-50">
              <SelectValue placeholder="All Steps" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">All Steps</SelectItem>
              <SelectItem value="offer_letter">Offer Letter</SelectItem>
              <SelectItem value="documents_received">Documents Received</SelectItem>
              <SelectItem value="hrd">HRD</SelectItem>
              <SelectItem value="data_flow">Data Flow</SelectItem>
              <SelectItem value="eligibility">Eligibility</SelectItem>
              <SelectItem value="prometric">Licensing Exam</SelectItem>
              <SelectItem value="council_registration">Council Registration</SelectItem>
              <SelectItem value="document_attestation">Document Attestation</SelectItem>
              <SelectItem value="medical">Medical</SelectItem>
              <SelectItem value="biometrics">Biometrics</SelectItem>
              <SelectItem value="visa">Visa</SelectItem>
              <SelectItem value="emigration">Emigration</SelectItem>
              <SelectItem value="ticket">Ticket</SelectItem>
            </SelectContent>
          </Select>
          <Select 
            value={filters.subStatus} 
            onValueChange={(val) => setFilters(prev => ({ ...prev, subStatus: val, page: 1 }))}
          >
            <SelectTrigger className="w-full md:w-[180px] h-10 border-slate-200 rounded-lg bg-slate-50">
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
                    onClick={() => setFilters({ search: "", subStatus: "all", step: "all", page: 1, limit: 5 })}
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
          <p className="text-slate-400 text-sm mt-1 max-w-sm">No projects match the current filters in the processing stage.</p>
          <Button onClick={() => setFilters({ search: "", subStatus: "all", step: "all", page: 1, limit: 5 })} variant="outline" className="mt-5 rounded-lg">
            <X className="h-4 w-4 mr-2" /> Clear Filters
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <Accordion type="single" collapsible className="space-y-3" defaultValue={`project-${projects[0].id}`}>
            {projects.map((p: any) => (
              <AccordionItem key={p.id} value={`project-${p.id}`} className="border-none">
                <Card className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all rounded-xl bg-white">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]]:bg-gradient-to-r [&[data-state=open]]:from-slate-50 [&[data-state=open]]:to-blue-50/30">
                    <div className="flex flex-1 items-center justify-between text-left gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center h-10 w-10 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-lg font-bold text-sm shrink-0">
                          <Hash className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900 truncate">{p.project?.title || "Unnamed Project"}</h3>
                            <span className="text-[10px] text-slate-400 font-medium">by {p.project?.client?.name || "Unknown Client"}</span>
                          </div>
                          {/* Summary Row (Designation, Status, Progress) - Always Visible */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                             <Badge variant="outline" className="text-[10px] h-5 px-2 font-semibold bg-indigo-50 text-indigo-600 border-indigo-200 gap-1">
                               <Briefcase className="h-3 w-3" />
                               {p.roleNeeded?.designation || p.roleNeeded?.roleCatalog?.name || "N/A"}
                             </Badge>
                             <Badge variant="outline" className="text-[10px] h-5 px-2 font-semibold bg-blue-50 text-blue-600 border-blue-200">
                               {p.subStatus?.label || p.subStatus?.name || "N/A"}
                             </Badge>
                             {p.processing?.step && (
                               <Badge variant="outline" className={`text-[10px] h-5 px-2 font-semibold gap-1 ${
                                 p.processing.processingSteps?.every((s: any) => s.status === 'completed')
                                   ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                   : 'bg-purple-50 text-purple-600 border-purple-200'
                               }`}>
                                 {p.processing.processingSteps?.every((s: any) => s.status === 'completed') ? (
                                   <><CheckCircle2 className="h-2.5 w-2.5" /> All Steps Completed</>
                                 ) : (
                                   <>Current: {p.processing.step.replace(/_/g, ' ')}</>
                                 )}
                               </Badge>
                             )}
                             {p.processing?.processingSteps?.length > 0 && (
                               <div className="flex items-center gap-1.5 ml-1">
                                 <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                   <div 
                                     className="h-full bg-emerald-500 transition-all duration-500" 
                                     style={{ 
                                       width: `${(p.processing.processingSteps.filter((s: any) => s.status === 'completed').length / p.processing.processingSteps.length) * 100}%` 
                                     }}
                                   />
                                 </div>
                                 <span className="text-[10px] font-bold text-slate-500">
                                   {p.processing.processingSteps.filter((s: any) => s.status === 'completed').length}/{p.processing.processingSteps.length}
                                 </span>
                               </div>
                             )}
                             {p.processing?.assignedTo && (
                               <Badge variant="outline" className="text-[10px] h-5 px-2 font-semibold bg-slate-50 text-slate-600 border-slate-200 gap-1">
                                 <User className="h-2.5 w-2.5" />
                                 {p.processing.assignedTo.name}
                               </Badge>
                             )}
                          </div>
                        </div>
                      </div>
                      <div className="hidden md:block shrink-0">
                         <div 
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-blue-200 bg-background hover:bg-blue-50 hover:text-blue-700 h-8 px-3 text-blue-600 cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/projects/${p.projectId}`);
                            }}
                         >
                            View Project <ExternalLink className="ml-1.5 h-3 w-3 transition-transform" />
                         </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="p-0">
                    <div className="px-5 pb-5 border-t border-slate-100 bg-slate-50/30">
                        {/* Legend and Step Tiles - Only Visible when Accordion is OPEN */}
                        {p.processing?.processingSteps?.length > 0 && (
                          <div className="space-y-3 mt-4">
                            <div className="flex flex-wrap items-center gap-3 py-2 px-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mr-1">Status Guide:</span>
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-orange-500" />
                                <span className="text-[10px] font-medium text-slate-600">Pending</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                <span className="text-[10px] font-medium text-slate-600">In Process</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-medium text-slate-600">Completed</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-red-500" />
                                <span className="text-[10px] font-medium text-slate-600">Cancelled</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {[...p.processing.processingSteps]
                                .sort((a: any, b: any) => (a.template?.order || 0) - (b.template?.order || 0))
                                .map((step: any) => {
                                  let colorClass = "bg-slate-50 text-slate-400 border-slate-200"; 
                                  const status = step.status?.toLowerCase();
                                  
                                  if (status === 'completed') colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100";
                                  else if (status === 'in_progress' || status === 'started') colorClass = "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100";
                                  else if (status === 'pending') colorClass = "bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-100";
                                  else if (status === 'rejected' || status === 'cancelled') colorClass = "bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100";

                                  return (
                                    <TooltipProvider key={step.id}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className={`px-2.5 py-1.5 rounded-md border text-[10px] font-bold transition-all flex items-center gap-2 min-w-[80px] justify-center bg-white shadow-sm hover:shadow-md ${colorClass}`}>
                                            <div className={`h-1.5 w-1.5 rounded-full ${
                                              status === 'completed' ? 'bg-emerald-500' : 
                                              (status === 'in_progress' || status === 'started') ? 'bg-blue-500' : 
                                              status === 'pending' ? 'bg-orange-500' : 
                                              'bg-red-500'
                                            }`} />
                                            {step.template?.label || "Step"}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                          <p className="text-[10px] font-bold">{step.template?.label || "Step"}</p>
                                          <p className="text-[9px] uppercase tracking-wider opacity-80">{status?.replace(/_/g, ' ') || 'Unknown'}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  );
                                })}
                            </div>
                          </div>
                        )}
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
