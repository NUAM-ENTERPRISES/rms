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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  ChevronDown,
  Flag,
  FileIcon,
  Check,
  X,
  FileX,
  CheckCircle2,
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
  useRequestResubmissionMutation,
} from "@/features/documents";
import {
  useGetProjectQuery,
  useGetNominatedCandidatesQuery,
} from "@/features/projects";
import { useUploadDocumentMutation } from "@/features/candidates/api";
import { useCan } from "@/hooks/useCan";
import { toast } from "sonner";
import { PDFViewer } from "@/components/molecules/PDFViewer";
// import { EligibilityRequirements } from "@/components/molecules/EligibilityRequirements";
import { MatchmakingProcess } from "@/components/molecules/MatchmakingProcess";
import { ConfirmationDialog } from "@/components/molecules/ConfirmationDialog";
import { FlagIcon } from "@/shared/components/FlagIcon";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link2 } from "lucide-react";


export default function CandidateDocumentVerificationPage() {
  const { candidateId, projectId: routeProjectId } = useParams<{
    candidateId: string;
    projectId?: string;
  }>();
  const navigate = useNavigate();
  const canVerifyDocuments = useCan("verify:documents");
  const canRequestResubmission = useCan("request:resubmission");

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

  const [isResubmitDialogOpen, setIsResubmitDialogOpen] = useState(false);
  const [resubmitReason, setResubmitReason] = useState("");
  const [selectedResubmitVerification, setSelectedResubmitVerification] = useState<any>(null);

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
  const [requestResubmission, { isLoading: isRequestingResubmission }] =
    useRequestResubmissionMutation();

    // Project-related refetch helpers so we can trigger live updates elsewhere
    const { refetch: refetchProject } = useGetProjectQuery(selectedProject?.project?.id || "", {
      skip: !selectedProject?.project?.id,
    });

    const { refetch: refetchNominated } = useGetNominatedCandidatesQuery(
      {
        projectId: selectedProject?.project?.id || "",
        search: undefined,
        statusId: undefined,
        page: 1,
        limit: 100,
      },
      { skip: !selectedProject?.project?.id }
    );

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
        roleCatalogId: selectedProject?.roleNeeded?.roleCatalog?.id,
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
        roleCatalogId: selectedProject?.roleNeeded?.roleCatalog?.id,
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
          roleCatalogId: selectedProject?.roleNeeded?.roleCatalog?.id,
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
          roleCatalogId: selectedProject?.roleNeeded?.roleCatalog?.id,
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
        roleCatalogId: selectedProject?.roleNeeded?.roleCatalog?.id || "",
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

  // Handle resubmission request
  const handleRequestResubmission = async () => {
    if (!selectedResubmitVerification || !resubmitReason) {
      toast.error("Please provide a reason for resubmission");
      return;
    }

    try {
      await requestResubmission({
        documentId: selectedResubmitVerification.document.id,
        candidateProjectMapId: selectedProject?.id || "",
        reason: resubmitReason,
        roleCatalogId: selectedProject?.roleNeeded?.roleCatalog?.id,
      }).unwrap();
      toast.success("Resubmission request sent successfully!");
      setIsResubmitDialogOpen(false);
      setResubmitReason("");
      setSelectedResubmitVerification(null);
      // Ensure UI updates immediately
      refetchRequirements();
    } catch (error) {
      toast.error("Failed to request resubmission");
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
        roleCatalogId: uploadDocType.toLowerCase() === "resume" ? (selectedProject?.roleNeeded?.roleCatalog?.id || "") : undefined,
      }).unwrap();

      // Step 3: Link the document to the current project
      await reuseDocument({
        documentId: documentData.data.id,
        projectId: selectedProjectId,
        roleCatalogId: selectedProject?.roleNeeded?.roleCatalog?.id || "",
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

      // Trigger project and nominated candidates refetch so other pages (e.g., ProjectDetail)
      // pick up the updated status immediately
      try {
        await refetchProject?.();
      } catch (e) {
        // best-effort
      }

      try {
        await refetchNominated?.();
      } catch (e) {
        // best-effort
      }
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

      // Trigger project and nominated candidates refetch so other pages (e.g., ProjectDetail)
      // pick up the updated status immediately
      try {
        await refetchProject?.();
      } catch (e) {
        // best-effort
      }

      try {
        await refetchNominated?.();
      } catch (e) {
        // best-effort
      }
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
        return <Badge className="bg-green-500 text-white font-semibold whitespace-nowrap">Verified</Badge>;
      case "rejected":
        return <Badge className="bg-red-500 text-white font-semibold whitespace-nowrap">Rejected</Badge>;
      case "resubmission_required":
        return <Badge className="bg-amber-500 text-white font-semibold text-center leading-tight py-1">Waiting for re-submission</Badge>;
      case "resubmitted":
        return <Badge className="bg-blue-500 text-white font-semibold whitespace-nowrap">Resubmitted</Badge>;
      case "pending":
        return <Badge variant="outline" className="whitespace-nowrap">Pending</Badge>;
      default:
        return <Badge variant="outline" className="whitespace-nowrap">Unknown</Badge>;
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
      <motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: "easeOut" }}
  className="relative overflow-hidden rounded-xl border border-white/25 bg-white/85 backdrop-blur-xl shadow-xl"
>
  {/* Minimal glow */}
  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/6 to-purple-400/4 pointer-events-none" />

  <div className="p-4"> {/* Tiny padding */}
    {selectedProject && (
      <div className="space-y-3"> {/* Minimal spacing */}

        {/* Header - Super Compact */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Avatar + Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-blue-600 p-0.5 shadow-md flex-shrink-0">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">
                {selectedProject.candidate?.firstName} {selectedProject.candidate?.lastName}
              </h3>
              <p className="text-xs text-blue-600 font-medium truncate">
                {selectedProject.roleNeeded?.designation}
              </p>
            </div>
          </div>

          {/* Right: Flag + Title + Actions */}
          <div className="flex items-center gap-2">
            <FlagIcon
              countryCode={selectedProject.project?.countryCode || "UN"}
              className="w-7 h-7 rounded shadow-sm ring-1 ring-white/70 flex-shrink-0"
            />
            <p className="text-sm font-semibold text-slate-800 max-w-[120px] truncate">
              {selectedProject.project?.title}
            </p>

            {/* Tiny Action Buttons */}
            {canVerifyDocuments && !summary.isDocumentationReviewed && (
              <div className="flex gap-1.5">
                {summary.totalSubmitted > 0 && summary.totalVerified < summary.totalSubmitted && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setBulkAction("verify");
                      setIsBulkConfirmationOpen(true);
                    }}
                    disabled={isVerifyingAll}
                    className="h-8 px-3 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow"
                  >
                    {isVerifyingAll ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                  </Button>
                )}
                {summary.totalSubmitted > 0 && (summary.totalRejected || 0) < (summary.totalSubmitted || 0) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setBulkAction("reject");
                      setIsBulkConfirmationOpen(true);
                    }}
                    disabled={isRejectingAll}
                    className="h-8 px-3 text-xs border-red-400/40 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg"
                  >
                    {isRejectingAll ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Project Switcher - Tiny */}
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="h-9 text-xs rounded-lg border-white/30 bg-white/70 backdrop-blur shadow-sm">
            <SelectValue placeholder="Switch" />
          </SelectTrigger>
          <SelectContent className="rounded-lg">
            {projectsData.data.map((project: any) => (
              <SelectItem key={project.project.id} value={project.project.id} className="text-xs">
                {project.project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Meta Pills - Ultra Compact */}
        <div className="flex flex-wrap gap-2">
          {[
            {
              icon: Calendar,
              value: new Date(selectedProject.project.createdAt).toLocaleDateString("en-GB", {
                month: "short",
                day: "numeric",
              }),
            },
            {
              icon: UserCheck,
              value: selectedProject.recruiter?.name?.split(" ")[0] || "—",
            },
            {
              icon: Clock,
              value: new Date(selectedProject.project.deadline).toLocaleDateString("en-GB", {
                month: "short",
                day: "numeric",
              }),
              urgent: new Date(selectedProject.project.deadline) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          ].map((item) => (
            <div
              key={item.value}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium backdrop-blur",
                item.urgent
                  ? "bg-red-100/80 text-red-700"
                  : "bg-blue-100/70 text-blue-700"
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              <span>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
</motion.div>

        {/* Document Requirements */}
       {selectedProjectId && (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.7 }}
    className="rounded-2xl bg-white/95 backdrop-blur-2xl border border-white/30 shadow-2xl overflow-hidden"
  >
    {/* Header */}
    <div className="p-6 lg:p-8 border-b border-white/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-blue-500/10">
            <FileText className="h-7 w-7 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Document Requirements & Verification</h2>
        </div>

        <div className="flex gap-5">
          {[
            { label: "Required", value: summary.totalRequired || 0, color: "blue" },
            { label: "Submitted", value: summary.totalSubmitted || 0, color: "emerald" },
            { label: "Verified", value: summary.totalVerified || 0, color: "green" },
            { label: "Pending", value: summary.totalPending || 0, color: "amber" },
          ].map((item) => (
            <div key={item.label} className="text-center px-6 py-4 bg-white/80 rounded-2xl border border-white/40 shadow-lg">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{item.label}</p>
              <p className={`text-3xl font-extrabold mt-2 text-${item.color}-600`}>{item.value}</p>
            </div>
          ))}
          {summary.isDocumentationReviewed && (
            <div className="flex items-center ml-2">
              <Badge className={cn(
                "px-3 py-2 rounded-full font-semibold",
                summary.documentationStatus === "Documents Verified" || summary.documentationStatus === "Document verified"
                  ? "bg-green-500 text-white"
                  : summary.documentationStatus === "Documents Rejected" || summary.documentationStatus === "Document rejected"
                  ? "bg-red-500 text-white"
                  : "bg-emerald-100 text-emerald-800"
              )}>
                {summary.documentationStatus || "Document reviewed"}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>

    <div className="p-6 lg:p-8">
      {requirementsLoading ? (
        <div className="text-center py-20">
          <RefreshCw className="inline-block h-8 w-8 animate-spin text-blue-600 mb-3" />
          <p className="text-lg text-slate-600">Loading document requirements...</p>
        </div>
      ) : (
        <>
          {/* Your Full Table – 100% Logic Preserved */}
          <div className="rounded-2xl overflow-x-auto border border-white/30 bg-white/50 backdrop-blur">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-100 to-slate-50">
                  <TableHead className="font-bold text-slate-700">Document Type</TableHead>
                  <TableHead className="font-bold text-slate-700 w-[150px]">Status</TableHead>
                  <TableHead className="font-bold text-slate-700">Submitted Document</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requirements.map((requirement: any) => {
                  const verification = verifications.find((v: any) => v.document.docType === requirement.docType);
                  const displayedStatus = verification ? localStatuses[verification.id] ?? verification.status : undefined;

                  return (
                    <TableRow key={requirement.id} className="hover:bg-white/70 transition">
                      <TableCell className="py-5">
                        <div className="flex items-center gap-3">
                          <FileIcon className="h-6 w-6 text-slate-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 truncate">{requirement.docType}</span>
                              {requirement.mandatory && (
                                <Badge className="bg-red-500/20 text-red-700 text-[10px] font-bold px-1.5 py-0 h-4 flex-shrink-0">REQ</Badge>
                              )}
                            </div>
                            {requirement.description && (
                              <p className="text-xs text-slate-500 mt-1 truncate max-w-[180px]">{requirement.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>{verification ? getStatusBadge(displayedStatus as string) : <Badge variant="outline">Not Submitted</Badge>}</TableCell>

                      <TableCell>
                        {verification ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">
                              {verification.document.fileName}
                            </span>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenPDF(verification.document.fileUrl, verification.document.fileName)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setUploadDocType(verification.document.docType); setShowUploadDialog(true); setUploadFile(null); }}>
                                <Upload className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-xs">No document</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {summary.isDocumentationReviewed ? (
                            <Badge className={cn(
                              "font-semibold text-xs",
                              summary.documentationStatus === "Documents Verified" || summary.documentationStatus === "Document verified"
                                ? "bg-green-500 text-white"
                                : summary.documentationStatus === "Documents Rejected" || summary.documentationStatus === "Document rejected"
                                ? "bg-red-500 text-white"
                                : "bg-slate-100 text-slate-700"
                            )}>{summary.documentationStatus || "Reviewed"}</Badge>
                          ) : verification ? (
                            <>
                              {canVerifyDocuments && displayedStatus === "pending" && (
                                <div className="flex gap-2">
                                  <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white px-3" onClick={() => { setSelectedVerification(verification); setConfirmationAction("verify"); setIsConfirmationOpen(true); }}>
                                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Verify
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-8 border-red-600 text-red-600 hover:bg-red-50 px-3" onClick={() => { setSelectedVerification(verification); setConfirmationAction("reject"); setIsConfirmationOpen(true); }}>
                                    <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
                                  </Button>
                                </div>
                              )}
                              {canVerifyDocuments && displayedStatus === "verified" && (
                                <Button size="sm" variant="outline" className="h-8 border-red-600 text-red-600 hover:bg-red-50 px-3" onClick={() => { setSelectedVerification(verification); setConfirmationAction("reject"); setIsConfirmationOpen(true); }}>
                                  <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
                                </Button>
                              )}
                              {canVerifyDocuments && (displayedStatus === "rejected" || displayedStatus === "resubmission_required" || displayedStatus === "resubmitted") && (
                                <div className="flex gap-2">
                                  {displayedStatus === "resubmission_required" ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex gap-2">
                                            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white px-3" disabled>
                                              <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Verify
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-8 border-red-600 text-red-600 hover:bg-red-50 px-3" disabled>
                                              <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
                                            </Button>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Please wait for resubmission of the document</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <>
                                      <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white px-3" onClick={() => { setSelectedVerification(verification); setConfirmationAction("verify"); setIsConfirmationOpen(true); }}>
                                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Verify
                                      </Button>
                                      {displayedStatus === "resubmitted" && (
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="h-8 border-red-600 text-red-600 hover:bg-red-50 px-3" 
                                          onClick={() => { 
                                            setSelectedVerification(verification); 
                                            setConfirmationAction("reject"); 
                                            setIsConfirmationOpen(true); 
                                          }}
                                        >
                                          <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
                                        </Button>
                                      )}
                                      {canRequestResubmission && displayedStatus === "rejected" && (
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="h-8 border-blue-600 text-blue-600 hover:bg-blue-50 px-3" 
                                          onClick={() => { 
                                            setSelectedResubmitVerification(verification); 
                                            setIsResubmitDialogOpen(true); 
                                          }}
                                        >
                                          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Resubmit
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="h-8 px-3" onClick={() => setShowReuseDialog(true)}>Link</Button>
                              <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white px-3" onClick={() => setShowUploadDialog(true)}>
                                <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
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
          </div>

          {/* Final Complete/Reject Buttons */}
          {(summary.allDocumentsVerified || allRejected) && canVerifyDocuments && !summary.isDocumentationReviewed && (
       <div className="mt-10 pt-8 border-t border-white/30 flex justify-end gap-5">
  {summary.allDocumentsVerified && (
    <Button
      size="sm"
      className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold text-base px-6 py-3 rounded-lg shadow-2xl hover:scale-105 transition max-w-[220px] flex items-center justify-center gap-3"
      onClick={() => { setCompletionAction("complete"); setIsCompletionConfirmationOpen(true); }}
      disabled={isCompleting || selectedProject?.status === CANDIDATE_PROJECT_STATUS.DOCUMENTS_VERIFIED}
    >
      {isCompleting ? <RefreshCw className="h-6 w-6 animate-spin" /> : <CheckCircle className="h-6 w-6" />}
      <span>Complete Verification</span>
    </Button>
  )}
  {allRejected && (
    <Button
      size="sm"
      variant="destructive"
      className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 font-semibold text-base px-6 py-3 rounded-lg shadow-2xl hover:scale-105 transition max-w-[220px] flex items-center justify-center gap-3"
      onClick={() => { setCompletionAction("reject"); setIsCompletionConfirmationOpen(true); }}
      disabled={isRejectingComplete || selectedProject?.status === CANDIDATE_PROJECT_STATUS.REJECTED_DOCUMENTS}
    >
      {isRejectingComplete ? <RefreshCw className="h-6 w-6 animate-spin" /> : <XCircle className="h-6 w-6" />}
      <span>Reject Verification</span>
    </Button>
  )}
</div>
          )}
        </>
      )}
    </div>

    <div className="h-1.5 bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-600" />
  </motion.div>
)}

        {/* Eligibility Requirements */}
        {/* {selectedProjectId && eligibilityData?.data && (
          <EligibilityRequirements
            eligibilityData={eligibilityData.data}
            className="mt-6"
          />
        )} */}

        {/* Matchmaking Process */}
        {selectedProjectId && matchmakingData?.data && (
          <MatchmakingProcess
            matchmakingData={matchmakingData.data}
            className="mt-6"
          />
        )}

        {/* Document Reuse Dialog */}
       <Dialog open={showReuseDialog} onOpenChange={setShowReuseDialog}>
  <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
    {/* Elegant Header */}
    <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white">
      <DialogTitle className="text-2xl font-bold flex items-center gap-3">
        <div className="p-2.5 bg-white/20 backdrop-blur rounded-xl">
          <Link2 className="w-6 h-6" />
        </div>
        Link Existing Document
      </DialogTitle>
      <DialogDescription className="text-white/90 mt-2 text-base">
        Select an existing document to link to this project.
      </DialogDescription>
    </DialogHeader>

    {/* Body - Clean & Modern */}
    <div className="p-6 pt-2 bg-white/95 backdrop-blur-xl">
      <div className="space-y-5">
        <div>
          <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-violet-600" />
            Available Documents
          </Label>

          <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
            <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white/70 shadow-sm focus:ring-4 focus:ring-violet-500/30 transition-all">
              <SelectValue placeholder="Choose a document" />
            </SelectTrigger>

            <SelectContent className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-xl">
              {allCandidateDocuments.length === 0 ? (
                <div className="py-8 text-center">
                  <FileX className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-500">No documents available</p>
                </div>
              ) : (
                allCandidateDocuments.map((doc: any) => (
                  <SelectItem key={doc.id} value={doc.id} className="py-3 cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 bg-gradient-to-br from-violet-100 to-purple-100 rounded-lg">
                        <FileText className="w-4 h-4 text-violet-700" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{doc.docType}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{doc.fileName}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Optional: Visual confirmation when selected */}
        {selectedDocumentType && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50/80 px-4 py-2.5 rounded-lg border border-emerald-200/50"
          >
            <CheckCircle2 className="w-4 h-4" />
            Document selected and ready to link
          </motion.div>
        )}
      </div>
    </div>

    {/* Footer - Clean & Balanced */}
    <DialogFooter className="p-6 pt-4 bg-gradient-to-t from-slate-50 to-transparent border-t border-slate-200/60">
      <Button
        variant="outline"
        onClick={() => setShowReuseDialog(false)}
        className="h-11 px-6 rounded-xl font-medium border-slate-300 hover:bg-slate-50"
      >
        Cancel
      </Button>
      <Button
        onClick={handleReuseDocument}
        disabled={!selectedDocumentType || isReusing}
        className="h-11 px-6 rounded-xl font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-purple-500/30 disabled:opacity-60 transition-all"
      >
        {isReusing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Linking...
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4 mr-2" />
            Link Document
          </>
        )}
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

        {/* Resubmission Request Dialog */}
        <ConfirmationDialog
          isOpen={isResubmitDialogOpen}
          onClose={() => {
            setIsResubmitDialogOpen(false);
            setResubmitReason("");
            setSelectedResubmitVerification(null);
          }}
          onConfirm={handleRequestResubmission}
          title="Request Document Resubmission"
          description={
            <div className="space-y-4">
              <p>
                Are you sure you want to request a resubmission for this document? The candidate will be notified to upload a new version.
              </p>
              <div>
                <Label htmlFor="resubmit-reason" className="text-sm font-medium">
                  Reason for Resubmission (Required)
                </Label>
                <textarea
                  id="resubmit-reason"
                  value={resubmitReason}
                  onChange={(e) => setResubmitReason(e.target.value)}
                  placeholder="Explain why a resubmission is required..."
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                  required
                />
              </div>
            </div>
          }
          confirmText="Send Request"
          cancelText="Cancel"
          variant="default"
          isLoading={isRequestingResubmission}
        />
      </div>
    </div>
  );
}