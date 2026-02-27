import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
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
import { ImageViewer } from "@/components/molecules";
import {
    Users,
    XCircle,
    CheckCircle2,
    ClipboardList,
    Eye,
    Activity,
    Search,
    Filter,
    X,
    ChevronLeft,
    ChevronRight,
    Mail,
    Phone
} from "lucide-react";
import { Can } from "@/components/auth/Can";
import { useDebounce } from "@/hooks/useDebounce";
import { useGetAllProcessingCandidatesAdminQuery } from "@/features/processing/data/processing.endpoints";
import { useGetProjectsQuery } from "@/services/projectsApi";

export default function ProcessingAdminDashboardPage() {
    const navigate = useNavigate();
    const { theme } = useTheme();

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);
    const [statusFilter, setStatusFilter] = useState<"all" | "assigned" | "in_progress" | "completed" | "cancelled" | "visa_stamped">("all");
    const [projectFilter, setProjectFilter] = useState<string>("all");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    const { data: projectsData } = useGetProjectsQuery({ limit: 50 });
    const projects = projectsData?.data?.projects || [];

    const adminQueryParams: any = {
        search: debouncedSearch || undefined,
        projectId: projectFilter === "all" ? undefined : projectFilter,
        roleCatalogId: roleFilter === "all" ? undefined : roleFilter,
        page,
        limit: pageSize,
    };

    if (statusFilter === "all") {
        adminQueryParams.filterType = "total_processing";
    } else if (statusFilter === "visa_stamped") {
        adminQueryParams.status = "visa_stamped";
    } else {
        adminQueryParams.status = statusFilter;
    }

    const { data: apiResponse, isLoading, isFetching } = useGetAllProcessingCandidatesAdminQuery(adminQueryParams);

    const candidates = apiResponse?.data?.candidates || [];
    const pagination = apiResponse?.data?.pagination;

    const totalItems = pagination?.total ?? candidates.length;
    const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(totalItems / pageSize));
    useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, projectFilter, roleFilter, pageSize]);
    const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, totalItems);

    const counts: { all?: number; assigned?: number; in_progress?: number; completed?: number; cancelled?: number; visa_stamped?: number } = apiResponse?.data?.counts ?? {};
    const totalProcessing = counts?.all ?? ((counts.assigned || 0) + (counts.in_progress || 0) + (counts.completed || 0) + (counts.cancelled || 0));

    const stats = [
        { label: "Total Processing", value: totalProcessing, status: "all", icon: ClipboardList, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
        { label: "Visa Stamped", value: counts?.visa_stamped ?? counts.in_progress ?? 0, status: "visa_stamped", icon: Activity, color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
        { label: "Cancelled", value: counts.cancelled ?? 0, status: "cancelled", icon: XCircle, color: "text-rose-600", bgColor: "bg-rose-50", borderColor: "border-rose-200" },
        { label: "Completed", value: counts.completed ?? 0, status: "completed", icon: CheckCircle2, color: "text-emerald-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" }
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
            "all": "All",
            "assigned": "Ready for Processing",
            "in_progress": "In Progress",
            "completed": "Completed",
            "cancelled": "Cancelled"
        };
        return labels[status] || status;
    };

    return (
        <Can roles={["CEO", "Director", "Manager", "System Admin"]} fallback={<div className="p-8 text-center text-slate-600">Not authorized</div>}>
            <div className={cn("min-h-screen p-6", theme === "dark" ? "bg-black text-white" : "bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 text-black")}>
                <div className="mx-auto max-w-7xl space-y-8">
                    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 p-3 shadow-lg">
                                <ClipboardList className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h1 className={cn("text-4xl font-black", theme === "dark" ? "text-white" : "text-slate-900")}>Processing Overview — Admin</h1>
                                <p className={cn("font-medium", theme === "dark" ? "text-gray-300" : "text-slate-600")}>Admin view: totals, trends and a quick look at processing status</p>
                            </div>
                        </div>

                        {statusFilter && statusFilter !== 'all' && (
                            <Badge variant="outline" className="h-8 gap-2 bg-violet-50 text-violet-700 border-violet-200 self-start md:self-center">
                                Filtered by: {displayStatus(statusFilter)}
                                <X className="h-3 w-3 cursor-pointer hover:text-rose-500" onClick={() => setStatusFilter('all')} />
                            </Badge>
                        )}
                    </header>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {stats.map((stat) => (
                            <Card
                                key={stat.label}
                                className={cn(
                                    "group relative overflow-hidden border-2 transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer",
                                    statusFilter === stat.status ? "border-violet-500 ring-2 ring-violet-500/20" : stat.borderColor,
                                    theme === "dark" ? "bg-slate-800 text-white" : ""
                                )}
                                onClick={() => setStatusFilter(stat.status === 'all' ? 'all' : (statusFilter === stat.status ? 'all' : (stat.status as "all" | "visa_stamped" | "in_progress" | "completed" | "cancelled" | "assigned")))}
                            >
                                <div
                                    className={cn(
                                        "absolute inset-0 opacity-40 transition-opacity group-hover:opacity-60",
                                        theme === "dark" ? "bg-slate-800" : stat.bgColor
                                    )}
                                />
                                <CardHeader className="relative pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className={cn("text-sm font-semibold uppercase tracking-wider", theme === "dark" ? "text-white" : "text-slate-700")}>
                                            {stat.label}
                                        </CardTitle>
                                        <div className={cn("rounded-xl p-2.5 shadow-md", theme === "dark" ? "bg-slate-800" : stat.bgColor)}>
                                            <stat.icon className={`h-5 w-5 ${theme === "dark" ? "text-white" : stat.color}`} />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative space-y-2">
                                    <div className="flex items-baseline gap-2">
                                        <span className={cn("text-4xl font-black", theme === "dark" ? "text-white" : stat.color)}>
                                            {stat.value}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card className={cn("border-0 shadow-xl overflow-hidden", theme === "dark" ? "bg-black" : "bg-white")}>
                        <CardHeader className={cn("border-b pb-6", theme === "dark" ? "bg-black border-slate-700 text-white" : "bg-white border-slate-100")}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 p-2.5 shadow-lg">
                                        <Users className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className={cn("text-xl font-bold", theme === "dark" ? "text-white" : "text-slate-900")}>Active Candidates</CardTitle>
                                        <p className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-slate-500")}>Admin quick list</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {isFetching && <svg className="h-5 w-5 animate-spin text-violet-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>}
                                    <Badge className={cn("px-4 py-2 text-sm font-bold self-start sm:self-center", theme === "dark" ? "bg-violet-900 text-white" : "bg-violet-100 text-violet-700 border-0")}>{totalItems} Results</Badge>
                                </div>
                            </div>

                            <div className={cn("mt-6 p-4 rounded-2xl border", theme === "dark" ? "bg-black border-slate-700" : "bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-100")}>
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                    <div className="relative flex-1 max-w-md">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-violet-100 rounded-lg p-1.5"><Search className="h-4 w-4 text-violet-600" /></div>
                                        <Input placeholder="Search by name, email or project..." className="pl-14 h-11 bg-white border-slate-200 rounded-xl shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
                                    </div>

                                    <div className="hidden lg:block w-px h-8 bg-slate-200" />

                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-sm"><Filter className="h-4 w-4 text-slate-400" /><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filters:</span></div>

                                        <Select value={projectFilter} onValueChange={(val) => { setProjectFilter(val); setRoleFilter("all"); }}>
                                            <SelectTrigger className="h-10 w-[220px] bg-white border-slate-200 rounded-xl shadow-sm hover:border-violet-300 transition-colors">
                                                <SelectValue placeholder="All Projects" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="all">All Projects</SelectItem>
                                                {projects.map(p => (<SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>))}
                                            </SelectContent>
                                        </Select>

                                        {projectFilter !== "all" && (
                                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                                <SelectTrigger className="h-10 w-[180px] bg-white border-slate-200 rounded-xl shadow-sm hover:border-violet-300 transition-colors">
                                                    <SelectValue placeholder="All Roles" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="all">All Roles</SelectItem>
                                                    {projects.find(p => p.id === projectFilter)?.rolesNeeded?.map((r: any) => (
                                                        <SelectItem key={r.roleCatalogId} value={r.roleCatalogId}>{r.designation}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}

                                        {(search || projectFilter !== "all" || (statusFilter && statusFilter !== 'all')) && (
                                            <Button variant="ghost" size="sm" className="h-10 px-4 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-semibold gap-2 transition-all" onClick={() => { setSearch(""); setProjectFilter("all"); setRoleFilter("all"); setStatusFilter('all'); }}>
                                                <X className="h-4 w-4" /> Clear All
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {((statusFilter && statusFilter !== 'all') || projectFilter !== "all" || roleFilter !== "all") && (
                                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-200/60">
                                        <span className="text-xs font-semibold text-slate-500">Active:</span>
                                        {statusFilter && statusFilter !== 'all' && (<Badge className="bg-violet-100 text-violet-700 border-0 gap-1.5 pr-1.5 font-semibold">Status: {displayStatus(statusFilter)}<button className="ml-1 hover:bg-violet-200 rounded-full p-0.5 transition-colors" onClick={() => setStatusFilter('all')}><X className="h-3 w-3" /></button></Badge>)}
                                        {projectFilter !== "all" && (<Badge className="bg-blue-100 text-blue-700 border-0 gap-1.5 pr-1.5 font-semibold">Project: {projects.find(p => p.id === projectFilter)?.title || projectFilter}<button className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors" onClick={() => { setProjectFilter("all"); setRoleFilter("all"); }}><X className="h-3 w-3" /></button></Badge>)}
                                        {roleFilter !== "all" && (<Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1.5 pr-1.5 font-semibold">Role: {projects.find(p => p.id === projectFilter)?.rolesNeeded?.find((r: any) => r.roleCatalogId === roleFilter)?.designation || roleFilter}<button className="ml-1 hover:bg-emerald-200 rounded-full p-0.5 transition-colors" onClick={() => setRoleFilter("all")}><X className="h-3 w-3" /></button></Badge>)}
                                    </div>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className={cn("p-0", theme === "dark" ? "bg-black text-white" : "bg-white text-black")}>
                            <div className={cn("overflow-auto max-h-[80vh] scrollbar-thin", theme === "dark" ? "scrollbar-thumb-slate-600" : "scrollbar-thumb-slate-200")}>
                                <Table>
                                    <TableHeader>
                                        <TableRow className={cn(theme === "dark" ? "bg-black hover:bg-slate-800" : "bg-slate-50/80")}>
                                            <TableHead className={cn("font-bold text-xs uppercase tracking-wider w-[220px]", theme === "dark" ? "text-white" : "text-slate-700")}>Candidate</TableHead>
                                            <TableHead className={cn("font-bold text-xs uppercase tracking-wider", theme === "dark" ? "text-white" : "text-slate-700")}>Project & Role</TableHead>
                                            <TableHead className={cn("font-bold text-xs uppercase tracking-wider", theme === "dark" ? "text-white" : "text-slate-700")}>Recruiter</TableHead>
                                            <TableHead className={cn("font-bold text-xs uppercase tracking-wider", theme === "dark" ? "text-white" : "text-slate-700")}>Processing</TableHead>
                                            <TableHead className={cn("font-bold text-xs uppercase tracking-wider", theme === "dark" ? "text-white" : "text-slate-700")}>Status</TableHead>
                                            <TableHead className={cn("font-bold text-xs uppercase tracking-wider w-[120px]", theme === "dark" ? "text-white" : "text-slate-700")}>Progress</TableHead>
                                            <TableHead className={cn("text-center font-bold text-xs uppercase tracking-wider w-[80px]", theme === "dark" ? "text-white" : "text-slate-700")}>Action</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody className={theme === "dark" ? "bg-black" : ""}>
                                        {isLoading ? (
                                            <TableRow className={theme === "dark" ? "bg-black" : ""}>
                                                <TableCell colSpan={8} className="h-64 text-center">
                                                    <div className="flex flex-col items-center justify-center space-y-4">
                                                        <svg className="h-10 w-10 animate-spin text-violet-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                                                        <p className={cn("text-sm font-medium", theme === "dark" ? "text-gray-300" : "text-slate-500")}>Loading candidates...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : candidates.length === 0 ? (
                                            <TableRow className={theme === "dark" ? "bg-black" : ""}>
                                                <TableCell colSpan={8} className="h-64 text-center">
                                                    <div className={cn("flex flex-col items-center justify-center space-y-2", theme === "dark" ? "text-gray-300" : "text-slate-500")}>
                                                        <Filter className="h-10 w-10 opacity-20" />
                                                        <p className="text-lg font-bold">No candidates found</p>
                                                        <p className="text-sm">Try adjusting your filters or search term</p>
                                                        <Button variant="link" onClick={() => { setSearch(""); setProjectFilter("all"); setRoleFilter("all"); setStatusFilter('all'); }}>Clear all filters</Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            candidates.map((procCandidate) => (
                                                <TableRow
                                                    key={procCandidate.id}
                                                    className={cn(
                                                        "group transition-all duration-200 hover:shadow-md",
                                                        theme === "dark"
                                                            ? "bg-black hover:bg-black border-b border-slate-800"
                                                            : "bg-white hover:bg-white border-b border-slate-200"
                                                    )}
                                                >
                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-3">
                                                            <ImageViewer 
                                                                title={`${procCandidate.candidate.firstName} ${procCandidate.candidate.lastName}`} 
                                                                src={procCandidate.candidate.profileImage || null} 
                                                                className="h-9 w-9 rounded-full" 
                                                                ariaLabel={`View full image for ${procCandidate.candidate.firstName} ${procCandidate.candidate.lastName}`} 
                                                                enableHoverPreview={true} 
                                                            />
                                                            <div className="min-w-0">
                                                                <button 
                                                                    className={cn(
                                                                        "font-bold text-sm truncate text-left hover:text-violet-600 transition-colors",
                                                                        theme === "dark" ? "text-white" : "text-slate-900"
                                                                    )} 
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation(); 
                                                                        navigate(`/processingCandidateDetails/${procCandidate.id}`); 
                                                                    }} 
                                                                    onKeyDown={(e) => { 
                                                                        if (e.key === 'Enter' || e.key === ' ') { 
                                                                            e.preventDefault(); 
                                                                            navigate(`/processingCandidateDetails/${procCandidate.id}`); 
                                                                        } 
                                                                    }}
                                                                >
                                                                    {procCandidate.candidate.firstName} {procCandidate.candidate.lastName}
                                                                </button>
                                                                <div className={cn(
                                                                    "text-xs truncate flex flex-col gap-0.5 mt-1",
                                                                    theme === "dark" ? "text-gray-300" : "text-slate-500"
                                                                )}>
                                                                    <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> <span className="truncate">{procCandidate.candidate.email || "—"}</span></div>
                                                                    <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> <span className="truncate">{procCandidate.candidate.mobileNumber || "—"}</span></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <div className="space-y-1">
                                                            <p className={cn("text-sm font-bold leading-tight", theme === "dark" ? "text-white" : "text-slate-700")}>{procCandidate.project.title}</p>
                                                            <p className="text-xs text-violet-600 font-semibold uppercase tracking-wide">{procCandidate.role.designation}</p>
                                                            {procCandidate.project?.country?.flag && (
                                                                <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                                                    <span title={procCandidate.project.country.flagName || procCandidate.project.country.name} aria-label={procCandidate.project.country.flagName || procCandidate.project.country.name} className="text-lg leading-none">{procCandidate.project.country.flag}</span>
                                                                    <span className="font-medium">{procCandidate.project.country.name}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn("text-sm font-medium", theme === "dark" ? "text-white" : "text-slate-700")}>
                                                                {procCandidate.candidateProjectMap?.recruiter?.name || "N/A"}
                                                            </span>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <div className="min-w-0">
                                                            <div className={`inline-block rounded-xl px-3 py-2 border ${procCandidate.assignedTo ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100'}`}>
                                                                <p className={`text-sm font-medium ${procCandidate.assignedTo ? 'text-slate-700' : 'text-rose-700'}`}>{procCandidate.assignedTo?.name || "Unassigned"}</p>
                                                                <p className={`text-xs truncate ${procCandidate.assignedTo ? 'text-indigo-700' : 'text-rose-600'}`}>{procCandidate.assignedTo?.email || "—"}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <Badge className={`text-xs border-2 font-black whitespace-nowrap px-3 py-1 ${getStatusBadge(procCandidate.processingStatus)}`}>
                                                            {displayStatus(procCandidate.processingStatus)}
                                                        </Badge>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <div className="space-y-1.5">
                                                            {(() => {
                                                                const raw = (procCandidate as any).progressCount;
                                                                const pct = typeof raw === 'number' ? Math.min(100, Math.max(0, raw)) : (procCandidate.processingStatus === 'completed' ? 100 : 0);
                                                                return (
                                                                    <>
                                                                        <span className={cn("text-xs font-black", theme === "dark" ? "text-white" : "text-slate-700")}>{pct}%</span>
                                                                        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
                                                                            <div 
                                                                                style={{ width: `${pct}%` }} 
                                                                                className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                                                            />
                                                                        </div>
                                                                    </>
                                                                );
                                                            })()}
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
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className={cn("flex items-center justify-between px-4 py-3 border-t", theme === "dark" ? "border-slate-700 bg-black" : "border-slate-100 bg-white")}>
                                <div className={cn("text-sm", theme === "dark" ? "text-gray-300" : "text-slate-600")}>Showing {startItem} - {endItem} of {totalItems}</div>
                                <div className="flex items-center gap-2">
                                    <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                                        <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10 / page</SelectItem>
                                            <SelectItem value="25">25 / page</SelectItem>
                                            <SelectItem value="50">50 / page</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft /></Button>
                                    <div className={cn("px-2 text-sm", theme === "dark" ? "text-gray-300" : "text-slate-700")}>Page {page} / {totalPages}</div>
                                    <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}><ChevronRight /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Can>
    );
}