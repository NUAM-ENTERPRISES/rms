import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { useAppSelector } from "@/app/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import {
  ClipboardCheck,
  Loader2,
  AlertCircle,
  User,
  Briefcase,
  Calendar,
  ChevronRight,
  X,
  Search,
  Edit3,
  CheckCircle2,
  CheckSquare,
  Phone,
  Mail,
  MapPin,
  Building2,
  MessageCircle,
  Clock,
  Link2,
  FileText,
  Activity,
  Target,
} from "lucide-react";
import { useGetInterviewsQuery, useUpdateInterviewStatusMutation, useUpdateBulkInterviewStatusMutation, useGetInterviewHistoryQuery } from "../api";
import { useGetProjectsQuery } from "@/services/projectsApi";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import ReviewInterviewModal from "@/components/molecules/ReviewInterviewModal";
import InterviewHistory from "@/components/molecules/InterviewHistory";
import EditInterviewDialog from "../components/EditInterviewDialog";
import { ImageViewer } from "@/components/molecules";
import { toast } from "sonner";
import { FaWhatsapp } from "react-icons/fa";

const getOutcomeConfig = (outcome?: string) => {
  switch (outcome?.toLowerCase()) {
    case "passed":
      return { label: "Passed", bgClass: "bg-emerald-600 text-white", dotClass: "bg-emerald-500", listBg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "failed":
      return { label: "Failed", bgClass: "bg-red-600 text-white", dotClass: "bg-red-500", listBg: "bg-red-50 text-red-700 border-red-200" };
    case "completed":
      return { label: "Completed", bgClass: "bg-blue-600 text-white", dotClass: "bg-blue-500", listBg: "bg-blue-50 text-blue-700 border-blue-200" };
    case "backout":
      return { label: "Backout", bgClass: "bg-amber-600 text-white", dotClass: "bg-amber-500", listBg: "bg-amber-50 text-amber-700 border-amber-200" };
    default:
      return { label: "Pending", bgClass: "bg-slate-500 text-white", dotClass: "bg-slate-400", listBg: "bg-slate-100 text-slate-600 border-slate-200" };
  }
};

export default function MyInterviewsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAppSelector((s) => s.auth.user);
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "all",
    projectId: searchParams.get("projectId") || "all",
    roleCatalogId: searchParams.get("roleCatalogId") || "all",
  });
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);

  useEffect(() => {
    setProjectSearch("");
  }, [filters.projectId]);

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [updateInterviewStatus] = useUpdateInterviewStatusMutation();
  const [updateBulkInterviewStatus] = useUpdateBulkInterviewStatusMutation();

  useEffect(() => {
    const s = (location.state as any)?.selectedId;
    if (s) setSelectedId(s);
  }, [location.state]);

  useEffect(() => {
    setFilters({
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || "all",
      projectId: searchParams.get("projectId") || "all",
      roleCatalogId: searchParams.get("roleCatalogId") || "all",
    });
  }, [searchParams]);

  useEffect(() => {
    if (filters.projectId === "all") setSelectedBulkIds([]);
  }, [filters.projectId]);

  const rawParams = {
    search: filters.search || undefined,
    status: filters.status !== "all" ? filters.status : undefined,
    projectId: filters.projectId !== "all" ? filters.projectId : undefined,
    roleCatalogId: filters.roleCatalogId !== "all" ? filters.roleCatalogId : undefined,
    mode: searchParams.get("mode") || undefined,
    page: 1,
    limit: 15,
  } as any;

  const { data, isLoading, error } = useGetInterviewsQuery(rawParams);
  const { data: projectsData } = useGetProjectsQuery({ limit: 10 });
  const projects = projectsData?.data?.projects || [];

  const filteredProjects = useMemo(() => {
    if (!projectSearch) return projects;
    const term = projectSearch.toLowerCase();
    return projects.filter((p: any) => p.title?.toLowerCase().includes(term));
  }, [projects, projectSearch]);

  const selectedProject = useMemo(
    () => projects.find((p: any) => p.id === filters.projectId),
    [projects, filters.projectId]
  );

  const interviews = (data?.data?.interviews ?? []) as any[];

  const myInterviews = useMemo(() => {
    if (!currentUser) return interviews;
    return interviews.filter((i) => {
      const interviewerEmail = i.interviewerEmail;
      const candidateId = i.candidateProjectMap?.candidate?.id || i.candidate?.id;
      const isInterviewer =
        (currentUser.email && interviewerEmail === currentUser.email);
      const isCandidate = currentUser.id && candidateId === currentUser.id;
      return isInterviewer || isCandidate;
    });
  }, [interviews, currentUser]);

  const displayedList = myInterviews.length > 0 ? myInterviews : interviews;

  const filteredList = useMemo(() => {
    if (!filters.search) return displayedList;
    const term = filters.search.toLowerCase();
    return displayedList.filter((it) => {
      const cand = it.candidateProjectMap?.candidate;
      const role = it.candidateProjectMap?.roleNeeded;
      return (
        cand?.firstName?.toLowerCase().includes(term) ||
        cand?.lastName?.toLowerCase().includes(term) ||
        it.candidateProjectMap?.project?.title?.toLowerCase().includes(term) ||
        role?.designation?.toLowerCase().includes(term)
      );
    });
  }, [displayedList, filters.search]);

  const selected = useMemo(() => {
    if (selectedId) return filteredList.find((i) => i.id === selectedId) || null;
    return filteredList[0] || null;
  }, [filteredList, selectedId]);

  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(10);

  useEffect(() => {
    setHistoryPage(1);
  }, [selected?.id]);

  const { data: historyResp, isLoading: isHistoryLoading } = useGetInterviewHistoryQuery(
    { id: selected?.id ?? "", page: historyPage, limit: historyLimit },
    { skip: !selected?.id }
  );

  const handleReviewSubmit = async (
    updates: { id: string; interviewStatus: "passed" | "failed" | "completed"; subStatus?: string; reason?: string }[]
  ) => {
    try {
      await updateBulkInterviewStatus({ updates }).unwrap();
      toast.success(`${updates.length} Interview(s) reviewed successfully`);
      setSelectedBulkIds([]);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update status");
    }
  };

  if (isLoading)
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );

  if (error)
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load interviews.</AlertDescription>
        </Alert>
      </div>
    );

  const selectedOutcomeConfig = getOutcomeConfig(selected?.outcome);

  return (
    <div className="h-screen flex flex-col bg-slate-50/50">
      {/* Sticky Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="px-6 py-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-xl shrink-0">
                <ClipboardCheck className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">My Interviews</h1>
                <p className="text-[11px] text-slate-500 font-medium">Assigned to you as interviewer or candidate</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search candidates, projects..."
                  value={filters.search}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters((p) => ({ ...p, search: val }));
                    const np = new URLSearchParams(searchParams);
                    if (val) np.set("search", val);
                    else np.delete("search");
                    setSearchParams(np, { replace: true });
                  }}
                  className="pl-9 h-8 text-xs w-52 border-slate-200 rounded-lg"
                />
              </div>

              <Select
                value={filters.status}
                onValueChange={(val) => {
                  const np = new URLSearchParams(searchParams);
                  if (val === "all") np.delete("status");
                  else np.set("status", val);
                  setSearchParams(np);
                }}
              >
                <SelectTrigger className="h-8 w-28 text-xs border-slate-200 rounded-lg">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.projectId}
                onValueChange={(val) => {
                  const np = new URLSearchParams(searchParams);
                  if (val === "all") {
                    np.delete("projectId");
                    np.delete("roleCatalogId");
                  } else {
                    np.set("projectId", val);
                    np.delete("roleCatalogId");
                  }
                  setProjectSearch("");
                  setSearchParams(np);
                }}
              >
                <SelectTrigger className="h-8 w-40 text-xs border-slate-200 rounded-lg">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Search projects..."
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      className="text-xs h-7"
                    />
                  </div>
                  <SelectItem value="all">All Projects</SelectItem>
                  {filteredProjects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.roleCatalogId}
                disabled={filters.projectId === "all"}
                onValueChange={(val) => {
                  const np = new URLSearchParams(searchParams);
                  if (val === "all") np.delete("roleCatalogId");
                  else np.set("roleCatalogId", val);
                  setSearchParams(np);
                }}
              >
                <SelectTrigger className="h-8 w-36 text-xs border-slate-200 rounded-lg">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {selectedProject?.rolesNeeded?.map((r: any) => (
                    <SelectItem key={r.id} value={r.roleCatalogId!}>{r.designation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(filters.search || filters.status !== "all" || filters.projectId !== "all" || filters.roleCatalogId !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                  onClick={() => setSearchParams(new URLSearchParams())}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}

              {selectedBulkIds.length > 0 && (
                <Button
                  size="sm"
                  className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 text-xs font-semibold"
                  onClick={() => setIsReviewOpen(true)}
                >
                  <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                  Bulk Review ({selectedBulkIds.length})
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="h-8 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Back
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Body: List + Detail */}
      <div className="flex-1 flex overflow-hidden">
        {/* List Panel */}
        <div className="w-72 border-r bg-white flex flex-col shrink-0">
          {/* Select all row */}
          {filteredList.length > 0 && filters.projectId !== "all" && (
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={filteredList.length > 0 && filteredList.every((it) => selectedBulkIds.includes(it.id))}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedBulkIds(filteredList.map((it) => it.id));
                    else setSelectedBulkIds([]);
                  }}
                />
                <label htmlFor="select-all" className="text-[11px] font-bold text-slate-500 cursor-pointer select-none uppercase tracking-wider">
                  {selectedBulkIds.length > 0 ? `${selectedBulkIds.length} selected` : "Select All"}
                </label>
              </div>
              {selectedBulkIds.length > 0 && (
                <button
                  onClick={() => setSelectedBulkIds([])}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          <ScrollArea className="flex-1">
            {filteredList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="p-3 bg-indigo-50 rounded-full mb-3">
                  <ClipboardCheck className="h-6 w-6 text-indigo-400" />
                </div>
                <p className="text-sm font-bold text-slate-500">No interviews found</p>
                <p className="text-[11px] text-slate-400 mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="p-3 space-y-1.5">
                {filteredList.map((it) => {
                  const candidate = it.candidateProjectMap?.candidate;
                  const role = it.candidateProjectMap?.roleNeeded;
                  const project = it.candidateProjectMap?.project;
                  const isSelected = it.id === selected?.id;
                  const cfg = getOutcomeConfig(it.outcome);

                  return (
                    <div key={it.id} className="relative flex items-center gap-1.5 group">
                      {filters.projectId !== "all" && (
                        <Checkbox
                          checked={selectedBulkIds.includes(it.id)}
                          onCheckedChange={(checked) => {
                            setSelectedBulkIds((prev) =>
                              checked ? [...prev, it.id] : prev.filter((id) => id !== it.id)
                            );
                          }}
                          className="opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity shrink-0"
                        />
                      )}
                      <button
                        onClick={() => setSelectedId(it.id)}
                        className={cn(
                          "flex-1 text-left p-3 rounded-xl border transition-all",
                          isSelected
                            ? "bg-indigo-50 border-indigo-200 shadow-sm"
                            : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/80"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            <ImageViewer
                              src={candidate?.profileImage || null}
                              title={candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown"}
                              className="h-9 w-9 rounded-lg border border-slate-200 object-cover"
                              enableHoverPreview={false}
                              ariaLabel={candidate ? `View profile image for ${candidate.firstName} ${candidate.lastName}` : "View profile image"}
                            />
                            <div className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white", cfg.dotClass)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-slate-800 truncate">
                              {candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown"}
                            </p>
                            <p className="text-[11px] text-indigo-600 font-medium truncate">{role?.designation || "Unknown Role"}</p>
                            <p className="text-[10px] text-slate-400 truncate">{project?.title || "—"}</p>
                          </div>
                          <ChevronRight className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "text-indigo-500" : "text-slate-300")} />
                        </div>

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {it.outcome && (
                            <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", cfg.listBg)}>
                              {cfg.label}
                            </span>
                          )}
                          {it.scheduledTime && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Calendar className="h-2.5 w-2.5" />
                              {format(new Date(it.scheduledTime), "MMM d, h:mm a")}
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Detail Panel */}
        <div className="flex-1 overflow-hidden">
          {selected ? (
            <ScrollArea className="h-full">
              <div className="p-6 space-y-5 max-w-full">

                {/* Detail Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <ImageViewer
                        src={selected.candidateProjectMap?.candidate?.profileImage || null}
                        title={
                          selected.candidateProjectMap?.candidate
                            ? `${selected.candidateProjectMap.candidate.firstName} ${selected.candidateProjectMap.candidate.lastName}`
                            : "Candidate"
                        }
                        className="h-12 w-12 rounded-xl border border-slate-200 object-cover shadow-sm"
                        ariaLabel="Candidate profile"
                      />
                      <div className={cn("absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm", selectedOutcomeConfig.dotClass)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">
                          {selected.candidateProjectMap?.candidate
                            ? `${selected.candidateProjectMap.candidate.firstName} ${selected.candidateProjectMap.candidate.lastName}`
                            : "Unknown Candidate"}
                        </h2>
                        <Badge className={cn("rounded-full px-2 py-0 h-5 text-[9px] uppercase font-bold tracking-wider", selectedOutcomeConfig.bgClass)}>
                          {selectedOutcomeConfig.label}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {selected.candidateProjectMap?.roleNeeded?.designation || "—"} ·{" "}
                        {selected.candidateProjectMap?.project?.title || "—"}
                        {selected.scheduledTime && (
                          <> · {format(new Date(selected.scheduledTime), "dd MMM yyyy, hh:mm a")}</>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditOpen(true)}
                      className="h-8 text-xs font-semibold border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setIsReviewOpen(true)}
                      className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 text-xs font-semibold"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Review
                    </Button>
                  </div>
                </div>

                {/* Main detail card */}
                <Card className="border-indigo-100 shadow-sm overflow-hidden rounded-xl bg-white">
                  <div className="bg-gradient-to-r from-indigo-50/80 to-transparent px-5 py-3.5 border-b border-indigo-100">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-indigo-100 rounded-lg">
                        <Building2 className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Interview & Candidate Details</h3>
                        <p className="text-[10px] text-slate-500 font-medium">Scheduling, role, project, and candidate information</p>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-12">
                      {/* Left: Candidate + Schedule */}
                      <div className="md:col-span-5 border-r border-slate-100 flex flex-col">
                        {/* Candidate */}
                        <div className="p-4 border-b border-slate-100 bg-slate-50/30">
                          <div className="flex items-center gap-2 mb-3">
                            <User className="h-3.5 w-3.5 text-indigo-500" />
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Candidate Info</h4>
                          </div>
                          <div className="space-y-2.5">
                            {selected.candidateProjectMap?.candidate?.email && (
                              <div className="flex items-center gap-2 text-slate-700">
                                <div className="h-6 w-6 rounded-md bg-indigo-50 flex items-center justify-center shrink-0">
                                  <Mail className="h-3 w-3 text-indigo-500" />
                                </div>
                                <a href={`mailto:${selected.candidateProjectMap.candidate.email}`} className="text-[12px] hover:underline truncate">
                                  {selected.candidateProjectMap.candidate.email}
                                </a>
                              </div>
                            )}
                            {selected.candidateProjectMap?.candidate?.mobileNumber && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-700">
                                  <div className="h-6 w-6 rounded-md bg-indigo-50 flex items-center justify-center shrink-0">
                                    <Phone className="h-3 w-3 text-indigo-500" />
                                  </div>
                                  <span className="text-[12px]">{selected.candidateProjectMap.candidate.mobileNumber}</span>
                                </div>
                                <button
                                  onClick={() => {
                                    const phone = selected.candidateProjectMap.candidate.mobileNumber.replace(/\D/g, "");
                                    window.open(`https://wa.me/${phone}`, "_blank");
                                  }}
                                  className="flex items-center gap-1 text-emerald-600 hover:bg-emerald-50 px-2 py-0.5 rounded-lg text-[10px] font-bold"
                                >
                                  <FaWhatsapp className="h-3 w-3" />
                                  Chat
                                </button>
                              </div>
                            )}
                            {selected.candidateProjectMap?.candidate?.totalExperience !== undefined && (
                              <div className="flex items-center gap-2 text-slate-700">
                                <div className="h-6 w-6 rounded-md bg-amber-50 flex items-center justify-center shrink-0">
                                  <Briefcase className="h-3 w-3 text-amber-500" />
                                </div>
                                <span className="text-[12px]">{selected.candidateProjectMap.candidate.totalExperience} yrs experience</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Schedule */}
                        <div className="p-4 bg-slate-50/30 flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Schedule Details</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                              <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">Mode</p>
                              <p className="text-[11px] font-bold text-slate-700 capitalize">{selected.mode?.replace("_", " ") || "—"}</p>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                              <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">Duration</p>
                              <p className="text-[11px] font-bold text-slate-700">{selected.duration ? `${selected.duration} min` : "—"}</p>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                              <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">Air Ticket</p>
                              <p className="text-[11px] font-bold text-slate-700 capitalize">{selected.airTicket || "No"}</p>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                              <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">Accommodation</p>
                              <p className="text-[11px] font-bold text-slate-700">{selected.accommodation ? "Yes" : "No"}</p>
                            </div>
                          </div>
                          {selected.scheduledTime && (
                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-2.5 flex items-center gap-2">
                              <Clock className="h-3 w-3 text-indigo-500 shrink-0" />
                              <span className="text-[10px] font-bold text-indigo-700">
                                {format(new Date(selected.scheduledTime), "EEE, dd MMM yyyy • hh:mm a")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Project + Meeting + Notes */}
                      <div className="md:col-span-7 p-5 space-y-5 bg-white">
                        {/* Project & Role */}
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Project & Role</h4>
                            </div>
                            {selected.candidateProjectMap?.project?.countryCode && (
                              <Badge variant="outline" className="text-[9px] px-2 h-4">
                                <MapPin className="h-2.5 w-2.5 mr-1" />
                                {selected.candidateProjectMap.project.countryCode}
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                              <p className="text-[9px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Project</p>
                              <p className="text-[12px] font-bold text-slate-800">{selected.candidateProjectMap?.project?.title || "—"}</p>
                              {selected.candidateProjectMap?.project?.deadline && (
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  Deadline: {format(new Date(selected.candidateProjectMap.project.deadline), "dd MMM yyyy")}
                                </p>
                              )}
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                              <p className="text-[9px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Role</p>
                              <p className="text-[12px] font-bold text-slate-800">{selected.candidateProjectMap?.roleNeeded?.designation || "—"}</p>
                              {selected.candidateProjectMap?.roleNeeded?.roleCatalog && (
                                <p className="text-[10px] text-indigo-500 font-medium mt-0.5">
                                  {selected.candidateProjectMap.roleNeeded.roleCatalog.label || selected.candidateProjectMap.roleNeeded.roleCatalog.name}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Client details */}
                          {selected.candidateProjectMap?.project?.client && (
                            <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Client</p>
                              </div>
                              <p className="text-[12px] font-bold text-slate-800">{selected.candidateProjectMap.project.client.name}</p>
                              <div className="flex gap-3 mt-1">
                                {selected.candidateProjectMap.project.client.email && (
                                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Mail className="h-2.5 w-2.5" />
                                    {selected.candidateProjectMap.project.client.email}
                                  </span>
                                )}
                                {selected.candidateProjectMap.project.client.phone && (
                                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Phone className="h-2.5 w-2.5" />
                                    {selected.candidateProjectMap.project.client.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Meeting Link */}
                        {selected.meetingLink && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Link2 className="h-3.5 w-3.5 text-indigo-500" />
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Meeting Link</h4>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-3 rounded-xl shadow-sm">
                              <a
                                href={selected.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 text-[11px] text-indigo-600 hover:text-indigo-700 break-all"
                              >
                                {selected.meetingLink}
                              </a>
                              {selected.candidateProjectMap?.candidate?.mobileNumber && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const phone = selected.candidateProjectMap.candidate.mobileNumber.replace(/\D/g, "");
                                    const candidateName = selected.candidateProjectMap.candidate.firstName;
                                    const message = `Hi ${candidateName}, here is the meeting link for your interview: ${selected.meetingLink}`;
                                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2.5 text-[10px] font-bold rounded-lg shrink-0"
                                >
                                  <FaWhatsapp className="h-3 w-3 mr-1" />
                                  Send
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {selected.notes && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-3.5 w-3.5 text-indigo-500" />
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notes</h4>
                            </div>
                            <div className="text-[12px] text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-xl leading-relaxed shadow-sm whitespace-pre-wrap min-h-[60px]">
                              {selected.notes}
                            </div>
                          </div>
                        )}

                        {/* Empty state */}
                        {!selected.meetingLink && !selected.notes && (
                          <div className="flex flex-col items-center justify-center text-center py-8 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200">
                            <Activity className="h-8 w-8 text-slate-200 mb-2" />
                            <p className="text-[12px] font-bold text-slate-400">No additional details</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">No meeting link or notes recorded.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Interview History */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-800">Complete Interview History</h3>
                    <p className="text-[10px] text-slate-500">Timeline of all interactions and status changes</p>
                  </div>
                  <div className="p-5">
                    <InterviewHistory
                      items={Array.isArray(historyResp?.data) ? historyResp?.data : historyResp?.data?.items ?? []}
                      isLoading={isHistoryLoading}
                      pagination={historyResp?.data?.pagination ?? null}
                      onPageChange={(p) => setHistoryPage(p)}
                      onLimitChange={(l) => {
                        setHistoryLimit(l);
                        setHistoryPage(1);
                      }}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12">
              <div className="p-4 bg-indigo-50 rounded-full mb-3">
                <ClipboardCheck className="h-8 w-8 text-indigo-300" />
              </div>
              <p className="text-sm font-bold text-slate-400">No interview selected</p>
              <p className="text-[11px] text-slate-400 mt-1">Select an interview from the list to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ReviewInterviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        interview={selectedBulkIds.length > 0 ? filteredList.filter((it) => selectedBulkIds.includes(it.id)) : selected}
        onSubmit={handleReviewSubmit}
      />

      {selected && (
        <EditInterviewDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          interviewId={selected.id}
        />
      )}
    </div>
  );
}