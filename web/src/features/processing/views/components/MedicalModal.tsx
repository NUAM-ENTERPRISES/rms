import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, FileCheck, Upload, CheckCircle2, XCircle, Clock, RefreshCw, File, Copy, Eye, Calendar, Send, Edit2 } from "lucide-react";
import { DatePicker } from "@/components/molecules/DatePicker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import React, { useState, useMemo } from "react";
const UploadDocumentModal = React.lazy(() => import("../../components/UploadDocumentModal"));
const VerifyProcessingDocumentModal = React.lazy(() => import("../../components/VerifyProcessingDocumentModal"));
const CompleteProcessingStepModal = React.lazy(() => import("../../components/CompleteProcessingStepModal"));
const ConfirmSubmitDateModal = React.lazy(() => import("../../components/ConfirmSubmitDateModal"));
const ConfirmEditSubmitDateModal = React.lazy(() => import("../../components/ConfirmEditSubmitDateModal"));
const ConfirmMedicalModal = React.lazy(() => import("./ConfirmMedicalModal"));
const ConfirmCancelStepModal = React.lazy(() => import("../../components/ConfirmCancelStepModal"));
import { useGetMedicalRequirementsQuery, useCompleteStepMutation, useReuploadProcessingDocumentMutation, useVerifyProcessingDocumentMutation, useCancelStepMutation, useSubmitHrdDateMutation } from "@/services/processingApi";
import { useUploadDocumentMutation } from "@/features/candidates/api";
import { useCreateDocumentMutation } from "@/services/documentsApi";
import { useReuseDocumentMutation } from "@/features/documents/api";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MedicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  processingId: string;
  onComplete?: () => void | Promise<void>;
}

