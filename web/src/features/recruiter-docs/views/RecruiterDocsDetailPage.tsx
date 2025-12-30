import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  Eye,
  Download,
  User,
  Building2,
  Calendar,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Send,
  Edit,
  Link2,
  FileX,
  Flag,
  Globe,
  Briefcase,
  Sparkles,
  Home,
  Utensils,
  Car,
  ShieldCheck,
  EyeOff,
  Users,
  GraduationCap,
  Info,
  Mail,
  Phone,
  Award,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGetProjectQuery, useSendForVerificationMutation, RoleNeeded } from "@/features/projects/api";
import { 
  useGetCandidateProjectRequirementsQuery,
  useCreateDocumentMutation,
  useReuseDocumentMutation,
  useGetDocumentsQuery
} from "@/features/documents/api";
import { useUploadDocumentMutation, useGetCandidateByIdQuery, WorkExperience, CandidateQualification, Document as CandidateDocument } from "@/features/candidates/api";
import { useAppSelector } from "@/app/hooks";
import { toast } from "sonner";
import { UploadDocumentModal } from "@/features/documents/components/UploadDocumentModal";
import { ConfirmationDialog } from "@/components/molecules/ConfirmationDialog";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { FlagIcon } from "@/shared/components/FlagIcon";
import LoadingScreen from "@/components/atoms/LoadingScreen";
import MatchScoreSummary from "@/features/projects/components/MatchScoreSummary";

// Minimal colorful badge classes for match scores
const getMinimalScoreBadgeClass = (score?: number) => {
  if (typeof score !== "number") return "bg-slate-50 text-slate-700";
  if (score >= 90) return "bg-green-50 text-green-700";
  if (score >= 80) return "bg-blue-50 text-blue-700";
  if (score >= 70) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
};

// Format a single work experience item for display. Some records use
// explicit yearsOfExperience while others provide start/end dates.
const formatWorkExperienceEntry = (exp: {
  jobTitle?: string;
  designation?: string;
  position?: string;
  role?: string;
  companyName?: string;
  company?: string;
  yearsOfExperience?: number;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
}) => {
  const title = exp.jobTitle || exp.designation || exp.position || exp.role || "";
  const company = exp.companyName || exp.company || "";

  // If yearsOfExperience provided, show it, otherwise compute from dates
  let yearsLabel = "";
  if (typeof exp.yearsOfExperience === "number") {
    yearsLabel = ` (${exp.yearsOfExperience} years)`;
  } else if (exp.startDate) {
    try {
      const start = new Date(exp.startDate);
      const end = exp.endDate ? new Date(exp.endDate) : (exp.isCurrent ? new Date() : null);
      if (end) {
        const diffMs = Math.max(0, end.getTime() - start.getTime());
        const years = Math.round((diffMs / (1000 * 60 * 60 * 24 * 365)) * 10) / 10;
        if (!Number.isNaN(years) && years > 0) {
          yearsLabel = ` (${years} years)`;
        }
      }
    } catch (e) {
      // ignore and leave blank
    }
  }

  // Prefer showing title and company first, then years
  const parts = [] as string[];
  if (title) parts.push(title);
  if (company) parts.push(`at ${company}`);
  return `${parts.join(" ")}${yearsLabel}`.trim();
};

interface UploadData {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
}

interface DocumentRequirement {
  id: string;
  docType: string;
  description?: string;
  mandatory: boolean;
}

interface DocumentVerification {
  id: string;
  status: string;
  createdAt: string;
  document: {
    id: string;
    docType: string;
    fileName: string;
    fileUrl: string;
  };
}

interface CandidateProjectMap {
  id: string;
  status: string;
  subStatus?: {
    name: string;
  };
  isSendedForDocumentVerification: boolean;
  roleNeeded?: {
    id: string;
    designation: string;
    roleCatalog?: {
      id: string;
    };
  };
}

