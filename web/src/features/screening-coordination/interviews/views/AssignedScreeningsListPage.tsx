import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
<<<<<<< HEAD
import { format } from "date-fns";
import { ClipboardCheck, Search, Loader2, AlertCircle, User, Briefcase, Calendar, ChevronRight, X, CheckSquare, Square } from "lucide-react";
=======
import {
  ClipboardCheck, Search, Loader2, AlertCircle, User, Briefcase, Calendar, ChevronRight, X, Plus, CheckSquare, Square 
} from "lucide-react";
>>>>>>> copy/dark-theme
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ImageViewer from "@/components/molecules/ImageViewer";
import ProjectRoleFilter from "@/components/molecules/ProjectRoleFilter";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getAge } from "@/utils";
import { toast } from "sonner";
import { useGetAssignedScreeningsQuery } from "../data";
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

<<<<<<< HEAD
  // Project & role filtering is handled by the `ProjectRoleFilter` component
=======
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
>>>>>>> copy/dark-theme

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

  const selectedProjectDetails = selected?.project || null; 

  const toggleBatchSelect = (id: string) => {
    const newSet = new Set(selectedBatch);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedBatch(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedBatch.size === displayed.length) {
      setSelectedBatch(new Set());
    } else {
      setSelectedBatch(new Set(displayed.map((item) => item.id)));
    }
  };

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
      <div className="h-screen flex items-center justify-center bg-slate-50/50 dark:bg-black">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
          <p className="text-base font-medium text-slate-700 dark:text-slate-200">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50/50 dark:bg-black">
        <Alert variant="destructive" className="max-w-md shadow-md bg-white dark:bg-slate-900 border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-sm text-slate-800 dark:text-slate-200">
            Failed to load assigned screenings
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50/50 dark:bg-black">
      {/* Compact Header */}
      <header className="border-b bg-white/95 dark:bg-black/95 backdrop-blur-xl shadow-sm sticky top-0 z-20 dark:border-slate-800">
        <div className="px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300 dark:opacity-20 dark:group-hover:opacity-40"></div>
                <div className="relative p-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-md transform transition-transform duration-200 group-hover:scale-105 dark:from-indigo-700 dark:to-purple-800">
                  <ClipboardCheck className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
                  Assigned Screenings
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Awaiting scheduling</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-sm dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500 dark:text-indigo-400 transition-transform duration-200 group-focus-within:scale-110" />
              <Input
                placeholder="Search candidates, projects..."
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                className="pl-10 h-9 text-sm rounded-xl border-indigo-200/50 dark:border-slate-700 bg-white/90 dark:bg-black/90 shadow-inner hover:shadow-md focus:shadow-lg transition-all duration-200 focus:ring-1 focus:ring-indigo-400/30 dark:focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 dark:text-white dark:placeholder:text-slate-400"
              />
            </div>

            <ProjectRoleFilter
              value={{ projectId: filters.projectId, roleCatalogId: filters.roleCatalogId }}
              onChange={(v) => setFilters((p) => ({ ...p, projectId: v.projectId, roleCatalogId: v.roleCatalogId }))}
              className="flex-nowrap min-w-[220px]"
            />

            {selectedBatch.size > 0 && (
              <Button
                onClick={handleBatchSchedule}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 dark:from-green-700 dark:to-emerald-700 dark:hover:from-green-600 dark:hover:to-emerald-600 text-white rounded-xl shadow-md text-sm"
              >
                <Calendar className="h-4 w-4 mr-1.5" />
                Bulk Schedule {selectedBatch.size}
              </Button>
            )}

            {(filters.search || filters.status !== "all" || filters.projectId !== "all" || filters.roleCatalogId !== "all" || selectedBatch.size > 0) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-xs rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 dark:text-slate-300"
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
        <div className="w-80 border-r bg-white/85 dark:bg-black backdrop-blur-lg shadow-md overflow-hidden flex flex-col dark:border-slate-800">
          {/* Batch selection header */}
          {displayed.length > 0 && (
            <div className="px-2 pt-2 pb-1 border-b bg-indigo-50/50 dark:bg-slate-900 flex items-center justify-between dark:border-slate-800">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200"
              >
                {selectedBatch.size === displayed.length && displayed.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Square className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                )}
                {selectedBatch.size > 0 ? `Selected: ${selectedBatch.size}` : "Select all"}
              </button>
            </div>
          )}
          <ScrollArea className="flex-1">
            {displayed.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <ClipboardCheck className="h-14 w-14 text-indigo-300/70 dark:text-indigo-600/60 mb-3" />
                <p className="text-base font-medium text-slate-700 dark:text-slate-200">No assignments</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
                          ? `${isBatchSelected ? "bg-green-50 dark:bg-green-950" : "bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950"} border-${isBatchSelected ? "green" : "indigo"}-300/50 dark:border-${isBatchSelected ? "green" : "indigo"}-800/50 shadow-md ring-1 ring-${isBatchSelected ? "green" : "indigo"}-300/30 dark:ring-${isBatchSelected ? "green" : "indigo"}-800/30`
                          : "bg-white dark:bg-black border-slate-200/60 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md"
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
                          <CheckSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                        )}
                      </button>

                      {/* Candidate avatar */}
                      <div className="flex-shrink-0">
                        <ImageViewer
                          src={it.candidate?.profileImage}
                          fallbackSrc={""}
                          title={candidateName}
                          className="h-9 w-9 rounded-full"
                          enableHoverPreview={false}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                              {candidateName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {it.roleNeeded?.designation || "Unknown Role"}
                            </p>

                            {/* Age & gender */}
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                              {it.candidate ? (
                                `${getAge(it.candidate.dateOfBirth) ? `${getAge(it.candidate.dateOfBirth)} yrs` : 'Age N/A'} • ${it.candidate.gender ? (it.candidate.gender.charAt(0) + it.candidate.gender.slice(1).toLowerCase()) : 'Gender N/A'}`
                              ) : null}
                            </p>
                          </div>
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-all duration-200 flex-shrink-0",
                              isSelected ? "text-indigo-600 dark:text-indigo-400 translate-x-0.5" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                            )}
                          />
                        </div>

                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                            <Calendar className="h-3 w-3" />
                            <span className="capitalize">
                              {it.subStatus?.label || it.subStatus?.name || (it.assignedAt ? 'Assigned' : 'Unassigned')}
                            </span>
                          </div>
                          {it.recruiter && <Badge variant="outline" className="text-xs px-2 py-0.5 dark:bg-slate-900 dark:text-slate-300">{it.recruiter.name}</Badge>}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
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
        <div className="flex-1 overflow-hidden bg-gradient-to-b from-white to-indigo-50/30 dark:from-black dark:to-black">
          {selected ? (
            <ScrollArea className="h-full">
              <div className="p-5 max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-indigo-200/50 dark:border-indigo-800/50">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 truncate">
                      Assigned Item Details
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {selected.assignedAt
                        ? `Assigned ${format(new Date(selected.assignedAt), "MMM d, yyyy 'at' h:mm a")}`
                        : "Not assigned yet"}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    className={cn(
                      "group relative overflow-hidden",
                      "bg-gradient-to-r from-indigo-600 to-purple-600",
                      "hover:from-indigo-700 hover:to-purple-700",
                      "dark:from-indigo-700 dark:to-purple-800",
                      "dark:hover:from-indigo-600 dark:hover:to-purple-700",
                      "text-white shadow-md hover:shadow-lg",
                      "transition-all duration-300",
                      "hover:scale-[1.03] active:scale-[0.98]",
                      "rounded-lg px-5 py-2 text-sm font-medium",
                      "after:absolute after:inset-0 after:opacity-0 after:bg-gradient-to-r after:from-white/10 after:to-transparent after:transition-opacity after:duration-500",
                      "hover:after:opacity-100"
                    )}
                    onClick={() => {
                      setSelectedAssignment(selected);
                      setIsScheduleOpen(true);
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-1.5 transition-transform group-hover:rotate-12" />
                    Schedule
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50/95 to-purple-50/90 dark:from-indigo-950/60 dark:to-purple-950/55 rounded-xl overflow-visible transition-all hover:shadow-xl">
                    <CardContent className="p-5">
                      <h3 className="text-base font-semibold text-indigo-700 dark:text-indigo-300 mb-4 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Candidate
                      </h3>
                      <div className="flex items-start gap-4">
                        <ImageViewer
                          src={selected.candidate?.profileImage}
                          fallbackSrc={""}
                          title={`${selected.candidate?.firstName || ""} ${selected.candidate?.lastName || ""}`.trim() || "Profile image"}
                          className="h-20 w-20 rounded-lg"
                          enableHoverPreview={true}
                          hoverPosition="right"
                          previewClassName="w-64 h-64"
                        />

                        <div className="space-y-2.5 text-sm">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Name</p>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {selected.candidate ? `${selected.candidate.firstName} ${selected.candidate.lastName}` : "Unknown"}
                            </p>
                          </div>

                          {selected.candidate?.email && (
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                              <p className="font-medium break-all text-slate-900 dark:text-slate-100">{selected.candidate.email}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mt-3">
                            {(selected.candidate?.phone || (selected.candidate?.countryCode && selected.candidate?.mobileNumber)) && (
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Phone</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                  {selected.candidate.phone || `${selected.candidate.countryCode ?? ""} ${selected.candidate.mobileNumber ?? ""}`.trim()}
                                </p>
                              </div>
                            )}

                            {typeof getAge !== 'undefined' && selected.candidate?.dateOfBirth && (
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Age</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                  {getAge(selected.candidate.dateOfBirth) ? `${getAge(selected.candidate.dateOfBirth)} yrs` : 'N/A'}
                                </p>
                              </div>
                            )}

                            {selected.candidate?.gender && (
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Gender</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                  {selected.candidate.gender.charAt(0) + selected.candidate.gender.slice(1).toLowerCase()}
                                </p>
                              </div>
                            )}

                            {selected.candidate?.experience !== undefined && (
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Experience</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">{selected.candidate.experience} yrs</p>
                              </div>
                            )}

                            {selected.candidate?.totalExperience !== undefined && (
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Total Experience</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">{selected.candidate.totalExperience} yrs</p>
                              </div>
                            )}

                            {selected.candidate?.dateOfBirth && (
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">DOB</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">{format(new Date(selected.candidate.dateOfBirth), "MMM d, yyyy")}</p>
                              </div>
                            )}

                            {selected.candidate?.currentRole && (
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Current role</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">{selected.candidate.currentRole}</p>
                              </div>
                            )}

                            {selected.candidate?.currentEmployer && (
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Current employer</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">{selected.candidate.currentEmployer}</p>
                              </div>
                            )}
                          </div>

                          {/* Qualifications */}
<<<<<<< HEAD
                          {!!selected.candidate?.qualifications?.length && (
                            <div className="mt-3">
                              <p className="text-xs text-slate-500">Qualifications</p>
                              <ul className="mt-1 space-y-2 text-xs">
=======
                          {selected.candidate?.qualifications?.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Qualifications</p>
                              <ul className="space-y-2 text-sm">
>>>>>>> copy/dark-theme
                                {selected.candidate.qualifications.map((q: any) => (
                                  <li key={q.id}>
                                    <div className="font-medium text-slate-900 dark:text-slate-100">
                                      {q.qualification?.shortName || q.qualification?.name || 'Qualification'}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                      {q.university ? `${q.university}${q.graduationYear ? ` • ${q.graduationYear}` : ''}` : (q.graduationYear ? `Graduated ${q.graduationYear}` : '')}
                                      {q.gpa !== undefined && q.gpa !== null ? ` • GPA ${q.gpa}` : ''}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

<<<<<<< HEAD
                          {/* Work experiences (most recent first) */}
                          {!!selected.candidate?.workExperiences?.length && (
                            <div className="mt-3">
                              <p className="text-xs text-slate-500">Work experience</p>
                              <ul className="mt-1 space-y-2 text-xs">
=======
                          {/* Work experiences */}
                          {selected.candidate?.workExperiences?.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Work experience</p>
                              <ul className="space-y-3 text-sm">
>>>>>>> copy/dark-theme
                                {selected.candidate.workExperiences
                                  .slice()
                                  .sort((a: any, b: any) => (new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime()))
                                  .map((w: any) => (
                                    <li key={w.id}>
                                      <div className="font-medium text-slate-900 dark:text-slate-100">
                                        {w.jobTitle || 'Role'}{w.companyName ? ` • ${w.companyName}` : ''}
                                      </div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {w.startDate ? format(new Date(w.startDate), 'MMM yyyy') : ''}
                                        {w.endDate ? ` — ${format(new Date(w.endDate), 'MMM yyyy')}` : (w.isCurrent ? ' — Present' : '')}
                                      </div>
                                      {w.description && (
                                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{w.description}</div>
                                      )}
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50/95 to-pink-50/90 dark:from-purple-950/60 dark:to-pink-950/55 rounded-xl overflow-hidden transition-all hover:shadow-xl">
                    <CardContent className="p-5">
                      <h3 className="text-base font-semibold text-purple-700 dark:text-purple-300 mb-4 flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Project & Role
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Project</p>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{selected.project?.title || "Unknown"}</p>

                          {selectedProjectDetails?.client?.name && (
                            <>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Client</p>
                              <p className="font-medium text-slate-900 dark:text-slate-100">{selectedProjectDetails.client.name}</p>
                            </>
                          )}

                          {selectedProjectDetails?.deadline && (
                            <>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Deadline</p>
                              <p className="font-medium text-slate-900 dark:text-slate-100">{format(new Date(selectedProjectDetails.deadline), "MMM d, yyyy")}</p>
                            </>
                          )}

                          {selectedProjectDetails?.country?.name && (
                            <>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Country</p>
                              <p className="font-medium text-slate-900 dark:text-slate-100">{selectedProjectDetails.country.name}</p>
                            </>
                          )}

                          {typeof selectedProjectDetails?.priority !== 'undefined' && (
                            <>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Priority</p>
                              <p className="font-medium text-slate-900 dark:text-slate-100 capitalize">{selectedProjectDetails.priority || "-"}</p>
                            </>
                          )}

                          {typeof selectedProjectDetails?.requiredScreening !== 'undefined' && (
                            <>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Requires screening</p>
                              <p className="font-medium text-slate-900 dark:text-slate-100">{selectedProjectDetails.requiredScreening ? 'Yes' : 'No'}</p>
                            </>
                          )}
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Role</p>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{selected.roleNeeded?.designation || "Unknown"}</p>
                        </div>

<<<<<<< HEAD
                        {!!selectedProjectDetails?.documentRequirements?.length && (
                          <div className="mt-2">
                            <p className="text-xs text-slate-500">Document requirements</p>
                            <ul className="mt-1 space-y-1 text-xs">
=======
                        {selectedProjectDetails?.documentRequirements?.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Document requirements</p>
                            <ul className="mt-2 space-y-1.5 text-xs">
>>>>>>> copy/dark-theme
                              {selectedProjectDetails.documentRequirements.map((d: any) => (
                                <li key={d.id} className="flex items-center gap-2">
                                  <span className="font-medium text-slate-900 dark:text-slate-100">
                                    {(d.docType || d.description || d.id).toString().replace(/_/g, ' ')}
                                  </span>
                                  {d.mandatory && (
                                    <span className="ml-2 text-xxs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300">
                                      Required
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-0 shadow-lg bg-white/95 dark:bg-black rounded-xl overflow-hidden transition-all hover:shadow-xl">
                  <CardContent className="p-5">
                    <h3 className="text-base font-semibold text-indigo-700 dark:text-indigo-300 mb-4">Assignment Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                        <p className="font-medium capitalize text-slate-900 dark:text-slate-100">
                          {selected.subStatus?.label || selected.subStatus?.name || (selected.assignedAt ? 'Assigned' : 'Unassigned')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Assigned At</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {selected.assignedAt ? format(new Date(selected.assignedAt), "MMM d, yyyy") : 'Not assigned'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-center bg-gradient-to-b from-white to-indigo-50/30 dark:from-black dark:to-black">
              <div className="space-y-4 max-w-sm px-6">
                <ClipboardCheck className="h-16 w-16 text-indigo-300/70 dark:text-indigo-600/60 mx-auto" />
                <p className="text-xl font-semibold text-slate-700 dark:text-slate-200">No Item Selected</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
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