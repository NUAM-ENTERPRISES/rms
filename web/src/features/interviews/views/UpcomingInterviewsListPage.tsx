import { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import {
  ClipboardCheck,
  Search,
  Loader2,
  AlertCircle,
  User,
  Briefcase,
  Calendar,
  Clock,
  ChevronRight,
  X,
  Edit3,
  CheckCircle2,
  Phone,
  Video,
  MapPin,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetUpcomingInterviewsQuery } from "../api";
import { useGetProjectsQuery, useGetProjectQuery } from "@/services/projectsApi";
import ReviewInterviewModal from "@/components/molecules/ReviewInterviewModal";
import InterviewHistory from "@/components/molecules/InterviewHistory";
import { useGetInterviewHistoryQuery } from "../api";
import EditInterviewDialog from "../components/EditInterviewDialog";
import { toast } from "sonner";
import { ImageViewer } from "@/components/molecules/ImageViewer";
import { useUpdateInterviewStatusMutation, useUpdateBulkInterviewStatusMutation } from "../api";
import { cn } from "@/lib/utils";

const getModeInfo = (mode?: string) => {
  const lowerMode = mode?.toLowerCase();
  switch (lowerMode) {
    case "video_call":
      return { Icon: Video, color: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-sky-200 dark:border-sky-800" };
    case "phone_call":
      return { Icon: Phone, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" };
    case "in_person":
      return { Icon: MapPin, color: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 border border-violet-200 dark:border-violet-800" };
    default:
      return { Icon: Calendar, color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800" };
  }
};

const getStatusBadgeVariant = (status?: string) => {
  const s = status?.toLowerCase();
  if (s?.includes("passed") || s?.includes("selected")) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
  if (s?.includes("failed") || s?.includes("rejected")) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  if (s?.includes("scheduled")) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
  if (s?.includes("review")) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
  return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
};

export default function UpcomingInterviewsListPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [filters, setFilters] = useState({ 
    search: "",
    projectId: "",
    roleCatalogId: ""
  });
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const s = (location.state as any)?.selectedId;
    if (s) setSelectedId(s);
  }, [location.state]);

  const { data, isLoading, error } = useGetUpcomingInterviewsQuery({
    page: 1,
    limit: 15,
    search: filters.search || undefined,
    projectId: filters.projectId || undefined,
    roleCatalogId: filters.roleCatalogId || undefined,
  });

  const { data: projectsData } = useGetProjectsQuery({ 
    limit: 10, 
    status: "active" 
  });
  
  const { data: projectDetails } = useGetProjectQuery(filters.projectId || "", {
    skip: !filters.projectId,
  });

  const projects = projectsData?.data?.projects || [];
  const filteredProjects = useMemo(() => {
    if (!projectSearch) return projects;
    const term = projectSearch.toLowerCase();
    return projects.filter((p: any) => p.title?.toLowerCase().includes(term));
  }, [projects, projectSearch]);

  const roles = projectDetails?.data?.rolesNeeded || [];

  const items = data?.data?.interviews || [];

  const displayed = useMemo(() => {
    return items.filter((it) => it.scheduledTime && !(it as any).conductedAt);
  }, [items]);

  const selected = useMemo(() => {
    if (selectedId) return displayed.find((i) => i.id === selectedId) || null;
    return displayed[0] || null;
  }, [displayed, selectedId]);

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [updateInterviewStatus] = useUpdateInterviewStatusMutation();
  const [updateBulkInterviewStatus] = useUpdateBulkInterviewStatusMutation();

  const { data: historyResp, isLoading: isHistoryLoading } = useGetInterviewHistoryQuery(
    selected?.id ?? "",
    { skip: !selected?.id }
  );

  const handleReviewSubmit = async (updates: { id: string; interviewStatus: "passed" | "failed" | "completed"; subStatus?: string; reason?: string }[]) => {
    try {
      await updateBulkInterviewStatus({ updates }).unwrap();
      toast.success(`${updates.length} Interview(s) reviewed successfully`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update status");
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
          <AlertDescription>Failed to load upcoming interviews.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-950 dark:to-black">
      {/* Compact Header */}
      <div className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Upcoming Interviews
                </h1>
                <p className="text-xs text-muted-foreground">Scheduled and approaching interviews</p>
              </div>
            </div>
            <Button onClick={() => navigate(-1)} variant="ghost" size="sm">Back</Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-sm min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search candidates..."
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                className="pl-9 text-sm"
              />
            </div>

            <Select
              value={filters.projectId || "all_projects"}
              onValueChange={(val) => {
                setFilters(p => ({ ...p, projectId: val === "all_projects" ? "" : val, roleCatalogId: "" }));
                setProjectSearch("");
              }}
            >
              <SelectTrigger className="w-[200px] text-sm h-10">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <SelectItem value="all_projects">All Projects</SelectItem>
                {filteredProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filters.projectId && (
              <Select
                value={filters.roleCatalogId || "all_roles"}
                onValueChange={(val) => setFilters(p => ({ ...p, roleCatalogId: val === "all_roles" ? "" : val }))}
              >
                <SelectTrigger className="w-[200px] text-sm h-10">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_roles">All Roles</SelectItem>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.roleCatalogId!}>{r.designation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(filters.search || filters.projectId || filters.roleCatalogId) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setFilters({ search: "", projectId: "", roleCatalogId: "" })}
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}

            {displayed.length > 0 && (
              <Button
                variant="default"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 ml-auto"
                onClick={() => {
                  setSelectedId(null);
                  setIsReviewOpen(true);
                }}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Review All ({displayed.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Compact List Panel */}
        <div className="w-80 border-r bg-white/60 dark:bg-gray-900/60">
          <ScrollArea className="h-full">
            {displayed.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-40 text-indigo-400" />
                <p className="font-medium">No upcoming interviews</p>
                <p className="text-xs mt-1">Scheduled interviews will appear here</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {displayed.map((it) => {
                  const candidate = it.candidateProjectMap?.candidate;
                  const role = (it as any).candidateProjectMap?.roleNeeded;
                  const isSelected = it.id === selected?.id;
                  const subStatus = it.candidateProjectMap?.subStatus?.label || it.candidateProjectMap?.subStatus?.name || "Scheduled";
                  const scheduledDate = it.scheduledTime ? new Date(it.scheduledTime) : null;
                  const { Icon: ModeIcon, color: modeColor } = getModeInfo(it.mode);

                  return (
                    <button
                      key={it.id}
                      onClick={() => setSelectedId(it.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all",
                        isSelected
                          ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300 dark:from-indigo-900/30 dark:to-purple-900/30 dark:border-indigo-700"
                          : "bg-white dark:bg-gray-800 border-transparent hover:border-gray-300 dark:hover:border-gray-700"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-indigo-400 to-purple-500 text-white">
                            {candidate
                              ? `${candidate.firstName[0]}${candidate.lastName[0]}`.toUpperCase()
                              : "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown"}
                          </p>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 truncate">
                            {role?.designation || "Unknown Role"}
                          </p>
                        </div>
                        <ChevronRight className={cn("h-4 w-4 text-muted-foreground", isSelected && "text-indigo-600")} />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge className={cn("text-xs px-2 py-0.5", getStatusBadgeVariant(subStatus))}>
                          {subStatus}
                        </Badge>
                        <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium", modeColor)}>
                          <ModeIcon className="h-3 w-3" />
                          <span className="capitalize">{it.mode?.replace("_", " ") || "Unknown"}</span>
                        </div>
                        {it.expired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                      </div>

                      {scheduledDate && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(scheduledDate, "MMM d, h:mm a")}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Compact Detail Panel */}
        <div className="flex-1 overflow-hidden">
          {selected ? (
            <ScrollArea className="h-full">
              <div className="p-5 max-w-4xl mx-auto space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent">
                      Interview Details
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span>
                        {selected.scheduledTime
                          ? format(new Date(selected.scheduledTime), "MMM d, yyyy • h:mm a")
                          : "Not scheduled"}
                      </span>
                      {(() => {
                        const { Icon: ModeIcon, color: modeColor } = getModeInfo(selected.mode);
                        return (
                          <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium", modeColor)}>
                            <ModeIcon className="h-4 w-4" />
                            <span className="capitalize">{selected.mode?.replace("_", " ") || "Unknown"}</span>
                          </div>
                        );
                      })()}
                      {selected.expired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                    </div>
                  </div>

                  {!(selected as any).conductedAt && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" onClick={() => setIsReviewOpen(true)} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50/70 to-purple-50/70 dark:from-indigo-900/20 dark:to-purple-900/20">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <ImageViewer
                          src={selected.candidateProjectMap?.candidate?.profileImage}
                          alt={selected.candidateProjectMap?.candidate ? `${selected.candidateProjectMap.candidate.firstName} ${selected.candidateProjectMap.candidate.lastName}` : "Unknown"}
                          fallback={`${selected.candidateProjectMap?.candidate?.firstName?.[0] || ""}${selected.candidateProjectMap?.candidate?.lastName?.[0] || ""}`}
                          size="lg"
                        />
                        <div>
                          <h3 className="font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-2 text-sm">
                            <User className="h-4 w-4" />
                            Candidate
                          </h3>
                          <p className="font-medium text-sm mt-1">
                            {selected.candidateProjectMap?.candidate
                              ? `${selected.candidateProjectMap.candidate.firstName} ${selected.candidateProjectMap.candidate.lastName}`
                              : "Unknown"}
                          </p>
                          {selected.candidateProjectMap?.candidate?.email && (
                            <p className="text-xs text-muted-foreground mt-1 break-all">
                              {selected.candidateProjectMap.candidate.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <Separator className="my-4" />
                      <h3 className="font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-2 text-sm mb-3">
                        <Briefcase className="h-4 w-4" />
                        Project & Role
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Project</p>
                          <p className="font-medium truncate">{selected.candidateProjectMap?.project?.title || "Unknown"}</p>
                          {selected.candidateProjectMap?.project?.client && (
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate">
                              {selected.candidateProjectMap.project.client.name}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Role</p>
                          <p className="font-medium truncate">
                            {(selected as any).candidateProjectMap?.roleNeeded?.designation || "Unknown"}
                          </p>
                        </div>
                        {selected.candidateProjectMap?.candidate?.mobileNumber && (
                          <div className="col-span-2">
                             <p className="text-muted-foreground text-xs">Contact</p>
                             <p className="font-medium text-sm flex items-center gap-1">
                               <Phone className="h-3 w-3" />
                               {selected.candidateProjectMap.candidate.mobileNumber}
                             </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50/70 to-teal-50/70 dark:from-emerald-900/20 dark:to-teal-900/20">
                    <CardContent className="p-5 space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <Badge className={cn("px-3 py-1 text-sm font-medium", getStatusBadgeVariant(
                          selected.candidateProjectMap?.subStatus?.label || selected.candidateProjectMap?.subStatus?.name
                        ))}>
                          {selected.candidateProjectMap?.subStatus?.label ||
                            selected.candidateProjectMap?.subStatus?.name ||
                            "Scheduled"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Mode</p>
                        {(() => {
                          const { Icon: ModeIcon, color: modeColor } = getModeInfo(selected.mode);
                          return (
                            <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium", modeColor)}>
                              <ModeIcon className="h-4 w-4" />
                              <span className="capitalize">{selected.mode?.replace("_", " ") || "Not specified"}</span>
                            </div>
                          );
                        })()}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Scheduled</p>
                        <p className="font-medium text-sm">
                          {selected.scheduledTime
                            ? format(new Date(selected.scheduledTime), "MMM d, yyyy • h:mm a")
                            : "—"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {selected.notes && (
                  <Card className="border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-amber-700 dark:text-amber-400 text-sm mb-2">Notes</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.notes}</p>
                    </CardContent>
                  </Card>
                )}

                <InterviewHistory items={historyResp?.data ?? []} isLoading={isHistoryLoading} />
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30 text-indigo-500" />
                <p className="font-medium">No interview selected</p>
                <p className="text-sm">Select from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ReviewInterviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        interview={selected || (displayed.length > 0 ? displayed : null)}
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