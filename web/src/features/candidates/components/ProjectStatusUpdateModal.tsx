import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui";
import { toast } from "sonner";
import { useCreateCandidateProjectStatusChangeRequestMutation } from "@/features/candidates/api";
import { getStatusChangeTargetLabel } from "@/features/candidates/utils/candidateProjectPipelineBlocked";

const schema = z.object({
  requestedStatus: z.enum(["withdrawn", "on_hold"]),
  reason: z.string().trim().min(10, "Remarks must be at least 10 characters"),
});

type FormValues = z.infer<typeof schema>;

interface ProjectStatusUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateProjectMapId: string;
  candidateId: string;
  projectId: string;
  candidateName: string;
  projectName: string;
  canDirectApply?: boolean;
}

export function ProjectStatusUpdateModal({
  open,
  onOpenChange,
  candidateProjectMapId,
  candidateId,
  projectId,
  candidateName,
  projectName,
  canDirectApply = false,
}: ProjectStatusUpdateModalProps) {
  const [createRequest, { isLoading }] =
    useCreateCandidateProjectStatusChangeRequestMutation();

  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      requestedStatus: "withdrawn",
      reason: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await createRequest({
        candidateProjectMapId,
        candidateId,
        projectId,
        requestedStatus: values.requestedStatus,
        reason: values.reason,
      }).unwrap();

      const statusLabel = getStatusChangeTargetLabel(values.requestedStatus);
      if (canDirectApply) {
        toast.success(
          response.message ||
            `${candidateName} – ${projectName}: marked as ${statusLabel}.`,
        );
      } else {
        toast.success(
          response.message ||
            `${candidateName} – ${projectName}: ${statusLabel} request sent to admin. Wait for approval.`,
        );
      }
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Failed to submit status change request. Please try again.");
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="border border-slate-200 bg-background shadow-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Project Updates</DialogTitle>
          <DialogDescription>
            {canDirectApply ? (
              <>
                Update the status for{" "}
                <span className="font-medium text-foreground">{candidateName}</span>{" "}
                on{" "}
                <span className="font-medium text-foreground">{projectName}</span>.
                As a manager, the change will apply immediately.
              </>
            ) : (
              <>
                Request a status change for{" "}
                <span className="font-medium text-foreground">{candidateName}</span>{" "}
                on{" "}
                <span className="font-medium text-foreground">{projectName}</span>.
                An admin or manager must approve before the status changes.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="requested-status">Status type</Label>
            <Controller
              name="requestedStatus"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="requested-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-change-reason">Remarks</Label>
            <Textarea
              id="status-change-reason"
              rows={4}
              placeholder="Provide the reason for this status change request..."
              aria-invalid={Boolean(errors.reason)}
              {...register("reason")}
            />
            {errors.reason && (
              <p className="text-sm text-destructive" role="alert">
                {errors.reason.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Submitting...
                </>
              ) : canDirectApply ? (
                "Apply status"
              ) : (
                "Submit request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
