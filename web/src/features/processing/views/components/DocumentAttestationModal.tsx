import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, FileCheck, Upload, CheckCircle2, RefreshCw, File, Eye, XCircle, Clock, Truck, Download } from "lucide-react";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import React, { useState, useMemo } from "react";
import { format } from "date-fns";
const UploadDocumentModal = React.lazy(() => import("../../components/UploadDocumentModal"));
const VerifyProcessingDocumentModal = React.lazy(() => import("../../components/VerifyProcessingDocumentModal"));
const CompleteProcessingStepModal = React.lazy(() => import("../../components/CompleteProcessingStepModal"));
import { ProcessingStepActionButtons } from "../../components/ProcessingStepActionButtons";
import { useGetDocumentAttestationRequirementsQuery, useCompleteStepMutation, useReuploadProcessingDocumentMutation, useVerifyProcessingDocumentMutation } from "@/services/processingApi";
import { useUploadDocumentMutation } from "@/features/candidates/api";
import { useCreateDocumentMutation } from "@/services/documentsApi";
import { useReuseDocumentMutation } from "@/features/documents/api";
import {
  useUploadCourierAttestationMutation,
  useUploadCourierAttestationMergedMutation,
} from "@/features/courier-shipments/api";
import { useCan } from "@/hooks/useCan";
import { toast } from "sonner";
import VerifyAllDocumentsControl from "../../components/VerifyAllDocumentsControl";
import { ProcessingActionLockBanner } from "../../components/ProcessingActionLockBanner";
import { LockedProcessingActionButton } from "../../components/LockedProcessingActionButton";
import { useProcessingActionLock } from "@/features/processing/context/ProcessingActionLockContext";
import { getUploadErrorMessage } from "@/lib/document-upload";

interface CourierAttestationDocumentRow {
  id: string;
  baseDocType: string;
  attestedDocType: string;
  document: {
    id: string;
    docType: string;
    fileName: string;
    fileUrl: string;
    mimeType?: string | null;
    status?: string;
    createdAt?: string;
  } | null;
  shipmentId: string;
  legNumber: number | null;
  shipmentStatus?: string | null;
  uploadedAt: string;
  uploadedBy?: { id: string; name?: string | null; email?: string | null } | null;
  remarks?: string | null;
  isMerged?: boolean;
}

interface MergedCourierAttestationGroup {
  documentId: string;
  document: {
    id: string;
    docType?: string;
    fileName: string;
    fileUrl: string;
    mimeType?: string | null;
    status?: string;
    createdAt?: string;
  } | null;
  shipmentId: string;
  legNumber: number | null;
  uploadedAt: string;
  uploadedBy?: { id: string; name?: string | null; email?: string | null } | null;
  remarks?: string | null;
  coveredDocuments: Array<{
    id: string;
    baseDocType: string;
    attestedDocType: string;
    label?: string;
  }>;
}

type CourierReuploadContext = {
  shipmentId: string;
  projectId: string;
  isMerged: boolean;
  attestedDocType?: string;
  mergedAttestedDocTypes?: string[];
  docLabel: string;
};

interface DocumentAttestationModalProps {
  isOpen: boolean;
  onClose: () => void;
  processingId: string;
  candidateProjectMapId?: string;
  onComplete?: () => void | Promise<void>;
}


