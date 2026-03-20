import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useGetCandidateProjectsWorkflowDetailsQuery } from "../api";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  FileText,
  AlertCircle,
  Building2,
  Calendar,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  FileWarning,
  Hash,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import LoadingScreen from "@/components/atoms/LoadingScreen";
import { ImageViewer } from "@/components/molecules/ImageViewer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PDFViewer } from "@/components/molecules/PDFViewer";

export default function CandidateProjectWorkflowPage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    search: "",
    page: 1,
    limit: 5,
  });

  const [pdfConfig, setPdfConfig] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: "",
    title: "",
  });

  const { data: response, isLoading, error } = useGetCandidateProjectsWorkflowDetailsQuery({
    candidateId: candidateId!,
    search: filters.search || undefined,
    page: filters.page,
    limit: filters.limit,
  });

  const candidate = response?.candidate;

  if (isLoading) return <LoadingScreen />;

  if (error || !candidate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-slate-800">Error loading project workflow details</h2>
        <p className="text-sm text-slate-500">Something went wrong while fetching the data.</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  const projectList = response?.projects || [];
  const pagination = response?.pagination || { page: 1, totalPages: 1, total: 0, limit: filters.limit };
  const totalPages = pagination.totalPages;
  const displayedProjects = projectList;

  const hasActiveFilters = !!filters.search;

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl shadow-lg text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-xl hover:bg-white/10 text-white border border-white/20 shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="relative shrink-0">
              <ImageViewer
                src={candidate.profileImage}
                title={`${candidate.firstName} ${candidate.lastName}`}
                className="h-16 w-16 rounded-2xl border-2 border-white/30 shadow-lg"
                enableHoverPreview={true}
              />
              <div
                className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 border-2 border-white rounded-full shadow-sm z-10"
                title="Active"
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {candidate.firstName} {candidate.lastName}
              </h1>
              <Badge className="bg-white/20 text-white border-white/30 font-semibold px-3 py-1 rounded-full text-xs w-fit">
                <FileText className="h-3 w-3 mr-1" /> Project Workflow
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-blue-100 mt-2">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {format(new Date(), "dd MMM yyyy")}
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> {projectList.length || 0} Projects
              </span>
              {candidate.email && (
                <span className="flex items-center gap-1.5 opacity-80">
                  <FileText className="h-3.5 w-3.5" /> {candidate.email}
                </span>
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
            placeholder="Search projects by title, client, or role..."
            className="pl-10 h-10 border-slate-200 focus-visible:ring-blue-500 rounded-lg bg-slate-50"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 hidden md:block" />
          {hasActiveFilters && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => setFilters({ search: "", page: 1, limit: 5 })}
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

      {displayedProjects.length === 0 ? (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center p-16 text-center bg-white rounded-2xl">
          <div className="p-5 bg-slate-50 rounded-full mb-4">
            <FileWarning className="h-10 w-10 text-slate-300" />
          </div>
          <p className="text-slate-600 font-semibold text-lg">No Projects Found</p>
          <p className="text-slate-400 text-sm mt-1 max-w-sm">No projects match the current filters in the project workflow view.</p>
          <Button onClick={() => setFilters({ search: "", page: 1, limit: 5 })} variant="outline" className="mt-5 rounded-lg">
            <X className="h-4 w-4 mr-2" /> Clear Filters
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <Accordion type="single" collapsible className="space-y-3" defaultValue={`project-${displayedProjects[0]?.id}`}>
            {displayedProjects.map((p: any) => (
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
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">Nominated by</p>
                          <p className="font-semibold text-slate-800 mt-1">{p.recruiter?.name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{p.recruiter?.email || 'No email'}</p>
                          <p className="text-[10px] text-slate-400 mt-1">Assigned on: {p.assignedAt ? format(new Date(p.assignedAt), 'dd MMM yyyy, HH:mm') : 'N/A'}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">Type</p>
                          <p className="font-semibold text-slate-800 mt-1">{p.mainStatus?.label || p.mainStatus?.name || 'N/A'} / {p.subStatus?.label || p.subStatus?.name || 'N/A'}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 md:col-span-2">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">Role</p>
                          <p className="font-semibold text-slate-800 mt-1">{p.roleNeeded?.designation || p.roleNeeded?.roleCatalog?.name || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>

          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500">
                Page <span className="text-slate-800 font-semibold">{filters.page}</span> of <span className="text-slate-800 font-semibold">{totalPages}</span>
                <span className="hidden md:inline text-slate-400 ml-2">({pagination.total} projects total)</span>
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page === 1}
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                  className="rounded-lg h-8 px-3 text-xs border-slate-200"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page === totalPages}
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                  className="rounded-lg h-8 px-3 text-xs border-slate-200"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <PDFViewer
        isOpen={pdfConfig.isOpen}
        fileUrl={pdfConfig.url}
        fileName={pdfConfig.title}
        onClose={() => setPdfConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
