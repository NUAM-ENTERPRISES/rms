import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ClipboardCheck, Search, Loader2, AlertCircle, User, Briefcase, Calendar, ChevronRight, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetAssignedMockInterviewsQuery, useCreateMockInterviewMutation } from "../data";
import { useUsersLookup } from "@/shared/hooks/useUsersLookup";
import { useGetTemplatesByRoleQuery, useGetTemplatesQuery } from "@/features/mock-interview-coordination/templates/data";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
// note: using native <select> for simplicity in modal
import { Button as UiButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AssignedInterviewsListPage() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState({ search: "", status: "all" });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // fetch assigned candidate-project items (show a large limit so 'View All' is useful)
  const { data, isLoading, error, refetch: refetchAssigned } = useGetAssignedMockInterviewsQuery({ page: 1, limit: 100 });
  const items = data?.data?.items || [];

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

  // scheduling modal state + form
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [createMockInterview, createState] = useCreateMockInterviewMutation();
  const { users, getUsersByRole } = useUsersLookup();

  const scheduleSchema = z.object({
    candidateProjectMapId: z.string().min(1, "Candidate selection is required"),
    coordinatorId: z.string().min(1, "Coordinator is required"),
    templateId: z.string().optional(),
    scheduledTime: z
      .string()
      .optional()
      .refine((v) => !v || !Number.isNaN(Date.parse(v)), {
        message: "Invalid date/time",
      }),
    duration: z.number().min(15).max(240).optional(),
    meetingLink: z.string().optional(),
    mode: z.enum(["video", "phone", "in_person"]).optional(),
  });

  type ScheduleFormValues = z.infer<typeof scheduleSchema>;

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    mode: "onChange",
    defaultValues: {
      candidateProjectMapId: selectedAssignment?.id || "",
      coordinatorId: "",
      templateId: undefined,
      scheduledTime: "",
      duration: 60,
      meetingLink: "",
      mode: "video",
    },
  });

  useEffect(() => {
    if (!selectedAssignment) return;
    const initialScheduled = selectedAssignment?.assignedAt
      ? (() => {
          const iso = new Date(selectedAssignment.assignedAt);
          const tzOffset = iso.getTimezoneOffset();
          const local = new Date(iso.getTime() - tzOffset * 60000);
          return local.toISOString().slice(0, 16);
        })()
      : "";

    form.reset({
      candidateProjectMapId: selectedAssignment?.id || "",
      coordinatorId: "",
      templateId: undefined,
      scheduledTime: initialScheduled,
      duration: 60,
      meetingLink: "",
      mode: "video",
    });
  }, [selectedAssignment]);

  const roleId = selectedAssignment?.roleNeeded?.id;
  const { data: templatesByRole } = useGetTemplatesByRoleQuery({ roleId: roleId || "", isActive: true }, { skip: !roleId });
  const { data: allTemplates } = useGetTemplatesQuery(undefined, { skip: !isScheduleOpen });
  const templateOptions = (roleId ? templatesByRole?.data : allTemplates?.data) || [];
  const coordinators = getUsersByRole("coordinator").length ? getUsersByRole("coordinator") : users || [];

  const onSubmitSchedule = async (values: ScheduleFormValues) => {
    try {
      const payload: any = { ...values };
      if (values.scheduledTime) {
        payload.scheduledTime = new Date(values.scheduledTime).toISOString();
      }

      await createMockInterview(payload).unwrap();
      toast.success("Mock interview scheduled");
      setIsScheduleOpen(false);
      form.reset();
      refetchAssigned?.();
    } catch (err: any) {
      const status = err?.status;
      if (status === 409) {
        toast.error("Conflict: mock interview already exists for this assignment.");
      } else if (status === 404) {
        toast.error("Resource not found. Please try again.");
      } else {
        toast.error("Failed to schedule interview. Please try again.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load assigned interviews. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Assigned Interviews</h1>
                <p className="text-sm text-muted-foreground">Candidate-project assignments awaiting scheduling</p>
              </div>
            </div>
            <div>
              <Button onClick={() => navigate(-1)} variant="ghost">Back</Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search candidates, projects, roles..." value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} className="pl-10" />
            </div>

            {/* <Select value={filters.status} onValueChange={(value) => setFilters((p) => ({ ...p, status: value }))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select> */}

            {(filters.search || filters.status !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => setFilters({ search: "", status: "all" })}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 border-r bg-muted/20">
          <ScrollArea className="h-full">
            {displayed.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm font-medium mb-1">No assigned items found</p>
                <p className="text-xs">Assignments will appear here</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {displayed.map((it) => {
                  const isSelected = it.id === (selected?.id || displayed[0]?.id);
                  return (
                    <button key={it.id} onClick={() => setSelectedId(it.id)} className={cn("w-full text-left p-3 rounded-lg border transition-all", "hover:bg-accent/50", isSelected ? "bg-accent border-primary shadow-sm" : "bg-card border-transparent")}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{it.candidate ? `${it.candidate.firstName} ${it.candidate.lastName}` : "Unknown Candidate"}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{it.roleNeeded?.designation || "Unknown Role"}</p>
                        </div>
                        <ChevronRight className={cn("h-4 w-4 flex-shrink-0 transition-transform", isSelected && "text-primary")} />
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          <Calendar className="h-3 w-3" />
                          <span className="capitalize">{it.subStatus?.label || it.subStatus?.name || (it.assignedAt ? 'Assigned' : 'Unassigned')}</span>
                        </div>
                        {it.recruiter && <Badge className="text-xs">{it.recruiter.name}</Badge>}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{it.assignedAt ? format(new Date(it.assignedAt), "MMM d, yyyy") : "Not assigned"}</span>
                      </div>
                    </button>
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
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold">Assigned Item Details</h2>
                    <p className="text-sm text-muted-foreground">{selected.assignedAt ? `Assigned ${format(new Date(selected.assignedAt), "MMMM d, yyyy 'at' h:mm a")}` : "Not assigned"}</p>
                  </div>

                  {/* Schedule button */}
                  <div>
                    <Button
                      onClick={() => {
                        setSelectedAssignment(selected);
                        setIsScheduleOpen(true);
                      }}
                    >
                      Schedule Mock Interview
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2"><User className="h-5 w-5 text-primary" />Candidate Information</h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Name</p>
                          <p className="font-medium">{selected.candidate ? `${selected.candidate.firstName} ${selected.candidate.lastName}` : "Unknown"}</p>
                        </div>
                        {selected.candidate?.email && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Email</p>
                            <p className="font-medium text-xs break-all">{selected.candidate.email}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />Project & Role</h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Project</p>
                          <p className="font-medium">{selected.project?.title || "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Role</p>
                          <p className="font-medium">{selected.roleNeeded?.designation || "Unknown"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Assignment Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <p className="font-medium capitalize">{selected.subStatus?.label || selected.subStatus?.name || (selected.assignedAt ? 'Assigned' : 'Unassigned')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Assigned At</p>
                        <p className="font-medium">{selected.assignedAt ? format(new Date(selected.assignedAt), "MMM d, yyyy h:mm a") : 'Not assigned'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <ClipboardCheck className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No item selected</p>
                <p className="text-sm">Select an assignment from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Schedule modal */}
      <Dialog
        open={isScheduleOpen}
        onOpenChange={(open) => {
          setIsScheduleOpen(open);
          if (!open) setSelectedAssignment(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-3">Schedule Mock Interview</DialogTitle>
            <DialogDescription>
              Set a date/time, coordinator and optional template for the mock interview.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmitSchedule)} className="space-y-4 pt-4">
            <div>
              <Label className="text-sm font-medium">Candidate</Label>
              <Input
                disabled
                value={
                  selectedAssignment && selectedAssignment.candidate
                    ? `${selectedAssignment.candidate.firstName} ${selectedAssignment.candidate.lastName} — ${selectedAssignment.project?.title}`
                    : ""
                }
                className="h-11 mt-1 bg-muted/40"
              />
            </div>

            <div>
              <Label htmlFor="coordinatorId" className="text-sm font-medium">Coordinator *</Label>
              <select id="coordinatorId" {...form.register("coordinatorId")} className="w-full mt-1 h-11 rounded-md border px-3">
                <option value="">Select coordinator</option>
                {coordinators.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} {c.email ? `— ${c.email}` : ""}</option>
                ))}
              </select>
              {form.formState.errors.coordinatorId && (
                <p className="text-sm text-destructive">{form.formState.errors.coordinatorId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="templateId" className="text-sm font-medium">Template (optional)</Label>
              <select id="templateId" {...form.register("templateId")} className="w-full mt-1 h-11 rounded-md border px-3">
                <option value="">No template</option>
                {templateOptions.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="scheduledTime" className="text-sm font-medium">Date & time</Label>
                <Input id="scheduledTime" type="datetime-local" {...form.register("scheduledTime")} className="mt-1 h-11" />
                {form.formState.errors.scheduledTime && (
                  <p className="text-sm text-destructive">{form.formState.errors.scheduledTime.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="duration" className="text-sm font-medium">Duration (minutes)</Label>
                <Input id="duration" type="number" {...form.register("duration", { valueAsNumber: true })} min={15} max={240} className="mt-1 h-11" />
                {form.formState.errors.duration && (
                  <p className="text-sm text-destructive">{form.formState.errors.duration.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="meetingLink" className="text-sm font-medium">Meeting link (optional)</Label>
              <Input id="meetingLink" {...form.register("meetingLink")} placeholder="https://meet.google.com/xxx-xxxx-xxx" className="mt-1 h-11" />
            </div>

            <div>
              <Label htmlFor="mode" className="text-sm font-medium">Mode</Label>
              <select id="mode" {...form.register("mode")} className="w-full mt-1 h-11 rounded-md border px-3">
                <option value="video">Video</option>
                <option value="phone">Phone</option>
                <option value="in_person">In-person</option>
              </select>
            </div>

            <DialogFooter>
              <div className="flex gap-3 w-full pt-2">
                <UiButton type="button" variant="outline" onClick={() => { setIsScheduleOpen(false); setSelectedAssignment(null); }} className="flex-1" disabled={createState.isLoading}>
                  Cancel
                </UiButton>
                <UiButton type="submit" className="flex-1" disabled={createState.isLoading || !form.formState.isValid}>
                  {createState.isLoading ? "Scheduling..." : "Schedule Interview"}
                </UiButton>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
