import React, { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DepartmentSelect, JobTitleSelect } from "@/components/molecules";
import {
  DOCUMENT_TYPE,
  DOCUMENT_TYPE_CONFIG,
  getDocumentNumberLabel,
  isEligibilityLetterType,
  isPassportDocumentType,
} from "@/constants/document-types";
import { Pencil } from "lucide-react";

const HIDDEN_DOCUMENT_TYPES = new Set<string>(["experience_letter"]);

const ROLE_DOC_TYPES = new Set<string>([
  DOCUMENT_TYPE.RESUME,
  DOCUMENT_TYPE.CV,
  DOCUMENT_TYPE.EXPERIENCE_LETTERS,
]);

export interface EditableCandidateDocument {
  id: string;
  docType: string;
  docName?: string | null;
  documentNumber?: string | null;
  issuedAt?: string | null;
  expiryDate?: string | null;
  roleCatalogId?: string | null;
  roleCatalog?: {
    id?: string;
    name?: string;
    label?: string;
    roleDepartmentId?: string;
  } | null;
}

export interface EditCandidateDocumentValues {
  docType: string;
  docName?: string;
  documentNumber?: string;
  issuedAt?: string;
  expiryDate?: string;
  roleCatalogId?: string;
}

interface EditCandidateDocumentDialogProps {
  isOpen: boolean;
  document: EditableCandidateDocument | null;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (values: EditCandidateDocumentValues) => Promise<void> | void;
}

const editDocumentSchema = z
  .object({
    docType: z.string().min(1, "Document type is required"),
    docName: z.string().optional(),
    documentNumber: z.string().optional(),
    issuedAt: z.string().optional(),
    expiryDate: z.string().optional(),
    departmentId: z.string().optional(),
    roleCatalogId: z.string().optional(),
    roleLabel: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (isPassportDocumentType(data.docType)) {
      if (!data.documentNumber?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passport number is required",
          path: ["documentNumber"],
        });
      }
      if (!data.expiryDate?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passport expiry date is required",
          path: ["expiryDate"],
        });
      }
    }

    if (isEligibilityLetterType(data.docType)) {
      if (!data.documentNumber?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Eligibility number is required",
          path: ["documentNumber"],
        });
      }
      if (!data.issuedAt?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Issued date is required",
          path: ["issuedAt"],
        });
      }
      if (!data.expiryDate?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Expiry date is required",
          path: ["expiryDate"],
        });
      }
    }

    if (
      (data.docType === DOCUMENT_TYPE.RESUME ||
        data.docType === DOCUMENT_TYPE.CV ||
        data.docType === DOCUMENT_TYPE.EXPERIENCE_LETTERS) &&
      !data.roleCatalogId?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a role",
        path: ["roleCatalogId"],
      });
    }
  });

type EditDocumentForm = z.infer<typeof editDocumentSchema>;

