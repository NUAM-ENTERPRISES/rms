import React, { useCallback, useEffect, useState } from "react";

const CandidateUploadDocumentModal = React.lazy(
  () => import("../../recruiter-docs/components/CandidateUploadDocumentModal")
);
const PassportDocumentDetailsDialog = React.lazy(
  () =>
    import("../../recruiter-docs/components/PassportDocumentDetailsDialog").then(
      (m) => ({ default: m.PassportDocumentDetailsDialog })
    )
);
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileText,
  Download,
  Eye,
  Calendar,
  Check,
  Plus,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RefreshCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_HEADER_GRADIENT_GRAY } from "@/lib/page-shell-styles";
import { toast } from "sonner";
import { getUploadErrorMessage } from "@/lib/document-upload";
import {
  DOCUMENT_TYPE,
  DOCUMENT_TYPE_CONFIG,
} from "@/constants/document-types";
import { ResumeUploadRoleModal } from "@/components/molecules/ResumeUploadRoleModal";
import type { ResumeRoleSelection } from "@/components/molecules/ResumeUploadRoleModal";
import { ResumeReuploadModal } from "@/components/molecules/ResumeReuploadModal";
import { DeleteConfirmationDialog } from "@/components/molecules/DeleteConfirmationDialog";
import { EditCandidateDocumentDialog } from "./EditCandidateDocumentDialog";
import type { EditableCandidateDocument } from "./EditCandidateDocumentDialog";
import {
  getCandidateProfileCompletion,
  getDocumentRepositorySlots,
  getPassportDocument,
} from "../profileCompletion";
import { useGetDocumentsQuery, useUploadDocumentMutation, useGetWorkExperiencesQuery } from "../api";
import { useCreateDocumentMutation, useUpdateDocumentMutation, useDeleteDocumentMutation } from "@/features/documents/api";
import { useUploadResumeMutation } from "@/services/uploadApi";
import { useCan } from "@/hooks/useCan";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { DateUtils } from "@/shared/utils/date";
import { truncateFileName } from "@/lib/formatFileName";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Document type options based on backend constants
const DOCUMENT_TYPES = [
  { value: DOCUMENT_TYPE.PASSPORT, label: "Passport Copy", category: "identity" },
  { value: DOCUMENT_TYPE.PASSPORT_PHOTO, label: "Passport Photo", category: "other" },
  { value: "aadhaar", label: "Aadhaar Card", category: "identity" },
  { value: "pan_card", label: "PAN Card", category: "identity" },
  { value: "driving_license", label: "Driving License", category: "identity" },
  { value: "voter_id", label: "Voter ID", category: "identity" },
  {
    value: "professional_license",
    label: "Professional License",
    category: "professional",
  },
  {
    value: "nursing_license",
    label: "Nursing License",
    category: "professional",
  },
  {
    value: "medical_license",
    label: "Medical License",
    category: "professional",
  },
  {
    value: "registration_certificate",
    label: "Registration Certificate",
    category: "professional",
  },
  { value: DOCUMENT_TYPE.DEGREE, label: "Degree Certificate", category: "educational" },
  { value: "diploma", label: "Diploma Certificate", category: "educational" },
  { value: "certificate", label: "Certificate", category: "educational" },
  { value: "transcript", label: "Transcript", category: "educational" },
  { value: "marksheet", label: "Marksheet", category: "educational" },
  { value: "resume", label: "Resume", category: "employment" },
  { value: "cv", label: "Curriculum Vitae", category: "employment" },
  {
    value: DOCUMENT_TYPE.EXPERIENCE_LETTERS,
    label: "Experience Letter",
    category: "employment",
  },
  {
    value: "relieving_letter",
    label: "Relieving Letter",
    category: "employment",
  },
  { value: "salary_slip", label: "Salary Slip", category: "employment" },
  {
    value: "appointment_letter",
    label: "Appointment Letter",
    category: "employment",
  },
  {
    value: "background_check",
    label: "Background Check",
    category: "verification",
  },
  {
    value: DOCUMENT_TYPE.PCC,
    label: "Police Clearance (PCC)",
    category: "verification",
  },
  {
    value: DOCUMENT_TYPE.HRD_NORKA,
    label: "HRD / NORKA",
    category: "verification",
  },
  {
    value: "reference_letter",
    label: "Reference Letter",
    category: "verification",
  },
  {
    value: DOCUMENT_TYPE.DATAFLOW_REPORT,
    label: "Dataflow Report",
    category: "verification",
  },
  {
    value: DOCUMENT_TYPE.ELIGIBILITY_LETTER,
    label: "Eligibility Letter",
    category: "verification",
  },
  {
    value: "medical_certificate",
    label: "Medical Certificate",
    category: "medical",
  },
  {
    value: "medical_fitness",
    label: "Medical Fitness Report",
    category: "medical",
  },
  {
    value: "vaccination_certificate",
    label: "Vaccination Certificate",
    category: "medical",
  },
  {
    value: "covid_vaccination",
    label: "COVID-19 Vaccination",
    category: "medical",
  },
  {
    value: "medical_insurance",
    label: "Medical Insurance",
    category: "medical",
  },
  { value: DOCUMENT_TYPE.BANK_DETAILS, label: "Bank Account Details", category: "other" },
  { value: DOCUMENT_TYPE.OFFER_LETTER, label: "Offer Letter", category: "other" },
  { value: DOCUMENT_TYPE.JOINING_LETTER, label: "Joining Letter", category: "other" },
  { value: DOCUMENT_TYPE.OTHER, label: "Other Document", category: "other" },
];

