import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DepartmentSelect } from "./DepartmentSelect";
import { JobTitleSelect } from "./JobTitleSelect";
import { RefreshCcw } from "lucide-react";

interface ResumeReuploadModalProps {
  isOpen: boolean;
  isSubmitting?: boolean;
  initialDocName?: string;
  initialRoleCatalogId?: string;
  initialDepartmentId?: string;
  initialRoleLabel?: string;
  onClose: () => void;
  onSubmit: (payload: {
    file: File;
    docName?: string;
    roleCatalogId?: string;
  }) => Promise<void> | void;
}

export function ResumeReuploadModal({
  isOpen,
  isSubmitting = false,
  initialDocName,
  initialRoleCatalogId,
  initialDepartmentId,
  initialRoleLabel,
  onClose,
  onSubmit,
}: ResumeReuploadModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [docName, setDocName] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState<string | undefined>();
  const [roleCatalogId, setRoleCatalogId] = React.useState<string | undefined>();
  const [roleLabel, setRoleLabel] = React.useState("");

  React.useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setDocName("");
      setDepartmentId(undefined);
      setRoleCatalogId(undefined);
      setRoleLabel("");
      return;
    }
    setDocName(initialDocName || "");
    setDepartmentId(initialDepartmentId);
    setRoleCatalogId(initialRoleCatalogId);
    setRoleLabel(initialRoleLabel || "");
  }, [
    isOpen,
    initialDocName,
    initialRoleCatalogId,
    initialDepartmentId,
    initialRoleLabel,
  ]);

  const handleSubmit = async () => {
    if (!file) return;
    await onSubmit({
      file,
      docName: docName.trim() || undefined,
      roleCatalogId,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Reupload Resume</DialogTitle>
          <DialogDescription>
            Replace resume file and optionally update role and document name.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Document Name (Optional)</Label>
            <Input
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Type document name"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <DepartmentSelect
                value={departmentId}
                onValueChange={(value) => {
                  setDepartmentId(value);
                  setRoleCatalogId(undefined);
                  setRoleLabel("");
                }}
                placeholder="Select department"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <JobTitleSelect
                value={roleLabel}
                departmentId={departmentId}
                onRoleChange={(role) => {
                  if (role) {
                    setRoleCatalogId(role.id);
                    setRoleLabel(role.label || role.name || "");
                  } else {
                    setRoleCatalogId(undefined);
                    setRoleLabel("");
                  }
                }}
                placeholder="Select role"
                disabled={!departmentId}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>New Resume File (PDF)</Label>
            <Input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!file || isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Reuploading...
              </>
            ) : (
              <>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reupload Resume
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

