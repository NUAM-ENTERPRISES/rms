import { useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { useCreateCandidateProjectStatusChangeRequestMutation } from "@/features/candidates/api";
import { getStatusChangeTargetLabel } from "@/features/candidates/utils/candidateProjectPipelineBlocked";

const blockSchema = z.object({
  requestType: z.literal("block"),
  requestedStatus: z.enum(["withdrawn", "on_hold"]),
  reason: z.string().trim().min(10, "Remarks must be at least 10 characters"),
});

const reactivateSchema = z.object({
  requestType: z.literal("reactivate"),
  reason: z.string().trim().min(10, "Remarks must be at least 10 characters"),
});

const schema = z.discriminatedUnion("requestType", [blockSchema, reactivateSchema]);

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
  currentMainStatus?: string;
  previousStatus?: { name: string; label: string };
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
  currentMainStatus,
  previousStatus,
}: ProjectStatusUpdateModalProps) {
  const [createRequest, { isLoading }] =
    useCreateCandidateProjectStatusChangeRequestMutation();

  // Determine if currently blocked
  const isBlocked = ["withdrawn", "on_hold"].includes(
    currentMainStatus?.toLowerCase() || ""
  );

  // Initialize with appropriate request type
  const [requestType, setRequestType] = useState<"block" | "reactivate">(
    isBlocked ? "reactivate" : "block"
  );

  const {
    control,
    handleSubmit,
    register,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      requestType: isBlocked ? "reactivate" : "block",
      requestedStatus: currentMainStatus === "withdrawn" ? "on_hold" : "withdrawn",
      reason: "",
    } as FormValues,
  });

  const watchedRequestType = watch("requestType");

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await createRequest({
        candidateProjectMapId,
        candidateId,
        projectId,
        requestType: values.requestType,
        requestedStatus:
          values.requestType === "block" ? values.requestedStatus : undefined,
        reason: values.reason,
      }).unwrap();

      if (values.requestType === "reactivate") {
        toast.success(
          response.message ||
            (canDirectApply
              ? `${candidateName} reactivated successfully.`
              : `${candidateName}: Reactivation request sent for approval.`)
        );
      } else {
        const statusLabel = getStatusChangeTargetLabel(values.requestedStatus!);
        toast.success(
          response.message ||
            (canDirectApply
              ? `${candidateName} – ${projectName}: marked as ${statusLabel}.`
              : `${candidateName} – ${projectName}: ${statusLabel} request sent to admin.`)
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
        if (!next) {
          reset();
          setRequestType(isBlocked ? "reactivate" : "block");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="border border-slate-200 bg-background shadow-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isBlocked ? "Manage Blocked Status" : "Project Updates"}
          </DialogTitle>
          <DialogDescription>
            {isBlocked ? (
              <>
                Candidate is currently{" "}
                <span className="font-medium text-foreground">
                  {currentMainStatus}
                </span>
                . You can reactivate or change the block status.
              </>
            ) : canDirectApply ? (
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
          {isBlocked && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={watchedRequestType === "reactivate" ? "default" : "outline"}
                onClick={() => {
                  setRequestType("reactivate");
                  reset({
                    requestType: "reactivate",
                    reason: "",
                  } as FormValues);
                }}
                className="flex-1"
              >
                Reactivate
              </Button>
              <Button
                type="button"
                variant={watchedRequestType === "block" ? "default" : "outline"}
                onClick={() => {
                  setRequestType("block");
                  reset({
                    requestType: "block",
                    requestedStatus: currentMainStatus === "withdrawn" ? "on_hold" : "withdrawn",
                    reason: "",
                  } as FormValues);
                }}
                className="flex-1"
              >
                Change Status
              </Button>
            </div>
          )}

          {watchedRequestType === "reactivate" && previousStatus && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Will return to: <strong>{previousStatus.label}</strong>
              </AlertDescription>
            </Alert>
          )}

          {watchedRequestType === "block" && (
            <div className="space-y-2">
              <Label htmlFor="requested-status">Status type</Label>
              <Controller
                name="requestedStatus"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="requested-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentMainStatus !== "withdrawn" && (
                        <SelectItem value="withdrawn">Withdrawn</SelectItem>
                      )}
                      {currentMainStatus !== "on_hold" && (
                        <SelectItem value="on_hold">On Hold</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="status-change-reason">Remarks</Label>
            <Textarea
              id="status-change-reason"
              rows={4}
              placeholder={
                watchedRequestType === "reactivate"
                  ? "Provide the reason for reactivation..."
                  : "Provide the reason for status change..."
              }
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
                "Apply"
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