function formatDateForInput(value?: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function EditCandidateDocumentDialog({
  isOpen,
  document,
  isSaving = false,
  onClose,
  onSave,
}: EditCandidateDocumentDialogProps) {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditDocumentForm>({
    resolver: zodResolver(editDocumentSchema),
    defaultValues: {
      docType: "",
      docName: "",
      documentNumber: "",
      issuedAt: "",
      expiryDate: "",
      departmentId: "",
      roleCatalogId: "",
      roleLabel: "",
    },
  });

  const docType = watch("docType");
  const departmentId = watch("departmentId");
  const isPassportDoc = isPassportDocumentType(docType);
  const isEligibilityDoc = isEligibilityLetterType(docType);
  const requiresRole = ROLE_DOC_TYPES.has(docType);

  useEffect(() => {
    if (!isOpen || !document) {
      reset();
      return;
    }
    reset({
      docType: document.docType || "",
      docName: document.docName?.trim() || "",
      documentNumber: document.documentNumber?.trim() || "",
      issuedAt: formatDateForInput(document.issuedAt),
      expiryDate: formatDateForInput(document.expiryDate),
      departmentId: document.roleCatalog?.roleDepartmentId || "",
      roleCatalogId: document.roleCatalogId || document.roleCatalog?.id || "",
      roleLabel: document.roleCatalog?.label || document.roleCatalog?.name || "",
    });
  }, [isOpen, document, reset]);

  const docTypeOptions = useMemo(() => {
    const entries = Object.entries(DOCUMENT_TYPE_CONFIG).filter(
      ([type]) => !HIDDEN_DOCUMENT_TYPES.has(type),
    );
    if (
      document?.docType &&
      !entries.some(([type]) => type === document.docType)
    ) {
      entries.unshift([
        document.docType,
        {
          displayName: document.docType.replaceAll("_", " "),
        } as (typeof DOCUMENT_TYPE_CONFIG)[keyof typeof DOCUMENT_TYPE_CONFIG],
      ]);
    }
    return entries;
  }, [document?.docType]);

  const onSubmit = async (values: EditDocumentForm) => {
    await onSave({
      docType: values.docType,
      docName: values.docName?.trim() || undefined,
      documentNumber: values.documentNumber?.trim() || undefined,
      issuedAt: values.issuedAt?.trim() || undefined,
      expiryDate: values.expiryDate?.trim() || undefined,
      roleCatalogId: requiresRole
        ? values.roleCatalogId?.trim() || undefined
        : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-foreground" />
            Edit document
          </DialogTitle>
          <DialogDescription>
            Update the document type and details. The uploaded file stays the same.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="edit-doc-type">Document type</Label>
            <Controller
              name="docType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="edit-doc-type" className="w-full">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {docTypeOptions.map(([type, cfg]) => (
                      <SelectItem key={type} value={type}>
                        {cfg.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.docType ? (
              <p className="text-xs text-destructive" role="alert">
                {errors.docType.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-doc-name">Document name</Label>
            <Controller
              name="docName"
              control={control}
              render={({ field }) => (
                <Input
                  id="edit-doc-name"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Optional display name"
                />
              )}
            />
          </div>

          {requiresRole ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <DepartmentSelect
                      value={field.value || undefined}
                      onValueChange={(value) => {
                        field.onChange(value ?? "");
                        setValue("roleCatalogId", "");
                        setValue("roleLabel", "");
                      }}
                      placeholder="Select department"
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Controller
                  name="roleCatalogId"
                  control={control}
                  render={({ field }) => (
                    <JobTitleSelect
                      value={watch("roleLabel") || ""}
                      onRoleChange={(role) => {
                        field.onChange(role?.id ?? "");
                        setValue(
                          "roleLabel",
                          role?.label || role?.name || "",
                        );
                      }}
                      departmentId={departmentId || undefined}
                      placeholder="Select a role"
                      disabled={!departmentId}
                      required
                    />
                  )}
                />
                {errors.roleCatalogId ? (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.roleCatalogId.message}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-doc-number">
                {getDocumentNumberLabel(docType)}
                {isPassportDoc || isEligibilityDoc ? " *" : ""}
              </Label>
              <Controller
                name="documentNumber"
                control={control}
                render={({ field }) => (
                  <Input
                    id="edit-doc-number"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder={
                      isPassportDoc
                        ? "e.g. A1234567"
                        : isEligibilityDoc
                          ? "Eligibility number"
                          : "Optional"
                    }
                  />
                )}
              />
              {errors.documentNumber ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.documentNumber.message}
                </p>
              ) : null}
            </div>

            {isEligibilityDoc ? (
              <div className="space-y-1.5">
                <Label htmlFor="edit-issued-at">Issued date *</Label>
                <Controller
                  name="issuedAt"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="edit-issued-at"
                      type="date"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.issuedAt ? (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.issuedAt.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="edit-expiry-date">
                {isPassportDoc ? "Passport expiry date" : "Expiry date"}
                {isPassportDoc || isEligibilityDoc ? " *" : ""}
              </Label>
              <Controller
                name="expiryDate"
                control={control}
                render={({ field }) => (
                  <Input
                    id="edit-expiry-date"
                    type="date"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.expiryDate ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.expiryDate.message}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
