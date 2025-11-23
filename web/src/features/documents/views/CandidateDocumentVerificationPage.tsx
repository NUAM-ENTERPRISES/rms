import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  AlertCircle,
  User,
  Calendar,
  UserCheck,
  Upload,
  ArrowLeft,
} from "lucide-react";
import { CANDIDATE_PROJECT_STATUS } from "@/constants/statuses";
import {
  useGetCandidateProjectsQuery,
  useGetCandidateProjectRequirementsQuery,
  useGetCandidateEligibilityQuery,
  useGetMatchmakingProcessQuery,
  useReuseDocumentMutation,
  useCompleteVerificationMutation,
  useRejectVerificationMutation,
  useVerifyDocumentMutation,
  useCreateDocumentMutation,
} from "@/features/documents";
import { useUploadDocumentMutation } from "@/features/candidates/api";
import { useCan } from "@/hooks/useCan";
import { toast } from "sonner";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { EligibilityRequirements } from "@/components/molecules/EligibilityRequirements";
import { MatchmakingProcess } from "@/components/molecules/MatchmakingProcess";
import { ConfirmationDialog } from "@/components/molecules/ConfirmationDialog";
import { FlagIcon } from "@/shared/components/FlagIcon";

export default function CandidateDocumentVerificationPage() {
  const { candidateId, projectId: routeProjectId } = useParams<{
    candidateId: string;
    projectId?: string;
  }>();
  const navigate = useNavigate();
  const canVerifyDocuments = useCan("verify:documents");

  // State
  // initialize selectedProjectId from route if available so direct links work
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    routeProjectId || ""
  );
  const [showReuseDialog, setShowReuseDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState<string>("");
  // (no reupload optimistic state) we keep uploads simple — user can replace files
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);
  const [isRejectingAll, setIsRejectingAll] = useState(false);
  const [isBulkConfirmationOpen, setIsBulkConfirmationOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"verify" | "reject" | null>(null);
  const [bulkNotes, setBulkNotes] = useState("");
  const [isCompletionConfirmationOpen, setIsCompletionConfirmationOpen] = useState(false);
  const [completionAction, setCompletionAction] = useState<"complete" | "reject" | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");

  // PDF Viewer state
  const [isPDFViewerOpen, setIsPDFViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    fileUrl: string;
    fileName: string;
  } | null>(null);

  // Confirmation dialog state
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<"verify" | "reject" | null>(null);
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  // Local optimistic statuses so UI updates immediately
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  // API Queries
  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = useGetCandidateProjectsQuery(candidateId!);

  const { data: requirementsData, isLoading: requirementsLoading, refetch: refetchRequirements } =
    useGetCandidateProjectRequirementsQuery(
      { candidateId: candidateId!, projectId: selectedProjectId },
      { skip: !selectedProjectId }
    );

  // selectedProject should be the candidateProject mapping object. The
  // `selectedProjectId` normally stores the project's `project.id`, but
  // deep links may pass a candidateProjectMap id instead. Allow either
  // to match here so the UI can render even if the URL contained the
  // candidateProjectMap id.
  const selectedProject = projectsData?.data?.find((p: any) => {
    return (
      p.project?.id === selectedProjectId || // when selectedProjectId is the project id
      p.id === selectedProjectId // or when selectedProjectId is the candidateProjectMap id
    );
  });

  // Eligibility and Matchmaking data
  const { data: eligibilityData } = useGetCandidateEligibilityQuery(
    {
      candidateId: candidateId!,
      projectId: selectedProjectId,
      roleId: selectedProject?.roleNeeded?.id || "",
    },
    { skip: !selectedProjectId || !selectedProject?.roleNeeded?.id }
  );

  const { data: matchmakingData } = useGetMatchmakingProcessQuery(
    {
      candidateId: candidateId!,
      projectId: selectedProjectId,
    },
    { skip: !selectedProjectId }
  );

  // Mutations
  const [reuseDocument, { isLoading: isReusing }] = useReuseDocumentMutation();
  const [completeVerification, { isLoading: isCompleting }] =
    useCompleteVerificationMutation();
  const [rejectVerification, { isLoading: isRejectingComplete }] =
    useRejectVerificationMutation();
  const [verifyDocument] = useVerifyDocumentMutation();
  const [uploadDocument, { isLoading: isUploading }] =
    useUploadDocumentMutation();
  const [createDocument, { isLoading: isCreating }] =
    useCreateDocumentMutation();

  // Auto-select first project
  useEffect(() => {
    // If a route project id exists prefer that (ensures direct deep links work),
    // otherwise fall back to the first project in the list.
    if (routeProjectId) {
      // If the route passed an id that is actually a candidateProjectMap id
      // (top-level `p.id`) we want to normalise to the underlying
      // project.id so requirements load correctly. If the route already
      // contains a project.id we'll use that directly.
      if (projectsData?.data && projectsData.data.length > 0) {
        const match = projectsData.data.find(
          (p: any) => p.project?.id === routeProjectId || p.id === routeProjectId
        );

        if (match) {
          const projectId = match.project?.id || match.id || routeProjectId;
          if (selectedProjectId !== projectId) setSelectedProjectId(projectId);
          return;
        }
      }

      // No projects loaded yet that match the route id — still set the route
      // value so subsequent requests that assume projectId are guarded below.
      if (selectedProjectId !== routeProjectId) setSelectedProjectId(routeProjectId);
      return;
    }

    if (
      projectsData?.data &&
      projectsData.data.length > 0 &&
      !selectedProjectId
    ) {
      setSelectedProjectId(projectsData.data[0].project.id);
    }
  }, [projectsData, selectedProjectId, routeProjectId]);

  const requirements = requirementsData?.data?.requirements || [];
  const verifications = requirementsData?.data?.verifications || [];
  const allCandidateDocuments =
    requirementsData?.data?.allCandidateDocuments || [];
  const summary = requirementsData?.data?.summary || {};

  // Derived flag: are all submitted documents rejected?
  const allRejected =
    (summary.totalSubmitted || 0) > 0 &&
    (summary.totalRejected || 0) === (summary.totalSubmitted || 0);

  // Handle document verification
  const handleVerifyDocument = async (verification: any) => {
    try {
      await verifyDocument({
        documentId: verification.document.id,
        candidateProjectMapId: selectedProject?.id || "",
        status: "verified",
        notes: verificationNotes,
      }).unwrap();
      toast.success("Document verified successfully!");
      setVerificationNotes("");
      // Ensure UI updates immediately
      refetchRequirements();
    } catch (error) {
      toast.error("Failed to verify document");
    }
  };

  // Handle document rejection
  const handleRejectDocument = async (verification: any) => {
    try {
      await verifyDocument({
        documentId: verification.document.id,
        candidateProjectMapId: selectedProject?.id || "",
        status: "rejected",
        notes: verificationNotes,
        rejectionReason: verificationNotes,
      }).unwrap();
      toast.success("Document rejected");
      setVerificationNotes("");
      // Ensure UI updates immediately
      refetchRequirements();
    } catch (error) {
      toast.error("Failed to reject document");
    }
  };

  // Handle verify all documents
  const handleVerifyAllDocuments = async () => {
    if (!selectedProject?.id) {
      toast.error("No project selected");
      return;
    }

    setIsVerifyingAll(true);
    try {
      // Get all pending verifications
      const pendingVerifications = verifications.filter(
        (v: any) => v.status === "pending" && v.document
      );

      if (pendingVerifications.length === 0) {
        toast.info("No pending documents to verify");
        return;
      }

      // Verify all pending documents
      const verifyPromises = pendingVerifications.map((verification: any) =>
        verifyDocument({
          documentId: verification.document.id,
          candidateProjectMapId: selectedProject.id,
          status: "verified",
          notes: "Bulk verification",
        }).unwrap()
      );

      await Promise.all(verifyPromises);
      toast.success(
        `Successfully verified ${pendingVerifications.length} documents!`
      );
      // Ensure UI updates immediately
      refetchRequirements();
    } catch (error) {
      toast.error("Failed to verify some documents");
    } finally {
      setIsVerifyingAll(false);
    }
  };

  // Handle reject all documents
  const handleRejectAllDocuments = async () => {
    if (!selectedProject?.id) {
      toast.error("No project selected");
      return;
    }

    setIsRejectingAll(true);
    try {
      // Get all pending verifications
      const pendingVerifications = verifications.filter(
        (v: any) => v.status === "pending" && v.document
      );

      if (pendingVerifications.length === 0) {
        toast.info("No pending documents to reject");
        return;
      }

      // Reject all pending documents
      const rejectPromises = pendingVerifications.map((verification: any) =>
        verifyDocument({
          documentId: verification.document.id,
          candidateProjectMapId: selectedProject.id,
          status: "rejected",
          notes: "Bulk rejection",
        }).unwrap()
      );

      await Promise.all(rejectPromises);
      toast.success(
        `Successfully rejected ${pendingVerifications.length} documents!`
      );
      // Ensure UI updates immediately
      refetchRequirements();
    } catch (error) {
      toast.error("Failed to reject some documents");
    } finally {
      setIsRejectingAll(false);
    }
  };

  // Handle document reuse
  const handleReuseDocument = async () => {
    if (!selectedDocumentType) return;

    try {
      await reuseDocument({
        documentId: selectedDocumentType,
        projectId: selectedProjectId,
      }).unwrap();
      toast.success("Document linked successfully!");
      setShowReuseDialog(false);
      setSelectedDocumentType("");
      // Ensure UI updates immediately
      refetchRequirements();
    } catch (error) {
      toast.error("Failed to link document");
    }
  };

  // Handle document upload
  const handleUploadDocument = async () => {
    if (!uploadFile || !uploadDocType) return;

    try {
      // Step 1: Upload the file to S3
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("docType", uploadDocType);

      const uploadResult = await uploadDocument({
        candidateId: candidateId!,
        formData,
      }).unwrap();

      // Step 2: Create Document record in database
      // The upload API can return either { fileName, fileUrl, ... } or { data: { fileName, fileUrl, ... } }
      const uploadData: any = (uploadResult && (uploadResult as any).data) ? (uploadResult as any).data : uploadResult;

      const fileName = typeof uploadData?.fileName === "string" ? uploadData.fileName : undefined;
      const fileUrl = typeof uploadData?.fileUrl === "string" ? uploadData.fileUrl : undefined;
      const fileSize = typeof uploadData?.fileSize === "number" ? uploadData.fileSize : undefined;
      const mimeType = typeof uploadData?.mimeType === "string" ? uploadData.mimeType : undefined;

      if (!fileName || !fileUrl) {
        toast.error("Upload failed: missing fileName or fileUrl from upload response");
        return;
      }

      const documentData = await createDocument({
        candidateId: candidateId!,
        docType: uploadDocType,
        fileName,
        fileUrl,
        fileSize,
        mimeType,
      }).unwrap();

      // Step 3: Link the document to the current project
      await reuseDocument({
        documentId: documentData.data.id,
        projectId: selectedProjectId,
      }).unwrap();

      toast.success("Document uploaded and linked successfully!");
      setShowUploadDialog(false);
      setUploadFile(null);
      setUploadDocType("");
      // keep existing verification status intact when replacing the file
      // Ensure UI updates immediately
      refetchRequirements();
    } catch (error) {
      toast.error("Failed to upload document");
    }
  };

  // Open a PDF in the viewer
  const handleOpenPDF = (fileUrl: string, fileName: string) => {
    setSelectedDocument({ fileUrl, fileName });
    setIsPDFViewerOpen(true);
  };

  // Handle complete verification
  const handleCompleteVerification = async () => {
    if (!summary.allDocumentsVerified) {
      toast.error("Not all required documents are verified");
      return;
    }

    try {
      await completeVerification({
        candidateProjectMapId: selectedProject?.id,
      }).unwrap();
      toast.success("Document verification completed!");
      navigate("/documents/verification");
      // Ensure UI updates immediately
      refetchRequirements();
    } catch (error) {
      toast.error("Failed to complete verification");
    }
  };

  // Complete rejection (mark the verification process complete when all docs are rejected)
  const handleCompleteRejection = async () => {
    if (!allRejected) {
      toast.error("Not all required documents are rejected");
      return;
    }

    try {
      await rejectVerification({
        candidateProjectMapId: selectedProject?.id,
        reason: completionNotes || "Bulk rejection",
      }).unwrap();
      toast.success("Document rejection completed!");
      navigate("/documents/verification");
      // Ensure UI updates immediately
      refetchRequirements();
    } catch (error) {
      toast.error("Failed to complete rejection");
    }
  };

  // Bulk confirmation handlers
  const handleBulkConfirmationConfirm = async () => {
    // Close UI first, run the bulk action
    setIsBulkConfirmationOpen(false);
    if (bulkAction === "verify") {
      try {
        // optionally send notes? current bulk verify uses fixed notes
        await handleVerifyAllDocuments();
      } finally {
        setBulkAction(null);
        setBulkNotes("");
      }
    } else if (bulkAction === "reject") {
      try {
        // Optionally pass notes to server per-document; our existing handler uses fixed notes.
        await handleRejectAllDocuments();
      } finally {
        setBulkAction(null);
        setBulkNotes("");
      }
    }
  };

  const handleBulkConfirmationClose = () => {
    setIsBulkConfirmationOpen(false);
    setBulkAction(null);
    setBulkNotes("");
  };

  // Completion confirmation handlers
  const handleCompletionConfirm = async () => {
    setIsCompletionConfirmationOpen(false);
    if (completionAction === "complete") {
      try {
        await handleCompleteVerification();
      } finally {
        setCompletionAction(null);
        setCompletionNotes("");
      }
    } else if (completionAction === "reject") {
      try {
        await handleCompleteRejection();
      } finally {
        setCompletionAction(null);
        setCompletionNotes("");
      }
    }
  };

  const handleCompletionClose = () => {
    setIsCompletionConfirmationOpen(false);
    setCompletionAction(null);
    setCompletionNotes("");
  };

  // Handle confirmation dialog
  const handleConfirmationConfirm = async () => {
    if (!selectedVerification || !confirmationAction) return;

    // Optimistically update UI immediately
    const vid = selectedVerification.id;
    setLocalStatuses((s) => ({ ...s, [vid]: confirmationAction === "verify" ? "verified" : "rejected" }));

    try {
      if (confirmationAction === "verify") {
        await handleVerifyDocument(selectedVerification);
      } else if (confirmationAction === "reject") {
        await handleRejectDocument(selectedVerification);
      }
    } finally {
      // Ensure latest data from server and clear optimistic state
      try {
        await refetchRequirements();
      } catch (e) {
        // ignore
      }
      setLocalStatuses((s) => {
        const copy = { ...s };
        delete copy[vid];
        return copy;
      });

      setIsConfirmationOpen(false);
      setConfirmationAction(null);
      setSelectedVerification(null);
    }
  };

  const handleConfirmationClose = () => {
    setIsConfirmationOpen(false);
    setConfirmationAction(null);
    setSelectedVerification(null);
  };

  // Get document status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading candidate projects...</span>
        </div>
      </div>
    );
  }

  if (projectsError || !projectsData?.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive">Failed to load candidate projects</p>
                        <Button
            onClick={() => navigate("/documents/verification")}
            className="mt-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Verification
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-1 pb-4 space-y-6">
        {/* Candidate & Project Info */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Candidate Info */}
              {selectedProject && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 capitalize">
                          {selectedProject.candidate?.firstName}{" "}
                          {selectedProject.candidate?.lastName}
                        </h3>
                        <p className="text-sm text-slate-600 capitalize">
                          {selectedProject.roleNeeded?.designation}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <FlagIcon
                            countryCode={selectedProject.project?.countryCode}
                            size="3xl"
                            className="rounded"
                          />
                          <p className="text-sm font-medium">
                            {selectedProject.project?.title}
                          </p>
                        </div>
                      </div>

                      {/* Verify / Reject All Documents Buttons */}
                      {canVerifyDocuments && (
                        <div className="flex items-center gap-2">
                          {summary.totalSubmitted > 0 &&
                            summary.totalVerified < summary.totalSubmitted && (
                              <Button
                                onClick={() => {
                                  setBulkAction("verify");
                                  setIsBulkConfirmationOpen(true);
                                }}
                                disabled={isVerifyingAll}
                                variant="outline"
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              >
                                {isVerifyingAll ? (
                                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Verify
                              </Button>
                            )}

                          {summary.totalSubmitted > 0 &&
                            (summary.totalRejected || 0) < (summary.totalSubmitted || 0) && (
                              <Button
                                onClick={() => {
                                  setBulkAction("reject");
                                  setIsBulkConfirmationOpen(true);
                                }}
                                disabled={isRejectingAll}
                                variant="outline"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                {isRejectingAll ? (
                                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <XCircle className="h-4 w-4 mr-2" />
                                )}
                                Reject
                              </Button>
                            )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Project Selector */}
                  <div>
                    <Label className="text-sm font-medium">
                      Switch Project
                    </Label>
                    <Select
                      value={selectedProjectId}
                      onValueChange={setSelectedProjectId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectsData.data.map((project: any) => (
                          <SelectItem
                            key={project.project.id}
                            value={project.project.id}
                          >
                            {project.project.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Project Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <div>
                        <p className="text-xs text-slate-500">Created</p>
                        <p className="text-sm font-medium">
                          {new Date(
                            selectedProject.project.createdAt
                          ).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-slate-500" />
                      <div>
                        <p className="text-xs text-slate-500">Recruiter</p>
                        <p className="text-sm font-medium">
                          {selectedProject.recruiter?.name || "Unassigned"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <div>
                        <p className="text-xs text-slate-500">Deadline</p>
                        <p className="text-sm font-medium">
                          {new Date(
                            selectedProject.project.deadline
                          ).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Document Requirements */}
        {selectedProjectId && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Document Requirements & Verification
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>Required: {summary.totalRequired || 0}</span>
                <span>Submitted: {summary.totalSubmitted || 0}</span>
                <span>Verified: {summary.totalVerified || 0}</span>
                <span>Pending: {summary.totalPending || 0}</span>
              </div>
            </CardHeader>
            <CardContent>
              {requirementsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  <span>Loading requirements...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Document Requirements Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted Document</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requirements.map((requirement: any) => {
                        const verification = verifications.find(
                          (v: any) => v.document.docType === requirement.docType
                        );
                        const displayedStatus = verification
                          ? localStatuses[verification.id] ?? verification.status
                          : undefined;

                        return (
                          <TableRow key={requirement.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {requirement.docType}
                                </span>
                                {requirement.mandatory && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    Required
                                  </Badge>
                                )}
                              </div>
                              {requirement.description && (
                                <p className="text-xs text-slate-500 mt-1">
                                  {requirement.description}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              {verification ? (
                                getStatusBadge(displayedStatus as string)
                              ) : (
                                <Badge variant="outline">Not Submitted</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {verification ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">
                                    {verification.document.fileName}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenPDF(
                                        verification.document.fileUrl,
                                        verification.document.fileName
                                      )
                                    }
                                    className="h-6 w-6 p-0"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  {/* Small upload icon next to the preview button so users can replace the file */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setUploadDocType(verification.document.docType);
                                      setShowUploadDialog(true);
                                      setUploadFile(null);
                                    }}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Upload className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-sm text-slate-500">
                                  No document
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {verification ? (
                                  <>
                                    {/* Show verification buttons if document exists and user can verify */}
                                    {/* When a document is submitted we allow reuploading it. Verification actions
                                        (Verify / Reject) should only be shown for pending docs. Reupload is available
                                        whenever a document exists so the user can replace it. */}

                                    {verification.document && (
                                      <div className="flex items-center gap-2">
                                        {/*
                                          Action buttons:
                                          - pending -> show both Verify + Reject
                                          - verified -> show single Reject button (so reviewer can change their mind)
                                          - rejected -> show single Re-verify button (so reviewer can re-accept)
                                        */}
                                        {canVerifyDocuments && (
                                          displayedStatus === "pending" ? (
                                            <>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  setSelectedVerification(verification);
                                                  setConfirmationAction("verify");
                                                  setIsConfirmationOpen(true);
                                                }}
                                                className="h-8 text-green-600 border-green-600 hover:text-green-700 hover:bg-green-50"
                                              >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Verify
                                              </Button>

                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  setSelectedVerification(verification);
                                                  setConfirmationAction("reject");
                                                  setIsConfirmationOpen(true);
                                                }}
                                                className="h-8 text-red-600 border-red-600 hover:text-red-700 hover:bg-red-50"
                                              >
                                                <XCircle className="h-4 w-4 mr-1" />
                                                Reject
                                              </Button>
                                            </>
                                          ) : displayedStatus === "verified" ? (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setSelectedVerification(verification);
                                                setConfirmationAction("reject");
                                                setIsConfirmationOpen(true);
                                              }}
                                              className="h-8 text-red-600 border-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                              <XCircle className="h-4 w-4 mr-1" />
                                              Reject
                                            </Button>
                                          ) : displayedStatus === "rejected" ? (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setSelectedVerification(verification);
                                                setConfirmationAction("verify");
                                                setIsConfirmationOpen(true);
                                              }}
                                              className="h-8 text-green-600 border-green-600 hover:text-green-700 hover:bg-green-50"
                                            >
                                              <CheckCircle className="h-4 w-4 mr-1" />
                                              Re-verify
                                            </Button>
                                          ) : null
                                        )}
                                      </div>
                                    )}

                                    {/* Show status badge */}
                                    <div className="flex items-center gap-2">
                                      {displayedStatus === "verified" && (
                                        <Badge
                                          variant="default"
                                          className="text-xs bg-green-100 text-green-800 border-green-200"
                                        >
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Verified
                                        </Badge>
                                      )}
                                      {displayedStatus === "rejected" && (
                                        <Badge
                                          variant="destructive"
                                          className="text-xs"
                                        >
                                          <XCircle className="h-3 w-3 mr-1" />
                                          Rejected
                                        </Badge>
                                      )}
                                      {displayedStatus === "pending" && (
                                        <Badge variant="outline" className="text-xs">
                                          <Clock className="h-3 w-3 mr-1" />
                                          Pending
                                        </Badge>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setShowReuseDialog(true)}
                                      className="h-8"
                                    >
                                      Link Existing
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setShowUploadDialog(true)}
                                      className="h-8"
                                    >
                                      <Upload className="h-3 w-3 mr-1" />
                                      Upload
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Complete Verification Button */}
                  {(summary.allDocumentsVerified || allRejected) && canVerifyDocuments && (
                    <div className="flex justify-end pt-4 border-t">
                      {summary.allDocumentsVerified && (
                        // Show complete button. If the candidate-project is already in
                        // DOCUMENTS_VERIFIED status we disable it and show a tooltip.
                        <span
                          title={
                            selectedProject?.status === CANDIDATE_PROJECT_STATUS.DOCUMENTS_VERIFIED
                              ? "Already completed verification"
                              : undefined
                          }
                          className="inline-block"
                        >
                          <Button
                            onClick={() => {
                              setCompletionAction("complete");
                              setIsCompletionConfirmationOpen(true);
                            }}
                            // Disable if currently completing or the project status already shows documents verified
                            disabled={isCompleting || selectedProject?.status === CANDIDATE_PROJECT_STATUS.DOCUMENTS_VERIFIED}
                            className="bg-green-600 hover:bg-green-700"
                          >
                          {isCompleting ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Complete Verification
                        </Button>
                        </span>
                      )}

                      {allRejected && (
                        // Show reject-complete button. If the candidate-project is already in
                        // REJECTED_DOCUMENTS status we disable it and show a tooltip.
                        <span
                          title={
                            selectedProject?.status === CANDIDATE_PROJECT_STATUS.REJECTED_DOCUMENTS
                              ? "Already rejected verification"
                              : undefined
                          }
                          className="inline-block ml-2"
                        >
                          <Button
                            onClick={() => {
                              setCompletionAction("reject");
                              setIsCompletionConfirmationOpen(true);
                            }}
                            // Disable while request is in progress or when project already marked as rejected
                            disabled={isRejectingComplete || selectedProject?.status === CANDIDATE_PROJECT_STATUS.REJECTED_DOCUMENTS}
                            variant="destructive"
                            className="ml-2 bg-red-600 hover:bg-red-700"
                          >
                          {isRejectingComplete ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          Reject Verification
                        </Button>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Eligibility Requirements */}
        {selectedProjectId && eligibilityData?.data && (
          <EligibilityRequirements
            eligibilityData={eligibilityData.data}
            className="mt-6"
          />
        )}

        {/* Matchmaking Process */}
        {selectedProjectId && matchmakingData?.data && (
          <MatchmakingProcess
            matchmakingData={matchmakingData.data}
            className="mt-6"
          />
        )}

        {/* Document Reuse Dialog */}
        <Dialog open={showReuseDialog} onOpenChange={setShowReuseDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Link Existing Document</DialogTitle>
              <DialogDescription>
                Select an existing document to link to this project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">
                  Available Documents
                </Label>
                <Select
                  value={selectedDocumentType}
                  onValueChange={setSelectedDocumentType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a document" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCandidateDocuments.map((doc: any) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{doc.docType}</span>
                          <span className="text-xs text-muted-foreground">
                            {doc.fileName}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowReuseDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReuseDocument}
                disabled={!selectedDocumentType || isReusing}
              >
                {isReusing ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Link Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Document Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload New Document</DialogTitle>
              <DialogDescription>
                Upload a new document for this candidate and link it to the
                current project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Document Type</Label>
                <Select value={uploadDocType} onValueChange={setUploadDocType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {requirements.map((req: any) => (
                      <SelectItem key={req.id} value={req.docType}>
                        <div className="flex flex-col">
                          <span className="font-medium">{req.docType}</span>
                          {req.mandatory && (
                            <span className="text-xs text-red-600">
                              Required
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">File</Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: PDF, JPG, PNG, WEBP (max 10MB)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUploadDocument}
                disabled={
                  !uploadFile || !uploadDocType || isUploading || isCreating
                }
              >
                {isUploading || isCreating ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* PDF Viewer */}
        <PDFViewer
          fileUrl={selectedDocument?.fileUrl || ""}
          fileName={selectedDocument?.fileName || "Document"}
          isOpen={isPDFViewerOpen}
          onClose={() => {
            setIsPDFViewerOpen(false);
            setSelectedDocument(null);
          }}
          showDownload={true}
          showZoomControls={true}
          showRotationControls={true}
          showFullscreenToggle={true}
        />

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={isConfirmationOpen}
          onClose={handleConfirmationClose}
          onConfirm={handleConfirmationConfirm}
          title={confirmationAction === "verify" ? "Confirm Document Verification" : "Confirm Document Rejection"}
          description={
            <div className="space-y-4">
              <p>
                Are you sure you want to {confirmationAction === "verify" ? "verify" : "reject"} this document?
              </p>
              <div>
                <Label htmlFor="verification-notes" className="text-sm font-medium">
                  Notes (optional)
                </Label>
                <textarea
                  id="verification-notes"
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Add any notes about this verification..."
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
          }
          confirmText={confirmationAction === "verify" ? "Verify Document" : "Reject Document"}
          cancelText="Cancel"
          variant={confirmationAction === "verify" ? "default" : "destructive"}
        />

        {/* Bulk Confirmation Dialog for top Verify/Reject buttons */}
        <ConfirmationDialog
          isOpen={isBulkConfirmationOpen}
          onClose={handleBulkConfirmationClose}
          onConfirm={handleBulkConfirmationConfirm}
          title={bulkAction === "verify" ? "Confirm Bulk Verification" : "Confirm Bulk Rejection"}
          description={
            <div className="space-y-4">
              <p>
                Are you sure you want to {bulkAction === "verify" ? "verify all pending documents" : "reject all pending documents"} for this candidate-project?
              </p>
              <div>
                <Label htmlFor="bulk-notes" className="text-sm font-medium">
                  Notes (optional)
                </Label>
                <textarea
                  id="bulk-notes"
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder={`Add optional notes for this ${bulkAction === "verify" ? "verification" : "rejection"}...`}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
          }
          confirmText={bulkAction === "verify" ? "Verify All" : "Reject All"}
          cancelText="Cancel"
          variant={bulkAction === "verify" ? "default" : "destructive"}
        />

        {/* Completion Confirmation Dialog for Complete/Reject Verification buttons */}
        <ConfirmationDialog
          isOpen={isCompletionConfirmationOpen}
          onClose={handleCompletionClose}
          onConfirm={handleCompletionConfirm}
          title={completionAction === "complete" ? "Confirm Complete Verification" : "Confirm Reject Verification"}
          description={
            <div className="space-y-4">
              <p>
                {completionAction === "complete"
                  ? "Are you sure you want to mark document verification as complete for this candidate-project?"
                  : "Are you sure you want to mark document verification as rejected for this candidate-project?"}
              </p>
              <div>
                <Label htmlFor="completion-notes" className="text-sm font-medium">
                  Notes (optional)
                </Label>
                <textarea
                  id="completion-notes"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder={completionAction === "complete" ? "Add any notes about completing verification..." : "Add a reason for rejection..."}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
          }
          confirmText={completionAction === "complete" ? "Complete Verification" : "Reject Verification"}
          cancelText="Cancel"
          variant={completionAction === "complete" ? "default" : "destructive"}
        />
      </div>
    </div>
  );
}