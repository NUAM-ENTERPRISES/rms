import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { useUsersLookup } from "@/shared/hooks/useUsersLookup";
import { useTransferToProcessingMutation } from "@/features/processing/data/processing.endpoints";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SingleTransferToProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  recruiterName?: string;
  projectId: string;
  roleNeededId: string;
  onSuccess?: () => void;
}

export const SingleTransferToProcessingModal: React.FC<SingleTransferToProcessingModalProps> = ({
  isOpen,
  onClose,
  candidateId,
  candidateName,
  recruiterName,
  projectId,
  roleNeededId,
  onSuccess,
}) => {
  const [assignedProcessingTeamUserId, setAssignedProcessingTeamUserId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const { users, isLoading: isLoadingUsers } = useUsersLookup();
  const [transfer, { isLoading: isTransferring }] = useTransferToProcessingMutation();

  const processingUsers = users.filter((user) =>
    user.role.toLowerCase().includes("processing")
  );

  const handleTransfer = async () => {
    if (!assignedProcessingTeamUserId) {
      toast.error("Please select a processing team user");
      return;
    }

    try {
      await transfer({
        candidateIds: [candidateId],
        projectId,
        roleNeededId,
        assignedProcessingTeamUserId,
        notes,
      }).unwrap();

      toast.success(`Candidate ${candidateName} transferred to processing successfully`);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to transfer candidate");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfer to Processing</DialogTitle>
          <DialogDescription>
            Assign <span className="font-semibold">{candidateName}</span> to a processing team member for documentation verification.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {recruiterName && (
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center">
              <span className="text-muted-foreground">Assigned Recruiter:</span>
              <span className="font-medium">{recruiterName}</span>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="processingUser">Processing User <span className="text-red-500">*</span></Label>
            <Select
              value={assignedProcessingTeamUserId}
              onValueChange={setAssignedProcessingTeamUserId}
            >
              <SelectTrigger id="processingUser">
                <SelectValue placeholder={isLoadingUsers ? "Loading users..." : "Select a user"} />
              </SelectTrigger>
              <SelectContent>
                {processingUsers.length === 0 && !isLoadingUsers ? (
                  <div className="p-2 text-sm text-center text-muted-foreground">
                    No processing users found
                  </div>
                ) : (
                  processingUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any instructions or remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isTransferring}>
            Cancel
          </Button>
          <Button onClick={handleTransfer} disabled={isTransferring || !assignedProcessingTeamUserId || !projectId || !roleNeededId}>
            {isTransferring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transfer Candidate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
