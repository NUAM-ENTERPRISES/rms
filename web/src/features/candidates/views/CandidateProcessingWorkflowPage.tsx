import { Link, useNavigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import type { ElementType } from "react";
import {
  useGetCandidateProcessingWorkflowQuery,
  useGetStatusConfigQuery,
} from "../api";
import {
  WorkflowFilterTiles,
  WorkflowPageHeader,
  buildAllStatusTiles,
  buildProcessingStepFilterTiles,
} from "../components/candidate-workflow-page-ui";
import { Button } from "@/components/ui/button";
import {
  Settings,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  FileWarning,
  Hash,
  X,
  Repeat,
  User,
  Activity,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LoadingScreen from "@/components/atoms/LoadingScreen";
import {
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function getProcessingSubStatusTileIcon(name?: string): ElementType {
  const key = name?.toLowerCase() ?? "";
  if (key.includes("completed") || key.includes("ready")) return CheckCircle2;
  if (key.includes("failed")) return AlertCircle;
  if (key.includes("hold")) return Activity;
  if (key.includes("progress")) return Settings;
  return Repeat;
}

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
  const subStatusCounts = response?.subStatusCounts ?? [];
  const stepCounts = response?.stepCounts ?? {};
  const totalAll = response?.totalAll ?? pagination?.total ?? 0;

  const countBySubStatusId = useMemo(() => {
    const counts = subStatusCounts as Array<{ subStatusId: string; count: number }>;
    return counts.reduce<Record<string, number>>((acc, row) => {
      acc[row.subStatusId] = row.count;
      return acc;
    }, {});
  }, [subStatusCounts]);

  const statusTiles = useMemo(
    () => buildAllStatusTiles(subStatuses, countBySubStatusId, totalAll, getProcessingSubStatusTileIcon),
    [subStatuses, countBySubStatusId, totalAll],
  );

  const stepTiles = useMemo(
    () => buildProcessingStepFilterTiles(stepCounts as Record<string, number>, totalAll),
    [stepCounts, totalAll],
  );

  const activeStatusTile = useMemo(
    () => statusTiles.find((tile) => tile.id === filters.subStatus),
    [statusTiles, filters.subStatus],
  );

  const activeStepTile = useMemo(
    () => stepTiles.find((tile) => tile.id === filters.step),
    [stepTiles, filters.step],
  );

  const activeFilterLabel = useMemo(() => {
    const parts: string[] = [];
    if (filters.subStatus !== "all") parts.push(activeStatusTile?.label ?? "Status");
    if (filters.step !== "all") parts.push(activeStepTile?.label ?? "Step");
    return parts.length > 0 ? parts.join(" · ") : "All statuses & steps";
  }, [filters.subStatus, filters.step, activeStatusTile, activeStepTile]);

  const filteredCount = pagination?.total ?? 0;

  const hasActiveFilters =
    filters.search || filters.subStatus !== "all" || filters.step !== "all";

  const clearFilters = () =>
    setFilters({ search: "", subStatus: "all", step: "all", page: 1, limit: 5 });

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
      <WorkflowPageHeader
        theme="processing"
        candidateId={candidateId!}
        candidate={candidate}
        breadcrumbSegment="Processing"
        workflowBadge="Processing workflow"
        description="Track processing steps and status across nominated projects"
        stageLabel="Processing"
        badgeIcon={Repeat}
        avatarBadgeIcon={Repeat}
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
            className="pl-10 h-10 border-slate-200 focus-visible:ring-orange-500 rounded-lg bg-slate-50"
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
              <TooltipContent>Reset search, status, and step filters</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <WorkflowFilterTiles
        sectionLabel="Filter by processing status"
        tiles={statusTiles}
        selectedId={filters.subStatus}
        onSelect={(id) => setFilters((prev) => ({ ...prev, subStatus: id, page: 1 }))}
      />

      <WorkflowFilterTiles
        sectionLabel="Filter by processing step"
        tiles={stepTiles}
        selectedId={filters.step}
        onSelect={(id) => setFilters((prev) => ({ ...prev, step: id, page: 1 }))}
        gridClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2"
      />

      {projects.length === 0 ? (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center p-16 text-center bg-white rounded-2xl">
          <div className="p-5 bg-slate-50 rounded-full mb-4">
            <FileWarning className="h-10 w-10 text-slate-300" />
          </div>
          <p className="text-slate-600 font-semibold text-lg">No Projects Found</p>
          <p className="text-slate-400 text-sm mt-1 max-w-sm">No projects match the current filters in the processing stage.</p>
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
                  <div className="flex items-center gap-2 px-5 py-4 [&:has([data-state=open])]:bg-gradient-to-r [&:has([data-state=open])]:from-slate-50 [&:has([data-state=open])]:to-orange-50/30">
                    <AccordionTrigger className="flex-1 px-0 py-0 hover:no-underline">
                      <div className="flex flex-1 items-center text-left gap-3 min-w-0 pr-2">
                        <div className="flex items-center justify-center h-10 w-10 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-lg font-bold text-sm shrink-0">
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
                             <Badge variant="outline" className="text-[10px] h-5 px-2 font-semibold bg-orange-50 text-orange-600 border-orange-200">
                               {p.subStatus?.label || p.subStatus?.name || "N/A"}
                             </Badge>
                             {p.processing?.step && (
                               <Badge variant="outline" className={`text-[10px] h-5 px-2 font-semibold gap-1 ${
                                 p.processing.processingSteps?.every((s: any) => s.status === 'completed')
                                   ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                   : 'bg-amber-50 text-amber-700 border-amber-200'
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
                                       width: `${(p.processing.processingSteps.filter((s: any) => s.status === 'completed').length / p.processing.processingSteps.length) * 100}%`,
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
                    </AccordionTrigger>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="hidden md:inline-flex shrink-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-8 font-semibold text-xs rounded-lg border-orange-200"
                    >
                      <Link to={`/projects/${p.projectId}`}>
                        View Project <ExternalLink className="ml-1.5 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                  
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
