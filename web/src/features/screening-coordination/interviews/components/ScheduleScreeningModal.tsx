import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check } from "lucide-react";
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
import { useDebounce } from "@/hooks/useDebounce";
import { useGetUsersQuery } from "@/features/admin";
import { useCreateScreeningMutation } from "../data";

const scheduleSchema = z.object({
  coordinatorId: z.string().min(1, "Coordinator is required"),
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
  selectedAssignments?: any[]; // For batch scheduling
  refetchAssigned?: () => void;
}

export default function ScheduleScreeningModal({
  open,
  onOpenChange,
  selectedAssignment,
  selectedAssignments = [],
  refetchAssigned,
}: Props) {
  // Support both single and batch scheduling
  const isBatch = selectedAssignments.length > 0;
  const assignments = isBatch ? selectedAssignments : selectedAssignment ? [selectedAssignment] : [];

  const [createScreening, createState] = useCreateScreeningMutation();

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    mode: "onChange",
    defaultValues: {
      coordinatorId: "",
      scheduledTime: "",
      duration: 60,
      meetingLink: "",
      mode: "video",
    },
  });

  useEffect(() => {
    if (!open) return;
    // Reset form when dialog opens
    form.reset({
      coordinatorId: "",
      scheduledTime: "",
      duration: 60,
      meetingLink: "",
      mode: "video",
    });
    // reset user list params when dialog opens
    setUsersPage(1);
    setSearch("");
  }, [open, form]);

  // Local state for paginated, searchable users
  const [usersPage, setUsersPage] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const debouncedSearch = useDebounce(search, 400);

  // Fetch users only when modal is open
  const { data: usersResponse, isLoading: isUsersLoading } = useGetUsersQuery(
    { page: usersPage, limit: 10, search: debouncedSearch },
    { skip: !open }
  );

  const coordinators = (usersResponse?.data?.users || [])
    .filter((u: any) =>
      (u.userRoles || []).some((r: any) =>
        String(r?.role?.name || "").toLowerCase().includes("coordinator")
      )
    )
    .map((u: any) => ({ id: u.id, name: u.name, email: u.email }));

  const usersTotalPages = usersResponse?.data?.totalPages || 1;

  const onSubmitSchedule = async (values: ScheduleFormValues) => {
    try {
      if (assignments.length === 0) {
        toast.error("No assignments selected");
        return;
      }

      // Build payload(s)
      const payload = assignments.map((assignment) => {
        const candidateProjectMap = assignment?.candidateProjectMap || assignment;
        const basePayload: any = {
          candidateProjectMapId: candidateProjectMap?.id,
          coordinatorId: values.coordinatorId,
          duration: values.duration,
          meetingLink: values.meetingLink || undefined,
          mode: values.mode || "video",
        };

        if (values.scheduledTime) {
          basePayload.scheduledTime = new Date(values.scheduledTime).toISOString();
        }

        return basePayload;
      });

      // Send single or batch request
      const requestPayload = isBatch ? payload : payload[0];

      await createScreening(requestPayload).unwrap();
      
      const successMsg = isBatch 
        ? `${assignments.length} screenings scheduled successfully`
        : "Screening scheduled successfully";
      
      toast.success(successMsg);
      onOpenChange(false);
      form.reset();
      refetchAssigned?.();
    } catch (err: any) {
      const status = err?.status;
      if (status === 409) {
        toast.error("Conflict: one or more screenings already exist for these assignments.");
      } else if (status === 404) {
        toast.error("Resource not found. Please try again.");
      } else {
        toast.error("Failed to schedule screening(s). Please try again.");
      }
    }
  };

  const candidateSummary = assignments
    .slice(0, 3)
    .map((a) => {
      const candidate = a?.candidate || a?.candidateProjectMap?.candidate;
      return candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown";
    })
    .join(", ");

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
          <DialogTitle className="text-xl flex items-center gap-3">
            {isBatch ? "Bulk Schedule Screenings" : "Schedule Screening"}
          </DialogTitle>
          <DialogDescription>
            {isBatch
              ? `Configure details for ${assignments.length} screenings`
              : "Set a date/time, coordinator and optional details for the screening."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmitSchedule)} className="space-y-4 pt-4">
          {/* Candidates Summary - Only show for single scheduling */}
          {!isBatch && (
            <div>
              <Label className="text-sm font-medium">Candidate</Label>
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                {candidateSummary}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="coordinatorId" className="text-sm font-medium">Coordinator *</Label>

            {/* Search */}
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setUsersPage(1);
              }}
              placeholder="Search coordinators by name or email"
              className="mt-2 mb-2"
            />

            <select id="coordinatorId" {...form.register("coordinatorId")} className="w-full mt-1 h-11 rounded-md border px-3">
              <option value="">Select coordinator</option>
              {isUsersLoading && <option disabled>Loading...</option>}
              {!isUsersLoading && coordinators.length === 0 && (
                <option disabled>No coordinators found</option>
              )}
              {!isUsersLoading && coordinators.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.email ? `— ${c.email}` : ""}
                </option>
              ))}
            </select>
            {form.formState.errors.coordinatorId && (
              <p className="text-sm text-destructive">{form.formState.errors.coordinatorId.message}</p>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-slate-500">Page {usersPage} of {usersTotalPages}</div>
              <div className="flex items-center gap-2">
                <UiButton
                  size="sm"
                  variant="outline"
                  onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                  disabled={usersPage <= 1}
                >
                  Prev
                </UiButton>
                <UiButton
                  size="sm"
                  variant="outline"
                  onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))}
                  disabled={usersPage >= usersTotalPages}
                >
                  Next
                </UiButton>
              </div>
            </div>
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
              <UiButton 
                type="button" 
                variant="outline" 
                onClick={() => { onOpenChange(false); form.reset(); }} 
                className="flex-1" 
                disabled={createState.isLoading}
              >
                Cancel
              </UiButton>
              <UiButton 
                type="submit" 
                className="flex-1" 
                disabled={createState.isLoading || !form.formState.isValid}
              >
                {createState.isLoading 
                  ? `${isBatch ? "Bulk Scheduling" : "Scheduling"}...` 
                  : isBatch ? `Bulk Schedule (${assignments.length})` : "Schedule"
                }
              </UiButton>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
