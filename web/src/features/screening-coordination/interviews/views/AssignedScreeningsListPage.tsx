import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ClipboardCheck, Search, Loader2, AlertCircle, User, Briefcase, Calendar, ChevronRight, X, Plus, CheckSquare, Square, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useGetAssignedScreeningsQuery } from "../data";
import { useGetProjectQuery } from "@/features/projects";
import ScheduleScreeningModal from "../components/ScheduleScreeningModal";

export default function AssignedInterviewsListPage() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState({ 
    search: "", 
    status: "all",
    projectId: "all",
    roleCatalogId: "all"
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Set<string>>(new Set());
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [batchToSchedule, setBatchToSchedule] = useState<any[]>([]);

  const { data, isLoading, error, refetch: refetchAssigned } = useGetAssignedScreeningsQuery({ 
    page: 1, 
    limit: 15,
    projectId: filters.projectId === "all" ? undefined : filters.projectId,
    roleCatalogId: filters.roleCatalogId === "all" ? undefined : filters.roleCatalogId
  });
  const items = data?.data?.items || [];

  // Derive unique projects from the currently loaded screenings
  const projects = useMemo(() => {
    const map = new Map();
    items.forEach((it: any) => {
      if (it.project && !map.has(it.project.id)) {
        map.set(it.project.id, it.project);
      }
    });
    // Add currently selected project to ensure it stays in list when filtered
    if (filters.projectId !== "all" && !map.has(filters.projectId)) {
      const selectedItem = items.find(it => it.project?.id === filters.projectId);
      if (selectedItem?.project) {
        map.set(filters.projectId, selectedItem.project);
      }
    }
    return Array.from(map.values());
  }, [items, filters.projectId]);

  // Fetch roles for selected project
  const { data: projectDetailsResponse } = useGetProjectQuery(
    filters.projectId,
    { skip: filters.projectId === "all" }
  );
  const projectRoles = projectDetailsResponse?.data?.rolesNeeded || [];

  // Get unique roles from projectDetails
  const uniqueRoles = useMemo(() => {
    const rolesMap = new Map();
    projectRoles.forEach((r: any) => {
      const id = (r.roleCatalogId || r.roleCatalog?.id || r.id).toString();
      const name = r.designation || r.roleCatalog?.name || "Unknown Role";
      if (!rolesMap.has(id)) {
        rolesMap.set(id, { id, name });
      }
    });
    return Array.from(rolesMap.values());
  }, [projectRoles]);

  const { allItems, assigned, others } = useMemo(() => {
    let filtered = items;
    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(
        (it) =>
          it.candidate?.firstName?.toLowerCase().includes(term) ||
          it.candidate?.lastName?.toLowerCase().includes(term) ||
          it.project?.title?.toLowerCase().includes(term) ||
          it.roleNeeded?.designation?.toLowerCase().includes(term)
      );
    }

    const assignedOnly = filtered.filter((it) => !!it.assignedAt);
    const other = filtered.filter((it) => !it.assignedAt);

    return { allItems: filtered, assigned: assignedOnly, others: other };
  }, [items, filters]);

  const displayed = filters.status === "assigned" ? assigned : filters.status === "unassigned" ? others : allItems;

  const selected = useMemo(() => {
    if (selectedId) return displayed.find((i) => i.id === selectedId) || null;
    return displayed[0] || null;
  }, [displayed, selectedId]);

  // Toggle batch selection
  const toggleBatchSelect = (id: string) => {
    const newSet = new Set(selectedBatch);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedBatch(newSet);
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedBatch.size === displayed.length) {
      setSelectedBatch(new Set());
    } else {
      setSelectedBatch(new Set(displayed.map((item) => item.id)));
    }
  };

  // Handle batch scheduling
  const handleBatchSchedule = () => {
    if (selectedBatch.size === 0) {
      toast.error("Please select at least one screening");
      return;
    }

    const selectedItems = displayed.filter((item) => selectedBatch.has(item.id));
    setSelectedAssignment(null);
    setBatchToSchedule(selectedItems);
    setIsScheduleOpen(true);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-base font-medium text-slate-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
        <Alert variant="destructive" className="max-w-md shadow-md">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-sm">
            Failed to load assigned screenings
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/20">
      {/* Compact Header */}
      <header className="border-b bg-white/95 backdrop-blur-xl shadow-sm sticky top-0 z-20">
        <div className="px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative p-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-md transform transition-transform duration-200 group-hover:scale-105">
                  <ClipboardCheck className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Assigned Screenings
                </h1>
                <p className="text-xs text-slate-500">Awaiting scheduling</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-sm"
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500 transition-transform duration-200 group-focus-within:scale-110" />
              <Input
                placeholder="Search candidates, projects..."
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                className="pl-10 h-9 text-sm rounded-xl border-indigo-200/50 bg-white/90 shadow-inner hover:shadow-md focus:shadow-lg transition-all duration-200 focus:ring-1 focus:ring-indigo-400/30 focus:border-indigo-400"
              />
            </div>

            {/* Project Filter */}
            <div className="w-48">
              <Select
                value={filters.projectId}
                onValueChange={(val) => setFilters(p => ({ ...p, projectId: val, roleCatalogId: "all" }))}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl border-indigo-200/50 bg-white/90 shadow-sm focus:ring-indigo-400">
                  <div className="flex items-center gap-2 truncate">
                    <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                    <SelectValue placeholder="All Projects" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role Filter - Only show if project selected */}
            <div className="w-48">
              <Select
                value={filters.roleCatalogId}
                onValueChange={(val) => setFilters(p => ({ ...p, roleCatalogId: val }))}
                disabled={filters.projectId === "all"}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl border-indigo-200/50 bg-white/90 shadow-sm focus:ring-indigo-400">
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="h-3.5 w-3.5 text-indigo-500" />
                    <SelectValue placeholder="All Roles" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedBatch.size > 0 && (
              <Button
                onClick={handleBatchSchedule}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl shadow-md text-sm"
              >
                <Calendar className="h-4 w-4 mr-1.5" />
                Bulk Schedule {selectedBatch.size}
              </Button>
            )}

            {(filters.search || filters.status !== "all" || filters.projectId !== "all" || filters.roleCatalogId !== "all" || selectedBatch.size > 0) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-xs rounded-xl hover:bg-indigo-50"
                onClick={() => {
                  setFilters({ 
                    search: "", 
                    status: "all",
                    projectId: "all",
                    roleCatalogId: "all"
                  });
                  setSelectedBatch(new Set());
                }}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Compact List */}
        <div className="w-80 border-r bg-white/85 backdrop-blur-lg shadow-md overflow-hidden flex flex-col">
          {/* Batch selection header */}
          {displayed.length > 0 && (
            <div className="px-2 pt-2 pb-1 border-b bg-indigo-50/50 flex items-center justify-between">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-xs font-medium text-indigo-700 hover:text-indigo-900"
              >
                {selectedBatch.size === displayed.length && displayed.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-indigo-600" />
                ) : (
                  <Square className="h-4 w-4 text-indigo-400" />
                )}
                {selectedBatch.size > 0 ? `Selected: ${selectedBatch.size}` : "Select all"}
              </button>
            </div>
          )}
          <ScrollArea className="flex-1">
            {displayed.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <ClipboardCheck className="h-14 w-14 text-indigo-300/70 mb-3" />
                <p className="text-base font-medium text-slate-700">No assignments</p>
                <p className="text-xs text-slate-500 mt-1">
                  {filters.search || filters.status !== "all"
                    ? "Adjust search"
                    : "Assignments appear here"}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {displayed.map((it) => {
                  const isSelected = it.id === (selected?.id || displayed[0]?.id);
                  const isBatchSelected = selectedBatch.has(it.id);
                  const candidateName = it.candidate ? `${it.candidate.firstName} ${it.candidate.lastName}` : "Unknown";

                  return (
                    <button
                      key={it.id}
                      onClick={() => setSelectedId(it.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all duration-200 group text-xs flex items-start gap-2",
                        isSelected
                          ? `${isBatchSelected ? "bg-green-50" : "bg-gradient-to-br from-indigo-50 to-purple-50"} border-${isBatchSelected ? "green" : "indigo"}-300/50 shadow-md ring-1 ring-${isBatchSelected ? "green" : "indigo"}-300/30`
                          : "bg-white border-slate-200/60 hover:border-indigo-300 hover:shadow-md"
                      )}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBatchSelect(it.id);
                        }}
                        className="flex-shrink-0 mt-0.5"
                      >
                        {isBatchSelected ? (
                          <CheckSquare className="h-4 w-4 text-green-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate group-hover:text-indigo-700 transition-colors">
                              {candidateName}
                            </p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {it.roleNeeded?.designation || "Unknown Role"}
                            </p>
                          </div>
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-all duration-200 flex-shrink-0",
                              isSelected ? "text-indigo-600 translate-x-0.5" : "text-slate-400 group-hover:text-slate-600"
                            )}
                          />
                        </div>

                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            <Calendar className="h-3 w-3" />
                            <span className="capitalize">
                              {it.subStatus?.label || it.subStatus?.name || (it.assignedAt ? 'Assigned' : 'Unassigned')}
                            </span>
                          </div>
                          {it.recruiter && <Badge variant="outline" className="text-xs px-2 py-0.5">{it.recruiter.name}</Badge>}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="h-3 w-3" />
                          <span>{it.assignedAt ? format(new Date(it.assignedAt), "MMM d, yyyy") : "Not assigned"}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - Compact Details */}
        <div className="flex-1 overflow-hidden bg-gradient-to-b from-white to-indigo-50/20">
          {selected ? (
            <ScrollArea className="h-full">
              <div className="p-5 max-w-4xl mx-auto space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-indigo-200/50">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent truncate">
                      Assigned Item Details
                    </h2>
                    <p className="text-sm text-slate-600">
                      {selected.assignedAt
                        ? `Assigned ${format(new Date(selected.assignedAt), "MMM d, yyyy 'at' h:mm a")}`
                        : "Not assigned yet"}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg shadow-md px-4 text-sm transition-all duration-200 hover:shadow-lg"
                    onClick={() => {
                      setSelectedAssignment(selected);
                      setIsScheduleOpen(true);
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-1.5" />
                    Schedule
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-50/90 to-purple-50/90 rounded-xl overflow-hidden">
                    <CardContent className="p-4">
                      <h3 className="text-base font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Candidate
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div>
                          <p className="text-xs text-slate-500">Name</p>
                          <p className="font-medium text-slate-900">
                            {selected.candidate ? `${selected.candidate.firstName} ${selected.candidate.lastName}` : "Unknown"}
                          </p>
                        </div>
                        {selected.candidate?.email && (
                          <div>
                            <p className="text-xs text-slate-500">Email</p>
                            <p className="font-medium break-all text-slate-900">{selected.candidate.email}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50/90 to-pink-50/90 rounded-xl overflow-hidden">
                    <CardContent className="p-4">
                      <h3 className="text-base font-semibold text-purple-700 mb-3 flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Project & Role
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div>
                          <p className="text-xs text-slate-500">Project</p>
                          <p className="font-medium text-slate-900">{selected.project?.title || "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Role</p>
                          <p className="font-medium text-slate-900">{selected.roleNeeded?.designation || "Unknown"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-0 shadow-md bg-white/90 backdrop-blur-lg rounded-xl overflow-hidden">
                  <CardContent className="p-4">
                    <h3 className="text-base font-semibold text-indigo-700 mb-3">Assignment Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-xs text-slate-500">Status</p>
                        <p className="font-medium capitalize text-slate-900">
                          {selected.subStatus?.label || selected.subStatus?.name || (selected.assignedAt ? 'Assigned' : 'Unassigned')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Assigned At</p>
                        <p className="font-medium text-slate-900">
                          {selected.assignedAt ? format(new Date(selected.assignedAt), "MMM d, yyyy") : 'Not assigned'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-center bg-gradient-to-b from-white to-indigo-50/20">
              <div className="space-y-4 max-w-sm">
                <ClipboardCheck className="h-16 w-16 text-indigo-300/70 mx-auto" />
                <p className="text-xl font-semibold text-slate-700">No Item Selected</p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Select an assigned screening from the list to view details and schedule
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ScheduleScreeningModal
        open={isScheduleOpen}
        onOpenChange={(open) => {
          setIsScheduleOpen(open);
          if (!open) {
            setSelectedAssignment(null);
            setBatchToSchedule([]);
          }
        }}
        selectedAssignment={selectedAssignment}
        selectedAssignments={batchToSchedule}
        refetchAssigned={refetchAssigned}
      />
    </div>
  );
}