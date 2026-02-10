import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Filter,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useGetRecruiterDocumentsQuery,
  useGetDocumentStatsQuery,
  useGetRecruiterVerifiedRejectedDocumentsQuery,
} from "@/features/documents/api";
import { useGetProjectsQuery, useGetProjectQuery } from "@/services/projectsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { getStatusConfig, CandidateProjectStatus } from "@/constants/statuses";
import * as Icons from "lucide-react";
import { ImageViewer } from "@/components/molecules";

const RecruiterDocsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState("pending_documents");
  const [showScreeningOnly, setShowScreeningOnly] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("all");
  
  // Project filter specific states
  const [projectSearch, setProjectSearch] = useState("");
  const [projectPage, setProjectPage] = useState(1);
  const debouncedProjectSearch = useDebounce(projectSearch, 500);
  const [isProjectPopoverOpen, setIsProjectPopoverOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 500);

  const { data: projectsData } = useGetProjectsQuery({ 
    limit: 10, 
    search: debouncedProjectSearch, 
    page: projectPage 
  });
  
  const { data: projectDetails } = useGetProjectQuery(selectedProjectId, {
    skip: selectedProjectId === "all",
  });
  
  const roles = projectDetails?.data?.rolesNeeded || [];

  const { data: statsData } = useGetDocumentStatsQuery();
  
  const handleClearFilters = () => {
    setSearch("");
    setShowScreeningOnly(false);
    setSelectedProjectId("all");
    setSelectedRoleId("all");
    setProjectSearch("");
    setProjectPage(1);
    setPage(1);
  };

  const isVerifiedOrRejected = statusFilter === "documents_verified" || statusFilter === "rejected_documents";

  const { data: pendingDocsData, isLoading: isPendingLoading } = useGetRecruiterDocumentsQuery({
    page,
    limit,
    search: debouncedSearch,
    status: showScreeningOnly ? "InScreening" : (statusFilter === "all" ? undefined : statusFilter),
    projectId: selectedProjectId === "all" ? undefined : selectedProjectId,
    roleCatalogId: selectedRoleId === "all" ? undefined : selectedRoleId,
  }, { skip: isVerifiedOrRejected });

  const { data: verifiedRejectedDocsData, isLoading: isVerifiedRejectedLoading } = useGetRecruiterVerifiedRejectedDocumentsQuery({
    page,
    limit,
    search: debouncedSearch,
    status: showScreeningOnly ? "InScreening" : (statusFilter === "documents_verified" ? "verified" : "rejected"),
    projectId: selectedProjectId === "all" ? undefined : selectedProjectId,
    roleCatalogId: selectedRoleId === "all" ? undefined : selectedRoleId,
  }, { skip: !isVerifiedOrRejected });

  const docsData = isVerifiedOrRejected ? verifiedRejectedDocsData : pendingDocsData;
  const isLoading = isVerifiedOrRejected ? isVerifiedRejectedLoading : isPendingLoading;

  const apiCounts = isVerifiedOrRejected ? verifiedRejectedDocsData?.data?.counts : pendingDocsData?.data?.counts;
  const stats = {
    pendingDocuments: apiCounts?.pending ?? statsData?.data?.pendingDocuments ?? 0,
    verifiedDocuments: apiCounts?.verified ?? statsData?.data?.verifiedDocuments ?? 0,
    rejectedDocuments: apiCounts?.rejected ?? statsData?.data?.rejectedDocuments ?? 0,
    inScreening: apiCounts?.inScreening ?? 0,
  };

  const items = docsData?.data?.items || [];
  const pagination = docsData?.data?.pagination;

  const recentSubmissions = items
    .flatMap((item) => 
      (item.documentDetails || []).map((doc) => ({
        ...doc,
        candidateName: `${item.candidate.firstName} ${item.candidate.lastName}`,
        candidateId: item.candidate.id,
        projectTitle: item.project.title,
        projectId: item.project.id
      }))
    )
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 3);

  const pendingItems = items
    .filter((item) => item.progress.docsUploaded < item.progress.totalDocsToUpload)
    .slice(0, 2);

  const getProgressColor = (percentage: number) => {
    if (percentage < 30) return "bg-red-500";
    if (percentage < 70) return "bg-amber-500";
    if (percentage < 100) return "bg-blue-500";
    return "bg-emerald-500";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recruiter Documents</h1>
          <p className="text-muted-foreground">
            Manage and submit project-related documents for your assigned projects.
          </p>
        </div>
      </div>

      {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Upload Pending Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card
            className={cn(
              "border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
              statusFilter === "pending_documents" && !showScreeningOnly ? "ring-2 ring-amber-300" : ""
            )}
            onClick={() => {
              setStatusFilter("pending_documents");
              setShowScreeningOnly(false);
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Upload Pending</p>
                  <h3 className="text-3xl font-bold text-amber-600">
                    {stats?.pendingDocuments || 0}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2">Awaiting upload</p>
                </div>
                <div className="p-3 bg-amber-200/40 rounded-full">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Screening Card - Commented Out
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <Card
            className={cn(
              "border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-indigo-100/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
              showScreeningOnly ? "ring-2 ring-indigo-300" : ""
            )}
            onClick={() => {
              setShowScreeningOnly(true);
              setPage(1);
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">In Screening</p>
                  <h3 className="text-3xl font-bold text-indigo-600">
                    {stats?.inScreening || 0}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2">Screening phase</p>
                </div>
                <div className="p-3 bg-indigo-200/40 rounded-full">
                  <Filter className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        */}

        {/* Verified Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card
            className={cn(
              "border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
              statusFilter === "documents_verified" && !showScreeningOnly ? "ring-2 ring-green-300" : ""
            )}
            onClick={() => {
              setStatusFilter("documents_verified");
              setShowScreeningOnly(false);
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Verified</p>
                  <h3 className="text-3xl font-bold text-green-600">
                    {stats?.verifiedDocuments || 0}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2">Approved</p>
                </div>
                <div className="p-3 bg-green-200/40 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Rejected Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card
            className={cn(
              "border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
              statusFilter === "rejected_documents" && !showScreeningOnly ? "ring-2 ring-red-300" : ""
            )}
            onClick={() => {
              setStatusFilter("rejected_documents");
              setShowScreeningOnly(false);
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Rejected</p>
                  <h3 className="text-3xl font-bold text-red-600">
                    {stats?.rejectedDocuments || 0}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2">Action required</p>
                </div>
                <div className="p-3 bg-red-200/40 rounded-full">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Project Documents Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
            <div className="space-y-1">
              <CardTitle className="text-xl">
                {showScreeningOnly ? "In Screening Documents" :
                 statusFilter === "all" ? "All Project Documents" :
                 statusFilter === "pending_documents" ? "Upload Pending Documents" :
                 statusFilter === "documents_verified" ? "Verified Documents" :
                 statusFilter === "rejected_documents" ? "Rejected Documents" :
                 "Project Documents Status"}
              </CardTitle>
              <CardDescription>
                {showScreeningOnly ? "Candidates currently in screening phase who have pending documents." :
                 statusFilter === "all" ? "Track document submission progress for each of your projects." :
                 statusFilter === "pending_documents" ? "Candidates with pending document uploads." :
                 statusFilter === "documents_verified" ? "Candidates with all documents successfully verified." :
                 statusFilter === "rejected_documents" ? "Candidates with rejected documents requiring action." :
                 "Track document submission progress for each of your projects."}
              </CardDescription>
            </div>

            <div className="flex flex-col gap-4 w-full xl:w-auto">
              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2 bg-slate-100/80 px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                  <Checkbox 
                    id="screening-filter" 
                    checked={showScreeningOnly}
                    onCheckedChange={(checked) => {
                      setShowScreeningOnly(!!checked);
                      setPage(1);
                    }}
                  />
                  <Label htmlFor="screening-filter" className="text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap">
                    In Screening Only
                  </Label>
                </div>

                <Popover open={isProjectPopoverOpen} onOpenChange={setIsProjectPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isProjectPopoverOpen}
                      className="w-[220px] justify-between bg-white border-slate-200 h-9 shadow-sm font-normal"
                    >
                      <span className="truncate">
                        {selectedProjectId === "all" 
                          ? "All Projects" 
                          : projectDetails?.data?.title || "Loading project..."}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <div className="flex flex-col">
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Search projects..."
                            className="pl-7 h-8 text-xs border-none bg-muted/50 focus-visible:ring-0"
                            value={projectSearch}
                            onChange={(e) => {
                              setProjectSearch(e.target.value);
                              setProjectPage(1);
                            }}
                          />
                        </div>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        <div
                          className={cn(
                            "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                            selectedProjectId === "all" && "bg-accent/50"
                          )}
                          onClick={() => {
                            setSelectedProjectId("all");
                            setSelectedRoleId("all");
                            setPage(1);
                            setIsProjectPopoverOpen(false);
                          }}
                        >
                          All Projects
                        </div>
                        {projectsData?.data?.projects?.map((project) => (
                          <div
                            key={project.id}
                            className={cn(
                              "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                              selectedProjectId === project.id && "bg-accent/50"
                            )}
                            onClick={() => {
                              setSelectedProjectId(project.id);
                              setSelectedRoleId("all");
                              setPage(1);
                              setIsProjectPopoverOpen(false);
                            }}
                          >
                            <span className="truncate">{project.title}</span>
                          </div>
                        ))}
                        {projectsData?.data?.projects?.length === 0 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            No projects found.
                          </div>
                        )}
                      </div>
                      
                      {projectsData?.data?.pagination && projectsData.data.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between p-2 border-t bg-muted/20">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => setProjectPage((p) => Math.max(1, p - 1))}
                            disabled={Number(projectsData.data.pagination.page) === 1}
                          >
                            <ChevronLeft className="h-3 w-3 mr-1" />
                            Prev
                          </Button>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {projectsData.data.pagination.page} / {projectsData.data.pagination.totalPages}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => setProjectPage((p) => Math.min(projectsData.data.pagination.totalPages, p + 1))}
                            disabled={Number(projectsData.data.pagination.page) === projectsData.data.pagination.totalPages}
                          >
                            Next
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                <Select
                  value={selectedRoleId}
                  onValueChange={(val) => {
                    setSelectedRoleId(val);
                    setPage(1);
                  }}
                  disabled={selectedProjectId === "all"}
                >
                  <SelectTrigger className="w-[180px] bg-white border-slate-200 h-9 shadow-sm">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.roleCatalogId || role.id}>
                        {role.designation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search and Clear Row */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search projects or candidates..."
                    className="pl-8 bg-white border-slate-200 h-9 shadow-sm focus-visible:ring-primary"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 px-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 gap-2 transition-colors border border-transparent hover:border-rose-100"
                  onClick={handleClearFilters}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Clear Filters</span>
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-muted/60 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-semibold">Candidate</TableHead>
                  <TableHead className="font-semibold">Project Name</TableHead>
                  <TableHead className="font-semibold">Project Role</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Progress</TableHead>
                  <TableHead className="text-right w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    Loading documents...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    No documents found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const statusConfig = getStatusConfig(item.status.main as CandidateProjectStatus);
                  const StatusIcon = (Icons as any)[statusConfig.icon] || Icons.HelpCircle;
                  const hasResubmission = item.documentDetails?.some(doc => doc.status === "resubmission_required");
                  
                  const screeningStatuses = [
                    "screening_assigned",
                    "screening_scheduled",
                    "screening_completed",
                    "screening_passed",
                    "screening_failed"
                  ];
                  const isInScreening = screeningStatuses.includes(item.status.main) || 
                                       ((item.status as any).sub && screeningStatuses.includes((item.status as any).sub));
                  
                  return (
                    <TableRow 
                      key={item.candidateProjectMapId}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isInScreening ? "bg-red-200 hover:bg-red-300/60" :
                        statusFilter === "documents_verified" ? "bg-emerald-50/50 hover:bg-emerald-100/50" :
                        statusFilter === "rejected_documents" ? "bg-rose-50/50 hover:bg-rose-100/50" :
                        hasResubmission ? "bg-amber-100/50 hover:bg-amber-200/50" : 
                        "hover:bg-muted/50"
                      )}
                      onClick={() => navigate(`/recruiter-docs/${item.project.id}/${item.candidate.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <ImageViewer
                            src={item.candidate.profileImage || null}
                            title={`${item.candidate.firstName || ''} ${item.candidate.lastName || ''}`}
                            className="h-9 w-9"
                            ariaLabel={`View profile image for ${item.candidate.firstName || ''} ${item.candidate.lastName || ''}`}
                            enableHoverPreview={true}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{item.candidate.firstName} {item.candidate.lastName}</span>
                            <span className="text-xs text-muted-foreground">{item.candidate.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-primary hover:underline">{item.project.title}</span>
                          {/* <span className="text-[10px] text-muted-foreground uppercase tracking-wider">ID: {item.project.id.slice(-8)}</span> */}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-normal">
                          {item.project.role?.designation || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <Badge className={`${statusConfig.badgeClass} flex items-center gap-1 w-fit px-2 py-0.5 text-[11px] font-medium capitalize`}>
                            <StatusIcon className="h-3 w-3" />
                            {item.status.subLabel}
                          </Badge>
                          {hasResubmission && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1 w-fit px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              <AlertCircle className="h-2.5 w-2.5" />
                              Resubmit Needed
                            </Badge>
                          )}
                          {item.lastAction && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="h-2.5 w-2.5" />
                              <span>{item.lastAction.status} by {item.lastAction.performedBy?.split(' ')[0] || "System"}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                          <div className="flex items-center justify-between text-[10px] font-medium">
                            <span className="text-muted-foreground">{item.progress.docsUploaded} / {item.progress.totalDocsToUpload} docs</span>
                            <span className={item.progress.docsPercentage === 100 ? "text-emerald-600" : ""}>
                              {item.progress.docsPercentage}%
                            </span>
                          </div>
                          <div className="w-full bg-secondary/50 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${getProgressColor(item.progress.docsPercentage)}`}
                              style={{ width: `${item.progress.docsPercentage}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="View Details"
                            onClick={() => navigate(`/recruiter-docs/${item.project.id}/${item.candidate.id}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {((Number(pagination.page) - 1) * limit) + 1} to {Math.min(Number(pagination.page) * limit, pagination.total)} of {pagination.total} entries
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={Number(pagination.page) === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm font-medium">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={Number(pagination.page) === pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity or Notifications */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm border-none bg-slate-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Recent Submissions
            </CardTitle>
            <CardDescription>Your latest document uploads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSubmissions.length > 0 ? (
                recentSubmissions.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/recruiter-docs/${doc.projectId}/${doc.candidateId}`)}
                  >
                    <div className="bg-blue-50 p-2.5 rounded-full">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {doc.fileName}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Icons.User className="h-3 w-3" /> {doc.candidateName} • {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={
                      doc.status === "verified" 
                        ? "text-emerald-600 border-emerald-200 bg-emerald-50" 
                        : doc.status === "rejected"
                        ? "text-rose-600 border-rose-200 bg-rose-50"
                        : "text-amber-600 border-amber-200 bg-amber-50"
                    }>
                      {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : "N/A"}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No recent submissions</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-slate-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Required Documents
            </CardTitle>
            <CardDescription>Pending items that need your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingItems.length > 0 ? (
                pendingItems.map((item) => (
                  <div key={item.candidateProjectMapId} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-amber-50 p-2.5 rounded-full">
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {item.candidate.firstName} {item.candidate.lastName}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Icons.Briefcase className="h-3 w-3" /> {item.project.title}
                      </p>
                      <p className="text-[10px] font-medium text-amber-600 mt-1">
                        {item.progress.totalDocsToUpload - item.progress.docsUploaded} documents pending
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="h-8 w-8 p-0 rounded-full hover:bg-amber-50 hover:text-amber-600"
                      onClick={() => navigate(`/recruiter-docs/${item.project.id}/${item.candidate.id}`)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No pending documents</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecruiterDocsPage;
