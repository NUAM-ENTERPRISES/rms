import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, FileCheck, Upload, CheckCircle2, XCircle, Eye, BookUser, AlertCircle } from "lucide-react";
import { DatePicker } from "@/components/molecules/DatePicker";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import React, { useState, useMemo, useEffect } from "react";
const UploadDocumentModal = React.lazy(() => import("../../components/UploadDocumentModal"));
const VerifyProcessingDocumentModal = React.lazy(() => import("../../components/VerifyProcessingDocumentModal"));
const CompleteProcessingStepModal = React.lazy(() => import("../../components/CompleteProcessingStepModal"));
const ConfirmCancelStepModal = React.lazy(() => import("../../components/ConfirmCancelStepModal"));
import { useGetVisaRequirementsQuery, useCompleteStepMutation, useReuploadProcessingDocumentMutation, useVerifyProcessingDocumentMutation, useCancelStepMutation, useUpdateStepStatusMutation } from "@/services/processingApi";
import { useUploadDocumentMutation, useUpdateCandidateMutation } from "@/features/candidates/api";
import { useCreateDocumentMutation } from "@/services/documentsApi";
import { useReuseDocumentMutation } from "@/features/documents/api";
import { toast } from "sonner";
import { format } from "date-fns";
import VerifyAllDocumentsControl from "../../components/VerifyAllDocumentsControl";
import { getUploadErrorMessage } from "@/lib/document-upload";
import { resolveCandidatePassportNumber } from "@/features/candidates/utils/candidate-passport.util";



interface VisaModalProps {
  isOpen: boolean;
  onClose: () => void;
  processingId: string;
  candidateProjectMapId?: string;
  onComplete?: () => void | Promise<void>;
}

