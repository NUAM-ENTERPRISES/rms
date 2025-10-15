import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
  Filter,
  Eye,
  FileText,
  CheckCircle,
  Clock,
  MoreHorizontal,
  BarChart3,
  Phone,
  Mail,
  AlertCircle,
  Calendar,
  User,
} from "lucide-react";
import { useGetDocumentVerificationCandidatesQuery } from "@/features/projects";
import { format } from "date-fns";

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

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "verification_in_progress":
        return {
          label: "In Verification",
          variant: "secondary" as const,
          color: "bg-amber-100 text-amber-800",
        };
      case "pending_documents":
        return {
          label: "Pending Documents",
          variant: "outline" as const,
          color: "bg-orange-100 text-orange-800",
        };
      case "documents_verified":
        return {
          label: "Verified",
          variant: "default" as const,
          color: "bg-green-100 text-green-800",
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

export default function DocumentVerificationDashboard() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");

  // Get all candidates in verification stages across all projects
  const {
    data: candidatesData,
    isLoading,
    error,
  } = useGetDocumentVerificationCandidatesQuery("all"); // This would need to be implemented to get all projects

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
        .includes(searchTerm.toLowerCase()) ||
      candidate.project.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || candidate.status === statusFilter;
    const matchesProject =
      projectFilter === "all" || candidate.project.id === projectFilter;

    return matchesSearch && matchesStatus && matchesProject;
  });

  const handleViewCandidate = (candidateId: string) => {
    navigate(`/candidates/${candidateId}`);
  };

  const handleVerifyDocuments = (candidateId: string, projectId: string) => {
    navigate(
      `/documents/verification?candidate=${candidateId}&project=${projectId}`
    );
  };

  const handleViewProject = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p>Failed to load verification candidates. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Document Verification Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Manage document verification for candidates across all projects
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            {filteredCandidates.length} candidates
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search candidates or projects..."
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
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {/* This would be populated with actual projects */}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Candidates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Candidates</CardTitle>
          <CardDescription>
            Candidates requiring document verification across all projects
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Match Score</TableHead>
                    <TableHead>Status</TableHead>
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
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-white text-xs font-semibold">
                            P
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
                              {candidate.project.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(
                                new Date(candidate.assignedAt),
                                "dd MMM yyyy"
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {candidate.candidate.experience || 0} years
                        </div>
                      </TableCell>
                      <TableCell>
                        <MatchScoreBadge score={candidate.matchScore || 0} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={candidate.status} />
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
                              View Candidate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleViewProject(candidate.projectId)
                              }
                            >
                              <User className="h-4 w-4 mr-2" />
                              View Project
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleVerifyDocuments(
                                  candidate.candidateId,
                                  candidate.projectId
                                )
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
