import React, { useState } from "react";

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
  AlertCircle,
  CheckCircle,
  Check,
  Clock,
  X,
  RefreshCw,
  Plus,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DOCUMENT_TYPE } from "@/constants/document-types";
import { ResumeUploadRoleModal } from "@/components/molecules/ResumeUploadRoleModal";
import type { ResumeRoleSelection } from "@/components/molecules/ResumeUploadRoleModal";
import {
  getCandidateProfileCompletion,
  getDocumentRepositorySlots,
  getPassportDocument,
} from "../profileCompletion";
import { isPassportDocumentType } from "@/constants/document-types";
import { useGetDocumentsQuery, useUploadDocumentMutation, useGetWorkExperiencesQuery } from "../api";
import { useCreateDocumentMutation, useUpdateDocumentMutation } from "@/features/documents/api";
import { useUploadResumeMutation } from "@/services/uploadApi";
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
  { value: "passport", label: "Passport", category: "identity" },
  { value: "passport_copy", label: "Passport Copy", category: "identity" },
  { value: "passport_photo", label: "Passport Photo", category: "other" },
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
  { value: "degree", label: "Degree Certificate", category: "educational" },
  {
    value: "degree_certificate",
    label: "Degree Certificate",
    category: "educational",
  },
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
    value: "police_clearance",
    label: "Police Clearance",
    category: "verification",
  },
  {
    value: "reference_letter",
    label: "Reference Letter",
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
  { value: "photo", label: "Photograph", category: "other" },
  { value: "bank_details", label: "Bank Account Details", category: "other" },
  { value: "offer_letter", label: "Offer Letter", category: "other" },
  { value: "joining_letter", label: "Joining Letter", category: "other" },
  { value: "other", label: "Other Document", category: "other" },
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
}

