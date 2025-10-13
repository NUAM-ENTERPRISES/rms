import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  User,
  Building2,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { useGetDocumentsQuery } from "@/features/documents";
import { useCan } from "@/hooks/useCan";
import { Can } from "@/components/auth/Can";
import { DocumentStatusBadge, DocumentTypeBadge } from "@/components/molecules";
import { format } from "date-fns";
import { toast } from "sonner";

// Mock data for demonstration
const mockDocuments = [
  {
    id: "1",
    candidateId: "candidate-1",
    docType: "passport",
    fileName: "passport_john_doe.pdf",
    fileUrl: "https://example.com/passport.pdf",
    status: "pending",
    uploadedBy: "user-1",
    uploadedAt: "2024-01-15T10:30:00Z",
    candidate: {
      id: "candidate-1",
      name: "John Doe",
      contact: "+1234567890",
      email: "john@example.com",
    },
    verifications: [],
  },
  {
    id: "2",
    candidateId: "candidate-2",
    docType: "professional_license",
    fileName: "nursing_license_jane_smith.pdf",
    fileUrl: "https://example.com/license.pdf",
    status: "verified",
    uploadedBy: "user-2",
    uploadedAt: "2024-01-14T14:20:00Z",
    verifiedBy: "user-3",
    verifiedAt: "2024-01-15T09:15:00Z",
    candidate: {
      id: "candidate-2",
      name: "Jane Smith",
      contact: "+1987654321",
      email: "jane@example.com",
    },
    verifications: [],
  },
  {
    id: "3",
    candidateId: "candidate-3",
    docType: "degree",
    fileName: "bachelor_degree_mike_wilson.pdf",
    fileUrl: "https://example.com/degree.pdf",
    status: "rejected",
    uploadedBy: "user-1",
    uploadedAt: "2024-01-13T16:45:00Z",
    rejectedBy: "user-3",
    rejectedAt: "2024-01-14T11:30:00Z",
    rejectionReason: "Document is not clear, please resubmit",
    candidate: {
      id: "candidate-3",
      name: "Mike Wilson",
      contact: "+1122334455",
      email: "mike@example.com",
    },
    verifications: [],
  },
];

export default function DocumentVerificationPage() {
  const navigate = useNavigate();
  const canVerifyDocuments = useCan("verify:documents");
  const canReadDocuments = useCan("read:documents");

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [docTypeFilter, setDocTypeFilter] = useState("all");
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [verificationDialog, setVerificationDialog] = useState(false);
  const [verificationAction, setVerificationAction] = useState<
    "verify" | "reject"
  >("verify");
  const [verificationNotes, setVerificationNotes] = useState("");

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

  // Filter documents
  const filteredDocuments = mockDocuments.filter((doc) => {
    const matchesSearch =
      doc.candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    const matchesDocType =
      docTypeFilter === "all" || doc.docType === docTypeFilter;

    return matchesSearch && matchesStatus && matchesDocType;
  });

  const handleVerifyDocument = (document: any) => {
    setSelectedDocument(document);
    setVerificationAction("verify");
    setVerificationDialog(true);
  };

  const handleRejectDocument = (document: any) => {
    setSelectedDocument(document);
    setVerificationAction("reject");
    setVerificationDialog(true);
  };

  const handleSubmitVerification = () => {
    // In real implementation, this would call the API
    toast.success(
      `Document ${
        verificationAction === "verify" ? "verified" : "rejected"
      } successfully`
    );
    setVerificationDialog(false);
    setVerificationNotes("");
    setSelectedDocument(null);
  };

  const getStatusCounts = () => {
    const counts = {
      pending: 0,
      verified: 0,
      rejected: 0,
      expired: 0,
    };

    mockDocuments.forEach((doc) => {
      counts[doc.status as keyof typeof counts]++;
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Document Verification
            </h1>
            <p className="text-muted-foreground">
              Review and verify candidate documents
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
            <Can anyOf={["write:documents"]}>
              <Button onClick={() => navigate("/documents/upload")}>
                Upload Document
              </Button>
            </Can>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending
                  </p>
                  <p className="text-2xl font-bold">{statusCounts.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Verified
                  </p>
                  <p className="text-2xl font-bold">{statusCounts.verified}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Rejected
                  </p>
                  <p className="text-2xl font-bold">{statusCounts.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Expired
                  </p>
                  <p className="text-2xl font-bold">{statusCounts.expired}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by candidate name or file name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="professional_license">
                    Professional License
                  </SelectItem>
                  <SelectItem value="degree">Degree</SelectItem>
                  <SelectItem value="resume">Resume</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Documents ({filteredDocuments.length})</CardTitle>
            <CardDescription>
              Review and verify candidate documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {document.candidate.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {document.candidate.contact}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DocumentTypeBadge docType={document.docType} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">
                          {document.fileName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DocumentStatusBadge status={document.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(
                            new Date(document.uploadedAt),
                            "MMM dd, yyyy"
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(document.fileUrl, "_blank")
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Can anyOf={["verify:documents"]}>
                          {document.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleVerifyDocument(document)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRejectDocument(document)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </Can>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Verification Dialog */}
        <Dialog open={verificationDialog} onOpenChange={setVerificationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {verificationAction === "verify"
                  ? "Verify Document"
                  : "Reject Document"}
              </DialogTitle>
              <DialogDescription>
                {verificationAction === "verify"
                  ? "Confirm that this document is valid and verified."
                  : "Provide a reason for rejecting this document."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedDocument && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">
                    {selectedDocument.candidate.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDocument.fileName}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <FormLabel>Notes</FormLabel>
                <Textarea
                  placeholder={
                    verificationAction === "verify"
                      ? "Add any verification notes..."
                      : "Explain why this document is being rejected..."
                  }
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setVerificationDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitVerification}
                variant={
                  verificationAction === "verify" ? "default" : "destructive"
                }
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