export function VisaModal({ isOpen, onClose, processingId, candidateProjectMapId, onComplete }: VisaModalProps) {
  const { data, isLoading, error, refetch } = useGetVisaRequirementsQuery(processingId, {
    skip: !isOpen || !processingId,
  });

  const [uploadDocument, { isLoading: isUploading }] = useUploadDocumentMutation();
  const [createDocument] = useCreateDocumentMutation();
  const [reuseDocument, { isLoading: isReusing }] = useReuseDocumentMutation();
  const [completeStep, { isLoading: isCompletingStep }] = useCompleteStepMutation();
  const [reuploadProcessingDocument, { isLoading: isReuploadingProcessing }] = useReuploadProcessingDocumentMutation();
  const [verifyProcessingDocument, { isLoading: isVerifying }] = useVerifyProcessingDocumentMutation();
  const [updateStepStatus, { isLoading: isUpdatingVisa }] = useUpdateStepStatusMutation();
  const [updateCandidate, { isLoading: isUpdatingCandidate }] = useUpdateCandidateMutation();

  // Cancel step mutation + UI state
  const [cancelStep, { isLoading: isCancelling }] = useCancelStepMutation();
  const [cancelOpen, setCancelOpen] = useState(false);

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

  // Visa metadata state
  const [visaIssuedDate, setVisaIssuedDate] = useState<Date | undefined>(undefined);
  const [visaExpiryDate, setVisaExpiryDate] = useState<Date | undefined>(undefined);
  const [initialVisaIssuedDate, setInitialVisaIssuedDate] = useState<Date | undefined>(undefined);
  const [initialVisaExpiryDate, setInitialVisaExpiryDate] = useState<Date | undefined>(undefined);
  const [passportNumber, setPassportNumber] = useState("");
  const [initialPassportNumber, setInitialPassportNumber] = useState("");
  const [isEditingPassport, setIsEditingPassport] = useState(false);

  // Reupload context (when replacing an existing document)
  const [replaceOldDocumentId, setReplaceOldDocumentId] = useState<string | null>(null);
  const [replaceCandidateProjectMapId, setReplaceCandidateProjectMapId] = useState<string | null>(null);

  const activeStep = data?.step;
  const candidate = data?.processingCandidate;

  const requiredDocuments: any[] = data?.requiredDocuments || [];
  const uploads: any[] = data?.uploads || [];

  // Completion flag from API
  const isVisaCompleted = data?.isVisaCompleted || activeStep?.status === "completed";

  useEffect(() => {
    if (!activeStep) return;

    const issueDate = activeStep.visaIssuedAt ? new Date(activeStep.visaIssuedAt) : undefined;
    const expiryDate = activeStep.visaValidAt ? new Date(activeStep.visaValidAt) : undefined;

    setVisaIssuedDate(issueDate);
    setInitialVisaIssuedDate(issueDate);
    setVisaExpiryDate(expiryDate);
    setInitialVisaExpiryDate(expiryDate);
  }, [activeStep]);

  useEffect(() => {
    const saved = resolveCandidatePassportNumber(candidate?.candidate) ?? "";
    setPassportNumber(saved);
    setInitialPassportNumber(saved);
    setIsEditingPassport(!saved);
  }, [candidate?.candidate?.id, candidate?.candidate?.passportNumber]);

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

  const candidateDocs = data?.candidateDocuments || [];
  const processingDocs = data?.processing_documents || [];

  const candidateDocsByDocType = useMemo(() => {
    const map: Record<string, any[]> = {};
    candidateDocs.forEach((d: any) => {
      map[d.docType] = map[d.docType] || [];
      map[d.docType].push(d);
    });
    Object.keys(map).forEach((type) => {
      map[type].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
      const createdAt = d.createdAt || doc?.createdAt || d.processingDocument?.createdAt;

      if (!docType) return;
      const normalized = { ...d, docType, status, fileName, fileUrl, mimeType, id, createdAt };
      map[docType] = map[docType] || [];
      map[docType].push(normalized);
    });
    Object.keys(map).forEach((type) => {
      map[type].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    });
    return map;
  }, [processingDocs]);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerFileName, setViewerFileName] = useState<string>("");
  const [viewerMimeType, setViewerMimeType] = useState<string | undefined>(undefined);

  const handleViewDocument = (docType: string) => {
    const pdocs = processingDocsByDocType[docType] || [];
    const cdocs = candidateDocsByDocType[docType] || [];
    const url = pdocs[0]?.fileUrl || cdocs[0]?.fileUrl;

    if (!url) {
      toast("No document available to view");
      return;
    }

    let mime = pdocs[0]?.mimeType || cdocs[0]?.mimeType;
    const fileName = pdocs[0]?.fileName || cdocs[0]?.fileName || "Document";
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
    const cdoc = cdocs[0];

    if (!cdoc) {
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
    if (!candidate?.candidate?.id) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", selectedDocType);
      if (selectedRoleCatalog) formData.append("roleCatalogId", selectedRoleCatalog);

      const uploadResp = await uploadDocument({ candidateId: candidate.candidate.id, formData }).unwrap();
      const uploadData = uploadResp.data;

      if (replaceOldDocumentId) {
        if (!replaceCandidateProjectMapId) return;
        await reuploadProcessingDocument({
          oldDocumentId: replaceOldDocumentId,
          candidateProjectMapId: replaceCandidateProjectMapId,
          fileName: uploadData?.fileName || file.name,
          fileUrl: uploadData?.fileUrl || "",
          fileSize: uploadData?.fileSize || file.size,
          mimeType: uploadData?.mimeType || file.type || undefined,
          ...(selectedRoleCatalog && { roleCatalogId: selectedRoleCatalog }),
          ...(selectedDocType && { docType: selectedDocType }),
        }).unwrap();
        toast.success("File re-uploaded");
        setUploadModalOpen(false);
        await refetch();
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
      await reuseDocument({ 
        documentId, 
        projectId: candidate.project?.id || "", 
        roleCatalogId: selectedRoleCatalog || "" 
      }).unwrap();
      
      setUploadModalOpen(false);
      await refetch();
    } catch (err: any) {
      toast.error(getUploadErrorMessage(err));
    }
  };

  const handleMarkComplete = async () => {
    if (!activeStep?.id) return;
    setCompleteModalOpen(true);
  };

  const handleConfirmComplete = async () => {
    if (!activeStep?.id) return;
    try {
      await completeStep({ stepId: activeStep.id }).unwrap();
      toast.success("Visa step marked complete");
      setCompleteModalOpen(false);
      await refetch();
      if (onComplete) await onComplete();
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to complete Visa step");
    }
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!activeStep?.id) return;
    try {
      await cancelStep({ stepId: activeStep.id, reason }).unwrap();
      toast.success("Processing step cancelled");
      setCancelOpen(false);
      await refetch();
      if (onComplete) await onComplete();
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to cancel step");
    }
  };

  const handleSaveVisaMetadata = async () => {
    if (!activeStep?.id) return;

    const trimmedPassport = passportNumber.trim();
    const passportChanged = trimmedPassport !== initialPassportNumber;

    if (passportChanged && trimmedPassport.length > 0 && trimmedPassport.length < 3) {
      toast.error("Passport number must be at least 3 characters");
      return;
    }

    try {
      if (passportChanged) {
        const candidateId = candidate?.candidate?.id;
        if (!candidateId) {
          toast.error("Missing candidate id");
          return;
        }
        await updateCandidate({
          id: candidateId,
          passportNumber: trimmedPassport || null,
        }).unwrap();
      }

      const payload: Record<string, string> = {};
      if (visaIssuedDate) payload.visaIssuedAt = visaIssuedDate.toISOString();
      if (visaExpiryDate) payload.visaValidAt = visaExpiryDate.toISOString();

      if (Object.keys(payload).length > 0) {
        await updateStepStatus({ stepId: activeStep.id, data: payload as any }).unwrap();
      }

      if (passportChanged) {
        setIsEditingPassport(!trimmedPassport);
      }

      toast.success("Visa details saved");
      await refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to save visa details");
    }
  };

  const apiCounts = data?.counts;
  const statTotal = apiCounts?.totalMandatory ?? 0;
  const statVerified = apiCounts?.verifiedCount ?? 0;
  const statMissing = apiCounts?.missingCount ?? 0;
  const allVerified = statTotal > 0 ? statVerified >= statTotal : statMissing === 0;

  const visaChanged =
    (visaIssuedDate?.toISOString() || "") !== (initialVisaIssuedDate?.toISOString() || "") ||
    (visaExpiryDate?.toISOString() || "") !== (initialVisaExpiryDate?.toISOString() || "") ||
    passportNumber.trim() !== initialPassportNumber;
  const showSaveVisaButton = visaChanged && !isVisaCompleted && !isStepCancelled;
  const isSavingVisaDetails = isUpdatingVisa || isUpdatingCandidate;
  const hasPassportOnFile = Boolean(initialPassportNumber);
  const passportInputMissing = !passportNumber.trim() && !hasPassportOnFile;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
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
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
          ) : error || !data ? (
            <Card className="p-8 text-center text-sm text-slate-600">Could not load Visa requirements.</Card>
          ) : (
            <div className="space-y-4">
              {isStepCancelled && (
                <Card className="bg-rose-50 p-3 border-0">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-rose-600" />
                    <div>
                      <div className="text-sm font-semibold text-rose-700">Step cancelled</div>
                      <div className="text-xs text-slate-700 mt-1">{activeStep?.rejectionReason}</div>
                    </div>
                  </div>
                </Card>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border rounded-lg p-3 text-center">
                  <div className="text-2xl font-black text-slate-700">{statTotal}</div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Total Docs</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
                  <div className="text-2xl font-black text-emerald-600">{statVerified}</div>
                  <div className="text-[10px] uppercase font-bold text-emerald-600">Verified</div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-center">
                  <div className="text-2xl font-black text-amber-600">{statMissing}</div>
                  <div className="text-[10px] uppercase font-bold text-amber-600">Missing</div>
                </div>
              </div>

              <div className="border rounded-lg bg-teal-50/30">
                <div className="bg-teal-100/50 px-3 py-1 border-b text-[11px] font-bold uppercase text-teal-700">Visa Details</div>
                <div className="p-3 space-y-3">
                  <div
                    className={`rounded-lg border p-3 ${
                      hasPassportOnFile
                        ? "border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white"
                        : "border-amber-200 bg-gradient-to-br from-amber-50/80 to-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            hasPassportOnFile ? "bg-emerald-100" : "bg-amber-100"
                          }`}
                        >
                          <BookUser
                            className={`h-4 w-4 ${
                              hasPassportOnFile ? "text-emerald-700" : "text-amber-700"
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Passport Number
                          </div>
                          {hasPassportOnFile ? (
                            <p className="mt-1 truncate font-mono text-sm font-semibold tracking-wide text-slate-900">
                              {initialPassportNumber}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-amber-700">
                              Not on file — processing team must add passport number
                            </p>
                          )}
                        </div>
                      </div>
                      {hasPassportOnFile ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                        >
                          On file
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                        >
                          Missing
                        </Badge>
                      )}
                    </div>

                    {!isVisaCompleted && !isStepCancelled && (
                      <div className="mt-3 space-y-2">
                        {hasPassportOnFile && !isEditingPassport ? (
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => setIsEditingPassport(true)}
                            >
                              Update passport
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Label htmlFor="visa-passport-number" className="text-xs text-slate-600">
                              {hasPassportOnFile ? "Update passport number" : "Add passport number"}
                            </Label>
                            <Input
                              id="visa-passport-number"
                              value={passportNumber}
                              onChange={(event) => setPassportNumber(event.target.value.toUpperCase())}
                              placeholder="e.g., A1234567"
                              autoComplete="off"
                              className="h-9 bg-white font-mono text-sm tracking-wide"
                            />
                            {hasPassportOnFile ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => {
                                    setPassportNumber(initialPassportNumber);
                                    setIsEditingPassport(false);
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : null}
                            {passportInputMissing ? (
                              <p className="flex items-center gap-1.5 text-[11px] text-amber-700">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                Passport number is required for visa processing
                              </p>
                            ) : null}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {(visaIssuedDate || visaExpiryDate) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-teal-100 bg-white p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                          Visa issued
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">
                          {visaIssuedDate ? format(visaIssuedDate, "PPP") : "Not set"}
                        </div>
                      </div>
                      <div className="rounded-lg border border-teal-100 bg-white p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                          Visa expiry
                        </div>
                        <div
                          className={`mt-1 text-sm font-semibold ${
                            visaExpiryDate && visaExpiryDate.getTime() < Date.now()
                              ? "text-rose-600"
                              : "text-slate-800"
                          }`}
                        >
                          {visaExpiryDate ? format(visaExpiryDate, "PPP") : "Not set"}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-600 mb-1 block">Visa issue date</Label>
                      <DatePicker value={visaIssuedDate} onChange={setVisaIssuedDate} disabled={isVisaCompleted || isStepCancelled} compact />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600 mb-1 block">Visa expiry date</Label>
                      <DatePicker value={visaExpiryDate} onChange={setVisaExpiryDate} disabled={isVisaCompleted || isStepCancelled} compact />
                    </div>
                  </div>
                  {showSaveVisaButton && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleSaveVisaMetadata}
                        disabled={isSavingVisaDetails}
                        className="h-8 bg-teal-600"
                      >
                        {isSavingVisaDetails ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : null}
                        Save Details
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 border-b flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">Required Documents</h4>
                  {!isVisaCompleted && !isStepCancelled && (
                    <VerifyAllDocumentsControl
                      processingStepId={activeStep?.id}
                      requiredDocuments={requiredDocuments}
                      candidateDocsByDocType={candidateDocsByDocType}
                      processingDocsByDocType={processingDocsByDocType}
                      verifyProcessingDocument={verifyProcessingDocument}
                      refetch={refetch}
                      stepLabel="Visa"
                      disabled={isVerifying}
                    />
                  )}
                </div>
                <div className="divide-y max-h-[320px] overflow-auto">
                  {requiredDocuments.map((req) => {
                    const pdoc = processingDocsByDocType[req.docType]?.[0];
                    const cdoc = candidateDocsByDocType[req.docType]?.[0];
                    const verified = pdoc?.status === 'verified' || cdoc?.status === 'verified';
                    return (
                      <div key={req.docType} className="flex items-center gap-4 px-4 py-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${verified ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                          {verified ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Upload className="h-4 w-4 text-slate-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{req.label}</span>
                            {req.mandatory && <Badge className="text-[9px] bg-rose-100 text-rose-600">Required</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(pdoc || cdoc) && <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleViewDocument(req.docType)}><Eye className="h-4 w-4" /></Button>}
                          {!isVisaCompleted && !isStepCancelled && (
                            <>
                              {!pdoc && !cdoc ? (
                                <Button size="sm" className="h-8 text-xs" onClick={() => handleUploadClick(req.docType, req.label, candidate?.role?.roleCatalog?.id, candidate?.role?.designation)}>Upload</Button>
                              ) : !pdoc && cdoc ? (
                                <Button size="sm" onClick={() => handleVerifyClick(req.docType, req.label, candidate?.role?.roleCatalog?.id, candidate?.role?.designation)}>Verify</Button>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">{pdoc.status}</Badge>
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

        {!isLoading && !error && data && (
          <div className="px-6 py-3 border-t bg-slate-50 flex items-center justify-between">
            <div className="text-xs">
              {statMissing > 0 ? <span className="text-amber-600 font-medium">Missing: {statMissing}</span> : <span className="text-emerald-600 font-medium">All verified ✓</span>}
            </div>
            <div className="flex items-center gap-2">
              {!isVisaCompleted && !isStepCancelled && (
                <>
                  <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>Cancel Step</Button>
                  <Button size="sm" onClick={handleMarkComplete} disabled={!allVerified || isCompletingStep}>Mark Complete</Button>
                </>
              )}
              {isVisaCompleted && <Badge className="bg-emerald-100 text-emerald-700 px-2">Completed ✓</Badge>}
            </div>
          </div>
        )}
      </DialogContent>

      <React.Suspense fallback={null}>
        <UploadDocumentModal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} docType={selectedDocType} docLabel={selectedDocLabel} onUpload={handleUploadFile} isUploading={isUploading || isReusing || isReuploadingProcessing} />
        <VerifyProcessingDocumentModal isOpen={verifyModalOpen} onClose={() => setVerifyModalOpen(false)} documentId={verifyDocId} documentLabel={verifyDocLabel} processingStepId={activeStep?.id || ""} onConfirm={handleConfirmVerify} isVerifying={isVerifying} />
        <ConfirmCancelStepModal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={handleConfirmCancel} isCancelling={isCancelling} />
        <CompleteProcessingStepModal isOpen={completeModalOpen} onClose={() => setCompleteModalOpen(false)} onConfirm={handleConfirmComplete} isCompleting={isCompletingStep} requiredDocuments={requiredDocuments} uploadsByDocType={uploadsByDocType} candidateDocsByDocType={candidateDocsByDocType} processingDocsByDocType={processingDocsByDocType} onViewDocument={handleViewDocument} />
      </React.Suspense>
      {viewerUrl && viewerMimeType?.includes("pdf") ? (
        <PDFViewer fileUrl={viewerUrl} fileName={viewerFileName} isOpen={viewerOpen} onClose={() => setViewerOpen(false)} />
      ) : viewerUrl && (
        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}><DialogContent className="sm:max-w-3xl"><img src={viewerUrl} alt={viewerFileName} className="max-h-[70vh] object-contain mx-auto" /></DialogContent></Dialog>
      )}
    </Dialog>
  );
}

export default VisaModal;
