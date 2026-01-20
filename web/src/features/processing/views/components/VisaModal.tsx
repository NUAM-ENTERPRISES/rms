import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, FileCheck, Upload, CheckCircle2, XCircle, Clock, RefreshCw, File, Eye, Calendar, Send, Edit2 } from "lucide-react";
import { DatePicker } from "@/components/molecules/DatePicker";
import { format } from "date-fns";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import React, { useState, useMemo } from "react";
const UploadDocumentModal = React.lazy(() => import("../../components/UploadDocumentModal"));
const VerifyProcessingDocumentModal = React.lazy(() => import("../../components/VerifyProcessingDocumentModal"));
const CompleteProcessingStepModal = React.lazy(() => import("../../components/CompleteProcessingStepModal"));
const ConfirmSubmitDateModal = React.lazy(() => import("../../components/ConfirmSubmitDateModal"));
const ConfirmEditSubmitDateModal = React.lazy(() => import("../../components/ConfirmEditSubmitDateModal"));
const ConfirmCancelStepModal = React.lazy(() => import("../../components/ConfirmCancelStepModal"));
import { useGetVisaRequirementsQuery, useCompleteStepMutation, useReuploadProcessingDocumentMutation, useVerifyProcessingDocumentMutation, useCancelStepMutation, useSubmitHrdDateMutation } from "@/services/processingApi";
import { useUploadDocumentMutation } from "@/features/candidates/api";
import { useCreateDocumentMutation } from "@/services/documentsApi";
import { useReuseDocumentMutation } from "@/features/documents/api";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VisaModalProps {
  isOpen: boolean;
  onClose: () => void;
  processingId: string;
  onComplete?: () => void | Promise<void>;
}

