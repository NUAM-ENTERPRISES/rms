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
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  RefreshCw,
  AlertCircle,
  User,
  Building2,
  Calendar,
  UserCheck,
} from "lucide-react";
import {
  useGetCandidateProjectsQuery,
  useGetCandidateProjectRequirementsQuery,
  useReuseDocumentMutation,
  useCompleteVerificationMutation,
  useVerifyDocumentMutation,
} from "@/features/documents";
import { useCan } from "@/hooks/useCan";
import { toast } from "sonner";

export default function CandidateDocumentVerificationPage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const canVerifyDocuments = useCan("verify:documents");

  // State
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [showReuseDialog, setShowReuseDialog] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [selectedVerification, setSelectedVerification] = useState<any>(null);

  // API Queries
  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = useGetCandidateProjectsQuery(candidateId!);

  const {
    data: requirementsData,
    isLoading: requirementsLoading,
    error: requirementsError,
  } = useGetCandidateProjectRequirementsQuery(
    { candidateId: candidateId!, projectId: selectedProjectId },
    { skip: !selectedProjectId }
  );

  // Mutations
  const [reuseDocument, { isLoading: isReusing }] = useReuseDocumentMutation();
  const [completeVerification, { isLoading: isCompleting }] =
    useCompleteVerificationMutation();
  const [verifyDocument, { isLoading: isVerifying }] =
    useVerifyDocumentMutation();

  // Auto-select first project
  useEffect(() => {
    if (
      projectsData?.data &&
      projectsData.data.length > 0 &&
      !selectedProjectId
    ) {
      setSelectedProjectId(projectsData.data[0].project.id);
    }
  }, [projectsData, selectedProjectId]);

  const selectedProject = projectsData?.data?.find(
    (p: any) => p.project.id === selectedProjectId
  );

  const requirements = requirementsData?.data?.requirements || [];
  const verifications = requirementsData?.data?.verifications || [];
  const allCandidateDocuments =
    requirementsData?.data?.allCandidateDocuments || [];
  const summary = requirementsData?.data?.summary || {};

  // Handle document verification
  const handleVerifyDocument = async (verificationId: string) => {
    try {
      await verifyDocument({
        documentId: verificationId,
        status: "verified",
        notes: verificationNotes,
      }).unwrap();
      toast.success("Document verified successfully!");
      setVerificationNotes("");
    } catch (error) {
      toast.error("Failed to verify document");
    }
  };

  // Handle document rejection
  const handleRejectDocument = async (verificationId: string) => {
    try {
      await verifyDocument({
        documentId: verificationId,
        status: "rejected",
        notes: verificationNotes,
        rejectionReason: verificationNotes,
      }).unwrap();
      toast.success("Document rejected");
      setVerificationNotes("");
    } catch (error) {
      toast.error("Failed to reject document");
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
    } catch (error) {
      toast.error("Failed to link document");
    }
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
    } catch (error) {
      toast.error("Failed to complete verification");
    }
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
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Project</p>
                      <p className="text-sm font-medium">
                        {selectedProject.project?.title}
                      </p>
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
                                getStatusBadge(verification.status)
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
                                      window.open(
                                        verification.document.fileUrl,
                                        "_blank"
                                      )
                                    }
                                    className="h-6 w-6 p-0"
                                  >
                                    <Eye className="h-3 w-3" />
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
                                    {verification.status === "pending" &&
                                      canVerifyDocuments && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              handleVerifyDocument(
                                                verification.id
                                              )
                                            }
                                            className="h-8 text-green-600 hover:text-green-700"
                                          >
                                            <CheckCircle className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              handleRejectDocument(
                                                verification.id
                                              )
                                            }
                                            className="h-8 text-red-600 hover:text-red-700"
                                          >
                                            <XCircle className="h-4 w-4" />
                                          </Button>
                                        </>
                                      )}
                                  </>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowReuseDialog(true)}
                                    className="h-8"
                                  >
                                    Link Existing
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Complete Verification Button */}
                  {summary.allDocumentsVerified && canVerifyDocuments && (
                    <div className="flex justify-end pt-4 border-t">
                      <Button
                        onClick={handleCompleteVerification}
                        disabled={isCompleting}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isCompleting ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Complete Verification
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
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
      </div>
    </div>
  );
}
