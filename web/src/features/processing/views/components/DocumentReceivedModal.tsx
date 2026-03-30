import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, FileCheck, Upload, CheckCircle2, XCircle, Clock, RefreshCw, File, Eye, Calendar, Send, Edit3 } from "lucide-react";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import React, { useState, useMemo } from "react";
import { DatePicker } from "@/components/molecules/DatePicker";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { EditReceivedDateModal } from "@/components/EditReceivedDateModal";
const UploadDocumentModal = React.lazy(() => import("../../components/UploadDocumentModal"));
const VerifyProcessingDocumentModal = React.lazy(() => import("../../components/VerifyProcessingDocumentModal"));
const CompleteProcessingStepModal = React.lazy(() => import("../../components/CompleteProcessingStepModal"));
const ConfirmSubmitDateModal = React.lazy(() => import("../../components/ConfirmSubmitDateModal"));
const ConfirmEditSubmitDateModal = React.lazy(() => import("../../components/ConfirmEditSubmitDateModal"));
const ConfirmCancelStepModal = React.lazy(() => import("../../components/ConfirmCancelStepModal"));
import { useUploadDocumentMutation } from "@/features/candidates/api";
import { useCreateDocumentMutation } from "@/services/documentsApi";
import { useReuseDocumentMutation } from "@/features/documents/api";
import { toast } from "sonner";
import { useVerifyProcessingDocumentMutation, useCompleteStepMutation, useCancelStepMutation, useGetDocumentReceivedRequirementsQuery, useSubmitHrdDateMutation, useReuploadProcessingDocumentMutation, useSetProcessingDocumentReceivedDateMutation } from "@/services/processingApi";

interface DocumentReceivedModalProps {
  isOpen: boolean;
  onClose: () => void;
  processingId: string;
  candidateProjectMapId?: string;
  onComplete?: () => void | Promise<void>;

}

