import { useState, useEffect } from "react";
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
import { AlertCircle, UserPlus, Loader2 } from "lucide-react";
import { useGetUsersQuery } from "@/services/usersApi";

interface TransferCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  onConfirm: (data: { targetRecruiterId: string; reason: string }) => void;
  isLoading?: boolean;
}

export function TransferCandidateDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  onConfirm,
  isLoading = false,
}: TransferCandidateDialogProps) {
  const [targetRecruiterId, setTargetRecruiterId] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({
    targetRecruiterId: false,
    reason: false,
  });

  // Fetch list of recruiters
  const { data: usersData, isLoading: isLoadingUsers } = useGetUsersQuery({});
  
  // Filter only recruiters from users
  const allUsers = usersData?.data?.users || [];
    
  const recruiters = allUsers.filter((user: any) => 
    user.userRoles?.some((userRole: any) => 
      userRole.role?.name?.toLowerCase() === 'recruiter'
    )
  );

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setTargetRecruiterId("");
      setReason("");
      setErrors({ targetRecruiterId: false, reason: false });
    }
  }, [open]);

  // Validate form
  const validateForm = () => {
    const newErrors = {
      targetRecruiterId: !targetRecruiterId,
      reason: !reason.trim(),
    };
    setErrors(newErrors);
    return !newErrors.targetRecruiterId && !newErrors.reason;
  };

  // Check if form is valid (for enabling submit button)
  const isFormValid = targetRecruiterId && reason.trim();

  const handleSubmit = () => {
    if (validateForm()) {
      onConfirm({
        targetRecruiterId,
        reason: reason.trim(),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Transfer Candidate</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Transfer <span className="font-semibold text-slate-700">{candidateName}</span> to another recruiter
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Target Recruiter Selection */}
          <div className="space-y-2">
            <Label htmlFor="target-recruiter" className="text-sm font-medium text-slate-700">
              Target Recruiter <span className="text-red-500">*</span>
            </Label>
            <Select
              value={targetRecruiterId}
              onValueChange={(value) => {
                setTargetRecruiterId(value);
                setErrors((prev) => ({ ...prev, targetRecruiterId: false }));
              }}
              disabled={isLoadingUsers || isLoading}
            >
              <SelectTrigger
                id="target-recruiter"
                className={`h-11 ${
                  errors.targetRecruiterId ? "border-red-500 focus:ring-red-500" : ""
                }`}
              >
                <SelectValue placeholder="Select a recruiter..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : recruiters.length === 0 ? (
                  <div className="py-6 text-center text-sm text-slate-500">
                    No recruiters found
                  </div>
                ) : (
                  recruiters.map((recruiter: any) => (
                    <SelectItem key={recruiter.id} value={recruiter.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                          {recruiter.name?.charAt(0).toUpperCase() || "R"}
                        </div>
                        <div>
                          <div className="font-medium">{recruiter.name || "Unknown"}</div>
                          <div className="text-xs text-slate-500">{recruiter.email}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.targetRecruiterId && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 mt-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Target recruiter is required</span>
              </div>
            )}
          </div>

          {/* Reason Field */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium text-slate-700">
              Reason for Transfer <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for this transfer..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setErrors((prev) => ({ ...prev, reason: false }));
              }}
              className={`min-h-[100px] resize-none ${
                errors.reason ? "border-red-500 focus:ring-red-500" : ""
              }`}
              disabled={isLoading}
            />
            {errors.reason && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 mt-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Reason is required</span>
              </div>
            )}
            <p className="text-xs text-slate-500">
              Explain why this candidate is being transferred to help maintain proper records.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transferring...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Transfer Candidate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
