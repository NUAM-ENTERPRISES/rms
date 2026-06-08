import { useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui";
import {
  ProjectStatus,
  PROJECT_STATUS_LABELS,
  type ProjectStatusType,
} from "@/entities/project/constants";
import {
  getProjectStatusBadge,
  statusBadgeClassNames,
} from "@/features/projects/constants/statusBadges";
import { useUpdateProjectStatusMutation } from "@/features/projects/api";
import { toast } from "sonner";

const STATUS_OPTIONS = Object.values(ProjectStatus) as ProjectStatusType[];

const schema = z.object({
  status: z.enum([
    ProjectStatus.IN_PROGRESS,
    ProjectStatus.ON_HOLD,
    ProjectStatus.COMPLETED,
    ProjectStatus.CANCELLED,
  ]),
});

type FormValues = z.infer<typeof schema>;

interface ChangeProjectStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  currentStatus: ProjectStatusType;
}

export function ChangeProjectStatusDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  currentStatus,
}: ChangeProjectStatusDialogProps) {
  const [updateStatus, { isLoading }] = useUpdateProjectStatusMutation();
  const currentBadge = getProjectStatusBadge(currentStatus);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: currentStatus },
  });

  const selectedStatus = watch("status");

  useEffect(() => {
    if (open) {
      reset({ status: currentStatus });
    }
  }, [open, currentStatus, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (values.status === currentStatus) {
      toast.info("Project status is already set to this value.");
      return;
    }

    try {
      await updateStatus({ id: projectId, status: values.status }).unwrap();
      toast.success("Project status updated successfully.");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update project status. Please try again.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-slate-200 bg-background shadow-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update project status</DialogTitle>
          <DialogDescription>
            Change the lifecycle status for{" "}
            <span className="font-medium text-foreground">{projectTitle}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Current status</Label>
            <Badge
              variant="outline"
              className={statusBadgeClassNames(currentBadge)}
            >
              {currentBadge.label}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-status-select">New status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="project-status-select"
                    aria-invalid={Boolean(errors.status)}
                  >
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {PROJECT_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && (
              <p className="text-sm text-destructive" role="alert">
                {errors.status.message}
              </p>
            )}
          </div>

          {selectedStatus !== currentStatus && (
            <p className="text-sm text-muted-foreground">
              Status will change from{" "}
              <span className="font-medium">{currentBadge.label}</span> to{" "}
              <span className="font-medium">
                {PROJECT_STATUS_LABELS[selectedStatus]}
              </span>
              .
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || selectedStatus === currentStatus}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Updating...
                </>
              ) : (
                "Update status"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