function FileNameCell({ fileName }: { fileName: string }) {
  const { display, full, isTruncated } = truncateFileName(fileName, 60);

  if (!isTruncated) {
    return <p className="font-semibold text-slate-900">{display}</p>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="font-semibold text-slate-900 cursor-help">{display}</p>
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
}: DocumentUploadSectionProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadModalDocType, setUploadModalDocType] = useState<
    string | undefined
  >(undefined);
  const [isPDFViewerOpen, setIsPDFViewerOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ fileUrl: string; fileName: string } | null>(null);
  const [editPassportDoc, setEditPassportDoc] = useState<any | null>(null);
  const [isSavingPassportDetails, setIsSavingPassportDetails] = useState(false);
  const [showResumeUploadModal, setShowResumeUploadModal] = useState(false);
  const [selectedResumeFile, setSelectedResumeFile] = useState<File | null>(null);
  const [resumeDocName, setResumeDocName] = useState("");
  const [resumeDocNameMode, setResumeDocNameMode] = useState<"common" | "individual">("common");
  const [resumeRoleSelections, setResumeRoleSelections] = useState<ResumeRoleSelection[]>([
    { id: crypto.randomUUID() },
  ]);
  const [isResumeUploading, setIsResumeUploading] = useState(false);

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

  const { data: workExperiences } = useGetWorkExperiencesQuery(candidateId);

  const [uploadDocument] = useUploadDocumentMutation();
  const [uploadResume] = useUploadResumeMutation();
  const [createDocument] = useCreateDocumentMutation();
  const [updateDocument] = useUpdateDocumentMutation();

  const getStatusIcon = (status: string) => {
    const normalized = (status || "").toLowerCase();
    switch (normalized) {
      case "verified":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "rejected":
        return <X className="h-4 w-4 text-red-600" />;
      case "resubmission_required":
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      case "resubmitted":
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const normalized = (status || "").toLowerCase();
    switch (normalized) {
      case "verified":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Verified
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Pending
          </Badge>
        );
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "resubmission_required":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            Waiting for re-submission
          </Badge>
        );
      case "resubmitted":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Resubmitted
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

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

  const openUploadModal = (presetDocType?: string) => {
    if (presetDocType === DOCUMENT_TYPE.RESUME) {
      setShowResumeUploadModal(true);
      return;
    }
    setUploadModalDocType(presetDocType);
    setShowUploadModal(true);
  };

  React.useEffect(() => {
    if (!initialUploadDocType) return;
    setUploadModalDocType(initialUploadDocType);
    setShowUploadModal(true);
    onInitialUploadDocTypeHandled?.();
  }, [initialUploadDocType, onInitialUploadDocTypeHandled]);

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadModalDocType(undefined);
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
      toast.error("Failed to upload resume");
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
        expiryDate: meta.expiryDate
          ? new Date(meta.expiryDate).toISOString()
          : undefined,
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
      expiryDate: meta.expiryDate
        ? new Date(meta.expiryDate).toISOString()
        : undefined,
      notes: meta.notes,
      roleCatalogId: meta.roleCatalogId,
      workExperienceId: meta.workExperienceId,
    }).unwrap();
  };

  return (
    <div className="space-y-8">
      {/* ===== REQUIRED DOCUMENTS STATUS ===== */}
      <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <CardHeader className="border-b border-border bg-muted/40">
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
                className="rounded-md border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
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
                !slotPassportDoc?.documentNumber?.trim();

              return (
              <li
                key={slot.key}
                className={cn(
                  "flex h-full flex-col gap-3 rounded-xl border p-3 transition-colors",
                  slot.satisfied
                    ? passportNumberMissing
                      ? "border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-background to-background shadow-sm"
                      : "border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-background to-background shadow-sm"
                    : "border-border bg-muted/20"
                )}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-semibold text-foreground">{slot.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {slot.satisfied
                      ? passportNumberMissing
                        ? "Passport on file — number missing"
                        : slot.key === "passport" && slotPassportDoc?.documentNumber
                          ? "Passport on file with number recorded"
                          : "Document on file for this type"
                      : "Mandatory document missing"}
                  </p>
                  {slot.key === "passport" && slotPassportDoc?.documentNumber && (
                    <p className="text-xs font-medium text-foreground">
                      #{slotPassportDoc.documentNumber}
                      {slotPassportDoc.expiryDate
                        ? ` · Exp ${DateUtils.formatDate(slotPassportDoc.expiryDate)}`
                        : ""}
                    </p>
                  )}
                </div>
                <div className="mt-auto flex shrink-0 justify-end">
                  {slot.satisfied ? (
                    passportNumberMissing ? (
                      <div className="flex w-full flex-col gap-2">
                        <p className="text-[11px] text-amber-800">
                          Re-upload or edit to add passport number.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 w-fit max-w-full gap-2 rounded-full border-amber-200 bg-amber-50/60 px-2.5 text-[11px] font-bold tracking-wide text-amber-900 shadow-sm hover:bg-amber-100"
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
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-400/40 bg-gradient-to-b from-emerald-50 to-emerald-100/60 px-2.5 py-1.5 text-[11px] font-bold tracking-wide text-emerald-950 shadow-sm ring-1 ring-emerald-500/10"
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
                      className="h-7 w-fit max-w-full gap-2 rounded-full border-indigo-200 bg-indigo-50/60 px-2.5 text-[11px] font-bold tracking-wide text-indigo-800 shadow-sm hover:bg-indigo-100 hover:text-indigo-900"
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
  <Card className="overflow-hidden rounded-2xl border-0 bg-white/90 shadow-xl backdrop-blur-md">
    <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-gray-50">
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
            <div className="rounded-xl bg-gray-100 p-2">
              <FileText className="h-6 w-6 text-gray-700" />
            </div>
            Uploaded Documents
          </CardTitle>
          <CardDescription className="text-slate-600">
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
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/40 px-4 py-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search by file name, doc name, number..."
          className="sm:max-w-sm"
        />
        <Select value={selectedDocType} onValueChange={(value) => onDocTypeChange?.(value)}>
          <SelectTrigger className="sm:w-[220px]">
            <SelectValue placeholder="Filter by document type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All document types</SelectItem>
            {filterDocTypes.map((docType) => (
              <SelectItem key={docType} value={docType}>
                {DOCUMENT_TYPES.find((t) => t.value === docType)?.label || docType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600" />
        </div>
      ) : documents.length === 0 ? (
        /* Beautiful Empty State */
        <div className="py-20 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <div className="w-28 h-28 mx-auto bg-gradient-to-br from-gray-100 to-slate-100 rounded-full flex items-center justify-center shadow-inner">
              <FileText className="h-14 w-14 text-gray-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">No Documents Uploaded</h3>
              <p className="text-slate-600 mt-2">
                Start by uploading the candidate's resume, ID, certificates, or other required files.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70">
              <TableHead className="font-semibold text-slate-700">Document</TableHead>
              <TableHead className="font-semibold text-slate-700">Type</TableHead>
              <TableHead className="font-semibold text-slate-700">Status</TableHead>
              <TableHead className="font-semibold text-slate-700">Expiry Date</TableHead>
              <TableHead className="font-semibold text-slate-700">Uploaded</TableHead>
              <TableHead className="font-semibold text-slate-700">Activity</TableHead>
              <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc: any) => (
              <TableRow key={doc.id} className="hover:bg-indigo-50/30 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <FileNameCell fileName={doc.fileName} />
                      {doc.documentNumber && (
                        <p className="text-sm text-slate-600">#{doc.documentNumber}</p>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className="font-medium w-fit">
                      {DOCUMENT_TYPES.find((t) => t.value === doc.docType)?.label ||
                        doc.docType}
                    </Badge>
                    {(doc.docType === "resume" ||
                      doc.docType === "experience_letters") &&
                      doc.roleCatalog?.label && (
                      <span className="text-xs text-slate-500 font-medium px-1">
                        {doc.roleCatalog.label}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(doc.status)}
                    {getStatusBadge(doc.status)}
                  </div>
                </TableCell>

                <TableCell className="text-slate-700">
                  {doc.expiryDate ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
                      {DateUtils.formatDate(doc.expiryDate)}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="text-slate-700">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    {DateUtils.formatDateTime(doc.createdAt)}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    By: {getActorLabel(doc.uploadedByUser || doc.uploadedBy)}
                  </p>
                </TableCell>

                <TableCell className="text-slate-700">
                  <div className="text-sm capitalize">{doc.status?.replaceAll("_", " ") || "—"}</div>
                  <p className="mt-1 text-xs text-slate-500">
                    By: {getLatestDecisionActor(doc)}
                  </p>
                </TableCell>

                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {isPassportDocumentType(doc.docType) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditPassportDoc(doc)}
                        className="hover:bg-amber-100 hover:text-amber-800"
                        aria-label="Edit passport details"
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
                      className="hover:bg-indigo-100 hover:text-indigo-700"
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
                      className="hover:bg-green-100 hover:text-green-700"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
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
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/60 p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-600">
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
      existingPassportDocument={passportDocument}
      onClose={closeUploadModal}
      onUpload={async (file: File, meta: any) => {
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

          toast.success("Document uploaded successfully");
          setShowUploadModal(false);
          if (onRefresh) {
            onRefresh();
          } else {
            refetch();
          }
        } catch (error) {
          console.error("Upload error:", error);
          toast.error("Failed to upload document");
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
      setPreviewDoc({
        fileUrl: URL.createObjectURL(selectedResumeFile),
        fileName: selectedResumeFile.name,
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
            expiryDate: new Date(expiryDate).toISOString(),
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
      onClose={() => {
        setIsPDFViewerOpen(false);
        setPreviewDoc(null);
      }}
      showDownload={true}
      showZoomControls={true}
      showRotationControls={true}
      showFullscreenToggle={true}
    />
  )}

</div>
  );
}
