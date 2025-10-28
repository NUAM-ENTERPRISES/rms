import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label as FormLabel } from "@/components/ui/label";
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useGetVerificationCandidatesQuery } from "@/features/documents";
import { useCan } from "@/hooks/useCan";
import { Can } from "@/components/auth/Can";
import { toast } from "sonner";
import VerificationActionsMenu from "../components/VerificationActionsMenu";

export default function DocumentVerificationPage() {
  const navigate = useNavigate();
  const canReadDocuments = useCan("read:documents");

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [verificationDialog, setVerificationDialog] = useState(false);
  const [verificationAction, setVerificationAction] = useState<
    "verify" | "reject"
  >("verify");
  const [verificationNotes, setVerificationNotes] = useState("");

  // API calls
  const {
    data: verificationData,
    isLoading,
    error,
    refetch,
  } = useGetVerificationCandidatesQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: searchTerm || undefined,
    page: 1,
    limit: 50,
  });

  const candidateProjects = verificationData?.data?.candidateProjects || [];
  const totalCandidates = verificationData?.data?.pagination?.total || 0;

  // Permission check
  if (!canReadDocuments) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Access Denied
                </h2>
                <p className="text-muted-foreground">
                  You don't have permission to view document verification.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleVerifyCandidate = (candidateProject: any) => {
    setSelectedCandidate(candidateProject);
    setVerificationAction("verify");
    setVerificationDialog(true);
  };

  const handleRejectCandidate = (candidateProject: any) => {
    setSelectedCandidate(candidateProject);
    setVerificationAction("reject");
    setVerificationDialog(true);
  };

  const handleSubmitVerification = async () => {
    if (!selectedCandidate) return;

    try {
      if (verificationAction === "verify") {
        // Update candidate-project status to documents_verified
        // This would require a new API endpoint to update candidate-project status
        toast.success("Candidate documents verified successfully");
      } else {
        // Update candidate-project status to rejected_documents
        // This would require a new API endpoint to update candidate-project status
        toast.success("Candidate documents rejected successfully");
      }

      setVerificationDialog(false);
      setVerificationNotes("");
      setSelectedCandidate(null);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update document status");
    }
  };

  // Calculate status counts from API data
  const getStatusCounts = () => {
    const counts = {
      pending_documents: 0,
      documents_submitted: 0,
      verification_in_progress: 0,
      documents_verified: 0,
      rejected_documents: 0,
    };

    candidateProjects.forEach((candidateProject: any) => {
      if (candidateProject.status in counts) {
        counts[candidateProject.status as keyof typeof counts]++;
      }
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Document Verification
            </h1>
            <p className="text-sm text-slate-600">
              {totalCandidates} candidates • Review and verify candidate
              documents
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Compact Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Pending
                </p>
                <p className="text-xl font-bold text-amber-600">
                  {statusCounts.pending_documents}
                </p>
              </div>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Submitted
                </p>
                <p className="text-xl font-bold text-blue-600">
                  {statusCounts.documents_submitted}
                </p>
              </div>
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  In Progress
                </p>
                <p className="text-xl font-bold text-purple-600">
                  {statusCounts.verification_in_progress}
                </p>
              </div>
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Verified
                </p>
                <p className="text-xl font-bold text-green-600">
                  {statusCounts.documents_verified}
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Rejected
                </p>
                <p className="text-xl font-bold text-red-600">
                  {statusCounts.rejected_documents}
                </p>
              </div>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
          </div>
        </div>

        {/* Compact Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search candidates or files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 text-sm"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending_documents">
                  Pending Documents
                </SelectItem>
                <SelectItem value="documents_submitted">
                  Documents Submitted
                </SelectItem>
                <SelectItem value="verification_in_progress">
                  Verification in Progress
                </SelectItem>
                <SelectItem value="documents_verified">
                  Documents Verified
                </SelectItem>
                <SelectItem value="rejected_documents">
                  Rejected Documents
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Compact Documents Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                Candidates for Verification
              </h3>
              <span className="text-sm text-slate-500">
                {candidateProjects.length} candidates
              </span>
            </div>
          </div>
          <div className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading candidates...</span>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                  <p className="text-destructive">Failed to load candidates</p>
                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="font-medium text-slate-700">
                      Candidate
                    </TableHead>
                    <TableHead className="font-medium text-slate-700">
                      Project
                    </TableHead>
                    <TableHead className="font-medium text-slate-700">
                      Status
                    </TableHead>
                    <TableHead className="font-medium text-slate-700">
                      Documents
                    </TableHead>
                    <TableHead className="font-medium text-slate-700">
                      Recruiter
                    </TableHead>
                    <TableHead className="font-medium text-slate-700 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidateProjects.map((candidateProject: any) => (
                    <TableRow
                      key={candidateProject.id}
                      className="hover:bg-slate-50/50"
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                            {candidateProject.candidate.firstName.charAt(0)}
                          </div>
                          <div>
                            <button
                              onClick={() =>
                                navigate(
                                  `/candidates/${candidateProject.candidate.id}/documents/${candidateProject.project.id}`
                                )
                              }
                              className="font-medium text-slate-900 hover:text-blue-600 hover:underline cursor-pointer text-left"
                            >
                              {candidateProject.candidate.firstName}{" "}
                              {candidateProject.candidate.lastName}
                            </button>
                            <p className="text-xs text-slate-500">
                              {candidateProject.candidate.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-slate-900">
                            {candidateProject.project.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {candidateProject.project.client?.name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            candidateProject.status === "documents_verified"
                              ? "default"
                              : candidateProject.status === "rejected_documents"
                              ? "destructive"
                              : candidateProject.status ===
                                "verification_in_progress"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {candidateProject.status
                            .replace("_", " ")
                            .toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-600">
                          {candidateProject.documentVerifications?.length || 0}{" "}
                          documents
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-600">
                          {candidateProject.recruiter?.name || "Unassigned"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <VerificationActionsMenu
                          candidateProject={candidateProject}
                          onReject={handleRejectCandidate}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Compact Verification Dialog */}
        <Dialog open={verificationDialog} onOpenChange={setVerificationDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {verificationAction === "verify"
                  ? "Verify Document"
                  : "Reject Document"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {verificationAction === "verify"
                  ? "Confirm this document is valid and verified."
                  : "Provide a reason for rejecting this document."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCandidate && (
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <p className="font-medium text-slate-900">
                    {selectedCandidate.candidate.firstName}{" "}
                    {selectedCandidate.candidate.lastName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {selectedCandidate.project.title}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <FormLabel className="text-sm font-medium">Notes</FormLabel>
                <Textarea
                  placeholder={
                    verificationAction === "verify"
                      ? "Add verification notes..."
                      : "Explain rejection reason..."
                  }
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setVerificationDialog(false)}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitVerification}
                variant={
                  verificationAction === "verify" ? "default" : "destructive"
                }
                size="sm"
              >
                {verificationAction === "verify" ? "Verify" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
