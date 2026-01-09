import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { getAge } from "@/utils/getAge";
import {
  ClipboardCheck,
  Search,
  Loader2,
  AlertCircle,
  User,
  Briefcase,
  ChevronRight,
  MoveRight,
  CheckCircle2,
  X,
  CheckSquare,
  ChevronLeft,
  Mail,
  Phone,
  GraduationCap,
  CalendarDays,
  Layers,
  MapPin,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateInterviewStatusMutation, useUpdateBulkInterviewStatusMutation } from "../api";
import { useGetCandidatesToTransferQuery } from "@/features/processing/data/processing.endpoints";
import { useGetProjectsQuery } from "@/services/projectsApi";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SingleTransferToProcessingModal } from "../components/SingleTransferToProcessingModal";
import { MultiTransferToProcessingModal } from "../components/MultiTransferToProcessingModal";
import { ProcessingHistory } from "@/features/processing/components/ProcessingHistory";

export default function PassedCandidatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [bulkTransferModalOpen, setBulkTransferModalOpen] = useState(false);
  
  const currentPage = parseInt(searchParams.get("page") || "1");
  const setCurrentPage = (page: number) => {
    const np = new URLSearchParams(searchParams);
    if (page === 1) np.delete("page");
    else np.set("page", page.toString());
    setSearchParams(np);
  };

  const [filters, setFilters] = useState({ 
    search: searchParams.get("search") || "", 
    projectId: searchParams.get("projectId") || "all",
    roleNeededId: searchParams.get("roleNeededId") || "all",
    status: searchParams.get("status") || "all"
  });

  const [projectSearch, setProjectSearch] = useState("");
  const debouncedProjectSearch = useDebounce(projectSearch, 400);

  useEffect(() => {
    setFilters({
      search: searchParams.get("search") || "",
      projectId: searchParams.get("projectId") || "all",
      roleNeededId: searchParams.get("roleNeededId") || "all",
      status: searchParams.get("status") || "all"
    });
  }, [searchParams]);

  const { data, isLoading, error } = useGetCandidatesToTransferQuery({
    search: filters.search || undefined,
    projectId: filters.projectId !== "all" ? filters.projectId : undefined,
    roleNeededId: filters.roleNeededId !== "all" ? filters.roleNeededId : undefined,
    status: filters.status !== "all" ? filters.status as 'pending' | 'transferred' : undefined,
    page: currentPage,
    limit: 20,
  });

  const { data: projectsData } = useGetProjectsQuery({ 
    limit: 20,
    search: debouncedProjectSearch || undefined
  });
  const projects = projectsData?.data?.projects || [];
  
  const filteredProjects = projects; // API handles the filtering

  const selectedProject = useMemo(() => 
    projects.find((p: any) => p.id === filters.projectId),
    [projects, filters.projectId]
  );

  const [updateStatus, { isLoading: isUpdating }] = useUpdateInterviewStatusMutation();
  const [updateBulkStatus, { isLoading: isBulkUpdating }] = useUpdateBulkInterviewStatusMutation();

  const interviews = (data?.data?.interviews ?? []) as any[];
  
  const passedCandidates = useMemo(() => {
    return interviews.filter(it => it.outcome?.toLowerCase() === "passed");
  }, [interviews]);

  const filteredList = passedCandidates; // Filtering already done by query and the .filter above

  const selected = useMemo(() => {
    if (selectedId) return filteredList.find((i) => i.id === selectedId) || null;
    return filteredList[0] || null;
  }, [filteredList, selectedId]);

  const handleTransfer = async () => {
    setTransferModalOpen(true);
  };

  const handleBulkTransfer = async () => {
    if (selectedBulkIds.length === 0) return;
    setBulkTransferModalOpen(true);
  };

  const bulkTransferCandidates = useMemo(() => {
    return selectedBulkIds.map(id => {
      const interview = filteredList.find(it => it.id === id);
      if (!interview) return null;
      
      const candidate = interview.candidateProjectMap?.candidate || interview.candidate;
      return {
        id: interview.id,
        candidateId: candidate?.id,
        candidate, // Pass full candidate object for tooltip
        candidateName: `${candidate?.firstName} ${candidate?.lastName}`,
        recruiterName: interview.candidateProjectMap?.recruiter?.name,
      };
    }).filter(Boolean) as Array<{
      id: string;
      candidateId: string;
      candidate: any;
      candidateName: string;
      recruiterName?: string;
    }>;
  }, [selectedBulkIds, filteredList]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load passed candidates.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-950 dark:to-black">
      <div className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Ready for Processing
                </h1>
                <p className="text-sm text-muted-foreground">Candidates passed and ready for handoff</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search candidates..."
                value={filters.search}
                onChange={(e) => {
                  const val = e.target.value;
                  const np = new URLSearchParams(searchParams);
                  if (val) np.set("search", val);
                  else np.delete("search");
                  np.delete("page");
                  setSearchParams(np, { replace: true });
                }}
                className="pl-10 text-sm"
              />
            </div>

            <Select 
              value={filters.projectId} 
              onValueChange={(val) => {
                const np = new URLSearchParams(searchParams);
                if (val === "all") {
                  np.delete("projectId");
                  np.delete("roleNeededId");
                  setSelectedBulkIds([]);
                } else {
                  np.set("projectId", val);
                  np.delete("roleNeededId");
                }
                np.delete("page");
                setProjectSearch("");
                setSearchParams(np);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <SelectItem value="all">All Projects</SelectItem>
                {filteredProjects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={filters.roleNeededId} 
              disabled={filters.projectId === "all"}
              onValueChange={(val) => {
                const np = new URLSearchParams(searchParams);
                if (val === "all") np.delete("roleNeededId");
                else np.set("roleNeededId", val);
                np.delete("page");
                setSearchParams(np);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {selectedProject?.rolesNeeded?.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.designation}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={filters.status} 
              onValueChange={(val) => {
                const np = new URLSearchParams(searchParams);
                if (val === "all") np.delete("status");
                else np.set("status", val);
                np.delete("page");
                setSearchParams(np);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending Transfer</SelectItem>
                <SelectItem value="transferred">Already Transferred</SelectItem>
              </SelectContent>
            </Select>

            {(filters.search || filters.projectId !== "all" || filters.roleNeededId !== "all" || filters.status !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => {
                setSearchParams(new URLSearchParams());
              }}>
                <X className="h-4 w-4" />
              </Button>
            )}

            {filters.projectId !== "all" && selectedBulkIds.length > 0 && (
              <Button
                size="sm"
                onClick={handleBulkTransfer}
                disabled={isBulkUpdating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all animate-in fade-in zoom-in duration-200 gap-2"
              >
                {isBulkUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
                Bulk Transfer ({selectedBulkIds.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r bg-white/60 dark:bg-gray-900/60 flex flex-col">
          {filters.projectId !== "all" && filteredList.length > 0 && (
            <div className="p-3 border-b flex items-center justify-between bg-white/40 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={
                    filteredList.length > 0 &&
                    filteredList.every((it) => it.isTransferredToProcessing || selectedBulkIds.includes(it.id))
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedBulkIds(filteredList.filter(it => !it.isTransferredToProcessing).map((it) => it.id));
                    } else {
                      setSelectedBulkIds([]);
                    }
                  }}
                />
                <label
                  htmlFor="select-all"
                  className="text-xs font-medium cursor-pointer select-none"
                >
                  {selectedBulkIds.length > 0 ? `${selectedBulkIds.length} selected` : "Select All"}
                </label>
              </div>
              {selectedBulkIds.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-[10px] px-2"
                  onClick={() => setSelectedBulkIds([])}
                >
                  Clear
                </Button>
              )}
            </div>
          )}
          <ScrollArea className="flex-1">
            {filteredList.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-40 text-emerald-400" />
                <p className="font-medium">No candidates ready</p>
                <p className="text-xs mt-1">Candidates marked 'Passed' will appear here for processing</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {filteredList.map((it) => {
                  const candidate = it.candidateProjectMap?.candidate || it.candidate;
                  const isSelected = it.id === selected?.id;

                  return (
                    <div key={it.id} className="relative flex items-center gap-1 group">
                      {filters.projectId !== "all" && (
                        <Checkbox
                          checked={selectedBulkIds.includes(it.id)}
                          disabled={it.isTransferredToProcessing}
                          onCheckedChange={(checked) => {
                            setSelectedBulkIds((prev) =>
                              checked ? [...prev, it.id] : prev.filter((id) => id !== it.id)
                            );
                          }}
                          className="ml-1 opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
                        />
                      )}
                      <button
                        onClick={() => setSelectedId(it.id)}
                        className={cn(
                          "flex-1 text-left p-3.5 rounded-lg border transition-all",
                          isSelected
                            ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 dark:from-emerald-900/30 dark:to-teal-900/30 dark:border-emerald-700"
                            : "bg-white dark:bg-gray-800 border-transparent hover:border-gray-300 dark:hover:border-gray-700"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className="text-sm font-bold bg-emerald-500 text-white">
                              {candidate ? `${candidate.firstName?.[0]}${candidate.lastName?.[0]}` : "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">
                                {candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown"}
                              </p>
                              {it.isTransferredToProcessing && (
                                <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[9px] bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none">
                                  Transferred
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {it.candidateProjectMap?.project?.title || it.project?.title || "Unknown Project"}
                            </p>
                          </div>
                          <ChevronRight className={cn("h-4 w-4", isSelected ? "text-emerald-600" : "text-muted-foreground")} />
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {data?.data?.pagination && data.data.pagination.totalPages > 1 && (
            <div className="p-3 border-t bg-white/40 dark:bg-gray-800/40 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Page {currentPage} of {data.data.pagination.totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === data.data.pagination.totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          {selected ? (
            <ScrollArea className="h-full">
              <div className="p-6 max-w-4xl mx-auto space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Candidate Details</h2>
                      {selected.isTransferredToProcessing && (
                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200 uppercase tracking-wider text-[10px]">
                          Already Transferred
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">Passed on {format(new Date(selected.updatedAt || selected.scheduledTime), "PPP")}</p>
                  </div>
                  <Button 
                    onClick={handleTransfer}
                    disabled={isUpdating || selected.isTransferredToProcessing}
                    className={cn(
                      "shadow-md transition-all hover:scale-105",
                      selected.isTransferredToProcessing 
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed hover:scale-100" 
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    )}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : selected.isTransferredToProcessing ? (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    ) : (
                      <MoveRight className="h-4 w-4 mr-2" />
                    )}
                    {selected.isTransferredToProcessing ? "Transferred" : "Transfer to Processing"}
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Candidate Information Card */}
                  <Card className="border-emerald-100 dark:border-emerald-900/30 overflow-hidden shadow-sm">
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 px-6 py-4 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                      <h3 className="font-semibold text-lg flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                        <User className="h-5 w-5" />
                        Candidate Details
                      </h3>
                      {(selected.candidateProjectMap?.candidate || selected.candidate)?.experience && (
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          {(selected.candidateProjectMap?.candidate || selected.candidate).experience} Years Experience
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Full Name</p>
                            <p className="font-bold text-xl text-slate-800 dark:text-slate-200">
                              {(selected.candidateProjectMap?.candidate || selected.candidate)?.firstName} {(selected.candidateProjectMap?.candidate || selected.candidate)?.lastName}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
                              <Mail className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Email Address</p>
                              <p className="text-sm font-medium">{(selected.candidateProjectMap?.candidate || selected.candidate)?.email || "N/A"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
                              <Phone className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Contact Number</p>
                              <p className="text-sm font-medium">
                                {(selected.candidateProjectMap?.candidate || selected.candidate)?.countryCode || "+91"} {(selected.candidateProjectMap?.candidate || selected.candidate)?.mobileNumber || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
                              <CalendarDays className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Personal Info</p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium capitalize">{(selected.candidateProjectMap?.candidate || selected.candidate)?.gender?.toLowerCase() || "N/A"}</p>
                                <span className="text-slate-300">•</span>
                                <p className="text-sm font-medium">
                                  {getAge((selected.candidateProjectMap?.candidate || selected.candidate)?.dateOfBirth) ? `${getAge((selected.candidateProjectMap?.candidate || selected.candidate)?.dateOfBirth)} years` : "Age N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {((selected.candidateProjectMap?.candidate || selected.candidate)?.qualifications?.length ?? 0) > 0 && (
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">
                                <GraduationCap className="h-4 w-4 text-slate-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">Qualifications</p>
                                <div className="space-y-1 mt-1">
                                  {(selected.candidateProjectMap?.candidate || selected.candidate).qualifications.map((q: any) => (
                                    <div key={q.id} className="text-sm">
                                      <p className="font-medium truncate leading-tight">{q.qualification?.name || q.qualification?.shortName || "Degree"}</p>
                                      <p className="text-[11px] text-muted-foreground">{q.university} • {q.graduationYear}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Work Status</p>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs">Experience</span>
                                <span className="text-xs font-bold text-emerald-600">{(selected.candidateProjectMap?.candidate || selected.candidate)?.totalExperience || "0"}y</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full" 
                                  style={{ width: `${Math.min(((selected.candidateProjectMap?.candidate || selected.candidate)?.totalExperience || 0) * 10, 100)}%` }} 
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground italic">Current: {(selected.candidateProjectMap?.candidate || selected.candidate)?.currentRole || "Not Specified"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Project & Handoff Context Card */}
                  <Card className="border-indigo-100 dark:border-indigo-900/30 overflow-hidden shadow-sm">
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 px-6 py-4 border-b border-indigo-100 dark:border-indigo-900/30">
                      <h3 className="font-semibold text-lg flex items-center gap-2 text-indigo-800 dark:text-indigo-400">
                        <Briefcase className="h-5 w-5" />
                        Project Context
                      </h3>
                    </div>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Target Project</p>
                            <p className="font-bold text-lg text-slate-800 dark:text-slate-200">
                              {selected.candidateProjectMap?.project?.title || selected.project?.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-900/40">
                              <Layers className="h-4 w-4 text-indigo-500" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Hiring Designation</p>
                              <p className="text-sm font-medium">{(selected.candidateProjectMap?.roleNeeded || selected.roleNeeded)?.designation || "N/A"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-900/40">
                              <Clock className="h-4 w-4 text-indigo-500" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Deadline & Status</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] uppercase font-bold text-amber-600 border-amber-200">
                                  {selected.candidateProjectMap?.project?.priority || "Medium"}
                                </Badge>
                                <span className="text-xs font-medium">
                                  {selected.candidateProjectMap?.project?.deadline ? format(new Date(selected.candidateProjectMap.project.deadline), "MMM d, yyyy") : "No Deadline"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Requirement Details</p>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Type</p>
                                <p className="text-sm font-medium">{(selected.candidateProjectMap?.project?.type || "Bulk").replace("_", " ")}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Creator</p>
                                <p className="text-sm font-medium truncate">{selected.candidateProjectMap?.project?.createdBy?.name || "System"}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Grooming Standard</p>
                                <div className="flex items-center gap-1.5">
                                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                                  <p className="text-xs font-medium">{selected.candidateProjectMap?.project?.groomingStandard || "A-Grade"}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="p-4 bg-indigo-50/30 dark:bg-indigo-900/20 rounded-xl border border-indigo-50 dark:border-indigo-900/40">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assigned Recruiter</p>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800">
                                <AvatarFallback className="bg-indigo-500 text-white text-xs">
                                  {selected.candidateProjectMap?.recruiter?.name?.split(" ").map((n: string) => n[0]).join("") || "R"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{selected.candidateProjectMap?.recruiter?.name || "System Assigned"}</p>
                                <p className="text-[11px] text-muted-foreground">{selected.candidateProjectMap?.recruiter?.email || "recruiter@system.com"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-emerald-100 dark:border-emerald-900/30">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                      Interview Summary
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                          <p className="text-muted-foreground text-xs uppercase font-semibold">Final Outcome</p>
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 mt-1">PASSED</Badge>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg">
                          <p className="text-muted-foreground text-xs uppercase font-semibold">Interview Type</p>
                          <p className="font-medium capitalize mt-1">{selected.type || "—"}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg">
                          <p className="text-muted-foreground text-xs uppercase font-semibold">Mode</p>
                          <p className="font-medium capitalize mt-1">{selected.mode?.replace("_", " ") || "—"}</p>
                        </div>
                      </div>
                      
                      {selected.notes && (
                        <div className="pt-4 border-t">
                          <p className="text-sm font-semibold mb-2">Interviewer Feedback & Notes</p>
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm border italic text-slate-700 dark:text-slate-300 leading-relaxed">
                            "{selected.notes}"
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {selected.isTransferredToProcessing && 
                 selected.candidateProjectMap?.candidate?.id && 
                 selected.candidateProjectMap?.project?.id && 
                 selected.candidateProjectMap?.roleNeeded?.id && (
                  <ProcessingHistory
                    candidateId={selected.candidateProjectMap.candidate.id}
                    projectId={selected.candidateProjectMap.project.id}
                    roleNeededId={selected.candidateProjectMap.roleNeeded.id}
                  />
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                  <CheckCircle2 className="h-10 w-10 opacity-20" />
                </div>
                <p className="font-medium">Select a candidate</p>
                <p className="text-sm">Choose from the list on the left to review and handoff</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {selected && (
        <SingleTransferToProcessingModal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          candidateId={(selected.candidateProjectMap?.candidate || selected.candidate)?.id}
          candidateName={`${(selected.candidateProjectMap?.candidate || selected.candidate)?.firstName} ${(selected.candidateProjectMap?.candidate || selected.candidate)?.lastName}`}
          recruiterName={selected.candidateProjectMap?.recruiter?.name}
          projectId={selected.candidateProjectMap?.project?.id || selected.project?.id}
          roleNeededId={selected.candidateProjectMap?.roleNeeded?.id || selected.roleNeeded?.id}
          onSuccess={() => {
            if (selectedId === selected.id) {
              setSelectedId(null);
            }
            setSelectedBulkIds(prev => prev.filter(id => id !== selected.id));
          }}
        />
      )}

      {bulkTransferCandidates.length > 0 && filters.projectId !== "all" && (
        <MultiTransferToProcessingModal
          isOpen={bulkTransferModalOpen}
          onClose={() => setBulkTransferModalOpen(false)}
          candidates={bulkTransferCandidates}
          projectId={filters.projectId}
          roleNeededId={
            filters.roleNeededId !== "all" 
              ? filters.roleNeededId 
              : (filteredList.find(it => selectedBulkIds.includes(it.id))?.candidateProjectMap?.roleNeeded?.id || 
                 filteredList.find(it => selectedBulkIds.includes(it.id))?.roleNeeded?.id || "")
          }
          onSuccess={() => {
            setSelectedBulkIds([]);
            if (selectedId && selectedBulkIds.includes(selectedId)) {
              setSelectedId(null);
            }
          }}
          onRemoveCandidate={(interviewId) => {
            setSelectedBulkIds(prev => prev.filter(id => id !== interviewId));
            // Close modal if no candidates left
            if (selectedBulkIds.length <= 1) {
              setBulkTransferModalOpen(false);
            }
          }}
        />
      )}
    </div>
  );
}