export function MedicalModal({ isOpen, onClose, processingId, onComplete }: MedicalModalProps) {
  const { data, isLoading, error, refetch } = useGetMedicalRequirementsQuery(processingId, {
    skip: !isOpen || !processingId,
  });

  const [uploadDocument, { isLoading: isUploading }] = useUploadDocumentMutation();
  const [createDocument] = useCreateDocumentMutation();
  const [reuseDocument, { isLoading: isReusing }] = useReuseDocumentMutation();
  const [completeStep, { isLoading: isCompletingStep }] = useCompleteStepMutation();
  const [reuploadProcessingDocument, { isLoading: isReuploadingProcessing }] = useReuploadProcessingDocumentMutation();
  const [verifyProcessingDocument, { isLoading: isVerifying }] = useVerifyProcessingDocumentMutation();
  const [submitMedicalDate, { isLoading: isSubmittingDate }] = useSubmitHrdDateMutation();

  // Cancel step mutation + UI state
  const [cancelStep, { isLoading: isCancelling }] = useCancelStepMutation();
  const [cancelOpen, setCancelOpen] = useState(false);

  // Medical submission date state
  const [medicalSubmissionDate, setMedicalSubmissionDate] = useState<Date | undefined>(undefined);

  // Medical result + MOFA + notes
  // isMedicalPassed: null = not selected, true = passed, false = failed
  const [isMedicalPassed, setIsMedicalPassed] = useState<boolean | null>(null);
  const [mofaNumber, setMofaNumber] = useState<string>("");
  const [medicalNotes, setMedicalNotes] = useState<string>("");

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

  // Completion flag from API (support both HRD-shaped responses and explicit medical flag)
  const isMedicalCompleted = data?.isMedicalCompleted ?? data?.isHrdCompleted ?? false;

  // Whether this specific step has been cancelled
  const isStepCancelled = activeStep?.status === 'cancelled';

  // Initialize form state from API when modal opens (only once per open — preserves user edits during session)
  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    if (!isOpen) {
      // Reset initialization flag when modal closes so next open rehydrates from API
      initializedRef.current = false;
      return;
    }

    // Only initialize once after opening and when API data is available
    if (!data || initializedRef.current) return;

    const apiPassed = (data?.step?.isMedicalPassed !== undefined) ? data.step.isMedicalPassed : (data?.isMedicalPassed ?? null);
    setIsMedicalPassed(apiPassed ?? null);
    setMofaNumber(data?.step?.mofaNumber ?? data?.mofaNumber ?? "");
    setMedicalNotes(data?.step?.notes ?? data?.notes ?? "");

    initializedRef.current = true;
  }, [isOpen, data]);

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
      const doc = d.document || d.processingDocument?.document || d;
      const docType = doc?.docType || d.docType || d.processingDocument?.docType;
      const status = d.processingDocument?.status || d.processingDocument?.processingStatus || doc?.status || d.status;
      const fileName = d.document?.fileName || doc?.fileName;
      const fileUrl = d.document?.fileUrl || doc?.fileUrl;
      const mimeType = d.document?.mimeType || doc?.mimeType;
      const id = d.document?.id || d.processingDocument?.id || d.id;

      if (!docType) return;

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

    let mime = pdoc?.mimeType || cdoc?.mimeType;
    const fileName = pdoc?.fileName || cdoc?.fileName || "Document";

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

    setViewerMimeType(mime || undefined);
    setViewerFileName(fileName);
    setViewerUrl(url);
    setViewerOpen(true);
  };

  const handleVerifyClick = (docType: string, label?: string, roleCatalog?: string, roleLabel?: string) => {
    const pdocs = processingDocsByDocType[docType] || [];
    if (pdocs.length > 0) {
      toast.success("Document already in processing");
      return;
    }

    const cdocs = candidateDocsByDocType[docType] || [];
    const cdoc = cdocs[cdocs.length - 1];

    if (!cdoc) {
      toast("No candidate document found. Please upload a document to verify.");
      setSelectedDocType(docType);
      setSelectedDocLabel(label || "");
      setSelectedRoleCatalog(roleCatalog);
      setSelectedRoleLabel(roleLabel);
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

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", selectedDocType);
      if (selectedRoleCatalog) {
        formData.append("roleCatalogId", selectedRoleCatalog);
      }

      const uploadResp = await uploadDocument({ candidateId: candidate.candidate.id, formData }).unwrap();
      const uploadData = uploadResp.data;

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
          toast.success(resp?.message || "File re-uploaded and sent for processing");
        } catch (reErr: any) {
          console.error("Processing reupload failed", reErr);
          toast.error(reErr?.data?.message || reErr?.error || "Failed to reupload document for processing");
        } finally {
          setReplaceOldDocumentId(null);
          setReplaceCandidateProjectMapId(null);
          setUploadModalOpen(false);
          await refetch();
        }

        return;
      }

      const createResp = await createDocument({
        candidateId: candidate.candidate.id,
        docType: selectedDocType,
        fileName: uploadData?.fileName || file.name,
        fileUrl: uploadData?.fileUrl || "",
        ...(selectedRoleCatalog && { roleCatalogId: selectedRoleCatalog }),
      }).unwrap();

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
        toast.warning(reuseErr?.data?.message || "Uploaded but reuse failed");
      }

      setUploadModalOpen(false);
      await refetch();
    } catch (err: any) {
      console.error("Medical upload error", err);
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

    if (statMissing > 0) {
      const missingSummary = missingDocs.length > 2 ? `${missingDocs.slice(0,2).join(', ')} +${missingDocs.length - 2} more` : missingDocs.join(', ');
      toast.error(`Cannot complete — Missing: ${missingSummary}`);
      return;
    }

    // Require medical pass/fail selection
    if (isMedicalPassed === null) {
      toast.error("Please select Medical result (Passed or Failed)");
      return;
    }

    // MOFA number is required for both Passed and Failed
    if (!mofaNumber || !mofaNumber.trim()) {
      toast.error("Please enter MOFA number");
      return;
    }

    if (!allVerified) {
      toast.error("Cannot complete — All mandatory documents must be verified");
      return;
    }

    if (!hasSubmittedAt) {
      toast.error("Cannot complete — Submission date not set");
      return;
    }

    setCompleteModalOpen(true);
  };

  const handleConfirmComplete = async () => {
    if (!activeStep?.id) return false;

    try {
      const payload: any = { stepId: activeStep.id, isMedicalPassed, mofaNumber };
      if (medicalNotes) payload.notes = medicalNotes;

      // Call the complete-step API for Medical and surface success / errors
      await completeStep(payload).unwrap();

      if (isMedicalPassed) {
        toast.success("Medical step marked complete");
      } else {
        toast.success("Medical marked failed — processing cancelled");
      }

      setCompleteModalOpen(false);
      await refetch();

      if (onComplete) {
        await onComplete();
      }

      onClose();
      return true;
    } catch (err: any) {
      console.error("Mark Medical complete failed", err);
      const msg = err?.data?.message || err?.error || "Failed to complete Medical step";
      toast.error(msg);
      return false;
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

  const handleSubmitMedicalDate = async (date?: Date): Promise<boolean> => {
    if (!activeStep?.id) {
      toast.error("No active step found");
      return false;
    }

    const payloadDate = date ?? medicalSubmissionDate;

    if (!payloadDate) {
      toast.error("Please select a date and time");
      return false;
    }

    try {
      await submitMedicalDate({
        stepId: activeStep.id,
        submittedAt: payloadDate.toISOString(),
      }).unwrap();
      toast.success("Medical submission date saved successfully");
      await refetch();
      return true;
    } catch (err: any) {
      console.error("Submit Medical date failed", err);
      toast.error(err?.data?.message || "Failed to save Medical submission date");
      return false;
    }
  };

  // Helper: copy MOFA number to clipboard with feedback
  const handleCopyMofa = async () => {
    if (!mofaNumber) {
      toast.error("No MOFA number to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(mofaNumber);
      toast.success("MOFA copied");
    } catch (err) {
      console.error("Copy MOFA failed", err);
      toast.error("Failed to copy MOFA");
    }
  }; 

  const apiCounts = data?.counts;
  const computedStats = getDocStats();
  const missingDocs = getMissingMandatory();

  const statTotal = apiCounts?.totalMandatory ?? computedStats.mandatory;
  const statVerified = apiCounts?.verifiedCount ?? computedStats.verified;
  const statMissing = apiCounts?.missingCount ?? missingDocs.length;

  const hasSubmittedAt = Boolean(activeStep?.submittedAt);

  const allVerified = statTotal > 0 ? statVerified >= statTotal : statMissing === 0;
  const canMarkComplete = allVerified && hasSubmittedAt && isMedicalPassed !== null;

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
                <DialogTitle className="text-lg font-bold text-white">Medical Attestation</DialogTitle>
                <DialogDescription className="text-sm text-white/70">Upload and verify required medical documents</DialogDescription>
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
              <div className="text-sm text-slate-600">Could not load Medical requirements.</div>
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

              {/* Submission Date Section */}
              <div className="border rounded-lg overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="bg-blue-100 px-3 py-1 border-b border-blue-200">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Medical Submission Date & Time
                  </h4>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 w-full sm:w-auto">
                      <Label className="text-xs text-slate-600 mb-1 block">Select submission date and time</Label>

                      {activeStep?.submittedAt ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-slate-800">{format(new Date(activeStep.submittedAt), "PPP 'at' p")}</div>
                            <Badge className="text-[11px] bg-emerald-100 text-emerald-700 px-2">Submitted</Badge>
                          </div>

                          {!isMedicalCompleted && !isStepCancelled && (
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
                            value={medicalSubmissionDate}
                            onChange={setMedicalSubmissionDate}
                            placeholder="Pick date and time"
                            disabled={isMedicalCompleted}
                            className="w-full sm:min-w-[220px] h-8"
                            compact
                          />

                          {!activeStep?.submittedAt && (
                            <div className="mt-1">
                              {medicalSubmissionDate ? (
                                <p className="text-xs text-slate-500">Click <span className="font-medium">Submit Date</span> to save the submission time.</p>
                              ) : (
                                <p className="text-xs text-rose-600 flex items-center gap-2"><XCircle className="h-3.5 w-3.5" /> Submission date is required to complete Medical</p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex items-center">
                      {!activeStep?.submittedAt && !isStepCancelled && (
                        <Button
                          size="sm"
                          onClick={() => setSubmitConfirmOpen(true)}
                          disabled={isSubmittingDate || !medicalSubmissionDate || isMedicalCompleted || isStepCancelled}
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
                  {isMedicalCompleted && (
                    <p className="text-xs text-slate-500 mt-2">Medical is completed. Submission date cannot be modified.</p>
                  )}


                </div>
              </div>

              {/* MOFA number panel (left-aligned, outside Submission Date) */}
              <div className="mt-3">
                <div className="w-full sm:w-1/2">
                  {isMedicalCompleted || isStepCancelled ? (
                    <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-3 rounded-md border border-amber-200 border-l-4 border-amber-400 shadow-sm">
                      <div className="text-xs text-amber-700 font-semibold">MOFA number</div>
                      <div className="mt-1 flex items-center gap-3">
                        <div className="font-medium text-amber-900">{mofaNumber || '—'}</div>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCopyMofa} title="Copy MOFA">
                          <Copy className="h-4 w-4 text-amber-700" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-3 rounded-md border border-amber-200 border-l-4 border-amber-400 shadow-sm">
                      <label className="text-xs text-amber-700 mb-1 block">MOFA number</label>
                      <Input
                        value={mofaNumber}
                        onChange={(e) => setMofaNumber(e.target.value)}
                        placeholder="Enter MOFA number"
                        className="h-9"
                        required
                        aria-required="true"
                      />
                      <p className="text-xs text-amber-600 mt-1">Required — MOFA number is required for both Passed and Failed results.</p>
                    </div>
                  )} 
                </div>
              </div>

              {/* Medical result + MOFA (user story) */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 border-b">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">Medical result</h4>
                </div>

                {/* Show persisted/read-only result when API contains an explicit boolean OR step is completed/cancelled */}
                {( (data?.step?.isMedicalPassed === true || data?.step?.isMedicalPassed === false) || isMedicalCompleted || isStepCancelled) ? (
                  <div className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold ${isMedicalPassed ? 'bg-emerald-600 text-white' : 'bg-rose-100 text-rose-700'}`}>
                        {isMedicalPassed ? 'Passed' : 'Failed'}
                      </div>

                      <div className="text-sm text-slate-700">{isMedicalPassed ? 'Candidate passed Medical' : 'Candidate failed Medical'}</div>

                      <div className="mt-3 w-full">
                        <div className="flex items-center justify-between bg-amber-50 p-2 rounded-md border border-amber-100">
                          <div className="text-xs text-amber-700 font-semibold">MOFA number</div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-amber-900">{mofaNumber || '—'}</div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCopyMofa} title="Copy MOFA">
                              <Copy className="h-4 w-4 text-amber-700" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {medicalNotes && (
                      <div className="mt-3 text-xs text-slate-500">Notes: <span className="font-medium text-slate-700">{medicalNotes}</span></div>
                    )}

                    {activeStep?.rejectionReason && (
                      <div className="mt-3 text-xs text-rose-600">Reason: <span className="font-medium text-rose-700">{activeStep.rejectionReason}</span></div>
                    )}

                    <div className="mt-3 text-xs text-slate-500">Status: <span className="font-medium">{activeStep?.status || (isMedicalPassed ? 'completed' : 'cancelled')}</span></div>
                  </div>
                ) : (
                  <div className="p-3 flex flex-col gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="text-sm text-slate-700 font-medium">Result</div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-pressed={isMedicalPassed === true}
                          onClick={() => setIsMedicalPassed(true)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold ${isMedicalPassed === true ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700'}`}
                        >
                          Passed
                        </button>

                        <button
                          type="button"
                          aria-pressed={isMedicalPassed === false}
                          onClick={() => { setIsMedicalPassed(false); }}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold ${isMedicalPassed === false ? 'bg-rose-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700'}`}
                        >
                          Failed
                        </button>
                      </div>

                      <div className="ml-auto text-xs text-slate-500">Required — select Passed or Failed before completing</div>
                    </div>

                      {isMedicalPassed === false && (
                        <div className="text-sm text-rose-600 font-medium">Marking as <span className="font-black">Failed</span> will cancel processing for this candidate.</div>
                      )}
                  </div>
                )}
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

                          {isMedicalCompleted ? (
                            <Badge className="text-[11px] bg-emerald-100 text-emerald-700 px-2">Medical Completed</Badge>
                          ) : isStepCancelled ? (
                            <Badge className="text-[11px] bg-rose-100 text-rose-700 px-2">Step Cancelled</Badge>
                          ) : (
                            <>
                              {!hasProcessing ? (
                                <>
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
                                        candidateDoc?.verifications?.length ? candidateDoc.verifications[candidateDoc.verifications.length - 1].candidateProjectMapId : undefined
                                      )}
                                    >
                                      <Upload className="h-3 w-3 mr-1" />
                                      Re-upload
                                    </Button>
                                  )}

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

              {!isMedicalCompleted && !isStepCancelled && (
                <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)} disabled={isCancelling}>
                  {isCancelling ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Cancel Step
                </Button>
              )}

              {isMedicalCompleted ? (
                <Badge className="text-[11px] bg-emerald-100 text-emerald-700 px-2">Medical Completed ✓</Badge>
              ) : isStepCancelled ? (
                <Badge className="text-[11px] bg-rose-100 text-rose-700 px-2">Step Cancelled</Badge>
              ) : (
                !allVerified ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button size="sm" disabled className="opacity-80" aria-disabled>
                            {'Mark Medical Complete'}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>All mandatory documents must be verified before marking Medical complete. Verified {statVerified}/{statTotal}</p>
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
                            {'Mark Medical Complete'}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Submission date required to complete Medical. Please select and submit a date.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : isMedicalPassed === null ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button size="sm" disabled className="opacity-80" aria-disabled>
                            {'Mark Medical Complete'}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Please select the Medical result (Passed or Failed) before completing.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : !mofaNumber ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button size="sm" disabled className="opacity-80" aria-disabled>
                            {'Mark Medical Complete'}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>MOFA number is required. Please enter MOFA number before completing.</p>
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
                    {isCompletingStep ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark Medical Complete'}
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
          date={medicalSubmissionDate}
          onConfirm={async () => {
            const ok = await handleSubmitMedicalDate();
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
            const ok = await handleSubmitMedicalDate(newDate);
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

      {/* Confirm Medical Result Modal (replaces generic confirmation for Medical step) */}
      <React.Suspense fallback={null}>
        <ConfirmMedicalModal
          isOpen={completeModalOpen}
          onClose={() => setCompleteModalOpen(false)}
          isMedicalPassed={isMedicalPassed}
          mofaNumber={mofaNumber}
          notes={medicalNotes}
          onNotesChange={setMedicalNotes}
          isSubmitting={isCompletingStep}
          onConfirm={handleConfirmComplete}
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

export default MedicalModal;
