import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGetAllProcessingCandidatesQuery } from "@/features/processing/data/processing.endpoints";
import { useGetProjectsQuery } from "@/services/projectsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users, 
  XCircle, 
  CheckCircle2, 
  ClipboardList,
  Eye,
  TrendingUp,
  Activity,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCheck
} from "lucide-react";

export default function ProcessingDashboardPage() {
  const navigate = useNavigate();
  
  // Filter States
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<string | null>("assigned");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Fetch Projects for filter
  const { data: projectsData } = useGetProjectsQuery({ limit: 100 });
  const projects = projectsData?.data?.projects || [];

  // API Call for Candidates
  const { data: apiResponse, isLoading, isFetching } = useGetAllProcessingCandidatesQuery({
    search: debouncedSearch,
    projectId: projectFilter === "all" ? undefined : projectFilter,
    roleCatalogId: roleFilter === "all" ? undefined : roleFilter,
    status: (statusFilter === "all" ? undefined : statusFilter) as any,
    page,
    limit: pageSize
  });

  const candidates = apiResponse?.data?.candidates || [];
  const pagination = apiResponse?.data?.pagination;
  const counts = apiResponse?.data?.counts;

  // Extract roles for selected project
  const rolesForSelectedProject = useMemo(() => {
    if (projectFilter === "all") return [];
    const selectedProject = projects.find(p => p.id === projectFilter);
    if (!selectedProject) return [];
    
    // Group by roleCatalogId to avoid duplicates in the filter
    const roles: {id: string, name: string}[] = [];
    const seen = new Set();
    
    selectedProject.rolesNeeded?.forEach(rn => {
      if (rn.roleCatalogId && !seen.has(rn.roleCatalogId)) {
        seen.add(rn.roleCatalogId);
        roles.push({
          id: rn.roleCatalogId,
          name: rn.designation
        });
      }
    });
    
    return roles;
  }, [projects, projectFilter]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, projectFilter, roleFilter]);

  const totalItems = pagination?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  const stats = [
    {
      label: "Ready for Processing",
      value: counts?.assigned || 0,
      status: "assigned",
      icon: UserCheck,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      label: "Processing In Progress",
      value: counts?.in_progress || 0,
      status: "in_progress",
      icon: Activity,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200"
    },
    {
      label: "Processing Completed",
      value: counts?.completed || 0,
      status: "completed",
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200"
    },
    {
      label: "Processing Cancelled",
      value: counts?.cancelled || 0,
      status: "cancelled",
      icon: XCircle,
      color: "text-rose-600",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-200"
    }
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "in_progress": "bg-blue-100 text-blue-700 border-blue-200",
      "assigned": "bg-indigo-100 text-indigo-700 border-indigo-200",
      "completed": "bg-emerald-100 text-emerald-700 border-emerald-200",
      "cancelled": "bg-rose-100 text-rose-700 border-rose-200"
    };
    return styles[status] || "bg-slate-100 text-slate-700";
  };

  const displayStatus = (status: string) => {
    const labels: Record<string, string> = {
      "assigned": "Ready for Processing",
      "in_progress": "In Progress",
      "completed": "Completed",
      "cancelled": "Cancelled"
    };
    return labels[status] || status;
  };

  // Row background mapping to match tile colors (subtle)
  const rowBgClass = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-blue-50/40";
      case "assigned":
        return "bg-indigo-50/40";
      case "completed":
        return "bg-emerald-50/40";
      case "cancelled":
        return "bg-rose-50/40";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 p-3 shadow-lg">
              <ClipboardList className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900">Processing Dashboard</h1>
              <p className="text-slate-600 font-medium">Monitor and manage candidate processing workflows</p>
            </div>
          </div>
          
          {statusFilter && (
            <Badge variant="outline" className="h-8 gap-2 bg-violet-50 text-violet-700 border-violet-200 self-start md:self-center">
              Filtered by: {displayStatus(statusFilter)}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-rose-500" 
                onClick={() => setStatusFilter(null)} 
              />
            </Badge>
          )}
        </header>

        {/* Stats Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card 
              key={stat.label} 
              className={`group relative overflow-hidden border-2 transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer ${
                statusFilter === stat.status ? 'border-violet-500 ring-2 ring-violet-500/20' : stat.borderColor
              }`}
              onClick={() => setStatusFilter(statusFilter === stat.status ? null : stat.status)}
            >
              <div className={`absolute inset-0 ${stat.bgColor} opacity-40 transition-opacity group-hover:opacity-60`} />
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                    {stat.label}
                  </CardTitle>
                  <div className={`rounded-xl ${stat.bgColor} p-2.5 shadow-md`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-black ${stat.color}`}>{stat.value}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters & Table */}
        <Card className="border-0 shadow-xl overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 bg-white pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 p-2.5 shadow-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900">
                    Active Candidates
                  </CardTitle>
                  <p className="text-sm text-slate-500">Manage and track processing</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isFetching && <Loader2 className="h-5 w-5 animate-spin text-violet-500" />}
                <Badge className="bg-violet-100 text-violet-700 border-0 px-4 py-2 text-sm font-bold self-start sm:self-center">
                  {totalItems} Results
                </Badge>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-2xl border border-slate-100">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-violet-100 rounded-lg p-1.5">
                    <Search className="h-4 w-4 text-violet-600" />
                  </div>
                  <Input 
                    placeholder="Search by name, email or project..." 
                    className="pl-14 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* Divider */}
                <div className="hidden lg:block w-px h-8 bg-slate-200" />

                {/* Filters Group */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filters:</span>
                  </div>

                  <Select value={projectFilter} onValueChange={(val) => {
                    setProjectFilter(val);
                    setRoleFilter("all");
                  }}>
                    <SelectTrigger className="h-10 w-[220px] bg-white border-slate-200 rounded-xl shadow-sm hover:border-violet-300 transition-colors">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {projectFilter !== "all" && (
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="h-10 w-[180px] bg-white border-slate-200 rounded-xl shadow-sm hover:border-violet-300 transition-colors animate-in fade-in slide-in-from-left-2">
                        <SelectValue placeholder="All Roles" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Roles</SelectItem>
                        {rolesForSelectedProject.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {(search || projectFilter !== "all" || statusFilter !== "assigned") && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-10 px-4 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-semibold gap-2 transition-all"
                      onClick={() => {
                        setSearch("");
                        setProjectFilter("all");
                        setRoleFilter("all");
                        setStatusFilter("assigned");
                      }}
                    >
                      <X className="h-4 w-4" />
                      Clear All
                    </Button>
                  )}
                </div>
              </div>

              {/* Active Filters Display */}
              {(statusFilter || projectFilter !== "all" || roleFilter !== "all") && (
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-200/60">
                  <span className="text-xs font-semibold text-slate-500">Active:</span>
                  {statusFilter && (
                    <Badge className="bg-violet-100 text-violet-700 border-0 gap-1.5 pr-1.5 font-semibold">
                      Status: {displayStatus(statusFilter)}
                      <button 
                        className="ml-1 hover:bg-violet-200 rounded-full p-0.5 transition-colors"
                        onClick={() => setStatusFilter(null)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {projectFilter !== "all" && (
                    <Badge className="bg-blue-100 text-blue-700 border-0 gap-1.5 pr-1.5 font-semibold">
                      Project: {projects.find(p => p.id === projectFilter)?.title || projectFilter}
                      <button 
                        className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                        onClick={() => {
                          setProjectFilter("all");
                          setRoleFilter("all");
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {roleFilter !== "all" && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1.5 pr-1.5 font-semibold">
                      Role: {rolesForSelectedProject.find(r => r.id === roleFilter)?.name || roleFilter}
                      <button 
                        className="ml-1 hover:bg-emerald-200 rounded-full p-0.5 transition-colors"
                        onClick={() => setRoleFilter("all")}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-200">
              <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50">
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider w-[220px]">
                    Candidate
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Project & Role
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Recruiter
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Step
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider w-[120px]">
                    Progress
                  </TableHead>
                  <TableHead className="text-center font-bold text-slate-700 text-xs uppercase tracking-wider w-[80px]">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                     <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
                        <p className="text-sm font-medium text-slate-500">Loading candidates...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : candidates.length > 0 ? (
                  candidates.map((procCandidate) => (
                    <TableRow 
                      key={procCandidate.id}
                      className={`group transition-colors border-b border-slate-100 hover:shadow-sm ${rowBgClass(procCandidate.processingStatus)}`}
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-black text-white shadow-md">
                            {procCandidate.candidate.firstName[0]}{procCandidate.candidate.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-900 truncate">
                              {procCandidate.candidate.firstName} {procCandidate.candidate.lastName}
                            </p>
                            <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                              <Users className="h-3 w-3" /> {procCandidate.assignedTo?.name || "Unassigned"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-slate-700 font-bold leading-tight">{procCandidate.project.title}</p>
                          <p className="text-xs text-violet-600 font-semibold uppercase tracking-wide">
                            {procCandidate.role.designation}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                             <UserCheck className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {procCandidate.candidateProjectMap?.recruiter?.name || "N/A"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="text-xs font-bold border-slate-300 bg-white whitespace-nowrap px-2.5 py-0.5">
                          {/* Step information is not in the list API, might need to fetch from summary if available */}
                          Processing
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge 
                          className={`text-xs border-2 font-black whitespace-nowrap px-3 py-1 ${getStatusBadge(procCandidate.processingStatus)}`}
                        >
                          {displayStatus(procCandidate.processingStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-1.5">
                          {/* Progress is not in the list API, showing a placeholder or deriving if possible */}
                          <span className="text-xs font-black text-slate-700">
                            {procCandidate.processingStatus === 'completed' ? '100%' : '0%'}
                          </span>
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                procCandidate.processingStatus === 'completed' 
                                  ? 'bg-emerald-500 w-full' 
                                  : 'bg-amber-500 w-0'
                              }`}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-9 w-9 p-0 hover:bg-violet-100 hover:text-violet-700 rounded-full transition-all hover:scale-110 shadow-sm"
                          onClick={() => navigate(`/processingCandidateDetails/${procCandidate.id}`)}
                        >
                          <Eye className="h-5 w-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
                        <Filter className="h-10 w-10 opacity-20" />
                        <p className="text-lg font-bold">No candidates found</p>
                        <p className="text-sm">Try adjusting your filters or search term</p>
                        <Button variant="link" onClick={() => {
                          setSearch("");
                          setProjectFilter("all");
                          setRoleFilter("all");
                          setStatusFilter("assigned");
                        }}>Clear all filters</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-white">
              <div className="text-sm text-slate-600">
                Showing {startItem} - {endItem} of {totalItems}
              </div>
              <div className="flex items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-8 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="25">25 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <ChevronLeft />
                </Button>
                <div className="px-2 text-sm text-slate-700">Page {page} / {totalPages}</div>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