interface CandidateProjectRequirementsData {
  requirements: DocumentRequirement[];
  verifications: DocumentVerification[];
  candidateProject: CandidateProjectMap;
  summary: {
    totalVerified: number;
    totalRequired: number;
    totalRejected: number;
  };
  allCandidateDocuments: CandidateDocument[];
  isSendedForDocumentVerification: boolean;
}

interface MergedQualification extends CandidateQualification {
  qualification?: {
    name: string;
  };
  name?: string;
  institution?: string;
  yearOfCompletion?: number;
}

const RecruiterDocsDetailPage: React.FC = () => {
  const { projectId, candidateId } = useParams<{ projectId: string; candidateId: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const { data: projectData, isLoading: isProjectLoading, error: projectError } = useGetProjectQuery(projectId || "");
  const project = projectData?.data;

  const { data: requirementsData, isLoading: isRequirementsLoading, refetch: refetchRequirements } = useGetCandidateProjectRequirementsQuery(
    { candidateId: candidateId || "", projectId: projectId || "" },
    { skip: !candidateId || !projectId }
  );

  const { data: candidate } = useGetCandidateByIdQuery(candidateId || "", { skip: !candidateId });

  const [uploadDocument, { isLoading: isUploading }] = useUploadDocumentMutation();
  const [createDocument, { isLoading: isCreating }] = useCreateDocumentMutation();
  const [reuseDocument, { isLoading: isReusing }] = useReuseDocumentMutation();
  const [sendForVerification, { isLoading: isSendingVerification }] = useSendForVerificationMutation();

  const [showUploadDialog, setShowUploadDialog] = React.useState(false);
  const [showReuseDialog, setShowReuseDialog] = React.useState(false);
  const [uploadDocType, setUploadDocType] = React.useState("");
  const [selectedExistingDocId, setSelectedExistingDocId] = React.useState("");
  const [selectedRequirement, setSelectedRequirement] = React.useState<DocumentRequirement | null>(null);

  // Verification Confirmation State
  const [isVerifyConfirmOpen, setIsVerifyConfirmOpen] = React.useState(false);
  const [verificationNotes, setVerificationNotes] = React.useState("");
  const [selectedRoleNeededId, setSelectedRoleNeededId] = React.useState<string | undefined>(undefined);
  const [isRoleEditable, setIsRoleEditable] = React.useState(true);
  const [showEditRoleConfirm, setShowEditRoleConfirm] = React.useState(false);

  // Candidate Documents State
  const [candidateDocsPage, setCandidateDocsPage] = React.useState(1);
  const candidateDocsLimit = 10;
  const [candidateDocsSearch, setCandidateDocsSearch] = React.useState("");

  const { data: candidateDocsData, isLoading: isCandidateDocsLoading } = useGetDocumentsQuery({
    candidateId: candidateId || "",
    page: candidateDocsPage,
    limit: candidateDocsLimit,
    search: candidateDocsSearch,
  }, { skip: !candidateId });

  const candidateDocs = candidateDocsData?.data?.documents || [];
  const candidateDocsPagination = candidateDocsData?.data?.pagination;

  const [isPDFViewerOpen, setIsPDFViewerOpen] = React.useState(false);
  const [selectedDocument, setSelectedDocument] = React.useState<{
    fileUrl: string;
    fileName: string;
  } | null>(null);

  const handleOpenPDF = (fileUrl: string, fileName: string) => {
    setSelectedDocument({ fileUrl, fileName });
    setIsPDFViewerOpen(true);
  };

  const requirementsDataTyped = requirementsData?.data as CandidateProjectRequirementsData | undefined;
  const requirements = requirementsDataTyped?.requirements || [];
  const verifications = requirementsDataTyped?.verifications || [];
  const candidateProject = requirementsDataTyped?.candidateProject;
  const summary = requirementsDataTyped?.summary;
  const allCandidateDocuments = requirementsDataTyped?.allCandidateDocuments || [];
  const candidateQuals = (candidate?.qualifications || candidate?.candidateQualifications || []) as MergedQualification[];

  const handleUploadDocument = async (file: File) => {
    if (!uploadDocType || !candidateId || !projectId) return;

    try {
      // Step 1: Upload the file to S3
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", uploadDocType);

      const uploadResult = await uploadDocument({
        candidateId,
        formData,
      }).unwrap();

      // The upload API can return either { fileName, fileUrl, ... } or { data: { fileName, fileUrl, ... } }
      const uploadData = (uploadResult && 'data' in uploadResult) ? (uploadResult.data as UploadData) : (uploadResult as unknown as UploadData);

      // Step 2: Create Document record in database
      const documentData = await createDocument({
        candidateId,
        docType: uploadDocType,
        fileName: uploadData.fileName,
        fileUrl: uploadData.fileUrl,
        fileSize: uploadData.fileSize,
        mimeType: uploadData.mimeType,
      }).unwrap();

      // Step 3: Link the document to the current project
      await reuseDocument({
        documentId: documentData.data.id,
        projectId,
      }).unwrap();

      toast.success("Document uploaded and linked successfully!");
      setShowUploadDialog(false);
      setUploadDocType("");
      setSelectedRequirement(null);
      refetchRequirements();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    }
  };

  const handleReuseDocument = async () => {
    if (!selectedExistingDocId || !projectId) return;

    try {
      await reuseDocument({
        documentId: selectedExistingDocId,
        projectId,
        roleCatalogId: candidateProject?.roleNeeded?.roleCatalog?.id || "",
      }).unwrap();
      
      toast.success("Document linked successfully!");
      setShowReuseDialog(false);
      setSelectedExistingDocId("");
      setSelectedRequirement(null);
      refetchRequirements();
    } catch (error) {
      toast.error("Failed to link document");
    }
  };

  const handleSendForVerification = async () => {
    if (!projectId || !candidateId || !user?.id) return;

    try {
      await sendForVerification({
        projectId,
        candidateId,
        recruiterId: user.id,
        roleNeededId: selectedRoleNeededId || candidateProject?.roleNeeded?.id || project?.rolesNeeded?.[0]?.id,
        notes: verificationNotes || undefined,
      }).unwrap();
      
      toast.success("Candidate sent for verification successfully");
      setIsVerifyConfirmOpen(false);
      setVerificationNotes("");
      setSelectedRoleNeededId(undefined);
      setIsRoleEditable(true);
      refetchRequirements();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to send candidate for verification");
    }
  };

  const openVerifyModal = () => {
    const nominatedRoleId = candidateProject?.roleNeeded?.id;
    setSelectedRoleNeededId(nominatedRoleId || project?.rolesNeeded?.[0]?.id);
    setIsRoleEditable(nominatedRoleId ? false : true);
    setIsVerifyConfirmOpen(true);
  };

  const isVerificationSent = requirementsDataTyped?.isSendedForDocumentVerification ||
                             candidateProject?.isSendedForDocumentVerification || 
                             candidateProject?.subStatus?.name === "verification_in_progress_document" || 
                             candidateProject?.status === "verification_in_progress_document";

  if (isProjectLoading || isRequirementsLoading) return <LoadingScreen />;
  if (projectError || !project) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive opacity-50" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Project not found</h3>
          <p className="text-muted-foreground">The project you are looking for does not exist or you don't have access.</p>
        </div>
        <Button onClick={() => navigate("/recruiter-docs")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button 
          variant="ghost" 
          className="w-fit -ml-2 text-muted-foreground"
          onClick={() => navigate("/recruiter-docs")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{project.title}</h1>
              <Badge variant="outline" className="ml-2 uppercase">{project.id.slice(-8)}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {project.client?.name || "No Client"}
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Creator: {project.creator?.name || "N/A"}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Deadline: {new Date(project.deadline).toLocaleDateString()}
              </div>
              <Badge className={
                project.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                project.status === "completed" ? "bg-blue-50 text-blue-700 border-blue-200" :
                "bg-slate-50 text-slate-700 border-slate-200"
              }>
                {project.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1) : "N/A"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isVerificationSent ? (
              <>
                {summary && summary.totalVerified === summary.totalRequired && summary.totalRequired > 0 ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1.5 text-sm font-semibold">
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Documents Verified
                  </Badge>
                ) : summary && summary.totalRejected === summary.totalRequired && summary.totalRequired > 0 ? (
                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 px-3 py-1.5 text-sm font-semibold">
                    <AlertCircle className="mr-1.5 h-4 w-4" />
                    Documents Rejected
                  </Badge>
                ) : (summary?.totalRejected ?? 0) > 0 ? (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1.5 text-sm font-semibold">
                    <AlertCircle className="mr-1.5 h-4 w-4" />
                    Action Required
                  </Badge>
                ) : (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1.5 text-sm font-semibold">
                    <Clock className="mr-1.5 h-4 w-4" />
                    Verification In Progress
                  </Badge>
                )}
              </>
            ) : (
              verifications.length > 0 && (
                <Button 
                  variant="default"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={openVerifyModal}
                  disabled={isSendingVerification}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send for Verification
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="project-docs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="project-docs">Project Documents</TabsTrigger>
          <TabsTrigger value="candidate-docs">Candidate Documents</TabsTrigger>
          <TabsTrigger value="settings">Requirements</TabsTrigger>
        </TabsList>

        <TabsContent value="project-docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Level Documents</CardTitle>
              <CardDescription>
                Mandatory documents required for the project lifecycle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Uploaded At</TableHead>
                    <TableHead className="text-right w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requirements.map((requirement: DocumentRequirement) => {
                    const verification = verifications.find((v: DocumentVerification) => v.document.docType === requirement.docType);
                    
                    return (
                      <TableRow key={requirement.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span>{requirement.docType}</span>
                              {requirement.mandatory && (
                                <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Required</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{requirement.description || "N/A"}</TableCell>
                        <TableCell>
                          {verification ? (
                            <Badge className={
                              verification.status === "verified" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              verification.status === "rejected" ? "bg-rose-50 text-rose-700 border-rose-200" :
                              "bg-amber-50 text-amber-700 border-amber-200"
                            }>
                              {verification.status.charAt(0).toUpperCase() + verification.status.slice(1)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200">Not Submitted</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {verification ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-xs text-muted-foreground truncate max-w-[150px] block cursor-help">
                                    {verification.document.fileName}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs break-all">
                                  {verification.document.fileName}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No file</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {verification ? new Date(verification.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }) : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {verification ? (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  title="View Document"
                                  onClick={() => handleOpenPDF(verification.document.fileUrl, verification.document.fileName)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  title="Download Document"
                                  onClick={() => window.open(verification.document.fileUrl, '_blank')}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                {(!isVerificationSent || verification.status === "rejected") && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    title="Re-upload"
                                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                    onClick={() => {
                                      setSelectedRequirement(requirement);
                                      setUploadDocType(requirement.docType);
                                      setShowUploadDialog(true);
                                    }}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-violet-600 hover:bg-violet-50"
                                  onClick={() => {
                                    setSelectedRequirement(requirement);
                                    setUploadDocType(requirement.docType);
                                    setShowReuseDialog(true);
                                  }}
                                >
                                  <Link2 className="h-4 w-4 mr-2" />
                                  Add Existing
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-primary hover:bg-primary/10"
                                  onClick={() => {
                                    setSelectedRequirement(requirement);
                                    setUploadDocType(requirement.docType);
                                    setShowUploadDialog(true);
                                  }}
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  Upload
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {requirements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        No document requirements found for this project.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="candidate-docs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Candidate Specific Documents</CardTitle>
                <CardDescription>
                  All documents uploaded by this candidate.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    className="pl-8"
                    value={candidateDocsSearch}
                    onChange={(e) => {
                      setCandidateDocsSearch(e.target.value);
                      setCandidateDocsPage(1);
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded At</TableHead>
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCandidateDocsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">Loading documents...</p>
                      </TableCell>
                    </TableRow>
                  ) : candidateDocs.length > 0 ? (
                    candidateDocs.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {doc.docType}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
                            <Building2 className="h-3 w-3" />
                            {doc.verifications?.[0]?.candidateProjectMap?.project?.title || "General / Unlinked"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground truncate max-w-[200px] block cursor-help">
                                  {doc.fileName}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs break-all">
                                {doc.fileName}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            doc.status === "verified" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            doc.status === "rejected" ? "bg-rose-50 text-rose-700 border-rose-200" :
                            "bg-amber-50 text-amber-700 border-amber-200"
                          }>
                            {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(doc.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="View Document"
                              onClick={() => handleOpenPDF(doc.fileUrl, doc.fileName)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Download Document"
                              onClick={() => window.open(doc.fileUrl, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        No documents found for this candidate.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {candidateDocsPagination && candidateDocsPagination.totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCandidateDocsPage((p) => Math.max(1, p - 1))}
                    disabled={candidateDocsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <div className="text-sm font-medium">
                    Page {candidateDocsPage} of {candidateDocsPagination.totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCandidateDocsPage((p) => Math.min(candidateDocsPagination.totalPages, p + 1))}
                    disabled={candidateDocsPage === candidateDocsPagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Sidebar/Bottom Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{project.description ? "Project Description" : "Project Overview"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {project.description && (
              <div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {project.description}
                </p>
              </div>
            )}

            <div className={cn(
              "grid grid-cols-2 md:grid-cols-3 gap-6",
              project.description && "pt-6 border-t"
            )}>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <Flag className="h-3.5 w-3.5" /> Priority
                </span>
                <Badge className={
                  project.priority === "high" ? "bg-rose-50 text-rose-700 border-rose-200" :
                  project.priority === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
                  "bg-blue-50 text-blue-700 border-blue-200"
                }>
                  {project.priority?.toUpperCase() || "NORMAL"}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <Briefcase className="h-3.5 w-3.5" /> Project Type
                </span>
                <p className="text-sm font-medium capitalize">{project.projectType || "N/A"}</p>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <Globe className="h-3.5 w-3.5" /> Country
                </span>
                <div className="flex items-center gap-2">
                  <FlagIcon countryCode={project.countryCode} size="sm" />
                  <p className="text-sm font-medium">{project.countryCode || "N/A"}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" /> Grooming
                </span>
                <p className="text-sm font-medium capitalize">{project.groomingRequired || "N/A"}</p>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5" /> Screening
                </span>
                <p className="text-sm font-medium">{project.requiredScreening ? "Required" : "Not Required"}</p>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <Edit className="h-3.5 w-3.5" /> Resume Editable
                </span>
                <p className="text-sm font-medium">{project.resumeEditable ? "Yes" : "No"}</p>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <EyeOff className="h-3.5 w-3.5" /> Contact Info
                </span>
                <p className="text-sm font-medium">{project.hideContactInfo ? "Hidden" : "Visible"}</p>
              </div>
            </div>

            <div className="pt-6 border-t">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Project Benefits</h4>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${project.accommodation ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                    <Home className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Accommodation</span>
                    <span className="text-[10px] text-muted-foreground">{project.accommodation ? 'Provided' : 'Not Provided'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${project.food ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                    <Utensils className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Food</span>
                    <span className="text-[10px] text-muted-foreground">{project.food ? 'Provided' : 'Not Provided'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${project.transport ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                    <Car className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Transport</span>
                    <span className="text-[10px] text-muted-foreground">{project.transport ? 'Provided' : 'Not Provided'}</span>
                  </div>
                </div>
              </div>
            </div>

            {project.rolesNeeded?.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Roles & Requirements</h4>
                <div className="grid gap-4">
                  {project.rolesNeeded.map((role: RoleNeeded) => (
                    <div key={role.id} className="bg-slate-50/50 rounded-xl border border-slate-100 p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                            <Briefcase className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900">{role.designation}</h5>
                            <p className="text-xs text-muted-foreground">Quantity: {role.quantity} positions</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700 font-medium">
                            {role.employmentType || "Permanent"}
                          </Badge>
                          <Badge className={
                            role.priority === "high" ? "bg-rose-50 text-rose-700 border-rose-200" :
                            role.priority === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-blue-50 text-blue-700 border-blue-200"
                          }>
                            {role.priority?.toUpperCase() || "NORMAL"} PRIORITY
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Experience
                          </span>
                          <p className="text-sm font-semibold text-slate-700">
                            {role.minExperience}-{role.maxExperience} Years
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <Users className="h-3 w-3" /> Gender
                          </span>
                          <p className="text-sm font-semibold text-slate-700 capitalize">
                            {role.genderRequirement || "All"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Age Limit
                          </span>
                          <p className="text-sm font-semibold text-slate-700">
                            {role.ageRequirement || `${role.minAge}-${role.maxAge}`}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <Globe className="h-3 w-3" /> Visa Type
                          </span>
                          <p className="text-sm font-semibold text-slate-700 capitalize">
                            {role.visaType || "N/A"}
                          </p>
                        </div>
                      </div>

                      {role.educationRequirementsList && role.educationRequirementsList.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-2">
                            <GraduationCap className="h-3 w-3" /> Education Requirements
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {role.educationRequirementsList.map((edu) => (
                              <Badge key={edu.id} variant="outline" className="bg-white text-[11px] py-0.5">
                                {edu.qualification?.name} {edu.mandatory && <span className="ml-1 text-rose-500 font-bold">*</span>}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t flex flex-wrap gap-x-8 gap-y-4">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Last Updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Candidate Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {candidate ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {candidate.firstName?.[0]}{candidate.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-none">{candidate.firstName} {candidate.lastName}</h3>
                    <Badge variant="outline" className="mt-2 bg-blue-50 text-blue-700 border-blue-100">
                      {candidate.currentStatus?.statusName || "N/A"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-slate-600 truncate">{candidate.email || "No email"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-slate-600">{candidate.countryCode} {candidate.mobileNumber}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-slate-600">{candidate.gender ? candidate.gender.charAt(0).toUpperCase() + candidate.gender.slice(1).toLowerCase() : "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span className="text-slate-600">{candidate.totalExperience || candidate.experience || 0} Years Experience</span>
                  </div>
                  {candidateQuals[0] && (
                    <div className="flex items-center gap-3 text-sm">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-slate-600 truncate">
                        {candidateQuals[0].qualification?.name || candidateQuals[0].name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Education Section */}
                {candidateQuals.length > 0 && (
                  <div className="pt-4 border-t space-y-3">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Education</h4>
                    <div className="space-y-3">
                      {candidateQuals.map((qual: MergedQualification) => (
                        <div key={qual.id} className="flex gap-3">
                          <div className="mt-0.5 p-1.5 bg-slate-50 rounded-md border border-slate-100">
                            <GraduationCap className="h-3.5 w-3.5 text-primary/70" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-slate-700 truncate">
                              {qual.qualification?.name || qual.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {qual.university || qual.institution} • {qual.graduationYear || qual.yearOfCompletion}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience Section */}
                {candidate.workExperiences && candidate.workExperiences.length > 0 && (
                  <div className="pt-4 border-t space-y-3">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Work Experience</h4>
                    <div className="space-y-3">
                      {candidate.workExperiences.map((exp: WorkExperience) => (
                        <div key={exp.id} className="flex gap-3">
                          <div className="mt-0.5 p-1.5 bg-slate-50 rounded-md border border-slate-100">
                            <Briefcase className="h-3.5 w-3.5 text-primary/70" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-slate-700 truncate">
                              {exp.jobTitle}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {exp.companyName} • {new Date(exp.startDate).getFullYear()} - {exp.isCurrent ? 'Present' : (exp.endDate ? new Date(exp.endDate).getFullYear() : 'N/A')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <span>Document Progress</span>
                      <span className="text-primary">
                        {summary && summary.totalRequired > 0 ? Math.round((summary.totalVerified / summary.totalRequired) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-500" 
                        style={{ width: `${summary && summary.totalRequired > 0 ? (summary.totalVerified / summary.totalRequired) * 100 : 0}%` }} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-emerald-700">{summary?.totalVerified ?? 0}</span>
                      <span className="text-[10px] font-medium text-emerald-600 uppercase">Verified</span>
                    </div>
                    <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-2 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-rose-700">{summary?.totalRejected ?? 0}</span>
                      <span className="text-[10px] font-medium text-rose-600 uppercase">Rejected</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-10 text-center text-muted-foreground">
                <User className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Candidate details not available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <UploadDocumentModal
        isOpen={showUploadDialog}
        onClose={() => {
          setShowUploadDialog(false);
          setUploadDocType("");
          setSelectedRequirement(null);
        }}
        onUpload={handleUploadDocument}
        projectTitle={project.title}
        roleDesignation={candidateProject?.roleNeeded?.designation || project.rolesNeeded?.[0]?.designation || "N/A"}
        docType={uploadDocType}
        isMandatory={selectedRequirement?.mandatory}
        isUploading={isUploading || isCreating || isReusing}
      />

      <Dialog open={showReuseDialog} onOpenChange={setShowReuseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-violet-600" />
              Link Existing {uploadDocType}
            </DialogTitle>
            <DialogDescription>
              Select an existing {uploadDocType} from the candidate's profile to link to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Available {uploadDocType} Documents</Label>
              <Select value={selectedExistingDocId} onValueChange={setSelectedExistingDocId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select a ${uploadDocType}`} />
                </SelectTrigger>
                <SelectContent>
                  <TooltipProvider>
                    {allCandidateDocuments
                      .filter((doc: CandidateDocument) => doc.docType.toLowerCase() === uploadDocType.toLowerCase())
                      .map((doc: CandidateDocument) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col max-w-[280px]">
                                <span className="font-medium truncate">{doc.fileName}</span>
                                <span className="text-xs text-muted-foreground">
                                  Uploaded on {new Date(doc.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs break-all">
                              {doc.fileName}
                            </TooltipContent>
                          </Tooltip>
                        </SelectItem>
                      ))}
                  </TooltipProvider>
                  {allCandidateDocuments.filter((doc: CandidateDocument) => doc.docType.toLowerCase() === uploadDocType.toLowerCase()).length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      <FileX className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      No existing {uploadDocType} found.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReuseDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReuseDocument} 
              disabled={!selectedExistingDocId || isReusing}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isReusing ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Link Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <ConfirmationDialog
        isOpen={isVerifyConfirmOpen}
        className="sm:max-w-2xl"
        onClose={() => {
          setIsVerifyConfirmOpen(false);
          setVerificationNotes("");
          setSelectedRoleNeededId(undefined);
          setIsRoleEditable(true);
        }}
        onConfirm={handleSendForVerification}
        title="Send for Verification"
        description={
          <div className="space-y-4">
            <p>
              Are you sure you want to send {candidate?.firstName || candidate?.name || "this candidate"} {candidate?.lastName || ""} for
              verification? This will notify the verification team.
            </p>

            {/* Candidate Details */}
            {candidate && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                {/* Match score summary */}
                <MatchScoreSummary candidate={candidate} />

                <h4 className="text-sm font-semibold text-slate-700 mt-2">Candidate Profile</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                  {/* Education column */}
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">Education</p>
                    <div className="space-y-1">
                      {(candidate?.qualifications || candidate?.candidateQualifications || []).length > 0 ? (
                        (candidate?.qualifications || candidate?.candidateQualifications || []).map((qual, idx: number) => (
                          <p key={idx} className="text-xs text-slate-700">
                            {qual.qualification?.name || qual.name || qual.qualification?.shortName || 'N/A'}
                            {qual.qualification?.field || qual.field ? ` - ${qual.qualification?.field || qual.field}` : ''}
                            {qual.graduationYear || qual.yearOfCompletion ? ` (${qual.graduationYear || qual.yearOfCompletion})` : ''}
                          </p>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No education details</p>
                      )}
                    </div>
                  </div>

                  {/* Experience column */}
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">Experience</p>
                    <div className="space-y-1">
                      {candidate?.workExperiences && candidate?.workExperiences.length > 0 ? (
                        candidate?.workExperiences.map((exp: WorkExperience, idx: number) => (
                          <p key={idx} className="text-xs text-slate-700">
                            {formatWorkExperienceEntry(exp)}
                          </p>
                        ))
                      ) : candidate?.candidateExperience ? (
                        <p className="text-xs text-slate-700">{candidate?.candidateExperience} yrs</p>
                      ) : (
                        <p className="text-xs text-slate-500">No experience details</p>
                      )}
                    </div>
                  </div>
                </div>
                {/* Role match scores */}
                {candidate?.roleMatches && candidate?.roleMatches.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-slate-600 mb-2">Role match scores</p>
                    <div className="flex flex-wrap gap-2">
                      {candidate?.roleMatches.map((rm: { designation?: string; score?: number }, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-full px-2 py-1 border border-slate-100 bg-white/60"
                        >
                          <span className="text-xs text-slate-700 max-w-[160px] truncate">
                            {rm.designation || "Role"}
                          </span>
                          <span
                            className={`${getMinimalScoreBadgeClass(rm.score)} text-xs font-semibold px-2 py-0.5 rounded-full`}
                          >
                            {rm.score ?? "-"}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <div className="flex items-center gap-2">
                {!isRoleEditable && selectedRoleNeededId ? (
                  // Show only assigned role and make select disabled
                  <div className="flex items-center gap-2">
                    <Select value={selectedRoleNeededId} onValueChange={(v) => setSelectedRoleNeededId(v)}>
                      <SelectTrigger className="w-56" disabled>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {project?.rolesNeeded?.filter((r: RoleNeeded) => r.id === selectedRoleNeededId).map((r: RoleNeeded) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.designation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={() => setShowEditRoleConfirm(true)} className="h-8 w-8 p-0">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={selectedRoleNeededId}
                    onValueChange={(v) =>
                      setSelectedRoleNeededId(v)
                    }
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {project?.rolesNeeded?.map((r: RoleNeeded) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.designation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <label
                htmlFor="verify-notes"
                className="text-sm font-medium text-gray-700"
              >
                Notes (Optional)
              </label>
              <Textarea
                id="verify-notes"
                placeholder="Add any notes for the verification team..."
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                rows={3}
                className="w-full"
              />
            </div>
          </div>
        }
        confirmText="Send for Verification"
        cancelText="Cancel"
        isLoading={isSendingVerification}
        variant="default"
        icon={
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Send className="h-5 w-5 text-blue-600" />
          </div>
        }
      />

      {/* Confirm edit role dialog (Verify modal) */}
      <ConfirmationDialog
        isOpen={showEditRoleConfirm}
        onClose={() => setShowEditRoleConfirm(false)}
        onConfirm={() => {
          setIsRoleEditable(true);
          setShowEditRoleConfirm(false);
        }}
        title="Edit assigned role"
        description={`This candidate already has an assigned role. Do you want to edit it?`}
        confirmText="Edit role"
        cancelText="Cancel"
      />
    </div>
  );
};

export default RecruiterDocsDetailPage;