interface DocumentUploadSectionProps {
  candidateId: string;
  /** Rows for the table (may be paginated). */
  data?: any[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  currentPage?: number;
  onPageChange?: (page: number) => void;
  isFetching?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  selectedDocType?: string;
  onDocTypeChange?: (value: string) => void;
  /** All documents used only for mandatory-type completion (omit to derive from `data` / local fetch). */
  completionSourceDocuments?: any[];
  isLoading?: boolean;
  onRefresh?: () => void;
  /** When set, opens the upload modal for this doc type (e.g. from overview passport link). */
  initialUploadDocType?: string | null;
  onInitialUploadDocTypeHandled?: () => void;
  /** Passport stored on the candidate record (e.g. AC create) before a passport doc exists. */
  candidatePassportNumber?: string | null;
  /** Eligibility number from candidate record for prefill on eligibility letter upload. */
  candidateEligibilityNumber?: string | null;
}

const DOCUMENT_NAME_MAX_LENGTH = 40;

function getDocTypeLabel(docType: string): string {
  return (
    DOCUMENT_TYPES.find((t) => t.value === docType)?.label ||
    DOCUMENT_TYPE_CONFIG[docType as keyof typeof DOCUMENT_TYPE_CONFIG]
      ?.displayName ||
    docType
  );
}

function FileNameCell({ fileName }: { fileName: string }) {
  const { display, full, isTruncated } = truncateFileName(
    fileName,
    DOCUMENT_NAME_MAX_LENGTH,
  );

  const label = (
    <p
      className="font-semibold text-foreground truncate max-w-[12rem] sm:max-w-[14rem] md:max-w-[16rem]"
      title={full}
    >
      {display}
    </p>
  );

  if (!isTruncated) {
    return label;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block min-w-0 max-w-[12rem] sm:max-w-[14rem] md:max-w-[16rem] cursor-help">
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-md break-all">
          <p className="text-xs">{full}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function DocumentUploadSection({
  candidateId,
  data: externalDocuments,
  pagination: externalPagination,
  currentPage,
  onPageChange,
  isFetching = false,
  search = "",
  onSearchChange,
  selectedDocType = "all",
  onDocTypeChange,
  completionSourceDocuments,
  isLoading: isExternalLoading,
  onRefresh,
  initialUploadDocType,
  onInitialUploadDocTypeHandled,
  candidatePassportNumber,
  candidateEligibilityNumber,
}: DocumentUploadSectionProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadModalDocType, setUploadModalDocType] = useState<
    string | undefined
  >(undefined);
  const [isPDFViewerOpen, setIsPDFViewerOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ fileUrl: string; fileName: string } | null>(null);
  const [editPassportDoc, setEditPassportDoc] = useState<any | null>(null);
  const [isSavingPassportDetails, setIsSavingPassportDetails] = useState(false);
  const [editDocument, setEditDocument] = useState<EditableCandidateDocument | null>(null);
  const [isSavingDocument, setIsSavingDocument] = useState(false);
  const [showResumeUploadModal, setShowResumeUploadModal] = useState(false);
  const [selectedResumeFile, setSelectedResumeFile] = useState<File | null>(null);
  const [resumeDocName, setResumeDocName] = useState("");
  const [resumeDocNameMode, setResumeDocNameMode] = useState<"common" | "individual">("common");
  const [resumeRoleSelections, setResumeRoleSelections] = useState<ResumeRoleSelection[]>([
    { id: crypto.randomUUID() },
  ]);
  const [isResumeUploading, setIsResumeUploading] = useState(false);
  const [docToDelete, setDocToDelete] = useState<any | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reuploadTarget, setReuploadTarget] = useState<any | null>(null);
  const [isResumeReuploadOpen, setIsResumeReuploadOpen] = useState(false);
  const [isReuploading, setIsReuploading] = useState(false);
  const reuploadInitialValues = React.useMemo(() => {
    if (!reuploadTarget) return undefined;
    return {
      docName: reuploadTarget.docName,
      documentNumber: reuploadTarget.documentNumber,
      issuedAt: reuploadTarget.issuedAt,
      expiryDate: reuploadTarget.expiryDate,
      notes: reuploadTarget.notes,
      roleCatalogId: reuploadTarget.roleCatalogId,
      roleLabel:
        reuploadTarget.roleCatalog?.label || reuploadTarget.roleCatalog?.name,
      departmentId: reuploadTarget.roleCatalog?.roleDepartmentId,
      workExperienceId: reuploadTarget.workExperienceId,
    };
  }, [reuploadTarget]);

  const closePreviewDoc = useCallback(() => {
    setPreviewDoc((current) => {
      if (current?.fileUrl.startsWith("blob:")) {
        URL.revokeObjectURL(current.fileUrl);
      }
      return null;
    });
    setIsPDFViewerOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (previewDoc?.fileUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewDoc.fileUrl);
      }
    };
  }, [previewDoc?.fileUrl]);

  // If external data is provided, use it. Otherwise fetch (for backward compatibility if needed, though we're refactoring)
  const {
    data: documentsData,
    isLoading: isLocalLoading,
    refetch,
  } = useGetDocumentsQuery(
    {
      candidateId,
      page: 1,
      limit: 10,
    },
    { skip: !!externalDocuments }
  );

  const documents = externalDocuments || documentsData?.data?.documents || [];
  const pagination = externalPagination || documentsData?.data?.pagination;
  const page = currentPage ?? pagination?.page ?? 1;
  const isLoading = isExternalLoading || isLocalLoading;

  const completionDocs =
    completionSourceDocuments ?? documents;
  const filterDocTypes = React.useMemo(
    () =>
      Array.from(
        new Set((completionDocs || []).map((d: any) => d?.docType).filter(Boolean)),
      ) as string[],
    [completionDocs],
  );

  const completion = getCandidateProfileCompletion(completionDocs);
  const repositorySlots = getDocumentRepositorySlots(completionDocs);
  const passportDocument = getPassportDocument(completionDocs);
  const eligibilityDocument = React.useMemo(
    () =>
      (completionDocs || [])
        .filter(
          (doc: any) =>
            doc?.docType === DOCUMENT_TYPE.ELIGIBILITY_LETTER && !doc?.isDeleted,
        )
        .sort(
          (a: any, b: any) =>
            new Date(b?.createdAt ?? 0).getTime() -
            new Date(a?.createdAt ?? 0).getTime(),
        )[0],
    [completionDocs],
  );
  const storedPassportNumber = candidatePassportNumber?.trim() || null;
  const passportDocNumber = passportDocument?.documentNumber?.trim() || null;
  const displayedPassportNumber = passportDocNumber || storedPassportNumber;

  const { data: workExperiences } = useGetWorkExperiencesQuery(candidateId);

  const [uploadDocument] = useUploadDocumentMutation();
  const [uploadResume] = useUploadResumeMutation();
  const [createDocument] = useCreateDocumentMutation();
  const [updateDocument] = useUpdateDocumentMutation();
  const [deleteDocument] = useDeleteDocumentMutation();
  const canWriteDocuments = useCan("write:documents");
  const canManageDocuments = useCan("manage:documents");

  const getActorLabel = (actor: any): string => {
    if (!actor) return "—";
    if (typeof actor === "string") return actor;
    if (typeof actor === "object") {
      return actor.name || actor.email || actor.id || "—";
    }
    return "—";
  };

  const getLatestDecisionActor = (doc: any): string => {
    const normalized = (doc?.status || "").toLowerCase();
    const latestVerification = doc?.verifications?.[0];
    if (normalized === "verified") {
      return getActorLabel(
        doc?.verifiedByUser ||
          doc?.verifiedBy ||
          latestVerification?.latestActionBy ||
          latestVerification?.latestActionByName,
      );
    }
    if (normalized === "rejected") {
      return getActorLabel(
        doc?.rejectedByUser ||
          doc?.rejectedBy ||
          latestVerification?.latestActionBy ||
          latestVerification?.latestActionByName,
      );
    }
    if (normalized === "resubmitted") {
      return getActorLabel(
        latestVerification?.latestActionBy ||
          latestVerification?.latestActionByName ||
          doc?.uploadedByUser ||
          doc?.uploadedBy,
      );
    }
    if (normalized === "resubmission_required") {
      return getActorLabel(
        latestVerification?.latestActionBy ||
          latestVerification?.latestActionByName ||
          latestVerification?.resubmissionRequestedBy,
      );
    }
    return "—";
  };

  const refreshDocuments = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      refetch();
    }
  };

  const getDocumentLabel = (doc: any): string =>
    (doc?.docName && String(doc.docName).trim()) ||
    doc?.fileName ||
    "this document";

  const isResumeLike = (docType?: string) =>
    docType === DOCUMENT_TYPE.RESUME || docType === DOCUMENT_TYPE.CV;

  const openUploadModal = (presetDocType?: string) => {
    setReuploadTarget(null);
    if (presetDocType === DOCUMENT_TYPE.RESUME) {
      setShowResumeUploadModal(true);
      return;
    }
    setUploadModalDocType(presetDocType);
    setShowUploadModal(true);
  };

  const openReupload = (doc: any) => {
    setReuploadTarget(doc);
    if (isResumeLike(doc?.docType)) {
      setIsResumeReuploadOpen(true);
      return;
    }
    setUploadModalDocType(doc?.docType);
    setShowUploadModal(true);
  };

  const openDeleteConfirm = (doc: any) => {
    setDocToDelete(doc);
    setIsDeleteConfirmOpen(true);
  };

  const openEditDocument = (doc: any) => {
    setEditDocument({
      id: doc.id,
      docType: doc.docType,
      docName: doc.docName,
      documentNumber: doc.documentNumber,
      issuedAt: doc.issuedAt,
      expiryDate: doc.expiryDate,
      roleCatalogId: doc.roleCatalogId,
      roleCatalog: doc.roleCatalog,
    });
  };

  const handleEditDocumentSave = async (values: {
    docType: string;
    docName?: string;
    documentNumber?: string;
    issuedAt?: string;
    expiryDate?: string;
    roleCatalogId?: string;
  }) => {
    if (!editDocument?.id) return;
    setIsSavingDocument(true);
    try {
      await updateDocument({
        id: editDocument.id,
        docType: values.docType,
        docName: values.docName,
        documentNumber: values.documentNumber,
        issuedAt: DateUtils.toApiDate(values.issuedAt),
        expiryDate: DateUtils.toApiDate(values.expiryDate),
        roleCatalogId: values.roleCatalogId,
      }).unwrap();
      toast.success("Document updated");
      setEditDocument(null);
      refreshDocuments();
    } catch (error: unknown) {
      toast.error(getUploadErrorMessage(error));
    } finally {
      setIsSavingDocument(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteDocument(docToDelete.id).unwrap();
      toast.success("Document removed");
      setIsDeleteConfirmOpen(false);
      setDocToDelete(null);
      refreshDocuments();
    } catch (error: unknown) {
      const message =
        error &&
        typeof error === "object" &&
        "data" in error &&
        error.data &&
        typeof error.data === "object" &&
        "message" in error.data &&
        typeof (error.data as { message?: unknown }).message === "string"
          ? (error.data as { message: string }).message
          : "Failed to delete document";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const supersedePreviousDocument = async (previousId?: string) => {
    if (!previousId) return;
    await deleteDocument(previousId).unwrap();
  };

  React.useEffect(() => {
    if (!initialUploadDocType) return;
    setReuploadTarget(null);
    setUploadModalDocType(initialUploadDocType);
    setShowUploadModal(true);
    onInitialUploadDocTypeHandled?.();
  }, [initialUploadDocType, onInitialUploadDocTypeHandled]);

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadModalDocType(undefined);
    setReuploadTarget(null);
  };

  const closeResumeReuploadModal = () => {
    if (isReuploading) return;
    setIsResumeReuploadOpen(false);
    setReuploadTarget(null);
  };

  const handleResumeReuploadSubmit = async (payload: {
    file: File;
    docName?: string;
    roleCatalogId?: string;
  }) => {
    if (!reuploadTarget) return;
    if (payload.file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }

    setIsReuploading(true);
    try {
      await uploadResume({
        candidateId,
        file: payload.file,
        roleCatalogId:
          payload.roleCatalogId || reuploadTarget?.roleCatalogId || undefined,
        docName: payload.docName || reuploadTarget?.docName || undefined,
      }).unwrap();
      await supersedePreviousDocument(reuploadTarget.id);
      toast.success("Resume reuploaded successfully");
      setIsResumeReuploadOpen(false);
      setReuploadTarget(null);
      refreshDocuments();
    } catch (error: unknown) {
      toast.error(getUploadErrorMessage(error));
    } finally {
      setIsReuploading(false);
    }
  };

  const closeResumeUploadModal = () => {
    setShowResumeUploadModal(false);
    setSelectedResumeFile(null);
    setResumeDocName("");
    setResumeDocNameMode("common");
    setResumeRoleSelections([{ id: crypto.randomUUID() }]);
  };

  const addResumeRoleSelection = () => {
    setResumeRoleSelections((prev) => [...prev, { id: crypto.randomUUID() }]);
  };

  const removeResumeRoleSelection = (id: string) => {
    setResumeRoleSelections((prev) =>
      prev.length === 1 ? prev : prev.filter((entry) => entry.id !== id),
    );
  };

  const handleResumeUpload = async () => {
    if (!selectedResumeFile) {
      toast.error("Please select a resume file");
      return;
    }

    const selectedRoles = Array.from(
      new Set(
        resumeRoleSelections
          .map((entry) => entry.roleCatalogId?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (!selectedRoles.length) {
      toast.error("Please select at least one department and role");
      return;
    }

    setIsResumeUploading(true);
    try {
      await Promise.all(
        selectedRoles.map((roleCatalogId) => {
          const selection = resumeRoleSelections.find(
            (entry) => entry.roleCatalogId === roleCatalogId,
          );
          const individualDocName = selection?.docName?.trim();
          return uploadResume({
            candidateId,
            file: selectedResumeFile,
            roleCatalogId,
            docName:
              resumeDocNameMode === "common"
                ? resumeDocName.trim() || undefined
                : individualDocName || undefined,
          }).unwrap();
        }),
      );

      toast.success("Resume uploaded successfully");
      closeResumeUploadModal();
      if (onRefresh) {
        onRefresh();
      } else {
        refetch();
      }
    } catch (error) {
      console.error("Resume upload error:", error);
      toast.error(getUploadErrorMessage(error));
    } finally {
      setIsResumeUploading(false);
    }
  };

  const persistUploadedDocument = async (
    uploadData: any,
    uploadedDocument: any,
    meta: {
      docType: string;
      docName?: string;
      documentNumber?: string;
      issuedAt?: string;
      expiryDate?: string;
      notes?: string;
      roleCatalogId?: string;
      workExperienceId?: string;
    }
  ) => {
    const desiredDocName = (meta.docName && meta.docName.trim()) || "";

    if (uploadedDocument?.id) {
      await updateDocument({
        id: uploadedDocument.id,
        docName: desiredDocName || undefined,
        documentNumber: meta.documentNumber,
        issuedAt: DateUtils.toApiDate(meta.issuedAt),
        expiryDate: DateUtils.toApiDate(meta.expiryDate),
        notes: meta.notes,
      }).unwrap();
      return;
    }

    await createDocument({
      candidateId,
      docType: meta.docType,
      docName: desiredDocName || undefined,
      fileName: uploadData.fileName,
      fileUrl: uploadData.fileUrl,
      fileSize: uploadData.fileSize,
      mimeType: uploadData.mimeType,
      documentNumber: meta.documentNumber,
      issuedAt: DateUtils.toApiDate(meta.issuedAt),
      expiryDate: DateUtils.toApiDate(meta.expiryDate),
      notes: meta.notes,
      roleCatalogId: meta.roleCatalogId,
      workExperienceId: meta.workExperienceId,
    }).unwrap();
  };

  return (
    <div className="space-y-8">
      {/* ===== REQUIRED DOCUMENTS STATUS ===== */}
      <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm dark:bg-card dark:shadow-none">
        <CardHeader className="border-b border-border bg-muted/40 dark:!bg-muted/20">
          <CardTitle className="text-lg font-bold tracking-tight text-foreground">
            Required Documents Status
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Upload the missing files below to complete the candidate profile.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-2 pt-3">
            <Badge
              variant="secondary"
              className="rounded-md px-3 py-1 text-xs font-semibold tabular-nums"
            >
              {completion.completedCount}/{completion.requiredCount} types present
            </Badge>
            {completion.typeMissingCount === 0 ? (
              <Badge
                variant="outline"
                className="rounded-md border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:!border-border dark:!bg-muted/30 dark:text-emerald-300"
              >
                All complete
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="rounded-md border-destructive/25 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive"
              >
                {completion.typeMissingCount} missing
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-3 sm:p-4">
          <ul
            className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"
            aria-label="Mandatory document types checklist"
          >
            {repositorySlots.map((slot) => {
              const slotPassportDoc =
                slot.key === "passport" ? passportDocument : undefined;
              const passportNumberMissing =
                slot.key === "passport" &&
                slot.satisfied &&
                !displayedPassportNumber;
              const passportNumberFromCandidateOnly =
                slot.key === "passport" &&
                !slot.satisfied &&
                Boolean(storedPassportNumber);

              return (
              <li
                key={slot.key}
                className={cn(
                  "flex h-full flex-col gap-3 rounded-xl border p-3 transition-colors",
                  slot.satisfied
                    ? passportNumberMissing
                      ? "border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-background to-background shadow-sm dark:!border-border dark:from-muted/30 dark:via-card dark:!to-card dark:shadow-none"
                      : "border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-background to-background shadow-sm dark:!border-border dark:from-muted/30 dark:via-card dark:!to-card dark:shadow-none"
                    : passportNumberFromCandidateOnly
                      ? "border-sky-200/70 bg-gradient-to-br from-sky-50/90 via-background to-background shadow-sm dark:!border-border dark:from-muted/30 dark:via-card dark:!to-card dark:shadow-none"
                      : "border-border bg-muted/20 dark:!bg-muted/15"
                )}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-semibold text-foreground">{slot.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {slot.satisfied
                      ? passportNumberMissing
                        ? "Passport on file — number missing"
                        : slot.key === "passport" && displayedPassportNumber
                          ? "Passport on file with number recorded"
                          : "Document on file for this type"
                      : passportNumberFromCandidateOnly
                        ? "Passport number on file — upload copy to complete"
                        : "Mandatory document missing"}
                  </p>
                  {slot.key === "passport" && displayedPassportNumber && (
                    <p className="text-xs font-medium text-foreground">
                      #{displayedPassportNumber}
                      {slotPassportDoc?.expiryDate
                        ? ` · Exp ${DateUtils.formatDate(slotPassportDoc.expiryDate)}`
                        : ""}
                    </p>
                  )}
                </div>
                <div className="mt-auto flex shrink-0 justify-end">
                  {slot.satisfied ? (
                    passportNumberMissing ? (
                      <div className="flex w-full flex-col gap-2">
                        <p className="text-[11px] text-amber-800 dark:text-amber-300">
                          Re-upload or edit to add passport number.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 w-fit max-w-full gap-2 rounded-full border-amber-200 bg-amber-50/60 px-2.5 text-[11px] font-bold tracking-wide text-amber-900 shadow-sm hover:bg-amber-100 dark:!border-border dark:!bg-muted/30 dark:text-amber-300 dark:hover:!bg-muted/40"
                          onClick={() => {
                            if (slotPassportDoc?.id) {
                              setEditPassportDoc(slotPassportDoc);
                            } else {
                              openUploadModal(slot.uploadDocType);
                            }
                          }}
                        >
                          Add passport number
                        </Button>
                      </div>
                    ) : (
                    <div
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-400/40 bg-gradient-to-b from-emerald-50 to-emerald-100/60 px-2.5 py-1.5 text-[11px] font-bold tracking-wide text-emerald-950 shadow-sm ring-1 ring-emerald-500/10 dark:!border-border dark:from-muted/30 dark:to-muted/20 dark:text-emerald-300 dark:ring-border"
                      role="status"
                      aria-label={`${slot.label}: uploaded`}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-primary-foreground shadow-inner"
                        aria-hidden
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                      <span className="uppercase tracking-wider">Uploaded</span>
                    </div>
                    )
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 w-fit max-w-full gap-2 rounded-full border-indigo-200 bg-indigo-50/60 px-2.5 text-[11px] font-bold tracking-wide text-indigo-800 shadow-sm hover:bg-indigo-100 hover:text-indigo-900 dark:!border-border dark:!bg-muted/30 dark:text-indigo-300 dark:hover:!bg-muted/40 dark:hover:text-indigo-200"
                      onClick={() => openUploadModal(slot.uploadDocType)}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-primary-foreground shadow-inner"
                        aria-hidden
                      >
                        <Upload className="h-3 w-3" />
                      </span>
                      <span className="truncate uppercase tracking-wider">Upload</span>
                    </Button>
                  )}
                </div>
              </li>
            );
            })}
          </ul>
        </CardContent>
      </Card>

  {/* ===== UPLOADED DOCUMENTS LIST ===== */}
  <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm dark:bg-card dark:shadow-none">
    <CardHeader className={cn("border-b border-border", CARD_HEADER_GRADIENT_GRAY)}>
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-3 text-xl font-bold text-foreground">
            <div className="rounded-xl bg-muted p-2 dark:!bg-muted/40">
              <FileText className="h-6 w-6 text-foreground" />
            </div>
            Uploaded Documents
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            All candidate documents • Click to view or download
          </CardDescription>
        </div>
        <div>
          <Button
            variant="default"
            size="sm"
            onClick={() => openUploadModal(undefined)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Upload New Document
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={() => setShowResumeUploadModal(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Resume
          </Button>
        </div>
      </div>
    </CardHeader>

    <CardContent className="p-0">
      <div className="flex flex-col gap-3 border-b border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center dark:!bg-muted/20">
        <Input
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search by file name, doc name, number..."
          className="border-border dark:!border-border dark:!bg-muted/15 sm:max-w-sm"
        />
        <Select value={selectedDocType} onValueChange={(value) => onDocTypeChange?.(value)}>
          <SelectTrigger className="border-border dark:!border-border dark:!bg-muted/15 sm:w-[220px]">
            <SelectValue placeholder="Filter by document type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All document types</SelectItem>
            {filterDocTypes.map((docType) => (
              <SelectItem key={docType} value={docType}>
                {getDocTypeLabel(docType)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-b-4 border-primary dark:border-primary-400" />
        </div>
      ) : documents.length === 0 ? (
        /* Beautiful Empty State */
        <div className="py-20 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-slate-100 shadow-inner dark:from-muted/40 dark:to-muted/30">
              <FileText className="h-14 w-14 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">No Documents Uploaded</h3>
              <p className="text-muted-foreground mt-2">
                Start by uploading the candidate's resume, ID, certificates, or other required files.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/70 dark:bg-muted/30">
              <TableHead className="min-w-0 max-w-[14rem] font-semibold text-foreground sm:max-w-[16rem] md:max-w-[18rem]">
                Document
              </TableHead>
              <TableHead className="font-semibold text-foreground">Type</TableHead>
              <TableHead className="font-semibold text-foreground">Issued Date</TableHead>
              <TableHead className="font-semibold text-foreground">Expiry Date</TableHead>
              <TableHead className="font-semibold text-foreground">Uploaded</TableHead>
              <TableHead className="font-semibold text-foreground">Activity</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc: any) => (
              <TableRow key={doc.id} className="transition-colors hover:bg-indigo-50/30 dark:hover:!bg-muted/30">
                <TableCell className="min-w-0 max-w-[14rem] sm:max-w-[16rem] md:max-w-[18rem]">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="shrink-0 rounded-lg bg-red-100 p-2 dark:!bg-muted/40">
                      <FileText className="h-5 w-5 text-red-600 dark:text-red-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <FileNameCell
                        fileName={
                          (doc.docName && String(doc.docName).trim()) ||
                          doc.fileName ||
                          "Untitled"
                        }
                      />
                      {doc.documentNumber && (
                        <p className="truncate text-sm text-muted-foreground">
                          {doc.docType === DOCUMENT_TYPE.ELIGIBILITY_LETTER
                            ? `Eligibility #${doc.documentNumber}`
                            : `#${doc.documentNumber}`}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className="font-medium w-fit">
                      {getDocTypeLabel(doc.docType)}
                    </Badge>
                    {(doc.docType === "resume" ||
                      doc.docType === "experience_letters") &&
                      doc.roleCatalog?.label && (
                      <span className="text-xs text-muted-foreground font-medium px-1">
                        {doc.roleCatalog.label}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-foreground">
                  {doc.issuedAt ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {DateUtils.formatDate(doc.issuedAt)}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="text-foreground">
                  {doc.expiryDate ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {DateUtils.formatDate(doc.expiryDate)}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="text-foreground">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {DateUtils.formatDateTime(doc.createdAt)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    By: {getActorLabel(doc.uploadedByUser || doc.uploadedBy)}
                  </p>
                </TableCell>

                <TableCell className="text-foreground">
                  <div className="text-sm capitalize">{doc.status?.replaceAll("_", " ") || "—"}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    By: {getLatestDecisionActor(doc)}
                  </p>
                </TableCell>

                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {canWriteDocuments && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDocument(doc)}
                        className="hover:bg-amber-100 hover:text-amber-800 dark:hover:!bg-muted/40 dark:hover:text-amber-300"
                        aria-label={`Edit ${getDocumentLabel(doc)}`}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPreviewDoc({ fileUrl: doc.fileUrl, fileName: doc.fileName });
                        if ((doc.mimeType || "").startsWith("application/pdf")) {
                          setIsPDFViewerOpen(true);
                        } else {
                          window.open(doc.fileUrl, "_blank");
                        }
                      }}
                      className="hover:bg-indigo-100 hover:text-indigo-700 dark:hover:!bg-muted/40 dark:hover:text-indigo-300"
                      aria-label={`View ${getDocumentLabel(doc)}`}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const link = window.document.createElement("a");
                        link.href = doc.fileUrl;
                        link.download = doc.fileName;
                        link.rel = "noopener";
                        window.document.body.appendChild(link);
                        link.click();
                        window.document.body.removeChild(link);
                      }}
                      className="hover:bg-green-100 hover:text-green-700 dark:hover:!bg-muted/40 dark:hover:text-green-300"
                      aria-label={`Download ${getDocumentLabel(doc)}`}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canWriteDocuments && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReupload(doc)}
                        className="hover:bg-sky-100 hover:text-sky-800 dark:hover:!bg-muted/40 dark:hover:text-sky-300"
                        aria-label={`Reupload ${getDocumentLabel(doc)}`}
                        title="Reupload"
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    )}
                    {canManageDocuments && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteConfirm(doc)}
                        className="hover:bg-red-100 hover:text-red-700 dark:hover:!bg-muted/40 dark:hover:text-red-300"
                        aria-label={`Delete ${getDocumentLabel(doc)}`}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>

  {pagination && pagination.totalPages > 1 && (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm dark:bg-card dark:shadow-none">
      <p className="text-sm font-semibold text-muted-foreground">
        Page {page} of {pagination.totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || isFetching}
          onClick={() => onPageChange?.(Math.max(1, page - 1))}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pagination.totalPages || isFetching}
          onClick={() => onPageChange?.(Math.min(pagination.totalPages, page + 1))}
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )}

  {/* Lazy-loaded Upload Modal */}
  <React.Suspense fallback={null}>
    <CandidateUploadDocumentModal
      isOpen={showUploadModal}
      initialDocType={uploadModalDocType}
      initialWorkExperienceId={reuploadTarget?.workExperienceId}
      existingPassportDocument={passportDocument}
      initialEligibilityNumber={candidateEligibilityNumber}
      existingEligibilityDocument={eligibilityDocument}
      initialValues={reuploadInitialValues}
      mode={reuploadTarget ? "reupload" : "upload"}
      lockDocType={Boolean(reuploadTarget)}
      isUploading={isReuploading}
      onClose={closeUploadModal}
      onUpload={async (file: File, meta: any) => {
        const previousId = reuploadTarget?.id as string | undefined;
        try {
          if (meta?.docType === DOCUMENT_TYPE.RESUME) {
            setShowUploadModal(false);
            setSelectedResumeFile(file);
            setResumeDocName(meta?.docName || "");
            setResumeDocNameMode("common");
            setResumeRoleSelections([{ id: crypto.randomUUID() }]);
            setShowResumeUploadModal(true);
            return;
          }

          setIsReuploading(Boolean(previousId));
          const formData = new FormData();
          formData.append("file", file);
          formData.append("docType", meta.docType);

          const response = await uploadDocument({ candidateId, formData }).unwrap();
          const uploadData: any = response.data;
          const uploadedDocument =
            uploadData?.document && uploadData.document.id
              ? uploadData.document
              : uploadData?.id
                ? uploadData
                : null;

          await persistUploadedDocument(uploadData, uploadedDocument, meta);
          if (previousId) {
            try {
              await supersedePreviousDocument(previousId);
            } catch (error) {
              toast.error(
                getUploadErrorMessage(error) ||
                  "New file uploaded, but the previous document could not be removed.",
              );
              setShowUploadModal(false);
              setReuploadTarget(null);
              refreshDocuments();
              return;
            }
          }

          toast.success(
            previousId
              ? "Document reuploaded successfully"
              : "Document uploaded successfully",
          );
          setShowUploadModal(false);
          setReuploadTarget(null);
          refreshDocuments();
        } catch (error) {
          console.error("Upload error:", error);
          toast.error(getUploadErrorMessage(error));
        } finally {
          setIsReuploading(false);
        }
      }}
      workExperiences={workExperiences}
    />
  </React.Suspense>

  <ResumeUploadRoleModal
    mode="upload"
    isOpen={showResumeUploadModal}
    selectedFile={selectedResumeFile}
    docName={resumeDocName}
    docNameMode={resumeDocNameMode}
    roleSelections={resumeRoleSelections}
    isUploading={isResumeUploading}
    onClose={closeResumeUploadModal}
    onFileSelect={(event) => {
      const file = event.target.files?.[0];
      if (file && file.type !== "application/pdf") {
        toast.error("Please select a PDF file");
        return;
      }
      setSelectedResumeFile(file || null);
    }}
    onPreview={() => {
      if (!selectedResumeFile) return;
      setPreviewDoc((current) => {
        if (current?.fileUrl.startsWith("blob:")) {
          URL.revokeObjectURL(current.fileUrl);
        }
        return {
          fileUrl: URL.createObjectURL(selectedResumeFile),
          fileName: selectedResumeFile.name,
        };
      });
      setIsPDFViewerOpen(true);
    }}
    onAddRole={addResumeRoleSelection}
    onRemoveRole={removeResumeRoleSelection}
    onRoleSelectionsChange={setResumeRoleSelections}
    onDocNameModeChange={setResumeDocNameMode}
    onDocNameChange={setResumeDocName}
    onUpload={handleResumeUpload}
  />

  <ResumeReuploadModal
    isOpen={isResumeReuploadOpen}
    isSubmitting={isReuploading}
    initialDocName={reuploadTarget?.docName}
    initialRoleCatalogId={reuploadTarget?.roleCatalogId}
    initialDepartmentId={reuploadTarget?.roleCatalog?.roleDepartmentId}
    initialRoleLabel={
      reuploadTarget?.roleCatalog?.label || reuploadTarget?.roleCatalog?.name
    }
    onClose={closeResumeReuploadModal}
    onSubmit={handleResumeReuploadSubmit}
  />

  <DeleteConfirmationDialog
    isOpen={isDeleteConfirmOpen}
    onClose={() => {
      if (!isDeleting) {
        setIsDeleteConfirmOpen(false);
        setDocToDelete(null);
      }
    }}
    onConfirm={handleDeleteDocument}
    title={getDocumentLabel(docToDelete)}
    itemType="document"
    description="Are you sure you want to remove this document? It will be soft-deleted and kept in history."
    isLoading={isDeleting}
  />

  <EditCandidateDocumentDialog
    isOpen={Boolean(editDocument)}
    document={editDocument}
    isSaving={isSavingDocument}
    onClose={() => {
      if (!isSavingDocument) setEditDocument(null);
    }}
    onSave={handleEditDocumentSave}
  />

  <React.Suspense fallback={null}>
    <PassportDocumentDetailsDialog
      isOpen={Boolean(editPassportDoc)}
      documentId={editPassportDoc?.id || ""}
      initialDocumentNumber={editPassportDoc?.documentNumber}
      initialExpiryDate={editPassportDoc?.expiryDate}
      isSaving={isSavingPassportDetails}
      onClose={() => setEditPassportDoc(null)}
      onSave={async ({ documentNumber, expiryDate }) => {
        if (!editPassportDoc?.id) return;
        try {
          setIsSavingPassportDetails(true);
          await updateDocument({
            id: editPassportDoc.id,
            documentNumber,
            expiryDate: DateUtils.toApiDate(expiryDate),
          }).unwrap();
          toast.success("Passport details updated");
          setEditPassportDoc(null);
          if (onRefresh) {
            onRefresh();
          } else {
            refetch();
          }
        } finally {
          setIsSavingPassportDetails(false);
        }
      }}
    />
  </React.Suspense>

  {/* PDF Viewer for existing documents */}
  {previewDoc && (
    <PDFViewer
      fileUrl={previewDoc.fileUrl}
      fileName={previewDoc.fileName}
      isOpen={isPDFViewerOpen}
      onClose={closePreviewDoc}
      showDownload={true}
      showZoomControls={true}
      showRotationControls={true}
      showFullscreenToggle={true}
    />
  )}

</div>
  );
}
