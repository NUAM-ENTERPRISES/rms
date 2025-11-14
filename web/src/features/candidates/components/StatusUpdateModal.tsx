import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useUpdateCandidateStatusMutation } from "../api";
import { useGetCandidateStatusesQuery } from "@/services/candidatesApi";
import { Loader2 } from "lucide-react";

const statusUpdateSchema = z.object({
  currentStatusId: z.string().min(1, "Please select a status"),
  reason: z.string().optional(),
});

type StatusUpdateFormData = z.infer<typeof statusUpdateSchema>;

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  currentStatus: string;
  candidateName: string;
}

export function StatusUpdateModal({
  isOpen,
  onClose,
  candidateId,
  currentStatus,
  candidateName,
}: StatusUpdateModalProps) {
  const [updateStatus, { isLoading }] = useUpdateCandidateStatusMutation();
  const { data: statusesData, isLoading: isLoadingStatuses } =
    useGetCandidateStatusesQuery();

  const form = useForm<StatusUpdateFormData>({
    resolver: zodResolver(statusUpdateSchema),
    defaultValues: {
      currentStatusId: "",
      reason: "",
    },
  });

  const handleSubmit = async (data: StatusUpdateFormData) => {
    try {
      await updateStatus({
        candidateId,
        status: {
          currentStatusId: parseInt(data.currentStatusId),
          reason: data.reason,
        },
      }).unwrap();

      toast.success("Candidate status updated successfully");
      onClose();
      form.reset();
    } catch (error) {
      console.error("Failed to update candidate status:", error);
      toast.error("Failed to update candidate status");
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const statuses = statusesData?.data || [];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Candidate Status</DialogTitle>
          <DialogDescription>
            Update the status for{" "}
            <span className="font-medium">{candidateName}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <FormLabel>Current Status</FormLabel>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {currentStatus}
                </Badge>
              </div>
            </div>

            <FormField
              control={form.control}
              name="currentStatusId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoadingStatuses}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingStatuses ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="ml-2 text-sm text-muted-foreground">
                            Loading statuses...
                          </span>
                        </div>
                      ) : (
                        statuses.map((status) => (
                          <SelectItem key={status.id} value={status.id.toString()}>
                            {status.statusName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter reason for status change..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Status
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
