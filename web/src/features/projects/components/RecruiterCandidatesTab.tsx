import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  UserCheck,
  Send,
  Phone,
  Mail,
  UserPlus,
  Check,
} from "lucide-react";
import {
  useGetProjectCandidatesByRoleQuery,
  useSendForVerificationMutation,
} from "@/features/projects";
import {
  useGetCandidatesQuery,
  useAssignToProjectMutation,
} from "@/features/candidates";

interface RecruiterCandidatesTabProps {
  projectId: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "nominated":
        return {
          label: "Nominated",
          variant: "default" as const,
          color: "bg-blue-100 text-blue-800",
        };
      case "verification_in_progress":
        return {
          label: "In Verification",
          variant: "secondary" as const,
          color: "bg-amber-100 text-amber-800",
        };
      case "documents_verified":
        return {
          label: "Verified",
          variant: "outline" as const,
          color: "bg-green-100 text-green-800",
        };
      case "approved":
        return {
          label: "Approved",
          variant: "outline" as const,
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

export default function RecruiterCandidatesTab({
  projectId,
}: RecruiterCandidatesTabProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [assignSearchTerm, setAssignSearchTerm] = useState("");

  // Get current user (recruiter) - for future use
  // const { user } = useAppSelector((state) => state.auth);

  // Get all candidates assigned to the current recruiter
  const { data: candidatesData, isLoading, error } = useGetCandidatesQuery();

  // Get candidates already assigned to this project for filtering
  const { data: projectCandidatesData } = useGetProjectCandidatesByRoleQuery({
    projectId,
    role: "Recruiter",
  });

  const [sendForVerification, { isLoading: isSending }] =
    useSendForVerificationMutation();

  const [assignToProject, { isLoading: isAssigning }] =
    useAssignToProjectMutation();

  // Get all candidates (we'll filter by recruiter on the frontend for now)
  const allCandidates = candidatesData || [];

  // Get candidates already assigned to this project
  const projectCandidates = projectCandidatesData?.data || [];
  const assignedToProjectIds = projectCandidates.map((c) => c.candidateId);

  // Filter candidates assigned to this recruiter (for now, show all candidates)
  // TODO: Implement proper recruiter filtering on backend
  const recruiterCandidates = allCandidates;

  // Filter candidates (show all recruiter's candidates)
  const filteredCandidates = recruiterCandidates.filter((candidate: any) => {
    const matchesSearch =
      candidate.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || candidate.currentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filter candidates for assignment dialog (exclude already assigned to this project)
  const availableCandidates = recruiterCandidates.filter(
    (candidate: any) =>
      !assignedToProjectIds.includes(candidate.id) &&
      (candidate.firstName
        .toLowerCase()
        .includes(assignSearchTerm.toLowerCase()) ||
        candidate.lastName
          .toLowerCase()
          .includes(assignSearchTerm.toLowerCase()) ||
        candidate.email?.toLowerCase().includes(assignSearchTerm.toLowerCase()))
  );

  const handleSendForVerification = async (candidateId: string) => {
    try {
      await sendForVerification({ projectId, candidateId }).unwrap();
      toast.success("Candidate sent for verification successfully");
    } catch (error: any) {
      toast.error(
        error?.data?.message || "Failed to send candidate for verification"
      );
    }
  };

  const handleViewCandidate = (candidateId: string) => {
    navigate(`/candidates/${candidateId}`);
  };

  const handleAssignSingleCandidate = async (candidateId: string) => {
    try {
      const result = await assignToProject({
        candidateId,
        projectId,
        notes: `Assigned by recruiter to project`,
      }).unwrap();
      toast.success(
        result.message || "Candidate assigned to project successfully"
      );
    } catch (error: any) {
      toast.error(
        error?.data?.message || "Failed to assign candidate to project"
      );
    }
  };

  const handleCandidateSelection = (
    candidateId: string,
    isSelected: boolean
  ) => {
    if (isSelected) {
      setSelectedCandidates((prev) => [...prev, candidateId]);
    } else {
      setSelectedCandidates((prev) => prev.filter((id) => id !== candidateId));
    }
  };

  const handleAssignCandidates = async () => {
    if (selectedCandidates.length === 0) {
      toast.error("Please select at least one candidate");
      return;
    }

    try {
      const assignments = selectedCandidates.map((candidateId) =>
        assignToProject({
          candidateId,
          projectId,
          notes: `Bulk assigned by recruiter to project`,
        }).unwrap()
      );

      await Promise.all(assignments);
      toast.success(
        `${selectedCandidates.length} candidate(s) assigned to project successfully`
      );

      // Reset state
      setSelectedCandidates([]);
      setIsAssignDialogOpen(false);
      setAssignSearchTerm("");
    } catch (error: any) {
      toast.error(
        error?.data?.message || "Failed to assign candidates to project"
      );
    }
  };

  const handleSelectAll = () => {
    if (selectedCandidates.length === availableCandidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(availableCandidates.map((c: any) => c.id));
    }
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
            <p>Failed to load candidates. Please try again.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
            <SelectItem value="untouched">Untouched</SelectItem>
            <SelectItem value="interested">Interested</SelectItem>
            <SelectItem value="not_interested">Not Interested</SelectItem>
            <SelectItem value="not_eligible">Not Eligible</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="shortlisted">Shortlisted</SelectItem>
            <SelectItem value="selected">Selected</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="hired">Hired</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Candidates
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Assign Candidates to Project</DialogTitle>
              <DialogDescription>
                Select candidates to assign to this project. They will be
                automatically assigned to you as the recruiter.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search candidates to assign..."
                    value={assignSearchTerm}
                    onChange={(e) => setAssignSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleSelectAll}
                  className="whitespace-nowrap"
                >
                  {selectedCandidates.length === availableCandidates.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>

              <div className="flex-1 overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={
                            selectedCandidates.length ===
                              availableCandidates.length &&
                            availableCandidates.length > 0
                          }
                          onChange={handleSelectAll}
                          className="rounded"
                        />
                      </TableHead>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <div className="animate-pulse">
                            Loading candidates...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : availableCandidates.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-gray-500"
                        >
                          No available candidates found
                        </TableCell>
                      </TableRow>
                    ) : (
                      availableCandidates.map((candidate: any) => (
                        <TableRow key={candidate.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedCandidates.includes(
                                candidate.id
                              )}
                              onChange={(e) =>
                                handleCandidateSelection(
                                  candidate.id,
                                  e.target.checked
                                )
                              }
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                {candidate.firstName?.charAt(0).toUpperCase() ||
                                  "?"}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {candidate.firstName} {candidate.lastName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {candidate.totalExperience
                                    ? `${candidate.totalExperience} years exp`
                                    : "No experience"}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {candidate.email && (
                                <div className="flex items-center gap-1 mb-1">
                                  <Mail className="h-3 w-3" />
                                  {candidate.email}
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {candidate.countryCode} {candidate.mobileNumber}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-gray-100 text-gray-800"
                            >
                              {candidate.currentStatus || "untouched"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAssignDialogOpen(false);
                  setSelectedCandidates([]);
                  setAssignSearchTerm("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignCandidates}
                disabled={selectedCandidates.length === 0 || isAssigning}
              >
                {isAssigning ? (
                  "Assigning..."
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Assign {selectedCandidates.length} Candidate
                    {selectedCandidates.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="text-center py-8">
          <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Candidates Assigned
          </h3>
          <p className="text-gray-600">
            You don't have any candidates assigned to you yet.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Project Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.map((candidate: any) => {
                const isAssignedToProject = assignedToProjectIds.includes(
                  candidate.id
                );
                const projectAssignment = projectCandidates.find(
                  (pc: any) => pc.candidateId === candidate.id
                );

                return (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {candidate.firstName?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                          <button
                            onClick={() => handleViewCandidate(candidate.id)}
                            className="font-medium text-gray-900 hover:text-blue-600 hover:underline cursor-pointer text-left"
                          >
                            {candidate.firstName} {candidate.lastName}
                          </button>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            {candidate.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {candidate.email}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {candidate.countryCode} {candidate.mobileNumber}
                            </div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {candidate.totalExperience
                          ? `${candidate.totalExperience} years`
                          : "No experience"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={candidate.currentStatus} />
                    </TableCell>
                    <TableCell>
                      {isAssignedToProject ? (
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-800"
                        >
                          {projectAssignment?.status || "Assigned"}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-gray-100 text-gray-600"
                        >
                          Not Assigned
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isAssignedToProject ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleAssignSingleCandidate(candidate.id)
                            }
                            disabled={isAssigning}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign to Project
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            {projectAssignment?.status === "nominated" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleSendForVerification(candidate.id)
                                }
                                disabled={isSending}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Send for Verification
                              </Button>
                            )}
                            <Badge
                              variant="outline"
                              className="bg-green-100 text-green-800"
                            >
                              ✓ Assigned
                            </Badge>
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
      )}
    </div>
  );
}