export function VisaModal({ isOpen, onClose, processingId, onComplete }: VisaModalProps) {
  const { data, isLoading, error, refetch } = useGetVisaRequirementsQuery(processingId, {
    skip: !isOpen || !processingId,
  });

  const [uploadDocument, { isLoading: isUploading }] = useUploadDocumentMutation();
  const [createDocument] = useCreateDocumentMutation();
  const [reuseDocument, { isLoading: isReusing }] = useReuseDocumentMutation();
  const [completeStep, { isLoading: isCompletingStep }] = useCompleteStepMutation();
  const [reuploadProcessingDocument, { isLoading: isReuploadingProcessing }] = useReuploadProcessingDocumentMutation();
  const [verifyProcessingDocument, { isLoading: isVerifying }] = useVerifyProcessingDocumentMutation();
  const [submitHrdDate, { isLoading: isSubmittingDate }] = useSubmitHrdDateMutation();

  // Cancel step mutation + UI state
  const [cancelStep, { isLoading: isCancelling }] = useCancelStepMutation();
  const [cancelOpen, setCancelOpen] = useState(false);

  // Visa submission date state
  const [visaSubmissionDate, setVisaSubmissionDate] = useState<Date | undefined>(undefined);

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
  // Submit date confirmation modal
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  // Edit existing submitted date modal
  const [editSubmitOpen, setEditSubmitOpen] = useState(false);
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);

  // Reupload context (when replacing an existing document)
  const [replaceOldDocumentId, setReplaceOldDocumentId] = useState<string | null>(null);
  const [replaceCandidateProjectMapId, setReplaceCandidateProjectMapId] = useState<string | null>(null);

  const activeStep = data?.step;
  const candidate = data?.processingCandidate;

  const requiredDocuments: any[] = data?.requiredDocuments || [];
  const uploads: any[] = data?.uploads || [];

  // Completion flag from API
  const isVisaCompleted = data?.isVisaCompleted ?? false;

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

  const candidateDocsByDocType = useMemo(() => {
    const map: Record<string, any[]> = {};
    candidateDocs.forEach((d: any) => {
      map[d.docType] = map[d.docType] || [];
      map[d.docType].push(d);
    });
    return map;
  }, [candidateDocs]);

  const processingDocsByDocType = useMemo(() => {
    const map: Record<string, any[]> = {};
    processingDocs.forEach((d: any) => {
      // processing_documents from API can be nested. Normalize so we can group by docType reliably.
      const doc = d.document || d.processingDocument?.document || d;
      const docType = doc?.docType || d.docType || d.processingDocument?.docType;
      const status = d.processingDocument?.status || d.processingDocument?.processingStatus || doc?.status || d.status;
      const fileName = d.document?.fileName || doc?.fileName;
      const fileUrl = d.document?.fileUrl || doc?.fileUrl;
      const mimeType = d.document?.mimeType || doc?.mimeType;
      const id = d.document?.id || d.processingDocument?.id || d.id;

      if (!docType) return; // skip malformed entries

      const normalized = { ...d, docType, status, fileName, fileUrl, mimeType, id };

      map[docType] = map[docType] || [];
      map[docType].push(normalized);
    });
    return map;
  }, [processingDocs]);

  // Viewer state for inline preview (PDF / images)
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerFileName, setViewerFileName] = useState<string>("");
  const [viewerMimeType, setViewerMimeType] = useState<string | undefined>(undefined);

  const handleViewDocument = (docType: string) => {
    const pdocs = processingDocsByDocType[docType] || [];
    const cdocs = candidateDocsByDocType[docType] || [];
    const pdoc = pdocs[pdocs.length - 1];
    const cdoc = cdocs[cdocs.length - 1];
    const url = pdoc?.fileUrl || cdoc?.fileUrl;

    if (!url) {
      toast("No document available to view");
      return;
    }

    // Prefer mimeType from processing or candidate doc if available
    let mime = pdoc?.mimeType || cdoc?.mimeType;
    const fileName = pdoc?.fileName || cdoc?.fileName || "Document";

    // If mime type is missing or generic, try to infer from file extension
    const tryInferFromUrl = (u: string | undefined) => {
      if (!u) return null;
      const clean = u.split('?')[0].toLowerCase();
      if (/\.pdf$/.test(clean)) return 'application/pdf';
      if (/\.(jpe?g|png|gif|bmp|webp|svg)$/.test(clean)) return 'image/*';
      return null;
    };

    if (!mime) {
      mime = tryInferFromUrl(pdoc?.fileUrl) || tryInferFromUrl(cdoc?.fileUrl) || tryInferFromUrl(fileName);
    }

    // If mime appears as image/* or pdf set it accordingly; otherwise leave undefined
    setViewerMimeType(mime || undefined);
    setViewerFileName(fileName);
    setViewerUrl(url);
    setViewerOpen(true);
  };

  const handleVerifyClick = (docType: string, label?: string, roleCatalog?: string, roleLabel?: string) => {
    const pdocs = processingDocsByDocType[docType] || [];
    if (pdocs.length > 0) {
      // Already present in processing. Nothing to do here (backend action expected later)
      toast.success("Document already in processing");
      return;
    }

    const cdocs = candidateDocsByDocType[docType] || [];
    const cdoc = cdocs[cdocs.length - 1];

    if (!cdoc) {
      // No candidate-level document: prompt upload flow so user can add & then verify
      toast("No candidate document found. Please upload a document to verify.");
      setSelectedDocType(docType);
      setSelectedDocLabel(label || "");
      setSelectedRoleCatalog(roleCatalog);
      setSelectedRoleLabel(roleLabel);
      setUploadModalOpen(true);
      return;
    }

    // Candidate doc exists - Open verification modal
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

  const handleUploadClick = (docType: string, docLabel: string, roleCatalog?: string, roleLabel?: string, oldDocumentId?: string, candidateProjectMapId?: string) => {
    setSelectedDocType(docType);
    setSelectedDocLabel(docLabel);
    setSelectedRoleCatalog(roleCatalog);
    setSelectedRoleLabel(roleLabel);
    setReplaceOldDocumentId(oldDocumentId ?? null);
    setReplaceCandidateProjectMapId(candidateProjectMapId ?? null);
    setUploadModalOpen(true);
  };

  const handleUploadFile = async (file: File) => {
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
          setReplaceOldDocumentId(null);
          setReplaceCandidateProjectMapId(null);
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
      console.error("Visa upload error", err);
      toast.error(err?.data?.message || "Failed to upload and attach document");
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

    // Require submittedAt to be set before allowing completion
    if (!hasSubmittedAt) {
      toast.error("Cannot complete — Submission date not set");
      return;
    }

    setCompleteModalOpen(true);
  };

  const handleConfirmComplete = async () => {
    if (!activeStep?.id) return;

    try {
      await completeStep({ stepId: activeStep.id }).unwrap();
      toast.success("Visa step marked complete");
      setCompleteModalOpen(false);
      await refetch();
      
      // Notify parent to refresh all related data
      if (onComplete) {
        await onComplete();
      }
      
      onClose();
    } catch (err: any) {
      console.error("Mark Visa complete failed", err);
      const msg = err?.data?.message || err?.error || "Failed to complete Visa step";
      toast.error(msg);
    }
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!activeStep?.id) {
      toast.error("No active step found");
      return;
    }

    try {
      await cancelStep({ stepId: activeStep.id, reason }).unwrap();
      toast.success("Processing step cancelled");
      setCancelOpen(false);
      await refetch();

      if (onComplete) {
        await onComplete();
      }

      onClose();
    } catch (err: any) {
      console.error("Cancel step failed", err);
      toast.error(err?.data?.message || err?.error || "Failed to cancel step");
    }
  };

  const handleSubmitVisaDate = async (date?: Date): Promise<boolean> => {
    if (!activeStep?.id) {
      toast.error("No active step found");
      return false;
    }

    const payloadDate = date ?? visaSubmissionDate;

    if (!payloadDate) {
      toast.error("Please select a date and time");
      return false;
    }

    try {
      await submitHrdDate({
        stepId: activeStep.id,
        submittedAt: payloadDate.toISOString(),
      }).unwrap();
      toast.success("Visa submission date saved successfully");
      await refetch();
      return true;
    } catch (err: any) {
      console.error("Submit Visa date failed", err);
      toast.error(err?.data?.message || "Failed to save Visa submission date");
      return false;
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

  // Submitted date check: require a submittedAt date on the active step
  const hasSubmittedAt = Boolean(activeStep?.submittedAt);

  // Require all MANDATORY documents verified AND submitted date exists before allowing completion
  // treat verifiedCount >= totalMandatory as satisfied (API may include optional docs in verifiedCount)
  const allVerified = statTotal > 0 ? statVerified >= statTotal : statMissing === 0;
  const canMarkComplete = allVerified && hasSubmittedAt;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">Visa</DialogTitle>
                <DialogDescription className="text-sm text-white/70">Upload and verify required visa documents</DialogDescription>
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
              <div className="text-sm text-slate-600">Could not load Visa requirements.</div>
            </Card>
          ) : (
            <div className="space-y-4">

              {isStepCancelled && (
                <Card className="w-full border-0 shadow-sm bg-rose-50 p-3">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-rose-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-rose-700">Step cancelled</div>
                      <div className="text-xs text-slate-700 mt-1">{activeStep?.rejectionReason || 'No reason provided'}</div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Progress Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center border">
                  <div className="text-2xl font-black text-slate-700">{statTotal}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Docs</div>
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

              {/* Visa Submission Date Section (compact) */}
              <div className="border rounded-lg overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="bg-blue-100 px-3 py-1 border-b border-blue-200">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Visa Submission Date & Time
                  </h4>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 w-full sm:w-auto">
                      <Label className="text-xs text-slate-600 mb-1 block">Select submission date and time</Label>

                      {/* If step already has submittedAt, show the formatted submitted date and hide the picker */}
                      {activeStep?.submittedAt ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-slate-800">{format(new Date(activeStep.submittedAt), "PPP 'at' p")}</div>
                            <Badge className="text-[11px] bg-emerald-100 text-emerald-700 px-2">Submitted</Badge>
                          </div>

                          {/* Move edit to right edge and apply a circular 'nice' style */}
                          {!isVisaCompleted && !isStepCancelled && (
                            <div className="flex items-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-full bg-white hover:bg-slate-50 border border-slate-100 shadow-sm"
                                onClick={() => { setEditDate(new Date(activeStep.submittedAt)); setEditSubmitOpen(true); }}
                                title="Edit submission date"
                              >
                                <Edit2 className="h-4 w-4 text-slate-700" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <DatePicker
                            value={visaSubmissionDate}
                            onChange={setVisaSubmissionDate}
                            placeholder="Pick date and time"
                            disabled={isVisaCompleted}
                            className="w-full sm:min-w-[220px] h-8"
                            compact
                          />

                          {/* Validation / hint messages when no submittedAt */}
                          {!activeStep?.submittedAt && (
                            <div className="mt-1">
                              {visaSubmissionDate ? (
                                <p className="text-xs text-slate-500">Click <span className="font-medium">Submit Date</span> to save the submission time.</p>
                              ) : (
                                <p className="text-xs text-rose-600 flex items-center gap-2"><XCircle className="h-3.5 w-3.5" /> Submission date is required to complete Visa</p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex items-center">
                      {/* Only show submit button when no submittedAt present and when step is not cancelled */}
                      {!activeStep?.submittedAt && !isStepCancelled && (
                        <Button
                          size="sm"
                          onClick={() => setSubmitConfirmOpen(true)}
                          disabled={isSubmittingDate || !visaSubmissionDate || isVisaCompleted || isStepCancelled}
                          className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isSubmittingDate ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Send className="h-3.5 w-3.5 mr-1" />
                          )}
                          Submit Date
                        </Button>
                      )}
                    </div>
                  </div>
                  {isVisaCompleted && (
                    <p className="text-xs text-slate-500 mt-2">Visa is completed. Submission date cannot be modified.</p>
                  )}
                </div>
              </div>

              {/* Document List */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 border-b">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">Required Documents</h4>
                </div>
                <div className="divide-y max-h-[320px] overflow-auto">
                  {requiredDocuments.map((req) => {

                    const candidateList = candidateDocsByDocType[req.docType] || [];
                    const candidateDoc = candidateList[candidateList.length - 1];
                    const candidateVerified = candidateDoc?.status === 'verified';

                    const processingList = processingDocsByDocType[req.docType] || [];
                    const processingDoc = processingList[processingList.length - 1];
                    const processingVerified = processingDoc?.status === 'verified';

                    const hasPending = (candidateDoc?.status === 'pending') || (processingDoc?.status === 'pending');
                    const hasRejected = (candidateDoc?.status === 'rejected') || (processingDoc?.status === 'rejected');

                    const hasProcessing = !!processingDoc;
                    const hasCandidate = !!candidateDoc;

                    return (
                      <div key={req.docType} className={`flex items-center gap-4 px-4 py-3 ${processingVerified ? 'bg-emerald-50/50' : hasRejected ? 'bg-red-50/30' : ''}`}>
                        {/* Status Icon */}
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                          processingVerified || candidateVerified ? 'bg-emerald-100' : hasPending ? 'bg-blue-100' : hasRejected ? 'bg-red-100' : 'bg-slate-100'
                        }`}>
                          {processingVerified || candidateVerified ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                           hasPending ? <Clock className="h-4 w-4 text-blue-600" /> :
                           hasRejected ? <XCircle className="h-4 w-4 text-red-500" /> :
                           <Upload className="h-4 w-4 text-slate-400" />}
                        </div>

                        {/* Doc Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-800 truncate">{req.label}</span>
                            {req.mandatory ? (
                              <Badge className="text-[9px] bg-rose-100 text-rose-600 px-1.5 py-0 border-0">Required</Badge>
                            ) : (
                              <Badge className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0 border-0">Optional</Badge>
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
                                  Candidate: {candidateDoc.status} {candidateDoc.fileName ? `• ${candidateDoc.fileName.slice(0, 20)}...` : ''}
                                </span>
                              )}

                            </div>
                          )}
                        </div>

                        {/* Actions: View / Upload / Verify / Processing Badge */}
                        <div className="flex items-center gap-2">
                          {/* Keep view button available even after Visa is completed */}
                          {(hasCandidate || hasProcessing) && (
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

                          {isVisaCompleted ? (
                            <Badge className="text-[11px] bg-emerald-100 text-emerald-700 px-2">Visa Completed</Badge>
                          ) : isStepCancelled ? (
                            <Badge className="text-[11px] bg-rose-100 text-rose-700 px-2">Step Cancelled</Badge>
                          ) : (
                            <>
                              {!hasProcessing ? (
                                <>
                                  {/* Re-upload only when candidate doc is in pending state */}
                                  {candidateDoc?.status === 'pending' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs"
                                      onClick={() => handleUploadClick(
                                        req.docType,
                                        req.label,
                                        candidate?.role?.roleCatalog?.id,
                                        candidate?.role?.roleCatalog?.label || candidate?.role?.designation,
                                        candidateDoc?.id,
                                        // pick latest verification's candidateProjectMapId if available
                                        candidateDoc?.verifications?.length ? candidateDoc.verifications[candidateDoc.verifications.length - 1].candidateProjectMapId : undefined
                                      )}
                                    >
                                      <Upload className="h-3 w-3 mr-1" />
                                      Re-upload
                                    </Button>
                                  )}

                                  {/* Upload only when there is no candidate doc */}
                                  {!candidateDoc && (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="h-8 text-xs"
                                      onClick={() => handleUploadClick(req.docType, req.label, candidate?.role?.roleCatalog?.id, candidate?.role?.roleCatalog?.label || candidate?.role?.designation)}
                                    >
                                      <Upload className="h-3 w-3 mr-1" />
                                      Upload
                                    </Button>
                                  )}

                                  {/* Show Verify only when a candidate document exists (and there's no processing doc) */}
                                  {candidateDoc && (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleVerifyClick(req.docType, req.label, candidate?.role?.roleCatalog?.id, candidate?.role?.roleCatalog?.label || candidate?.role?.designation)}
                                    >
                                      Verify
                                    </Button>
                                  )}
                                </>
                              ) : (
                                processingVerified ? (
                                  <div className="flex items-center gap-2">
                                    <Badge className="text-[11px] bg-emerald-100 text-emerald-700 px-2">Verified</Badge>
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-500">In processing</div>
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
          <div className="px-6 py-3 border-t bg-slate-50 flex items-center justify-between">
            <div className="text-xs text-slate-500">
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

              {!isVisaCompleted && !isStepCancelled && (
                <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)} disabled={isCancelling}>
                  {isCancelling ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Cancel Step
                </Button>
              )}

              {isVisaCompleted ? (
                <Badge className="text-[11px] bg-emerald-100 text-emerald-700 px-2">Visa Completed ✓</Badge>
              ) : isStepCancelled ? (
                <Badge className="text-[11px] bg-rose-100 text-rose-700 px-2">Step Cancelled</Badge>
              ) : (
                // Show contextual tooltip when disabled: prefer verification requirement, then submission date
                !allVerified ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button size="sm" disabled className="opacity-80" aria-disabled>
                            {'Mark Visa Complete'}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>All mandatory documents must be verified before marking Visa complete. Verified {statVerified}/{statTotal}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : !hasSubmittedAt ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            size="sm"
                            onClick={handleMarkComplete}
                            disabled={true}
                            className="opacity-80"
                            aria-disabled={true}
                          >
                            {'Mark Visa Complete'}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Submission date required to complete Visa. Please select and submit a date.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleMarkComplete}
                    disabled={isCompletingStep || !canMarkComplete}
                    title={!canMarkComplete ? `Cannot complete — Missing: ${missingDocs.slice(0,2).join(', ')}${missingDocs.length > 2 ? ` +${missingDocs.length - 2} more` : ''}` : undefined}
                    aria-disabled={isCompletingStep || !canMarkComplete}
                  >
                    {isCompletingStep ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark Visa Complete'}
                  </Button>
                )
              )}
            </div>
          </div>
        )}
      </DialogContent>

      {/* Upload Document Modal */}
      <React.Suspense fallback={<div className="p-4">Loading...</div>}>
        <UploadDocumentModal
            isOpen={uploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
            docType={selectedDocType}
            docLabel={selectedDocLabel}
            roleCatalog={selectedRoleCatalog}            roleLabel={selectedRoleLabel}            onUpload={handleUploadFile}
            isUploading={isUploading || isReusing || isReuploadingProcessing}
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

      {/* Confirm Submit Date Modal */}
      <React.Suspense fallback={null}>
        <ConfirmSubmitDateModal
          isOpen={submitConfirmOpen}
          onClose={() => setSubmitConfirmOpen(false)}
          date={visaSubmissionDate}
          onConfirm={async () => {
            const ok = await handleSubmitVisaDate();
            if (ok) setSubmitConfirmOpen(false);
          }}
          isSubmitting={isSubmittingDate}
        />
      </React.Suspense>

      {/* Edit Submit Date Modal */}
      <React.Suspense fallback={null}>
        <ConfirmEditSubmitDateModal
          isOpen={editSubmitOpen}
          onClose={() => setEditSubmitOpen(false)}
          existingDate={editDate ? editDate.toISOString() : activeStep?.submittedAt}
          onConfirm={async (newDate: Date) => {
            const ok = await handleSubmitVisaDate(newDate);
            return ok;
          }}
          isSubmitting={isSubmittingDate}
        />
      </React.Suspense>

      {/* Confirm Cancel Step Modal */}
      <React.Suspense fallback={null}>
        <ConfirmCancelStepModal
          isOpen={cancelOpen}
          onClose={() => setCancelOpen(false)}
          onConfirm={handleConfirmCancel}
          isCancelling={isCancelling}
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
          candidateDocsByDocType={candidateDocsByDocType}
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

export default VisaModal;
