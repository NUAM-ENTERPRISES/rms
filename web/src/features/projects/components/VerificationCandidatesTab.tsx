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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Eye,
  FileText,
  CheckCircle,
  Clock,
  MoreHorizontal,
  BarChart3,
  Phone,
  Mail,
  AlertCircle,
} from "lucide-react";
import { useGetDocumentVerificationCandidatesQuery } from "@/features/projects";
import { format } from "date-fns";

interface VerificationCandidatesTabProps {
  projectId: string;
}

const DocumentStatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "all_verified":
        return {
          label: "All Verified",
          variant: "default" as const,
          color: "bg-green-100 text-green-800",
        };
      case "pending_verification":
        return {
          label: "Pending",
          variant: "secondary" as const,
          color: "bg-amber-100 text-amber-800",
        };
      case "has_rejected":
        return {
          label: "Has Rejected",
          variant: "destructive" as const,
          color: "bg-red-100 text-red-800",
        };
      case "no_documents":
        return {
          label: "No Documents",
          variant: "outline" as const,
          color: "bg-gray-100 text-gray-800",
        };
      default:
        return {
          label: status,
          variant: "outline" as const,
          color: "bg-gray-100 text-gray-800",
        };
    }
  };

  const config = getStatusConfig(status);
  return (
    <Badge variant={config.variant} className={config.color}>
      {config.label}
    </Badge>
  );
};

const MatchScoreBadge = ({ score }: { score: number }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 80) return "bg-blue-100 text-blue-800 border-blue-200";
    if (score >= 70) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  return (
    <Badge variant="outline" className={`${getScoreColor(score)} border`}>
      <BarChart3 className="h-3 w-3 mr-1" />
      {score}%
    </Badge>
  );
};

export default function VerificationCandidatesTab({
  projectId,
}: VerificationCandidatesTabProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Get candidates in verification stages
  const {
    data: candidatesData,
    isLoading,
    error,
  } = useGetDocumentVerificationCandidatesQuery(projectId);

  const candidates = candidatesData?.data || [];

  // Filter candidates
  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      candidate.candidate.firstName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      candidate.candidate.lastName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      candidate.candidate.email
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || candidate.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewCandidate = (candidateId: string) => {
    navigate(`/candidates/${candidateId}`);
  };

  const handleVerifyDocuments = (candidateId: string) => {
    // Navigate to document verification page
    navigate(
      `/documents/verification?candidate=${candidateId}&project=${projectId}`
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Failed to load verification candidates. Please try again.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Verification</CardTitle>
          <CardDescription>
            Candidates in document verification stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="verification_in_progress">
                  In Verification
                </SelectItem>
                <SelectItem value="pending_documents">
                  Pending Documents
                </SelectItem>
                <SelectItem value="documents_verified">
                  Documents Verified
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredCandidates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Verification Candidates
              </h3>
              <p className="text-gray-600">
                No candidates are currently in document verification stages.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Match Score</TableHead>
                    <TableHead>Document Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {candidate.candidate.firstName
                              ?.charAt(0)
                              .toUpperCase() || "?"}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {candidate.candidate.firstName}{" "}
                              {candidate.candidate.lastName}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                              {candidate.candidate.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {candidate.candidate.email}
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {candidate.candidate.countryCode}{" "}
                                {candidate.candidate.mobileNumber}
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <MatchScoreBadge score={candidate.matchScore || 0} />
                      </TableCell>
                      <TableCell>
                        <DocumentStatusBadge
                          status={
                            candidate.documentStatus || "pending_verification"
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-600">
                            {candidate.verifiedDocuments || 0}/
                            {candidate.totalDocuments || 0} verified
                          </div>
                          {candidate.pendingDocuments > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-amber-100 text-amber-800"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              {candidate.pendingDocuments} pending
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleViewCandidate(candidate.candidateId)
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleVerifyDocuments(candidate.candidateId)
                              }
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Verify Documents
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
