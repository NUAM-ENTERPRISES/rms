import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { useGetInterviewsQuery, useUpdateInterviewStatusMutation, useUpdateBulkInterviewStatusMutation } from "../api";
import { useGetProjectsQuery } from "@/services/projectsApi";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function PassedCandidatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);

  const [filters, setFilters] = useState({ 
    search: searchParams.get("search") || "", 
    projectId: searchParams.get("projectId") || "all",
    roleNeededId: searchParams.get("roleNeededId") || "all"
  });

  const [projectSearch, setProjectSearch] = useState("");

  useEffect(() => {
    setFilters({
      search: searchParams.get("search") || "",
      projectId: searchParams.get("projectId") || "all",
      roleNeededId: searchParams.get("roleNeededId") || "all"
    });
  }, [searchParams]);

  const { data, isLoading, error } = useGetInterviewsQuery({
    search: filters.search || undefined,
    projectId: filters.projectId !== "all" ? filters.projectId : undefined,
    roleNeededId: filters.roleNeededId !== "all" ? filters.roleNeededId : undefined,
    page: 1,
    limit: 100,
  });

  const { data: projectsData } = useGetProjectsQuery({ limit: 100 });
  const projects = projectsData?.data?.projects || [];
  
  const filteredProjects = useMemo(() => {
    if (!projectSearch) return projects;
    const term = projectSearch.toLowerCase();
    return projects.filter((p: any) => p.title?.toLowerCase().includes(term));
  }, [projects, projectSearch]);

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

  const handleTransfer = async (interviewId: string) => {
    try {
      // Transfer typically means moving to the next business phase.
      // We use the updateInterviewStatus with a 'processing' subStatus.
      await updateStatus({
        id: interviewId,
        data: {
          interviewStatus: "passed",
          subStatus: "processing",
          reason: "Transferring to processing team after passed interview"
        }
      }).unwrap();
      
      toast.success("Candidate transferred to processing team successfully");
      // Deselect if it was the selected one
      if (selectedId === interviewId) {
        setSelectedId(null);
      }
      setSelectedBulkIds(prev => prev.filter(id => id !== interviewId));
    } catch (err: any) {
      console.error("Transfer failed:", err);
      toast.error(err?.data?.message || "Failed to transfer candidate");
    }
  };

  const handleBulkTransfer = async () => {
    if (selectedBulkIds.length === 0) return;
    
    try {
      const updates = selectedBulkIds.map(id => ({
        id,
        interviewStatus: "passed" as const,
        subStatus: "processing",
        reason: "Bulk transferring to processing team after passed interview"
      }));

      await updateBulkStatus({ updates }).unwrap();
      
      toast.success(`${selectedBulkIds.length} candidates transferred to processing successfully`);
      setSelectedBulkIds([]);
      if (selectedId && selectedBulkIds.includes(selectedId)) {
        setSelectedId(null);
      }
    } catch (err: any) {
      console.error("Bulk transfer failed:", err);
      toast.error(err?.data?.message || "Failed to bulk transfer candidates");
    }
  };

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

            {(filters.search || filters.projectId !== "all" || filters.roleNeededId !== "all") && (
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
                    filteredList.every((it) => selectedBulkIds.includes(it.id))
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedBulkIds(filteredList.map((it) => it.id));
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
                            <p className="font-medium text-sm truncate">
                              {candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown"}
                            </p>
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
        </div>

        <div className="flex-1 overflow-hidden">
          {selected ? (
            <ScrollArea className="h-full">
              <div className="p-6 max-w-4xl mx-auto space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Candidate Details</h2>
                    <p className="text-sm text-muted-foreground">Passed on {format(new Date(selected.updatedAt || selected.scheduledTime), "PPP")}</p>
                  </div>
                  <Button 
                    onClick={() => handleTransfer(selected.id)}
                    disabled={isUpdating}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all hover:scale-105"
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MoveRight className="h-4 w-4 mr-2" />}
                    Transfer to Processing
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-emerald-100 dark:border-emerald-900/30">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <User className="h-5 w-5 text-emerald-600" />
                        Candidate Info
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Full Name</p>
                          <p className="font-medium text-base">
                            {(selected.candidateProjectMap?.candidate || selected.candidate)?.firstName} {(selected.candidateProjectMap?.candidate || selected.candidate)?.lastName}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Email Address</p>
                          <p className="font-medium">{(selected.candidateProjectMap?.candidate || selected.candidate)?.email || "N/A"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-emerald-100 dark:border-emerald-900/30">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-emerald-600" />
                        Project Context
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Assigned Project</p>
                          <p className="font-medium text-base">{selected.candidateProjectMap?.project?.title || selected.project?.title}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Designation / Role</p>
                          <p className="font-medium">{(selected.candidateProjectMap?.roleNeeded || selected.roleNeeded)?.designation || "N/A"}</p>
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
    </div>
  );
}