export function DocumentReceivedModal({ isOpen, onClose, processingId, candidateProjectMapId, onComplete }: DocumentReceivedModalProps) {
  // Use RTK Query to fetch requirements (ensures auth & caching)
  const { data, isLoading, error, refetch: refetchRequirements } = useGetDocumentReceivedRequirementsQuery(processingId, { skip: !isOpen || !processingId });

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const [selectedDocLabel, setSelectedDocLabel] = useState<string>("");
  const [selectedRoleCatalog, setSelectedRoleCatalog] = useState<string | undefined>(undefined);
  const [selectedRoleLabel, setSelectedRoleLabel] = useState<string | undefined>(undefined);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerFileName, setViewerFileName] = useState<string>("");
  const [viewerMimeType, setViewerMimeType] = useState<string | undefined>(undefined);

  // mutations reused
  const [uploadDocument, { isLoading: isUploading }] = useUploadDocumentMutation();
  const [createDocument] = useCreateDocumentMutation();
  const [reuseDocument, { isLoading: isReusing }] = useReuseDocumentMutation();

  const [verifyProcessingDocument, { isLoading: isVerifying }] = useVerifyProcessingDocumentMutation();
  const [reuploadProcessingDocument, { isLoading: isReuploadingProcessing }] = useReuploadProcessingDocumentMutation();
  const [setProcessingDocumentReceivedDate, { isLoading: isSettingReceivedDate }] = useSetProcessingDocumentReceivedDateMutation();
  const [completeStep, { isLoading: isCompletingStep }] = useCompleteStepMutation();
  const [cancelStep, { isLoading: isCancelling }] = useCancelStepMutation();
  const [submitHrdDate, { isLoading: isSubmittingDate }] = useSubmitHrdDateMutation();

  // Submission date state (mirrors HRD modal)
  const [submissionDate, setSubmissionDate] = useState<Date | undefined>(undefined);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [editSubmitOpen, setEditSubmitOpen] = useState(false);
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);

  // Document receivedAt date input state per verification/document
  const [receivedDateInputs, setReceivedDateInputs] = useState<Record<string, Date | undefined>>({});
  const [isEditReceivedDateModalOpen, setIsEditReceivedDateModalOpen] = useState(false);
  const [editReceivedDateVerificationId, setEditReceivedDateVerificationId] = useState<string | null>(null);
  const [editReceivedDateDocumentLabel, setEditReceivedDateDocumentLabel] = useState<string>('');
  const [editReceivedDateValue, setEditReceivedDateValue] = useState<Date | undefined>(undefined);

  // Reupload context (when replacing an existing document)
  const [replaceOldDocumentId, setReplaceOldDocumentId] = useState<string | null>(null);
  const [replaceCandidateProjectMapId, setReplaceCandidateProjectMapId] = useState<string | null>(null);



  const requiredDocuments: any[] = data?.requiredDocuments || [];
  const uploads: any[] = data?.uploads || [];
  const candidate = data?.processingCandidate || data?.candidate; // flexible payload
  const activeStep = data?.step || data?.activeStep;

  const uploadsByDocType = useMemo(() => {
    const map: Record<string, any[]> = {};
    uploads.forEach((u: any) => {
      map[u.docType] = map[u.docType] || [];
      map[u.docType].push(u);
    });
    return map;
  }, [uploads]);

  const candidateDocs = data?.candidateDocuments || [];
  const candidateDocsByDocType = useMemo(() => {
    const map: Record<string, any[]> = {};
    candidateDocs.forEach((d: any) => {
      map[d.docType] = map[d.docType] || [];
      map[d.docType].push(d);
    });
    // Sort each list by createdAt descending
    Object.keys(map).forEach(type => {
      map[type].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
    return map;
  }, [candidateDocs]);

  const processingDocs = data?.processing_documents || [];
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
      const createdAt = d.document?.createdAt || doc?.createdAt || d.createdAt;
      
      if (!docType) return;
      const receivedAt = d.receivedAt || d.verification?.receivedAt || d.document?.receivedAt || d.createdAt;
      const normalized = { ...d, docType, status, fileName, fileUrl, mimeType, id, createdAt, receivedAt };
      map[docType] = map[docType] || [];
      map[docType].push(normalized);
    });
    // Sort each list by createdAt descending
    Object.keys(map).forEach(type => {
      map[type].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
    return map;
  }, [processingDocs]);

  // Viewer
  const handleViewDocument = (docType: string) => {
    const pdocs = processingDocsByDocType[docType] || [];
    const cdocs = candidateDocsByDocType[docType] || [];
    const pdoc = pdocs[0];
    const cdoc = cdocs[0];
    const url = pdoc?.fileUrl || cdoc?.fileUrl;
    if (!url) { toast('No document available to view'); return; }
    let mime = pdoc?.mimeType || cdoc?.mimeType;
    const fileName = pdoc?.fileName || cdoc?.fileName || 'Document';
    const tryInferFromUrl = (u?: string) => {
      if (!u) return null;
      const clean = u.split('?')[0].toLowerCase();
      if (/\.pdf$/.test(clean)) return 'application/pdf';
      if (/\.(jpe?g|png|gif|bmp|webp|svg)$/.test(clean)) return 'image/*';
      return null;
    };
    if (!mime) mime = tryInferFromUrl(pdoc?.fileUrl) || tryInferFromUrl(cdoc?.fileUrl) || tryInferFromUrl(fileName);
    setViewerMimeType(mime || undefined);
    setViewerFileName(fileName);
    setViewerUrl(url);
    setViewerOpen(true);
  };

  // Upload handlers (reuse existing flows)
  const handleUploadClick = (docType: string, docLabel: string, roleCatalog?: string, roleLabel?: string, oldDocumentId?: string, candidateProjectMapId?: string) => {
    setSelectedDocType(docType);
    setSelectedDocLabel(docLabel);
    setSelectedRoleCatalog(roleCatalog);
    setSelectedRoleLabel(roleLabel);
    setReplaceOldDocumentId(oldDocumentId ?? null);
    setReplaceCandidateProjectMapId(candidateProjectMapId ?? null);
    setUploadModalOpen(true);
  };

  const handleOpenEditReceivedDate = (verificationId: string, label: string, currentDate?: string | null) => {
    setEditReceivedDateVerificationId(verificationId);
    setEditReceivedDateDocumentLabel(label);
    setEditReceivedDateValue(currentDate ? new Date(currentDate) : undefined);
    setIsEditReceivedDateModalOpen(true);
  };

  const handleSaveReceivedDate = async (date: Date) => {
    if (!editReceivedDateVerificationId) {
      toast.error('Missing document verification ID');
      return false;
    }

    try {
      await setProcessingDocumentReceivedDate({
        verificationId: editReceivedDateVerificationId,
        receivedAt: date.toISOString(),
        processingId,
      }).unwrap();
      toast.success('Received date updated');
      setIsEditReceivedDateModalOpen(false);
      await refetchRequirements();
      return true;
    } catch (err: any) {
      console.error('Set received date failed', err);
      toast.error(err?.data?.message || 'Failed to set received date');
      return false;
    }
  };

  const handleUploadFile = async (file: File) => {
    const candidateId = candidate?.candidate?.id || candidate?.id;
    if (!candidateId) {
      toast.error('Missing candidate id');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', selectedDocType);
      if (selectedRoleCatalog) formData.append('roleCatalogId', selectedRoleCatalog);
      const uploadResp = await uploadDocument({ candidateId, formData }).unwrap();
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
          toast.success(resp?.message || "File re-uploaded and sent for processing");
        } catch (reErr: any) {
          console.error("Processing reupload failed", reErr);
          toast.error(reErr?.data?.message || reErr?.error || "Failed to reupload document for processing");
        } finally {
          // clear reupload context
          setReplaceOldDocumentId(null);
          setReplaceCandidateProjectMapId(null);
          setUploadModalOpen(false);
          await refetchRequirements();
        }

        return;
      }

      // Create processing document entry
      const createResp = await createDocument({ candidateId, docType: selectedDocType, fileName: uploadData?.fileName || file.name, fileUrl: uploadData?.fileUrl || '' }).unwrap();
      const documentId = createResp.data.id;
      try {
        await reuseDocument({ documentId, projectId: candidate?.project?.id || '', roleCatalogId: selectedRoleCatalog || '' }).unwrap();
        toast.success('File uploaded and reused successfully');
      } catch (reuseErr: any) {
        toast.warning(reuseErr?.data?.message || 'Uploaded but reuse failed');
      }
      setUploadModalOpen(false);

      if (isOpen) {
        // simple refetch: call endpoint again
        const refetchResult = await refetchRequirements();

      }
    } catch (err: any) {
      console.error('Upload error', err);
      toast.error(err?.data?.message || 'Failed to upload');
    }
  };

  // verify modal state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyDocId, setVerifyDocId] = useState<string>('');
  const [verifyDocLabel, setVerifyDocLabel] = useState<string>('');

  const handleVerifyClick = (docType: string, label?: string, roleCatalog?: string, roleLabel?: string) => {
    const pdocs = processingDocsByDocType[docType] || [];
    if (pdocs.length > 0) {
      // Already present in processing. Nothing to do here (backend action expected later)
      toast.success("Document already in processing");
      return;
    }

    const cdocs = candidateDocsByDocType[docType] || [];
    const cdoc = cdocs[0];

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
      await verifyProcessingDocument({ documentId: verifyDocId, processingStepId: activeStep.id, notes: notes || undefined }).unwrap();
      toast.success('Document verified successfully');
      setVerifyModalOpen(false);
      // refetch
      try { await refetchRequirements(); } catch (err) { }
    } catch (err: any) {
      console.error('Verification failed', err);
      toast.error(err?.data?.message || 'Failed to verify document');
    }
  };

  // Completion helpers
  const getMissingMandatory = () => {
    const missing: string[] = [];
    requiredDocuments.forEach((req) => {
      if (!req.mandatory) return;
      const uploadsForDocType = uploadsByDocType[req.docType] || [];
      const anyVerified = uploadsForDocType.some((u: any) => u.status === 'verified');
      if (!anyVerified) missing.push(req.label);
    });
    return missing;
  };

  const getDocStats = () => {
    const mandatory = requiredDocuments.filter((r) => r.mandatory).length;
    const verified = requiredDocuments.filter((r) => {
      const uploadsForDocType = uploadsByDocType[r.docType] || [];
      return uploadsForDocType.some((u: any) => u.status === 'verified');
    }).length;
    return { mandatory, verified, total: requiredDocuments.length };
  };

  const apiCounts = data?.counts;
  const computedStats = getDocStats();
  const missingDocs = getMissingMandatory();
  const statTotal = apiCounts?.totalMandatory ?? computedStats.mandatory;
  const statVerified = apiCounts?.verifiedCount ?? computedStats.verified;
  const statMissing = apiCounts?.missingCount ?? missingDocs.length;

  // Submitted date helpers
  const hasSubmittedAt = Boolean(activeStep?.submittedAt);

  // Footer actions
  const handleMarkComplete = async () => {
    if (!activeStep?.id) return;
    if (statMissing > 0) { toast.error('Cannot complete — Missing mandatory docs'); return; }
    if (!hasSubmittedAt) { toast.error('Cannot complete — Submission date not set'); return; }
    setCompleteModalOpen(true);
  };

  // Submit date handlers
  const handleSubmitDate = async (date?: Date): Promise<boolean> => {
    if (!activeStep?.id) {
      toast.error('No active step');
      return false;
    }
    const payloadDate = date ?? submissionDate;
    if (!payloadDate) { toast.error('Please select a date and time'); return false; }
    try {
      await submitHrdDate({ stepId: activeStep.id, submittedAt: payloadDate.toISOString() }).unwrap();
      toast.success('Submission date saved successfully');
      try { await refetchRequirements(); } catch (err) { /* ignore */ }
      return true;
    } catch (err: any) {
      console.error('Submit date failed', err);
      toast.error(err?.data?.message || 'Failed to save submission date');
      return false;
    }
  };
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const handleConfirmComplete = async () => {
    if (!activeStep?.id) return;
    try {
      await completeStep({ stepId: activeStep.id }).unwrap();
      toast.success('Step marked complete');
      setCompleteModalOpen(false);
      if (onComplete) await onComplete();
      onClose();
    } catch (err: any) {
      console.error('Complete failed', err);
      toast.error(err?.data?.message || 'Failed to complete step');
    }
  };

  const [cancelOpen, setCancelOpen] = useState(false);
  const handleConfirmCancel = async (reason: string): Promise<void> => {
    if (!activeStep?.id) {
      toast.error('No active step');
      return;
    }
    try {
      await cancelStep({ stepId: activeStep.id, reason }).unwrap();
      toast.success('Processing step cancelled');
      setCancelOpen(false);
      if (onComplete) await onComplete();
      onClose();
    } catch (err: any) {
      console.error('Cancel failed', err);
      toast.error(err?.data?.message || 'Failed to cancel step');
    }
  };

  // Reuse upload modal & verify modal & confirm modals similar to HRD modal
  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center"><FileCheck className="h-5 w-5 text-white" /></div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">Document Received</DialogTitle>
                <DialogDescription className="text-sm text-white/70">View and verify required documents</DialogDescription>
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
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
          ) : error || !data ? (
            <Card className="p-8 text-center"><div className="h-14 w-14 rounded-full bg-rose-50 mx-auto mb-4 flex items-center justify-center"><AlertCircle className="h-7 w-7 text-rose-500" /></div><div className="text-sm text-slate-600">Could not load Document Received requirements.</div></Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center border"><div className="text-2xl font-black text-slate-700">{statTotal}</div><div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Docs</div></div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-100"><div className="text-2xl font-black text-emerald-600">{statVerified}</div><div className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold">Verified</div></div>
                <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100"><div className="text-2xl font-black text-amber-600">{statMissing}</div><div className="text-[10px] uppercase tracking-wider text-amber-600 font-bold">Missing</div></div>
              </div>

              {/* Submission Date Section (mirrors HRD) */}
              <div className="border rounded-lg overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="bg-blue-100 px-3 py-1 border-b border-blue-200">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Submission Date & Time
                  </h4>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 w-full sm:w-auto">
                      <Label className="text-xs text-slate-600 mb-1 block">Select submission date and time</Label>

                      {/* If step already has submittedAt, show the formatted submitted date and hide the picker */}
                      {activeStep?.submittedAt ? (
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-slate-700 font-semibold">{format(new Date(activeStep.submittedAt), "PPP p")}</div>
                          {!activeStep?.completedAt && (
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="ghost" onClick={() => { setEditDate(activeStep.submittedAt ? new Date(activeStep.submittedAt) : undefined); setEditSubmitOpen(true); }} className="h-8">Edit</Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <DatePicker
                            value={submissionDate}
                            onChange={setSubmissionDate}
                            placeholder="Pick date and time"
                            disabled={Boolean(activeStep?.completedAt)}
                            className="w-full sm:min-w-[220px] h-8"
                            compact
                          />

                          {/* Only show submit button when no submittedAt present and when step is not completed */}
                          {!activeStep?.submittedAt && !activeStep?.completedAt && (
                            <div className="text-xs text-slate-500 mt-2">Please set a submission date before marking this step complete.</div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex items-center">
                      {/* Show submit button when no submittedAt and not completed */}
                      {!activeStep?.submittedAt && !activeStep?.completedAt && (
                        <Button
                          size="sm"
                          onClick={() => setSubmitConfirmOpen(true)}
                          disabled={isSubmittingDate || !submissionDate || Boolean(activeStep?.completedAt)}
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
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 border-b"><h4 className="text-xs font-black uppercase tracking-wider text-slate-600">Required Documents</h4></div>
                <div className="divide-y max-h-[320px] overflow-auto">
                  {requiredDocuments.map((req: any) => {
                    const candidateList = candidateDocsByDocType[req.docType] || [];
                    const candidateDoc = candidateList[0];
                    const processingList = processingDocsByDocType[req.docType] || [];
                    const processingDoc = processingList[0];

                    const processingVerified = processingDoc?.status === 'verified';
                    const hasPending = (candidateDoc?.status === 'pending') || (processingDoc?.status === 'pending');
                    const hasRejected = (candidateDoc?.status === 'rejected') || (processingDoc?.status === 'rejected');
                    const hasProcessing = !!processingDoc;
                    const hasCandidate = !!candidateDoc;

                    const existingReceivedAt =
                      processingDoc?.receivedAt ||
                      processingDoc?.verification?.receivedAt ||
                      candidateDoc?.receivedAt ||
                      candidateDoc?.verifications?.[0]?.receivedAt;

                    const verificationId =
                      processingDoc?.verification?.id ||
                      candidateDoc?.verifications?.[0]?.id ||
                      null;

                    const dateKey = verificationId || req.docType;
                    const selectedReceivedDate =
                      receivedDateInputs[dateKey] ||
                      (existingReceivedAt ? new Date(existingReceivedAt) : undefined);

                    return (
                      <div key={req.docType} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${processingVerified ? 'border-emerald-200 bg-emerald-50/40 shadow-sm' : hasRejected ? 'border-rose-200 bg-rose-50/40 shadow-sm' : 'border-slate-200 bg-white'}`}>
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${processingVerified || (candidateDoc?.status === 'verified') ? 'bg-emerald-100' : hasPending ? 'bg-blue-100' : hasRejected ? 'bg-red-100' : 'bg-slate-100'}`}>
                          {processingVerified ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : hasPending ? <Clock className="h-4 w-4 text-blue-600" /> : hasRejected ? <XCircle className="h-4 w-4 text-red-500" /> : <Upload className="h-4 w-4 text-slate-400" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-800 truncate">{req.label}</span>
                            {req.mandatory ? <Badge className="text-[9px] bg-rose-100 text-rose-600 px-1.5 py-0 border-0">Required</Badge> : <Badge className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0 border-0">Optional</Badge>}
                          </div>
                          {(hasCandidate || hasProcessing) && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <span>Received: {existingReceivedAt ? format(new Date(existingReceivedAt), 'PPP') : 'Not set'}</span>
                              {verificationId && (
                                <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => handleOpenEditReceivedDate(verificationId, req.label, existingReceivedAt)} title="Edit received date">
                                  <Edit3 className="h-2 w-2" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {(hasCandidate || hasProcessing) && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleViewDocument(req.docType)} title="View document"><Eye className="h-4 w-4" /></Button>
                          )}


                          {!hasProcessing ? (
                            <>
                              {candidateDoc && (candidateDoc.status === 'pending' || candidateDoc.status === 'verified') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs font-semibold border-slate-200 hover:bg-slate-50"
                                  onClick={() => handleUploadClick(
                                    req.docType,
                                    req.label,
                                    candidate?.role?.roleCatalog?.id,
                                    candidate?.role?.roleCatalog?.label || candidate?.role?.designation,
                                    candidateDoc?.id,
                                    candidateProjectMapId || candidateDoc?.verifications?.[0]?.candidateProjectMapId
                                  )}
                                >
                                  <Upload className="h-3.5 w-3.5 mr-1.5" />Upload
                                </Button>
                              )}

                              {!candidateDoc && (
                                <Button size="sm" variant="default" className="h-8 text-xs" onClick={() => handleUploadClick(req.docType, req.label, candidate?.role?.roleCatalog?.id, candidate?.role?.roleCatalog?.label || candidate?.role?.designation)}>
                                  <Upload className="h-3 w-3 mr-1" />Upload
                                </Button>
                              )}

                              {candidateDoc && (
                                <Button size="sm" variant="default" onClick={() => handleVerifyClick(req.docType, req.label, candidate?.role?.roleCatalog?.id, candidate?.role?.roleCatalog?.label || candidate?.role?.designation)}>Verify</Button>
                              )}
                            </>
                          ) : processingVerified ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-semibold border-emerald-200 hover:bg-emerald-50 text-emerald-700"
                              onClick={() => handleUploadClick(
                                req.docType,
                                req.label,
                                candidate?.role?.roleCatalog?.id,
                                candidate?.role?.roleCatalog?.label || candidate?.role?.designation,
                                processingDoc?.id,
                                candidateProjectMapId || processingDoc?.candidateProjectMapId
                              )}
                            >
                              <Upload className="h-3 w-3 mr-1" />Re-upload
                            </Button>
                          ) : (
                            <div className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded">In processing</div>
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
            <div className="text-xs text-slate-500">{statMissing > 0 ? (<span className="text-amber-600 font-medium">Missing: {statMissing} — {missingDocs.slice(0,2).join(', ')}{missingDocs.length > 2 ? ` +${missingDocs.length - 2} more` : ''}</span>) : (<span className="text-emerald-600 font-medium">All mandatory documents verified ✓</span>)}</div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={async () => { try { await refetchRequirements(); toast.success('Refreshed'); } catch (err) { toast.error('Refresh failed'); } }}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>

              {/* Submit / Edit Date Confirmations */}
              <React.Suspense fallback={null}>
                <ConfirmSubmitDateModal
                  isOpen={submitConfirmOpen}
                  onClose={() => setSubmitConfirmOpen(false)}
                  date={submissionDate}
                  onConfirm={async () => { const ok = await handleSubmitDate(); if (ok) setSubmitConfirmOpen(false); }}
                  isSubmitting={isSubmittingDate}
                />
              </React.Suspense>

              <React.Suspense fallback={null}>
                <ConfirmEditSubmitDateModal
                  isOpen={editSubmitOpen}
                  onClose={() => setEditSubmitOpen(false)}
                  existingDate={editDate ? editDate.toISOString() : activeStep?.submittedAt}
                  onConfirm={async (newDate: Date) => { const ok = await handleSubmitDate(newDate); return ok; }}
                  isSubmitting={isSubmittingDate}
                />
              </React.Suspense>

              <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)} disabled={isCancelling}>{isCancelling ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Cancel Step</Button>

              <Button size="sm" onClick={handleMarkComplete} disabled={isCompletingStep || statMissing > 0 || !hasSubmittedAt}>{isCompletingStep ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark Step Complete'}</Button>
            </div>
          </div>
        )}
      </DialogContent>

      <React.Suspense fallback={<div className="p-4">Loading...</div>}>
        <UploadDocumentModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          docType={selectedDocType}
          docLabel={selectedDocLabel}
          roleCatalog={selectedRoleCatalog}
          roleLabel={selectedRoleLabel}
          onUpload={handleUploadFile}
          isUploading={isUploading || isReusing}
        />
      </React.Suspense>

      <EditReceivedDateModal
        isOpen={isEditReceivedDateModalOpen}
        onClose={() => setIsEditReceivedDateModalOpen(false)}
        documentLabel={editReceivedDateDocumentLabel}
        currentDate={editReceivedDateValue ? editReceivedDateValue.toISOString() : undefined}
        onConfirm={handleSaveReceivedDate}
        isSaving={isSettingReceivedDate}
      />

      <React.Suspense fallback={null}>
        <VerifyProcessingDocumentModal isOpen={verifyModalOpen} onClose={() => setVerifyModalOpen(false)} documentId={verifyDocId} documentLabel={verifyDocLabel} processingStepId={activeStep?.id || ''} onConfirm={handleConfirmVerify} isVerifying={isVerifying} />
      </React.Suspense>

      <React.Suspense fallback={null}>
        <CompleteProcessingStepModal isOpen={completeModalOpen} onClose={() => setCompleteModalOpen(false)} requiredDocuments={requiredDocuments} uploadsByDocType={uploadsByDocType} candidateDocsByDocType={candidateDocsByDocType} processingDocsByDocType={processingDocsByDocType} onConfirm={handleConfirmComplete} isCompleting={isCompletingStep} onViewDocument={handleViewDocument} />
      </React.Suspense>

      <React.Suspense fallback={null}>
        <ConfirmCancelStepModal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={handleConfirmCancel} isCancelling={isCancelling} />
      </React.Suspense>

      {viewerUrl && viewerMimeType && viewerMimeType.includes('pdf') && (<PDFViewer fileUrl={viewerUrl} fileName={viewerFileName} isOpen={viewerOpen} onClose={() => setViewerOpen(false)} />)}
      {viewerUrl && (!viewerMimeType || viewerMimeType.startsWith('image/')) && (
        <Dialog open={viewerOpen} onOpenChange={(v) => { if (!v) setViewerOpen(false); }}>
          <DialogContent className="sm:max-w-3xl max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3"><File className="h-5 w-5 text-blue-600" /><div className="font-semibold">{viewerFileName}</div></div>
                <div><Button variant="ghost" size="sm" onClick={() => setViewerOpen(false)}>Close</Button></div>
              </DialogTitle>
            </DialogHeader>
            <div className="p-4 flex justify-center"><img src={viewerUrl} alt={viewerFileName} className="max-h-[70vh] object-contain" /></div>
          </DialogContent>
        </Dialog>
      )}

    </Dialog>
  );
}

export default DocumentReceivedModal;
