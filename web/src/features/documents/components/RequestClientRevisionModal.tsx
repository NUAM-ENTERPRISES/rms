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
import { Textarea } from "@/components/ui/textarea";
import { RotateCcw, Loader2 } from "lucide-react";
import { useRequestClientReuploadMutation } from "../api";
import { toast } from "sonner";

interface RequestClientRevisionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidateProjectMapId: string;
  candidateName: string;
  onSuccess?: () => void;
}

export function RequestClientRevisionModal({
  isOpen,
  onOpenChange,
  candidateProjectMapId,
  candidateName,
  onSuccess,
}: RequestClientRevisionModalProps) {
  const [reason, setReason] = useState("");
  const [requestClientReupload, { isLoading }] = useRequestClientReuploadMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please provide a reason for the revision request.");
      return;
    }

    try {
      await requestClientReupload({
        candidateProjectMapId,
        reason: reason.trim(),
      }).unwrap();
      
      toast.success("Client revision request submitted. Recruiter has been notified.");
      onSuccess?.();
      onOpenChange(false);
      setReason("");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to submit revision request.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-orange-500" />
            Client Revision Requested
          </DialogTitle>
          <DialogDescription>
            Request document revisions for <strong>{candidateName}</strong> based on client feedback. 
            This will move the candidate back to the verification stage and notify the recruiter.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Client Feedback / Reason for Revision <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="e.g., Client requested a clearer resume or corrected spelling..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[120px]"
              required
            />
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
            <Button 
              type="submit" 
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={isLoading || !reason.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
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
