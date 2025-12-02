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
  UserCheck,
  MoreHorizontal,
  Mail,
  Phone,
} from "lucide-react";
import { useGetProcessingCandidatesQuery } from "@/features/processing/data/processing.endpoints";
import { ProcessingStatusBadge } from "@/features/processing/components/ProcessingStatusBadge";
import { PROCESSING_STEP_META_MAP } from "@/features/processing/constants/processingSteps";

interface ProcessingCandidatesTabProps {
  projectId: string;
}

export default function ProcessingCandidatesTab({
  projectId,
}: ProcessingCandidatesTabProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading, error } = useGetProcessingCandidatesQuery({
    projectId,
    search: searchTerm || undefined,
    status: statusFilter === "all" ? undefined : (statusFilter as any),
    limit: 50,
  });

  const candidates = data?.data.items ?? [];

  const handleViewCandidate = (candidateProjectMapId: string) => {
    navigate(`/processing/candidates/${candidateProjectMapId}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-1/4 rounded bg-gray-200" />
            <div className="space-y-2">
              <div className="h-4 rounded bg-gray-200" />
              <div className="h-4 rounded bg-gray-200" />
              <div className="h-4 rounded bg-gray-200" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-red-600">
          Failed to load processing candidates. Please try again.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Processing Candidates</CardTitle>
          <CardDescription>
            Candidates ready for final processing and hiring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
                <SelectItem value="IN_PROGRESS">Pending</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="NOT_APPLICABLE">Not Applicable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {candidates.length === 0 ? (
            <div className="py-8 text-center">
              <UserCheck className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                No Processing Candidates
              </h3>
              <p className="text-gray-600">
                No candidates are currently in the processing stage.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Current Step</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate) => {
                    const currentStep = candidate.currentStep;
                    const meta =
                      currentStep &&
                      PROCESSING_STEP_META_MAP[currentStep.stepKey];
                    return (
                      <TableRow key={candidate.candidateProjectMapId}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                              {candidate.candidate.firstName?.[0]}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {candidate.candidate.firstName}{" "}
                                {candidate.candidate.lastName}
                              </div>
                              <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                                {candidate.candidate.email && (
                                  <span className="inline-flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {candidate.candidate.email}
                                  </span>
                                )}
                                {candidate.candidate.mobileNumber && (
                                  <span className="inline-flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {candidate.candidate.countryCode}{" "}
                                    {candidate.candidate.mobileNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {currentStep ? (
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {meta?.title}
                              </div>
                              <ProcessingStatusBadge
                                status={currentStep.status}
                              />
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {candidate.project.title}
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
                                  handleViewCandidate(
                                    candidate.candidateProjectMapId
                                  )
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
