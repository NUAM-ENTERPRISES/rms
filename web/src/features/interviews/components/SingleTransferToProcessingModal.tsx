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
import { Loader2, Upload, Eye, FileText, CheckCircle2 } from "lucide-react";
import { OfferLetterUploadModal } from "@/features/documents/components/OfferLetterUploadModal";
import { useGetProjectsQuery } from "@/services/projectsApi";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { Badge } from "@/components/ui/badge";

interface SingleTransferToProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  recruiterName?: string;
  projectId: string;
  roleCatalogId: string;
  isOfferVerified?: boolean;
  isAlreadyUploaded?: boolean;
  existingFileUrl?: string;
  onSuccess?: () => void;
}

export const SingleTransferToProcessingModal: React.FC<SingleTransferToProcessingModalProps> = ({
  isOpen,
  onClose,
  candidateId,
  candidateName,
  recruiterName,
  projectId,
  roleCatalogId,
  isOfferVerified = false,
  isAlreadyUploaded = false,
  existingFileUrl = "",
  onSuccess,
}) => {
  const [assignedProcessingTeamUserId, setAssignedProcessingTeamUserId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [showOfferLetterModal, setShowOfferLetterModal] = useState(false);
  const [localOfferLetter, setLocalOfferLetter] = useState<string>(existingFileUrl);

  const [pdfViewerState, setPdfViewerState] = useState<{
    isOpen: boolean;
    fileUrl: string;
    fileName: string;
  }>({
    isOpen: false,
    fileUrl: "",
    fileName: "",
  });

  const activePdfUrl = useMemo(() => {
    if (!pdfViewerState.isOpen || !pdfViewerState.fileUrl) return "";
    return `${pdfViewerState.fileUrl}${pdfViewerState.fileUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
  }, [pdfViewerState.isOpen, pdfViewerState.fileUrl]);

  const { data: projectsData } = useGetProjectsQuery({ limit: 10 });
  const selectedProject = useMemo(() => 
    projectsData?.data?.projects?.find((p: any) => p.id === projectId),
    [projectsData, projectId]
  );

  const selectedRole = useMemo(() => {
    if (!selectedProject?.rolesNeeded || !roleCatalogId) return null;
    return selectedProject.rolesNeeded.find((r: any) => (r.roleCatalogId || r.roleCatalog?.id) === roleCatalogId);
  }, [selectedProject, roleCatalogId]);

  const roleDesignation = selectedRole?.designation || "Unknown Role";

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
        roleCatalogId,
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
          <div className="flex justify-between items-center px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">Offer Letter</span>
                {isOfferVerified ? (
                  <Badge variant="secondary" className="px-1 py-0 h-3.5 text-[8px] bg-emerald-100 text-emerald-700 border-none">
                    VERIFIED
                  </Badge>
                ) : ((isAlreadyUploaded || localOfferLetter) && (
                  <Badge variant="secondary" className="px-1 py-0 h-3.5 text-[8px] bg-emerald-100 text-emerald-700 border-none">
                    UPLOADED
                  </Badge>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">Upload signed PDF (Optional)</span>
            </div>
            <div className="flex items-center gap-2">
              {(isAlreadyUploaded || localOfferLetter || isOfferVerified) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPdfViewerState({
                    isOpen: true,
                    fileUrl: localOfferLetter || existingFileUrl,
                    fileName: `Offer Letter - ${candidateName}`
                  })}
                  className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {!isOfferVerified && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOfferLetterModal(true)}
                  className={cn(
                    "h-8 transition-all gap-2 shadow-sm",
                    (isAlreadyUploaded || localOfferLetter) 
                      ? "border-amber-200 text-amber-600 hover:bg-amber-600 hover:text-white" 
                      : "border-indigo-200 hover:bg-indigo-600 hover:text-white"
                  )}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {(isAlreadyUploaded || localOfferLetter) ? "Re-upload" : "Upload"}
                </Button>
              )}
            </div>
          </div>
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
          <Button onClick={handleTransfer} disabled={isTransferring || !assignedProcessingTeamUserId || !projectId || !roleCatalogId}>
            {isTransferring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transfer Candidate
          </Button>
        </DialogFooter>
      </DialogContent>

      <OfferLetterUploadModal
        isOpen={showOfferLetterModal}
        onClose={() => setShowOfferLetterModal(false)}
        candidateId={candidateId}
        candidateName={candidateName}
        projectId={projectId}
        projectTitle={selectedProject?.title || "Project"}
        roleCatalogId={roleCatalogId}
        roleDesignation={roleDesignation}
        isAlreadyUploaded={isAlreadyUploaded || !!localOfferLetter}
        existingFileUrl={localOfferLetter || existingFileUrl}
        onSuccess={(uploadData) => {
          if (uploadData?.fileUrl) {
            setLocalOfferLetter(uploadData.fileUrl);
          }
        }}
      />

      <PDFViewer
        fileUrl={activePdfUrl}
        fileName={pdfViewerState.fileName}
        isOpen={pdfViewerState.isOpen}
        onClose={() => setPdfViewerState({ ...pdfViewerState, isOpen: false })}
      />
    </Dialog>
  );
};
