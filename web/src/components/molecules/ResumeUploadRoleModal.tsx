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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DepartmentSelect } from "./DepartmentSelect";
import { JobTitleSelect } from "./JobTitleSelect";
import { Eye, Plus, Trash2, Upload } from "lucide-react";

export interface ResumeRoleSelection {
  id: string;
  departmentId?: string;
  roleCatalogId?: string;
  roleLabel?: string;
  docName?: string;
}

interface ResumeUploadRoleModalProps {
  mode?: "upload" | "edit";
  isOpen: boolean;
  selectedFile: File | null;
  docName?: string;
  docNameMode: "common" | "individual";
  roleSelections: ResumeRoleSelection[];
  isUploading?: boolean;
  onClose: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPreview: () => void;
  onAddRole: () => void;
  onRemoveRole: (id: string) => void;
  onRoleSelectionsChange: (next: ResumeRoleSelection[]) => void;
  onDocNameModeChange: (mode: "common" | "individual") => void;
  onDocNameChange?: (value: string) => void;
  onUpload: () => Promise<void> | void;
}

export function ResumeUploadRoleModal({
  mode = "upload",
  isOpen,
  selectedFile,
  docName = "",
  docNameMode,
  roleSelections,
  isUploading = false,
  onClose,
  onFileSelect,
  onPreview,
  onAddRole,
  onRemoveRole,
  onRoleSelectionsChange,
  onDocNameModeChange,
  onDocNameChange,
  onUpload,
}: ResumeUploadRoleModalProps) {
  const isEditMode = mode === "edit";
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <div className="p-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Resume Details" : "Upload Resume"}</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update role and document name for this uploaded resume."
                : "Upload one resume and map it to one or more department-role combinations."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Input value="resume" readOnly />
          </div>

          <div className="space-y-2">
            <Label>Document Name Mode</Label>
            <Select
              value={docNameMode}
              onValueChange={(value) =>
                onDocNameModeChange(value as "common" | "individual")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="common">Common name for all selected roles</SelectItem>
                <SelectItem value="individual">Individual name per role</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {docNameMode === "common" && (
            <div className="space-y-2">
              <Label>Document Name (Optional)</Label>
              <Input
                value={docName}
                onChange={(e) => onDocNameChange?.(e.target.value)}
                placeholder="Type common document name"
              />
            </div>
          )}

          {!isEditMode && (
            <div className="space-y-2">
              <Label>Resume File (PDF)</Label>
              <Input
                type="file"
                accept=".pdf"
                onChange={onFileSelect}
              />
              {selectedFile ? (
                <div className="flex items-center justify-between rounded-md border p-2">
                  <span className="text-sm text-slate-700">{selectedFile.name}</span>
                  <Button variant="ghost" size="sm" onClick={onPreview}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Departments and Roles</Label>
              <Button type="button" variant="outline" size="sm" onClick={onAddRole}>
                <Plus className="mr-2 h-4 w-4" />
                Add Role
              </Button>
            </div>

            {roleSelections.map((selection, index) => (
              <div key={selection.id} className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500">Mapping #{index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveRole(selection.id)}
                    disabled={roleSelections.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Department</Label>
                    <DepartmentSelect
                      value={selection.departmentId}
                      onValueChange={(departmentId) =>
                        onRoleSelectionsChange(
                          roleSelections.map((entry) =>
                            entry.id === selection.id
                              ? {
                                  ...entry,
                                  departmentId,
                                  roleCatalogId: undefined,
                                  roleLabel: "",
                                }
                              : entry,
                          ),
                        )
                      }
                      placeholder="Select department"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Role</Label>
                    <JobTitleSelect
                      value={selection.roleLabel ?? ""}
                      departmentId={selection.departmentId}
                      onRoleChange={(role) =>
                        onRoleSelectionsChange(
                          roleSelections.map((entry) =>
                            entry.id === selection.id
                              ? {
                                  ...entry,
                                  roleCatalogId: role?.id,
                                  roleLabel: role?.label || role?.name || "",
                                }
                              : entry,
                          ),
                        )
                      }
                      placeholder="Select role"
                      disabled={!selection.departmentId}
                      required
                    />
                  </div>
                </div>
                {docNameMode === "individual" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Document Name (Optional)</Label>
                    <Input
                      value={selection.docName ?? ""}
                      onChange={(e) =>
                        onRoleSelectionsChange(
                          roleSelections.map((entry) =>
                            entry.id === selection.id
                              ? { ...entry, docName: e.target.value }
                              : entry,
                          ),
                        )
                      }
                      placeholder="Type document name for this role"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 pt-4 border-t">
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={onUpload} disabled={isUploading || (!selectedFile && !isEditMode)}>
              {isUploading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {isEditMode ? "Saving..." : "Uploading..."}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {isEditMode ? "Save Changes" : "Upload Resume"}
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

