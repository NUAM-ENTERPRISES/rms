import { useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button as UiButton } from "@/components/ui/button";
import { useUsersLookup } from "@/shared/hooks/useUsersLookup";
import { useCreateMockInterviewMutation } from "../data";
import { useGetTemplatesByRoleQuery, useGetTemplatesQuery } from "../../templates/data";

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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssignment: any | null;
  refetchAssigned?: () => void;
}

export default function ScheduleMockInterviewModal({
  open,
  onOpenChange,
  selectedAssignment,
  refetchAssigned,
}: Props) {
  const [createMockInterview, createState] = useCreateMockInterviewMutation();
  const { users, getUsersByRole } = useUsersLookup();

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    mode: "onChange",
    defaultValues: {
      candidateProjectMapId: selectedAssignment?.candidateProjectMap?.id || "",
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

    const initialScheduled = selectedAssignment?.scheduledTime
      ? (() => {
          const iso = new Date(selectedAssignment.scheduledTime);
          const tzOffset = iso.getTimezoneOffset();
          const local = new Date(iso.getTime() - tzOffset * 60000);
          return local.toISOString().slice(0, 16);
        })()
      : "";

    form.reset({
      candidateProjectMapId: selectedAssignment?.candidateProjectMap?.id || "",
      coordinatorId: "",
      templateId: undefined,
      scheduledTime: initialScheduled,
      duration: 60,
      meetingLink: "",
      mode: "video",
    });
  }, [selectedAssignment]);

  const roleId = selectedAssignment?.candidateProjectMap?.roleNeeded?.id;
  const { data: templatesByRole } = useGetTemplatesByRoleQuery(
    { roleId: roleId || "", isActive: true },
    { skip: !roleId }
  );
  const { data: allTemplates } = useGetTemplatesQuery(undefined, { skip: !open });

  const templateOptions = (roleId ? templatesByRole?.data : allTemplates?.data) || [];
  const coordinators = getUsersByRole("coordinator").length ? getUsersByRole("coordinator") : users || [];

  const onSubmitSchedule = async (values: ScheduleFormValues) => {
    try {
      const payload: any = { ...values };
      if (values.scheduledTime) payload.scheduledTime = new Date(values.scheduledTime).toISOString();

      await createMockInterview(payload).unwrap();
      toast.success("Mock interview scheduled");
      onOpenChange(false);
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

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) form.reset();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-3">Schedule Mock Interview</DialogTitle>
          <DialogDescription>
            Set a date/time, coordinator and optional template for the mock
            interview.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmitSchedule)} className="space-y-4 pt-4">
          <div>
            <Label className="text-sm font-medium">Candidate</Label>
            <Input
              disabled
              value={
                selectedAssignment && selectedAssignment.candidateProjectMap?.candidate
                  ? `${selectedAssignment.candidateProjectMap.candidate.firstName} ${selectedAssignment.candidateProjectMap.candidate.lastName} — ${selectedAssignment.candidateProjectMap.project?.title}`
                  : ""
              }
              className="h-11 mt-1 bg-muted/40 text-black"
            />
          </div>

          <div>
            <Label htmlFor="coordinatorId" className="text-sm font-medium">Coordinator *</Label>
            <select id="coordinatorId" {...form.register("coordinatorId")} className="w-full mt-1 h-11 rounded-md border px-3">
              <option value="">Select coordinator</option>
              {coordinators.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.email ? `— ${c.email}` : ""}
                </option>
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
              {form.formState.errors.scheduledTime && <p className="text-sm text-destructive">{form.formState.errors.scheduledTime.message}</p>}
            </div>

            <div>
              <Label htmlFor="duration" className="text-sm font-medium">Duration (minutes)</Label>
              <Input id="duration" type="number" {...form.register("duration", { valueAsNumber: true })} min={15} max={240} className="mt-1 h-11" />
              {form.formState.errors.duration && <p className="text-sm text-destructive">{form.formState.errors.duration.message}</p>}
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
              <UiButton type="button" variant="outline" onClick={() => { onOpenChange(false); form.reset(); }} className="flex-1" disabled={createState.isLoading}>
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
  );
}
