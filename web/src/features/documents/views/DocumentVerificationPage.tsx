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
// Status filter dropdown removed — tiles act as status filters now
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
  Users,
  User,
  Building2,
  FileText,
  TrendingUp,
  Briefcase,
} from "lucide-react";
import { motion } from "framer-motion";
import { useGetVerificationCandidatesQuery } from "@/features/documents";
import { useCan } from "@/hooks/useCan";
import { Can } from "@/components/auth/Can";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import VerificationActionsMenu from "../components/VerificationActionsMenu";

export default function DocumentVerificationPage() {
  const navigate = useNavigate();
  const canReadDocuments = useCan("read:documents");

  // State
  const [searchTerm, setSearchTerm] = useState("");
  // default to verification_in_progress_document so the list shows candidates needing verification
  const [statusFilter, setStatusFilter] = useState(
    "verification_in_progress_document"
  );
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
        toast.success("Candidate documents verified successfully");
      } else {
        toast.success("Candidate documents rejected successfully");
      }

      setVerificationDialog(false);
      setVerificationNotes("");
      setSelectedCandidate(null);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update document status");
    }
  };

  // Calculate status counts from API data (prefer server-supplied counts when available)
  const getStatusCounts = () => {
    // API can return a counts object like: { pending: 1, verified: 2, rejected: 1 }
    const apiCounts = verificationData?.data?.counts;

    if (apiCounts) {
      // Map API count keys to our internal canonical keys
      // Keep both verification_in_progress_document and verification_in_progress for compatibility
      return {
        verification_in_progress_document: Number(apiCounts.pending || 0),
        documents_submitted: 0,
        verification_in_progress: Number(apiCounts.pending || 0),
        documents_verified: Number(apiCounts.verified || 0),
        rejected_documents: Number(apiCounts.rejected || 0),
      };
    }

    // Fallback: compute counts from returned candidateProjects array
    const counts = {
      verification_in_progress_document: 0,
      documents_submitted: 0,
      verification_in_progress: 0,
      documents_verified: 0,
      rejected_documents: 0,
    };

    candidateProjects.forEach((candidateProject: any) => {
      // status can come from different properties depending on API shape
      const rawStatus =
        candidateProject.status || candidateProject.subStatus?.name || candidateProject.subStatus?.label;

      // normalize known aliases into the keys we track
      let key = rawStatus;
      if (!key) return;

      // map legacy/alternate names to our chosen bucket
      if (key === "pending_documents" || key === "verification_in_progress") {
        key = "verification_in_progress_document";
      }

      if (key in counts) {
        counts[key as keyof typeof counts]++;
      }
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Document Verification
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{totalCandidates}</span> candidates &bull; Review and verify candidate documents
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

        {/* Dashboard Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
          {/* Total Candidates Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card
              className={cn(
                "border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
                statusFilter === "verification_in_progress_document" ? "ring-2 ring-blue-300" : ""
              )}
              onClick={() => setStatusFilter("verification_in_progress_document")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Pending Candidates</p>
                    <h3 className="text-3xl font-bold text-blue-600">
                      {statusCounts.verification_in_progress_document}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">For verification</p>
                  </div>
                  <div className="p-3 bg-blue-200/40 rounded-full">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Verified Documents Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card
              className={cn(
                "border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
                statusFilter === "documents_verified" ? "ring-2 ring-green-300" : ""
              )}
              onClick={() => setStatusFilter("documents_verified")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Verified</p>
                    <h3 className="text-3xl font-bold text-green-600">
                      {statusCounts.documents_verified}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">Approved</p>
                  </div>
                  <div className="p-3 bg-green-200/40 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* In-progress (merged into Total/Pending) - removed duplicate card */}

          {/* Rejected Documents Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card
              className={cn(
                "border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
                statusFilter === "rejected_documents" ? "ring-2 ring-red-300" : ""
              )}
              onClick={() => setStatusFilter("rejected_documents")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Rejected</p>
                    <h3 className="text-3xl font-bold text-red-600">
                      {statusCounts.rejected_documents}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">Not approved</p>
                  </div>
                  <div className="p-3 bg-red-200/40 rounded-full">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Compact Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
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
            {/* removed status dropdown — use tiles above to filter by status */}
          </div>
        </div>

        {/* Compact Documents Table */}
       <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
  {/* Header */}
  <div className="border-b border-gray-200 bg-gray-50/70 px-6 py-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
       <div className="rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-lg shadow-purple-500/20">
          <User className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {(() => {
              switch (statusFilter) {
                case "documents_verified":
                  return "Verified Candidates";
                case "verification_in_progress_document":
                  return "In-progress Candidates";
                case "rejected_documents":
                  return "Rejected Candidates";
                default:
                  return "Candidates for Verification";
              }
            })()}
          </h3>
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{candidateProjects.length}</span>{' '}
            {(() => {
              return candidateProjects.length === 1 ? 'candidate' : 'candidates';
            })()} {statusFilter === 'all' ? 'to review' : ''}
          </p>
        </div>
      </div>
      {isLoading && <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />}
    </div>
  </div>

  {/* Loading */}
  {isLoading && (
    <div className="py-24 text-center">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
      <p className="mt-3 text-sm text-gray-500">Loading candidates...</p>
    </div>
  )}

  {/* Error */}
  {error && (
    <div className="py-24 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
      <p className="mt-4 text-sm font-medium text-gray-900">Failed to load candidates</p>
      <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
        Try Again
      </Button>
    </div>
  )}

  {/* Table */}
  {!isLoading && !error && candidateProjects.length > 0 && (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50/50 border-b border-gray-200">
          <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
            Candidate
          </TableHead>
          <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
            Project
          </TableHead>
          
          {statusFilter === "documents_verified" ? (
            <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
              Verified
            </TableHead>
          ) : statusFilter === "verification_in_progress_document" ? (
            <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
              Pending / Submitted
            </TableHead>
          ) : statusFilter === "rejected_documents" ? (
            <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
              Rejected
            </TableHead>
          ) : (
            <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
              Status
            </TableHead>
          )}

          <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
            Documents
          </TableHead>
          <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
            Recruiter
          </TableHead>
          <TableHead className="h-11 px-6 text-right text-xs font-medium uppercase tracking-wider text-gray-600">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {candidateProjects.map((candidateProject: any, index: number) => {
          const status = candidateProject?.subStatus?.label || "";
          // const statusConfig = {
          //   documents_verified: { Icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
          //   rejected_documents: { Icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
          //   verification_in_progress: { Icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          //   documents_submitted: { Icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
          //   verification_in_progress_document: { Icon: Clock, color: "text-gray-600", bg: "bg-gray-100" },
          // }[status] || { Icon: AlertCircle, color: "text-gray-500", bg: "bg-gray-50" };
          // const { Icon } = statusConfig;

          return (
            <motion.tr
              key={candidateProject.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.03 }}
              className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70 transition-colors"
            >
              {/* Candidate — ONLY THIS ICON BACKGROUND CHANGED */}
              <TableCell className="px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/20 text-sm font-medium text-white">
                    {candidateProject.candidate.firstName?.[0]?.toUpperCase() || "A"}
                  </div>
                  <div>
                    <button
                      onClick={() =>
                        navigate(
                          `/candidates/${candidateProject.candidate.id}/documents/${candidateProject.project.id}`
                        )
                      }
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline"
                    >
                      {candidateProject.candidate.firstName} {candidateProject.candidate.lastName}
                    </button>
                    <p className="text-xs text-gray-500">{candidateProject.candidate.email}</p>
                  </div>
                </div>
              </TableCell>

              {/* Project — Unchanged */}
              <TableCell className="px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gray-100 p-2">
                    <Building2 className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {candidateProject.project.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {candidateProject.project.client?.name || "—"}
                    </p>
                  </div>
                </div>
              </TableCell>

              {/* Dynamic status/summary column */}
              <TableCell className="px-6 py-5">
                {(() => {
                  const docs = candidateProject.documentVerifications || [];
                  const totalDocs = docs.length;
                  const verifiedCount = docs.filter((d: any) => d.status === "verified").length;
                  const pendingCount = docs.filter((d: any) => d.status === "pending").length;
                  const rejectedCount = docs.filter((d: any) => d.status === "rejected").length;

                  if (statusFilter === "documents_verified") {
                    const lastVerified = docs
                      .filter((d: any) => d.status === "verified")
                      .map((d: any) => d.verifiedAt)
                      .filter(Boolean)
                      .sort()
                      .reverse()[0];

                    return (
                      <div className="text-sm text-gray-700">
                        <div className="font-medium">{verifiedCount} / {totalDocs} verified</div>
                        {lastVerified ? (
                          <div className="text-xs text-gray-500">Last: {new Date(lastVerified).toLocaleDateString()}</div>
                        ) : null}
                      </div>
                    );
                  }

                  if (statusFilter === "verification_in_progress_document") {
                    return (
                      <div className="text-sm text-gray-700">
                        <div className="font-medium">Pending: {pendingCount}</div>
                        <div className="text-xs text-gray-500">Submitted: {totalDocs}</div>
                      </div>
                    );
                  }

                  if (statusFilter === "rejected_documents") {
                    const lastRejected = docs
                      .filter((d: any) => d.status === "rejected")
                      .map((d: any) => ({at: d.rejectedAt, reason: d.rejectionReason}))
                      .filter((x: any) => x.at)
                      .sort((a: any, b: any) => (a.at > b.at ? -1 : 1))[0];

                    return (
                      <div className="text-sm text-gray-700">
                        <div className="font-medium">Rejected: {rejectedCount}</div>
                        {lastRejected?.reason ? (
                          <div className="text-xs text-gray-500 truncate max-w-[20rem]">Reason: {lastRejected.reason}</div>
                        ) : null}
                      </div>
                    );
                  }

                  return <div className="text-sm text-gray-700">{status}</div>;
                })()}
              </TableCell>

              {/* Documents */}
              <TableCell className="px-6 py-5 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  {candidateProject.documentVerifications?.length || 0}
                </div>
              </TableCell>

              {/* Recruiter */}
              <TableCell className="px-6 py-5 text-sm text-gray-600">
                {candidateProject.recruiter?.name || "Unassigned"}
              </TableCell>

              {/* Actions */}
              <TableCell className="px-6 py-5 text-right">
                <VerificationActionsMenu
                  candidateProject={candidateProject}
                  onReject={handleRejectCandidate}
                />
              </TableCell>
            </motion.tr>
          );
        })}
      </TableBody>
    </Table>
  )}

  {/* Empty State */}
  {!isLoading && !error && candidateProjects.length === 0 && (
    <div className="py-24 text-center">
      <div className="mx-auto h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
        <User className="h-6 w-6 text-gray-400" />
      </div>
      <p className="mt-4 text-sm text-gray-500">No candidates found</p>
    </div>
  )}
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