export function DocumentAttestationModal({ isOpen, onClose, processingId, candidateProjectMapId, onComplete }: DocumentAttestationModalProps) {
  const { isLocked } = useProcessingActionLock();
  const canWriteProcessing = useCan("write:processing");
  const { data, isLoading, error, refetch } = useGetDocumentAttestationRequirementsQuery(processingId, {
    skip: !isOpen || !processingId,
  });

  const [uploadDocument, { isLoading: isUploading }] = useUploadDocumentMutation();
  const [createDocument] = useCreateDocumentMutation();
  const [reuseDocument, { isLoading: isReusing }] = useReuseDocumentMutation();
  const [completeStep, { isLoading: isCompletingStep }] = useCompleteStepMutation();
  const [reuploadProcessingDocument, { isLoading: isReuploadingProcessing }] = useReuploadProcessingDocumentMutation();
  const [verifyProcessingDocument, { isLoading: isVerifying }] = useVerifyProcessingDocumentMutation();
  const [uploadCourierAttestation, { isLoading: isUploadingCourier }] =
    useUploadCourierAttestationMutation();
  const [uploadCourierAttestationMerged, { isLoading: isUploadingCourierMerged }] =
    useUploadCourierAttestationMergedMutation();

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const [selectedDocLabel, setSelectedDocLabel] = useState<string>("");
  const [selectedRoleCatalog, setSelectedRoleCatalog] = useState<string | undefined>(undefined);
  const [selectedRoleLabel, setSelectedRoleLabel] = useState<string | undefined>(undefined);

  // Verification modal state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyDocId, setVerifyDocId] = useState<string>("");
  const [verifyDocLabel, setVerifyDocLabel] = useState<string>("");

  // Confirmation modal state
  const [completeModalOpen, setCompleteModalOpen] = useState(false);

  // Reupload context (when replacing an existing document)
  const [replaceOldDocumentId, setReplaceOldDocumentId] = useState<string | null>(null);
  const [replaceCandidateProjectMapId, setReplaceCandidateProjectMapId] = useState<string | null>(null);
  const [courierReuploadContext, setCourierReuploadContext] =
    useState<CourierReuploadContext | null>(null);
  const [uploadPdfOnly, setUploadPdfOnly] = useState(false);

  const activeStep = data?.step;
  const candidate = data?.processingCandidate;

  const requiredDocuments: any[] = data?.requiredDocuments || [];
  const uploads: any[] = data?.uploads || [];

  // Completion flag from API
  const isAttestationCompleted = data?.isDocumentAttestationCompleted ?? false;

  // Whether this specific step has been cancelled
  const isStepCancelled = activeStep?.status === 'cancelled';

  const uploadsByDocType = useMemo(() => {
    const map: Record<string, any[]> = {};
    uploads.forEach((u: any) => {
      map[u.docType] = map[u.docType] || [];
      map[u.docType].push(u);
    });
    return map;
  }, [uploads]);

  // Candidate-level documents and processing-level documents from API
  const candidateDocs = data?.candidateDocuments || [];
  const processingDocs = data?.processing_documents || [];
  const courierAttestationDocuments: CourierAttestationDocumentRow[] =
    data?.courierAttestationDocuments || [];
  const individualCourierAttestationDocuments: CourierAttestationDocumentRow[] =
    data?.individualCourierAttestationDocuments ||
    courierAttestationDocuments.filter((row) => !row.isMerged);

  const candidateDocsByDocType = useMemo(() => {
    const map: Record<string, any[]> = {};
    candidateDocs.forEach((d: any) => {
      map[d.docType] = map[d.docType] || [];
      map[d.docType].push(d);
    });

    // Ensure newest document is at index 0
    Object.keys(map).forEach((type) => {
      map[type].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });

    return map;
  }, [candidateDocs]);

  const processingDocsByDocType = useMemo(() => {
    const map: Record<string, any[]> = {};
    processingDocs.forEach((d: any) => {
      // processing_documents from API can be nested. Normalize so we can group by docType reliably.
      const doc = d.document || d.processingDocument?.document || d;
      const matchedRequirementDocType =
        d.matchedRequirementDocType ||
        doc?.docType ||
        d.docType ||
        d.processingDocument?.docType;
      const docType = matchedRequirementDocType;
      const status = d.processingDocument?.status || d.processingDocument?.processingStatus || doc?.status || d.status;
      const fileName = d.document?.fileName || doc?.fileName;
      const fileUrl = d.document?.fileUrl || doc?.fileUrl;
      const mimeType = d.document?.mimeType || doc?.mimeType;
      const id = d.document?.id || d.processingDocument?.id || d.id;
      const createdAt = d.createdAt || doc?.createdAt;

      if (!docType) return; // skip malformed entries

      const normalized = { ...d, docType, status, fileName, fileUrl, mimeType, id, createdAt };

      map[docType] = map[docType] || [];
      map[docType].push(normalized);
    });

    // Ensure newest document is at index 0
    Object.keys(map).forEach((type) => {
      map[type].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    });

    return map;
  }, [processingDocs]);

  const courierDocsByBaseType = useMemo(() => {
    const map: Record<string, CourierAttestationDocumentRow[]> = {};
    individualCourierAttestationDocuments.forEach((row) => {
      if (!row.baseDocType || !row.document?.id) return;
      map[row.baseDocType] = map[row.baseDocType] || [];
      map[row.baseDocType].push(row);
    });
    Object.keys(map).forEach((type) => {
      map[type].sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      );
    });
    return map;
  }, [individualCourierAttestationDocuments]);

  const mergedCourierGroups = useMemo((): MergedCourierAttestationGroup[] => {
    if (data?.mergedCourierAttestationGroups?.length) {
      return data.mergedCourierAttestationGroups;
    }
    const groupsByDocumentId = new Map<string, CourierAttestationDocumentRow[]>();
    courierAttestationDocuments
      .filter((row) => row.isMerged && row.document?.id)
      .forEach((row) => {
        const existing = groupsByDocumentId.get(row.document!.id) ?? [];
        existing.push(row);
        groupsByDocumentId.set(row.document!.id, existing);
      });
    return Array.from(groupsByDocumentId.values()).map((rows) => {
      const first = rows[0]!;
      return {
        documentId: first.document!.id,
        document: first.document,
        shipmentId: first.shipmentId,
        legNumber: first.legNumber,
        uploadedAt: first.uploadedAt,
        uploadedBy: first.uploadedBy,
        remarks: first.remarks,
        coveredDocuments: rows.map((row) => ({
          id: row.id,
          baseDocType: row.baseDocType,
          attestedDocType: row.attestedDocType,
        })),
      };
    });
  }, [data?.mergedCourierAttestationGroups, courierAttestationDocuments]);

  // Individual courier uploads map onto their requirement rows; merged uploads stay
  // in the merged section only and do not auto-fill per-file rows.
  const effectiveCandidateDocsByDocType = useMemo(() => {
    const map: Record<string, any[]> = { ...candidateDocsByDocType };
    Object.entries(courierDocsByBaseType).forEach(([baseType, rows]) => {
      const courierAsCandidate = rows
        .filter((row) => row.document?.id)
        .map((row) => ({
          id: row.document!.id,
          docType: baseType,
          fileName: row.document!.fileName,
          fileUrl: row.document!.fileUrl,
          mimeType: row.document!.mimeType,
          status: row.document!.status || "pending",
          createdAt: row.uploadedAt || row.document!.createdAt,
          source: "courier_leg" as const,
          legNumber: row.legNumber,
          isMerged: false,
          uploadedBy: row.uploadedBy,
          remarks: row.remarks,
          courierUploadId: row.id,
        }));
      if (courierAsCandidate.length === 0) return;
      map[baseType] = [
        ...courierAsCandidate,
        ...(map[baseType] || []).filter((d) => d?.source !== "courier_leg"),
      ];
    });
    return map;
  }, [candidateDocsByDocType, courierDocsByBaseType]);

  const requiredDocTypeSet = useMemo(
    () => new Set(requiredDocuments.map((r) => r.docType)),
    [requiredDocuments],
  );

  const extraCourierDocs = useMemo(
    () =>
      individualCourierAttestationDocuments.filter(
        (row) =>
          row.document?.id &&
          row.baseDocType &&
          !requiredDocTypeSet.has(row.baseDocType),
      ),
    [individualCourierAttestationDocuments, requiredDocTypeSet],
  );

  // Viewer state for inline preview (PDF / images)
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerFileName, setViewerFileName] = useState<string>("");
  const [viewerMimeType, setViewerMimeType] = useState<string | undefined>(undefined);

  const openViewerForDoc = (doc: {
    fileUrl?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
  } | null | undefined) => {
    const url = doc?.fileUrl;
    if (!url) {
      toast("No document available to view");
      return;
    }

    let mime = doc?.mimeType || undefined;
    const fileName = doc?.fileName || "Document";

    const tryInferFromUrl = (u: string | undefined) => {
      if (!u) return null;
      const clean = u.split("?")[0].toLowerCase();
      if (/\.pdf$/.test(clean)) return "application/pdf";
      if (/\.(jpe?g|png|gif|bmp|webp|svg)$/.test(clean)) return "image/*";
      return null;
    };

    if (!mime) {
      mime = tryInferFromUrl(url) || tryInferFromUrl(fileName) || undefined;
    }

    setViewerMimeType(mime || undefined);
    setViewerFileName(fileName);
    setViewerUrl(url);
    setViewerOpen(true);
  };

  const handleViewDocument = (docType: string) => {
    const pdocs = processingDocsByDocType[docType] || [];
    const courier = courierDocsByBaseType[docType]?.[0];
    const cdocs = effectiveCandidateDocsByDocType[docType] || [];
    const pdoc = pdocs[0];
    const cdoc = cdocs[0];
    openViewerForDoc(
      pdoc
        ? { fileUrl: pdoc.fileUrl, fileName: pdoc.fileName, mimeType: pdoc.mimeType }
        : courier?.document
          ? {
              fileUrl: courier.document.fileUrl,
              fileName: courier.document.fileName,
              mimeType: courier.document.mimeType,
            }
          : cdoc
            ? {
                fileUrl: cdoc.fileUrl,
                fileName: cdoc.fileName,
                mimeType: cdoc.mimeType,
              }
            : null,
    );
  };

  const handleVerifyClick = (docType: string, label?: string, roleCatalog?: string, roleLabel?: string) => {
    const pdocs = processingDocsByDocType[docType] || [];
    if (pdocs.length > 0) {
      toast.success("Document already in processing");
      return;
    }

    const cdocs = effectiveCandidateDocsByDocType[docType] || [];
    const cdoc = cdocs[0];

    if (!cdoc) {
      toast("No candidate document found. Please upload a document to verify.");
      setSelectedDocType(docType);
      setSelectedDocLabel(label || "");
      setSelectedRoleCatalog(roleCatalog);
      setSelectedRoleLabel(roleLabel);
      setCourierReuploadContext(null);
      setUploadPdfOnly(false);
      setUploadModalOpen(true);
      return;
    }

    setVerifyDocId(cdoc.id);
    setVerifyDocLabel(label || "Document");
    setVerifyModalOpen(true);
  };

  const handleConfirmVerify = async (notes: string) => {
    if (!activeStep?.id || !verifyDocId) return;

    try {
      await verifyProcessingDocument({
        documentId: verifyDocId,
        processingStepId: activeStep.id,
        notes: notes || undefined,
      }).unwrap();

      toast.success("Document verified successfully");
      setVerifyModalOpen(false);
      await refetch();
    } catch (err: any) {
      console.error("Verification failed", err);
      toast.error(err?.data?.message || "Failed to verify document");
    }
  };

  const resetUploadContext = () => {
    setReplaceOldDocumentId(null);
    setReplaceCandidateProjectMapId(null);
    setCourierReuploadContext(null);
    setUploadPdfOnly(false);
  };

  const handleUploadClick = (docType: string, docLabel: string, roleCatalog?: string, roleLabel?: string, oldDocumentId?: string, candidateProjectMapId?: string) => {
    setSelectedDocType(docType);
    setSelectedDocLabel(docLabel);
    setSelectedRoleCatalog(roleCatalog);
    setSelectedRoleLabel(roleLabel);
    setReplaceOldDocumentId(oldDocumentId ?? null);
    setReplaceCandidateProjectMapId(candidateProjectMapId ?? null);
    setCourierReuploadContext(null);
    setUploadPdfOnly(false);
    setUploadModalOpen(true);
  };

  const handleCourierReuploadClick = (context: CourierReuploadContext) => {
    setSelectedDocType(context.attestedDocType || context.docLabel);
    setSelectedDocLabel(context.docLabel);
    setSelectedRoleCatalog(undefined);
    setSelectedRoleLabel(undefined);
    setReplaceOldDocumentId(null);
    setReplaceCandidateProjectMapId(null);
    setCourierReuploadContext(context);
    setUploadPdfOnly(true);
    setUploadModalOpen(true);
  };

  const handleUploadFile = async (file: File) => {
    if (courierReuploadContext) {
      try {
        if (courierReuploadContext.isMerged) {
          const docTypes = courierReuploadContext.mergedAttestedDocTypes || [];
          if (docTypes.length < 2) {
            toast.error("Merged re-upload requires at least two document types");
            return;
          }
          const resp = await uploadCourierAttestationMerged({
            id: courierReuploadContext.shipmentId,
            projectId: courierReuploadContext.projectId,
            docTypes,
            file,
          }).unwrap();
          toast.success(resp?.message || "Merged attested document replaced");
        } else {
          if (!courierReuploadContext.attestedDocType) {
            toast.error("Missing attested document type for courier re-upload");
            return;
          }
          const resp = await uploadCourierAttestation({
            id: courierReuploadContext.shipmentId,
            projectId: courierReuploadContext.projectId,
            docType: courierReuploadContext.attestedDocType,
            file,
          }).unwrap();
          toast.success(resp?.message || "Attested document replaced");
        }
      } catch (err: any) {
        console.error("Courier attestation re-upload failed", err);
        toast.error(err?.data?.message || err?.error || "Failed to replace courier attested document");
      } finally {
        resetUploadContext();
        setUploadModalOpen(false);
        await refetch();
      }
      return;
    }

    if (!candidate?.candidate?.id) {
      toast.error("Missing candidate id");
      return;
    }

    console.log("🔍 Upload Debug:", {
      selectedRoleCatalog,
      replaceOldDocumentId,
      replaceCandidateProjectMapId,
      candidateRoleId: candidate?.role?.roleCatalog?.id,
      candidateRole: candidate?.role,
    });

    try {
      // Build FormData to send as multipart/form-data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", selectedDocType);
      if (selectedRoleCatalog) {
        formData.append("roleCatalogId", selectedRoleCatalog);
        console.log("✅ Added roleCatalogId to FormData:", selectedRoleCatalog);
      } else {
        console.warn("⚠️ No roleCatalogId to add to FormData");
      }

      const uploadResp = await uploadDocument({ candidateId: candidate.candidate.id, formData }).unwrap();
      const uploadData = uploadResp.data;

      // If this is a re-upload (replace) operation, call processing reupload endpoint
      if (replaceOldDocumentId) {
        if (!replaceCandidateProjectMapId) {
          toast.error("Missing nomination id (candidateProjectMapId) for re-upload");
          return;
        }

        try {
          const payload: any = {
            oldDocumentId: replaceOldDocumentId,
            candidateProjectMapId: replaceCandidateProjectMapId,
            fileName: uploadData?.fileName || file.name,
            fileUrl: uploadData?.fileUrl || "",
            fileSize: uploadData?.fileSize || file.size,
            mimeType: uploadData?.mimeType || file.type || undefined,
            ...(selectedRoleCatalog && { roleCatalogId: selectedRoleCatalog }),
            ...(selectedDocType && { docType: selectedDocType }),
          };

          const resp = await reuploadProcessingDocument(payload).unwrap();
          console.log("🔁 Reupload processing response", resp);
          toast.success(resp?.message || "File re-uploaded and sent for processing");
        } catch (reErr: any) {
          console.error("Processing reupload failed", reErr);
          toast.error(reErr?.data?.message || reErr?.error || "Failed to reupload document for processing");
        } finally {
          // clear reupload context
          resetUploadContext();
          setUploadModalOpen(false);
          await refetch();
        }

        return;
      }

      // Normal create document flow
      console.log("📤 Creating document with roleCatalogId:", selectedRoleCatalog);
      const createResp = await createDocument({
        candidateId: candidate.candidate.id,
        docType: selectedDocType,
        fileName: uploadData?.fileName || file.name,
        fileUrl: uploadData?.fileUrl || "",
        ...(selectedRoleCatalog && { roleCatalogId: selectedRoleCatalog }),
      }).unwrap();

      console.log("📥 Document created:", createResp.data);

      // Call reuse endpoint for the newly created document so it can be reused across projects
      const documentId = createResp.data.id;
      try {
        await reuseDocument({ 
          documentId, 
          projectId: candidate.project?.id || "", 
          roleCatalogId: selectedRoleCatalog || "" 
        }).unwrap();
        toast.success("File uploaded and reused successfully");
      } catch (reuseErr: any) {
        console.error("Document reuse failed", reuseErr);
        // Non-fatal: show a warning but continue
        toast.warning(reuseErr?.data?.message || "Uploaded but reuse failed");
      }

      setUploadModalOpen(false);
      await refetch();
    } catch (err: any) {
      console.error("Document attestation upload error", err);
      toast.error(getUploadErrorMessage(err));
    }
  };

  const getMissingMandatory = () => {
    const missing: string[] = [];
    requiredDocuments.forEach((req) => {
      if (!req.mandatory) return;
      const uploadsForDocType = uploadsByDocType[req.docType] || [];
      const anyVerified = uploadsForDocType.some((u: any) => u.status === "verified");
      if (!anyVerified) missing.push(req.label);
    });
    return missing;
  };

  const getDocStats = () => {
    const mandatory = requiredDocuments.filter((r) => r.mandatory).length;
    const verified = requiredDocuments.filter((r) => {
      const uploadsForDocType = uploadsByDocType[r.docType] || [];
      return uploadsForDocType.some((u: any) => u.status === "verified");
    }).length;
    return { mandatory, verified, total: requiredDocuments.length };
  };

  const handleMarkComplete = async () => {
    if (!activeStep?.id) return;

    // If there are missing mandatory docs, show that message
    if (statMissing > 0) {
      const missingSummary = missingDocs.length > 2 ? `${missingDocs.slice(0,2).join(', ')} +${missingDocs.length - 2} more` : missingDocs.join(', ');
      toast.error(`Cannot complete — Missing: ${missingSummary}`);
      return;
    }

    // Require all mandatory documents to be verified
    if (!allVerified) {
      toast.error("Cannot complete — All mandatory documents must be verified");
      return;
    }

    setCompleteModalOpen(true);
  };

  const handleConfirmComplete = async () => {
    if (!activeStep?.id) return;

    try {
      await completeStep({ stepId: activeStep.id }).unwrap();
      toast.success("Document attestation step marked complete");
      setCompleteModalOpen(false);
      await refetch();
      
      // Notify parent to refresh all related data
      if (onComplete) {
        await onComplete();
      }
      
      onClose();
    } catch (err: any) {
      console.error("Mark document attestation complete failed", err);
      const msg = err?.data?.message || err?.error || "Failed to complete document attestation step";
      toast.error(msg);
    }
  };



  // Prefer counts from the API payload when available (keeps UI consistent with backend)
  const apiCounts = data?.counts;
  const computedStats = getDocStats();
  const missingDocs = getMissingMandatory();

  // Use *mandatory* counts (API provides totalMandatory). fall back to computed mandatory count.
  // Previously we used the total configured docs which incorrectly included optional docs.
  const statTotal = apiCounts?.totalMandatory ?? computedStats.mandatory;
  const statVerified = apiCounts?.verifiedCount ?? computedStats.verified;
  const statMissing = apiCounts?.missingCount ?? missingDocs.length;

  // Require all MANDATORY documents verified before allowing completion
  // treat verifiedCount >= totalMandatory as satisfied (API may include optional docs in verifiedCount)
  const allVerified = statTotal > 0 ? statVerified >= statTotal : statMissing === 0;
  const canMarkComplete = allVerified;



  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-card/10 flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">Document Attestation</DialogTitle>
                <DialogDescription className="text-sm text-white/70">Upload and verify required documents</DialogDescription>
              </div>
            </div>
            {candidate?.candidate && (
              <div className="text-right">
                <div className="text-sm font-semibold text-white">{candidate.candidate.firstName} {candidate.candidate.lastName}</div>
                <div className="text-xs text-white/60">{candidate.project?.title}</div>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : error || !data ? (
            <Card className="p-8 text-center">
              <div className="h-14 w-14 rounded-full bg-rose-50 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle className="h-7 w-7 text-rose-500" />
              </div>
              <div className="text-sm text-muted-foreground">Could not load document attestation requirements.</div>
            </Card>
          ) : (
            <div className="space-y-4">

              <ProcessingActionLockBanner />

              {isStepCancelled && (
                <Card className="w-full border-0 shadow-sm bg-rose-50 p-3">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-rose-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-rose-700">Step cancelled</div>
                      <div className="text-xs text-foreground mt-1">{activeStep?.rejectionReason || 'No reason provided'}</div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Progress Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-lg p-3 text-center border">
                  <div className="text-2xl font-black text-foreground">{statTotal}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total Docs</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-100">
                  <div className="text-2xl font-black text-emerald-600">{statVerified}</div>
                  <div className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold">Verified</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
                  <div className="text-2xl font-black text-amber-600">{statMissing}</div>
                  <div className="text-[10px] uppercase tracking-wider text-amber-600 font-bold">Missing</div>
                </div>
              </div>

              {mergedCourierGroups.length > 0 && (
                <div className="border rounded-lg overflow-hidden border-violet-200/80">
                  <div className="bg-violet-50 px-4 py-2 border-b border-violet-100">
                    <h4 className="text-xs font-black uppercase tracking-wider text-violet-800 flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5" />
                      Merged attested documents from courier legs
                    </h4>
                    <p className="text-[11px] text-violet-800/70 mt-0.5">
                      View or download the combined PDF for reference. Upload each required document individually on its row below.
                    </p>
                  </div>
                  <div className="divide-y max-h-[240px] overflow-auto">
                    {mergedCourierGroups.map((group) => {
                      const combinedLabel = group.coveredDocuments
                        .map(
                          (covered) =>
                            covered.label ||
                            covered.baseDocType.replace(/_/g, " "),
                        )
                        .join(" + ");
                      const mergedAttestedDocTypes = group.coveredDocuments.map(
                        (covered) => covered.attestedDocType,
                      );
                      const projectId = candidate?.project?.id || "";

                      return (
                        <div
                          key={group.documentId}
                          className="flex items-start gap-3 px-4 py-3 bg-gradient-to-r from-violet-50/60 to-fuchsia-50/30"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">
                                {combinedLabel}
                              </span>
                              <Badge className="text-[9px] bg-violet-100 text-violet-700 px-1.5 py-0 border-0">
                                Merged
                              </Badge>
                              <Badge className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0 border-0 gap-1">
                                <Truck className="h-2.5 w-2.5" />
                                Leg {group.legNumber ?? "—"}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {group.uploadedBy?.name || group.uploadedBy?.email || "Staff"}
                              {" · "}
                              {format(new Date(group.uploadedAt), "dd MMM yyyy HH:mm")}
                              {group.document?.fileName
                                ? ` · ${group.document.fileName}`
                                : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {group.document?.fileUrl && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="View document"
                                  onClick={() => openViewerForDoc(group.document)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1.5 text-xs"
                                  asChild
                                >
                                  <a
                                    href={group.document.fileUrl}
                                    download={group.document.fileName || "merged-attested.pdf"}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    Download
                                  </a>
                                </Button>
                              </>
                            )}
                            {!isAttestationCompleted &&
                              !isStepCancelled &&
                              canWriteProcessing && (
                                <LockedProcessingActionButton forceDisabled={isLocked}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs border-violet-200 text-violet-700 hover:bg-violet-50"
                                    disabled={isLocked}
                                    onClick={() =>
                                      handleCourierReuploadClick({
                                        shipmentId: group.shipmentId,
                                        projectId,
                                        isMerged: true,
                                        mergedAttestedDocTypes,
                                        docLabel: combinedLabel,
                                      })
                                    }
                                  >
                                    <Upload className="h-3 w-3 mr-1" />
                                    Re-upload
                                  </Button>
                                </LockedProcessingActionButton>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {extraCourierDocs.length > 0 && (
                <div className="border rounded-lg overflow-hidden border-indigo-200/80">
                  <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100">
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5" />
                      Also uploaded from courier legs
                    </h4>
                    <p className="text-[11px] text-indigo-700/70 mt-0.5">
                      These attested scans are on a courier leg for this project but are not in the country attestation requirements.
                    </p>
                  </div>
                  <div className="divide-y max-h-[200px] overflow-auto">
                    {extraCourierDocs.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground truncate">
                              {row.attestedDocType.replace(/_/g, " ")}
                            </span>
                            <Badge className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0 border-0">
                              Leg {row.legNumber ?? "—"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {row.uploadedBy?.name || row.uploadedBy?.email || "Staff"}
                            {" · "}
                            {format(new Date(row.uploadedAt), "dd MMM yyyy HH:mm")}
                            {row.document?.fileName
                              ? ` · ${row.document.fileName}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {row.document?.fileUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 shrink-0"
                              title="View document"
                              onClick={() => openViewerForDoc(row.document)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {!isAttestationCompleted &&
                            !isStepCancelled &&
                            canWriteProcessing && (
                              <LockedProcessingActionButton forceDisabled={isLocked}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                  disabled={isLocked}
                                  onClick={() =>
                                    handleCourierReuploadClick({
                                      shipmentId: row.shipmentId,
                                      projectId: candidate?.project?.id || "",
                                      isMerged: false,
                                      attestedDocType: row.attestedDocType,
                                      docLabel: row.attestedDocType.replace(/_/g, " "),
                                    })
                                  }
                                >
                                  <Upload className="h-3 w-3 mr-1" />
                                  Re-upload
                                </Button>
                              </LockedProcessingActionButton>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Document List */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 border-b flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Required Documents</h4>
                  {!isAttestationCompleted && !isStepCancelled && (
                    <VerifyAllDocumentsControl
                      processingStepId={activeStep?.id}
                      requiredDocuments={requiredDocuments}
                      candidateDocsByDocType={effectiveCandidateDocsByDocType}
                      processingDocsByDocType={processingDocsByDocType}
                      verifyProcessingDocument={verifyProcessingDocument}
                      refetch={refetch}
                      stepLabel="Document Attestation"
                      disabled={isVerifying}
                    />
                  )}
                </div>
                <div className="divide-y max-h-[320px] overflow-auto">
                  {requiredDocuments.map((req) => {

                    const candidateList = effectiveCandidateDocsByDocType[req.docType] || [];
                    const candidateDoc = candidateList[0];
                    const candidateVerified = candidateDoc?.status === 'verified';
                    const courierRow = courierDocsByBaseType[req.docType]?.[0];
                    const fromCourier = candidateDoc?.source === "courier_leg" || !!courierRow;

                    const processingList = processingDocsByDocType[req.docType] || [];
                    const processingDoc = processingList[0];
                    const processingVerified = processingDoc?.status === 'verified';

                    const hasPending = (candidateDoc?.status === 'pending') || (processingDoc?.status === 'pending');
                    const hasRejected = (candidateDoc?.status === 'rejected') || (processingDoc?.status === 'rejected');

                    const hasProcessing = !!processingDoc;
                    const hasCandidate = !!candidateDoc;
                    const hasViewableDoc = hasCandidate || hasProcessing;
                    const projectId = candidate?.project?.id || "";

                    return (
                      <div key={req.docType} className={`flex items-center gap-4 px-4 py-3 ${processingVerified ? 'bg-emerald-50/50' : hasRejected ? 'bg-red-50/30' : ''}`}>
                        {/* Status Icon */}
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                          processingVerified || candidateVerified ? 'bg-emerald-100' : hasPending ? 'bg-blue-100' : hasRejected ? 'bg-red-100' : 'bg-muted'
                        }`}>
                          {processingVerified || candidateVerified ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                           hasPending ? <Clock className="h-4 w-4 text-blue-600" /> :
                           hasRejected ? <XCircle className="h-4 w-4 text-red-500" /> :
                           <Upload className="h-4 w-4 text-slate-400" />}
                        </div>

                        {/* Doc Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground truncate">{req.label}</span>
                            {req.mandatory ? (
                              <Badge className="text-[9px] bg-rose-100 text-rose-600 px-1.5 py-0 border-0">Required</Badge>
                            ) : (
                              <Badge className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0 border-0">Optional</Badge>
                            )}
                            {fromCourier && (
                              <Badge className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0 border-0 gap-1">
                                <Truck className="h-2.5 w-2.5" />
                                Courier Leg {courierRow?.legNumber ?? candidateDoc?.legNumber ?? "—"}
                              </Badge>
                            )}
                          </div>

                          {(candidateDoc || processingDoc) && (
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {processingDoc && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${processingDoc.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : processingDoc.status === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'}`}>
                                  Processing: {processingDoc.status} {processingDoc.fileName ? `• ${processingDoc.fileName.slice(0, 20)}...` : ''}
                                </span>
                              )}
                              {candidateDoc && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${candidateDoc.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : candidateDoc.status === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'}`}>
                                  {fromCourier ? "Courier" : "Candidate"}: {candidateDoc.status} {candidateDoc.fileName ? `• ${String(candidateDoc.fileName).slice(0, 20)}...` : ''}
                                </span>
                              )}
                              {fromCourier && courierRow?.uploadedAt && (
                                <span className="text-[10px] text-muted-foreground">
                                  {courierRow.uploadedBy?.name || courierRow.uploadedBy?.email || "Staff"}
                                  {" · "}
                                  {format(new Date(courierRow.uploadedAt), "dd MMM yyyy HH:mm")}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions: View / Upload / Verify / Processing Badge */}
                        <div className="flex items-center gap-2">
                          {/* Keep view button available even after attestation is completed */}
                          {(hasViewableDoc) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleViewDocument(req.docType)}
                              title="View document"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}

                          {isAttestationCompleted ? (
                            <Badge className="text-[11px] bg-emerald-100 text-emerald-700 px-2">Document Attestation Completed</Badge>
                          ) : isStepCancelled ? (
                            <Badge className="text-[11px] bg-rose-100 text-rose-700 px-2">Step Cancelled</Badge>
                          ) : (
                            <>
                              {!hasProcessing ? (
                                <>
                                  {fromCourier && courierRow && canWriteProcessing && (
                                    <LockedProcessingActionButton forceDisabled={isLocked}>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                        disabled={isLocked}
                                        onClick={() =>
                                          handleCourierReuploadClick({
                                            shipmentId: courierRow.shipmentId,
                                            projectId,
                                            isMerged: false,
                                            attestedDocType: courierRow.attestedDocType,
                                            docLabel: req.label,
                                          })
                                        }
                                      >
                                        <Upload className="h-3 w-3 mr-1" />
                                        Re-upload
                                      </Button>
                                    </LockedProcessingActionButton>
                                  )}

                                  {candidateDoc && !fromCourier && (
                                    <LockedProcessingActionButton forceDisabled={isLocked}>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                        disabled={isLocked}
                                        onClick={() => handleUploadClick(
                                          req.docType,
                                          req.label,
                                          candidate?.role?.roleCatalog?.id,
                                          candidate?.role?.roleCatalog?.label || candidate?.role?.designation,
                                          candidateDoc?.id,
                                          candidateProjectMapId || candidateDoc?.verifications?.[0]?.candidateProjectMapId
                                        )}
                                      >
                                        <Upload className="h-3 w-3 mr-1" />
                                        Re-upload
                                      </Button>
                                    </LockedProcessingActionButton>
                                  )}

                                  {!candidateDoc && (
                                    <LockedProcessingActionButton forceDisabled={isLocked}>
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="h-8 text-xs"
                                        disabled={isLocked}
                                        onClick={() => handleUploadClick(req.docType, req.label, candidate?.role?.roleCatalog?.id, candidate?.role?.roleCatalog?.label || candidate?.role?.designation)}
                                      >
                                        <Upload className="h-3 w-3 mr-1" />
                                        Upload
                                      </Button>
                                    </LockedProcessingActionButton>
                                  )}

                                  {(candidateDoc) && (
                                    <LockedProcessingActionButton forceDisabled={isLocked}>
                                      <Button
                                        size="sm"
                                        variant="default"
                                        disabled={isLocked}
                                        onClick={() => handleVerifyClick(req.docType, req.label, candidate?.role?.roleCatalog?.id, candidate?.role?.roleCatalog?.label || candidate?.role?.designation)}
                                      >
                                        Verify
                                      </Button>
                                    </LockedProcessingActionButton>
                                  )}
                                </>
                              ) : (
                                processingVerified ? (
                                  <div className="flex items-center gap-2">
                                    <Badge className="text-[11px] bg-emerald-100 text-emerald-700 px-2">Verified</Badge>

                                    <LockedProcessingActionButton forceDisabled={isLocked}>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[10px] px-2 font-bold border-emerald-200 hover:bg-emerald-50 text-emerald-700"
                                        disabled={isLocked}
                                        onClick={() => handleUploadClick(
                                          req.docType,
                                          req.label,
                                          candidate?.role?.roleCatalog?.id,
                                          candidate?.role?.roleCatalog?.label || candidate?.role?.designation,
                                          processingDoc?.id,
                                          candidateProjectMapId || processingDoc?.candidateProjectMapId
                                        )}
                                      >
                                        <Upload className="h-3 w-3 mr-1" />
                                        Re-upload
                                      </Button>
                                    </LockedProcessingActionButton>

                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded">In processing</div>
                                )
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && data && (
          <div className="px-6 py-3 border-t bg-muted flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {statMissing > 0 ? (
                missingDocs.length > 0 ? (
                  <span className="text-amber-600 font-medium">Missing: {statMissing} — {missingDocs.slice(0, 2).join(', ')}{missingDocs.length > 2 ? ` +${missingDocs.length - 2} more` : ''}</span>
                ) : (
                  <span className="text-amber-600 font-medium">Missing: {statMissing}</span>
                )
              ) : (
                <span className="text-emerald-600 font-medium">All mandatory documents verified ✓</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={async () => { await refetch(); toast.success('Refreshed'); }}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
              </Button>

              {!isAttestationCompleted && !isStepCancelled && (
                <ProcessingStepActionButtons
                  processingStepId={activeStep?.id}
                  show={!isAttestationCompleted && !isStepCancelled}
                  onSubmitted={async () => {
                    await refetch();
                    if (onComplete) await onComplete();
                  }}
                />
              )}

              {isAttestationCompleted ? (
                <Badge className="text-[11px] bg-emerald-100 text-emerald-700 px-2">Document Attestation Completed ✓</Badge>
              ) : isStepCancelled ? (
                <Badge className="text-[11px] bg-rose-100 text-rose-700 px-2">Step Cancelled</Badge>
              ) : isLocked ? (
                <LockedProcessingActionButton forceDisabled>
                  <Button size="sm" disabled className="opacity-80" aria-disabled>
                    Mark Document Attestation Complete
                  </Button>
                </LockedProcessingActionButton>
              ) : (
                <Button
                    size="sm"
                    onClick={handleMarkComplete}
                    disabled={isCompletingStep || !canMarkComplete || isLocked}
                    title={!canMarkComplete ? `Cannot complete — Missing: ${missingDocs.slice(0,2).join(', ')}${missingDocs.length > 2 ? ` +${missingDocs.length - 2} more` : ''}` : undefined}
                    aria-disabled={isCompletingStep || !canMarkComplete || isLocked}
                  >
                    {isCompletingStep ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark Document Attestation Complete'}
                  </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      {/* Upload Document Modal */}
      <React.Suspense fallback={<div className="p-4">Loading...</div>}>
        <UploadDocumentModal
            isOpen={uploadModalOpen}
            onClose={() => {
              setUploadModalOpen(false);
              resetUploadContext();
            }}
            docType={selectedDocType}
            docLabel={selectedDocLabel}
            roleCatalog={selectedRoleCatalog}
            roleLabel={selectedRoleLabel}
            onUpload={handleUploadFile}
            isUploading={
              isUploading ||
              isReusing ||
              isReuploadingProcessing ||
              isUploadingCourier ||
              isUploadingCourierMerged
            }
            pdfOnly={uploadPdfOnly}
          />
      </React.Suspense>

      {/* Verify Document Modal */}
      <React.Suspense fallback={null}>
        <VerifyProcessingDocumentModal
          isOpen={verifyModalOpen}
          onClose={() => setVerifyModalOpen(false)}
          documentId={verifyDocId}
          documentLabel={verifyDocLabel}
          processingStepId={activeStep?.id || ""}
          onConfirm={handleConfirmVerify}
          isVerifying={isVerifying}
        />
      </React.Suspense>

      {/* Complete Step Confirmation Modal */}
      <React.Suspense fallback={null}>
        <CompleteProcessingStepModal
          isOpen={completeModalOpen}
          onClose={() => setCompleteModalOpen(false)}
          onConfirm={handleConfirmComplete}
          isCompleting={isCompletingStep}
          requiredDocuments={requiredDocuments}
          uploadsByDocType={uploadsByDocType}
          candidateDocsByDocType={effectiveCandidateDocsByDocType}
          processingDocsByDocType={processingDocsByDocType}
          onViewDocument={handleViewDocument}
        />
      </React.Suspense>

      {/* Inline Viewer: PDF or Image */}
      {viewerUrl && viewerMimeType && viewerMimeType.includes("pdf") && (
        <PDFViewer
          fileUrl={viewerUrl}
          fileName={viewerFileName}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {viewerUrl && (!viewerMimeType || viewerMimeType.startsWith("image/")) && (
        <Dialog open={viewerOpen} onOpenChange={(v) => { if (!v) setViewerOpen(false); }}>
          <DialogContent className="sm:max-w-3xl max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <File className="h-5 w-5 text-blue-600" />
                  <div className="font-semibold">{viewerFileName}</div>
                </div>
                <div>
                  <Button variant="ghost" size="sm" onClick={() => setViewerOpen(false)}>Close</Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="p-4 flex justify-center">
              <img src={viewerUrl} alt={viewerFileName} className="max-h-[70vh] object-contain" />
            </div>
          </DialogContent>
        </Dialog>
      )}

    </Dialog>
  );
}

export default DocumentAttestationModal;
