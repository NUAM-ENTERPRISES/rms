import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Loader2, Hash } from "lucide-react";
import { toast } from "sonner";
import { useUpdateProcessingCandidateMutation } from "@/services/processingApi";

interface EditFileNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  processingId: string;
  initialFileNumber?: string | null;
}

export function EditFileNumberModal({
  isOpen,
  onClose,
  processingId,
  initialFileNumber,
}: EditFileNumberModalProps) {
  const [fileNumber, setFileNumber] = useState(initialFileNumber || "");
  const [updateProcessingCandidate, { isLoading }] = useUpdateProcessingCandidateMutation();

  useEffect(() => {
    if (isOpen) {
      setFileNumber(initialFileNumber || "");
    }
  }, [isOpen, initialFileNumber]);

  const handleSave = async () => {
    try {
      await updateProcessingCandidate({
        id: processingId,
        fileNumber: fileNumber.trim(),
      }).unwrap();
      
      toast.success("File number updated successfully");
      onClose();
    } catch (error) {
      console.error("Failed to update file number:", error);
      toast.error("Failed to update file number. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600">
              <Hash className="h-4 w-4" />
            </div>
            <DialogTitle>Update File Number</DialogTitle>
          </div>
          <DialogDescription>
            Enter the file number for this processing candidate. This number will be displayed on the processing dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fileNumber" className="text-sm font-semibold">File Number</Label>
            <Input
              id="fileNumber"
              placeholder="e.g. PC-2024-001"
              value={fileNumber}
              onChange={(e) => setFileNumber(e.target.value)}
              className="font-medium"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleSave();
                }
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Save Number"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
