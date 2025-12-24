import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAppSelector } from "@/app/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Phone,
  Mail,
  UserPlus,
  Check,
  Send,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { ConfirmationDialog } from "@/components/ui";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetProjectCandidatesByRoleQuery,
  useSendForVerificationMutation,
  useGetProjectQuery,
} from "@/features/projects";
import {
  useGetCandidatesQuery,
  useGetRecruiterMyCandidatesQuery,
  useAssignToProjectMutation,
} from "@/features/candidates";
import CandidateCard from "./CandidateCard";

interface RecruiterCandidatesTabProps {
  projectId: string;
}

export default function RecruiterCandidatesTab({
  projectId,
}: RecruiterCandidatesTabProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // Changed to 9 to show 3 cards per row (3x3)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [assignSearchTerm, setAssignSearchTerm] = useState("");
  
  // Confirmation dialog states
  const [verifyConfirm, setVerifyConfirm] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    roleNeededId?: string;
    notes: string;
  }>({ isOpen: false, candidateId: "", candidateName: "", roleNeededId: undefined, notes: "" });
  
  const [assignConfirm, setAssignConfirm] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    roleNeededId?: string;
    notes: string;
  }>({ isOpen: false, candidateId: "", candidateName: "", roleNeededId: undefined, notes: "" });
  const [assignDialogRoleNeededId, setAssignDialogRoleNeededId] = useState<string | undefined>(undefined);

  // Get current user to filter candidates based on role
  const { user } = useAppSelector((state) => state.auth);

  // Check if user is a recruiter (non-manager)
  const isRecruiter = user?.roles?.includes("Recruiter");
  const isManager = user?.roles?.some(role => 
    ["CEO", "Director", "Manager", "Team Head", "Team Lead"].includes(role)
  );

  // Use different APIs based on role
  // Recruiters use dedicated endpoint, managers use general endpoint
  const { data: recruiterCandidatesData, isLoading: isLoadingRecruiter, error: recruiterError } = 
    useGetRecruiterMyCandidatesQuery(undefined, {
      skip: !isRecruiter || isManager, // Skip if not recruiter or if manager
    });

  const { data: allCandidatesData, isLoading: isLoadingAll, error: allError } = 
    useGetCandidatesQuery(undefined, {
      skip: !isManager, // Skip if not manager
    });

  // Determine which data to use
  const candidatesData = isRecruiter && !isManager 
    ? recruiterCandidatesData?.data 
    : allCandidatesData?.data;
  
  const isLoading = isLoadingRecruiter || isLoadingAll;
  const error = recruiterError || allError;

  // Get candidates already assigned to this project for filtering
  const { data: projectCandidatesData } = useGetProjectCandidatesByRoleQuery({
    projectId,
    role: "Recruiter",
  });

  // Get project details for comparison
  const { data: projectData } = useGetProjectQuery(projectId);

  useEffect(() => {
    if (isAssignDialogOpen) {
      setAssignDialogRoleNeededId(projectData?.data?.rolesNeeded?.[0]?.id);
    } else {
      setAssignDialogRoleNeededId(undefined);
    }
  }, [isAssignDialogOpen, projectData]);

  const [sendForVerification] = useSendForVerificationMutation();

  const [assignToProject, { isLoading: isAssigning }] =
    useAssignToProjectMutation();

  // Get candidates (already filtered by backend based on role)
  const allCandidates = Array.isArray(candidatesData) ? candidatesData : [];

  // Get candidates already assigned to this project
  const projectCandidates = projectCandidatesData?.data || [];
  const assignedToProjectIds = projectCandidates.map((c) => c.candidateId);

  // Candidates are already filtered by the API based on user role
  const recruiterCandidates = allCandidates;

  // Filter candidates (show all recruiter's candidates)
  const filteredCandidates = recruiterCandidates.filter((candidate: any) => {
    const matchesSearch =
      candidate.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

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

  const showVerifyConfirmation = (candidateId: string, candidateName: string) => {
    setVerifyConfirm({ isOpen: true, candidateId, candidateName, roleNeededId: projectData?.data?.rolesNeeded?.[0]?.id, notes: "" });
  };

  // Get candidate by ID for comparison
  const getCandidateById = (candidateId: string) => {
    return allCandidates.find((c: any) => c.id === candidateId);
  };

  const handleSendForVerification = async () => {
    try {
      await sendForVerification({ 
        projectId, 
        candidateId: verifyConfirm.candidateId,
        roleNeededId: verifyConfirm.roleNeededId,
        recruiterId: user?.id,
        notes: verifyConfirm.notes || undefined
      }).unwrap();
      toast.success("Candidate sent for verification successfully");
      setVerifyConfirm({ isOpen: false, candidateId: "", candidateName: "", roleNeededId: undefined, notes: "" });
    } catch (error: any) {
      toast.error(
        error?.data?.message || "Failed to send candidate for verification"
      );
    }
  };

  const handleViewCandidate = (candidateId: string) => {
    navigate(`/candidates/${candidateId}`);
  };

  const showAssignConfirmation = (candidateId: string, candidateName: string) => {
    setAssignConfirm({ isOpen: true, candidateId, candidateName, roleNeededId: projectData?.data?.rolesNeeded?.[0]?.id, notes: "" });
  };

  const handleAssignSingleCandidate = async () => {
    try {
      const result = await assignToProject({
        candidateId: assignConfirm.candidateId,
        projectId,
        roleNeededId: assignConfirm.roleNeededId,
        recruiterId: user?.id,
        notes: assignConfirm.notes || `Assigned by recruiter to project`,
      }).unwrap();
      toast.success(
        result.message || "Candidate assigned to project successfully"
      );
      setAssignConfirm({ isOpen: false, candidateId: "", candidateName: "", roleNeededId: undefined, notes: "" });
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
          roleNeededId: assignDialogRoleNeededId,
          recruiterId: user?.id,
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
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto hidden">
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Candidates
          </Button>
        </DialogTrigger>
          <DialogContent className="w-full max-w-3xl sm:max-w-4xl p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Assign Candidates to Project</DialogTitle>
              <DialogDescription>
                Select candidates to assign to this project. They will be
                automatically assigned to you as the recruiter.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex gap-4 mb-4">
                <div className="w-48">
                  <label className="text-xs text-gray-600">Role</label>
                  <Select value={assignDialogRoleNeededId} onValueChange={(v) => setAssignDialogRoleNeededId(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {projectData?.data?.rolesNeeded?.map((r: any) => (
                        <SelectItem key={r.id} value={r.id}>{r.designation}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

      {filteredCandidates.length === 0 ? (
        <div className="text-center py-12">
          <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Candidates Assigned
          </h3>
          <p className="text-gray-600">
            You don't have any candidates assigned to you yet.
          </p>
        </div>
      ) : (
        <div>
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              {isRecruiter && !isManager ? "My Candidates" : "All Candidates"}
            </h3>
            <p className="text-xs text-gray-600">
              Available candidates to assign to project
            </p>
          </div>
          
          {/* Changed from md:grid-cols-2 to md:grid-cols-3 for 3 cards per row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paginatedCandidates.map((candidate: any) => {
                // Check from both sources: candidate's projects array and projectCandidates query
                const currentProjectInCandidate = candidate.projects?.find(
                  (p: any) => p.projectId === projectId
                );
                
                const projectAssignment = projectCandidates.find(
                  (pc: any) => pc.candidateId === candidate.id
                );

                // Candidate is assigned if found in either source
                const isAssignedToProject = !!currentProjectInCandidate || assignedToProjectIds.includes(candidate.id);

                // Prefer showing the project's sub-status (label/name) for display.
                // For logical checks (e.g. 'nominated') prefer the canonical name.
                const actualSubStatusLabel = isAssignedToProject
                  ? (currentProjectInCandidate?.subStatus?.label || projectAssignment?.subStatus?.label)
                  : null;

                const actualSubStatusName = isAssignedToProject
                  ? (currentProjectInCandidate?.subStatus?.name || projectAssignment?.subStatus?.name)
                  : null;

                // Determine the status to display (prefer sub-status label, then name, then fallbacks)
                const projectStatusToShow = isAssignedToProject
                  ? (actualSubStatusLabel || actualSubStatusName || currentProjectInCandidate?.currentProjectStatus?.statusName || projectAssignment?.currentProjectStatus?.statusName)
                  : "not_in_project";

                // Check if candidate is nominated OR not in project - show verify button in both cases
                // Consider nominated if either sub-status name or main/current status indicates nominated
                const isNominated = isAssignedToProject && (
                  (!!actualSubStatusName && actualSubStatusName.toLowerCase().startsWith("nominated")) ||
                  ((currentProjectInCandidate?.mainStatus?.name || projectAssignment?.mainStatus?.name || "").toLowerCase() === "nominated") ||
                  ((currentProjectInCandidate?.currentProjectStatus?.statusName || projectAssignment?.currentProjectStatus?.statusName || "").toLowerCase() === "nominated")
                );

                // Explicitly detect verification-in-progress states so we never show the
                // "Send for Verification" button for candidates already in verification.
                const isVerificationInProgress = isAssignedToProject && (
                  (!!actualSubStatusName && actualSubStatusName.toLowerCase().includes("verification")) ||
                  (!!actualSubStatusLabel && actualSubStatusLabel.toLowerCase().includes("verification")) ||
                  ((currentProjectInCandidate?.currentProjectStatus?.statusName || projectAssignment?.currentProjectStatus?.statusName || "").toLowerCase().includes("verification"))
                );

                // Show verify button if: in project and nominated AND not already in verification
                const showVerifyBtn = isAssignedToProject && isNominated && !isVerificationInProgress;

                const actions = [];

                return (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    projectId={projectId}
                    isRecruiter={isRecruiter}
                    onView={handleViewCandidate}
                    onAction={(candidateId, action) => {
                      if (action === "assign") {
                        showAssignConfirmation(
                          candidateId,
                          `${candidate.firstName} ${candidate.lastName}`
                        );
                      }
                    }}
                    actions={actions}
                    projectStatus={projectStatusToShow}
                    showVerifyButton={showVerifyBtn}
                    onVerify={(candidateId) =>
                      showVerifyConfirmation(
                        candidateId,
                        `${candidate.firstName} ${candidate.lastName}`
                      )
                    }
                    showAssignButton={!isAssignedToProject}
                    onAssignToProject={(candidateId) =>
                      showAssignConfirmation(
                        candidateId,
                        `${candidate.firstName} ${candidate.lastName}`
                      )
                    }
                    isAlreadyInProject={isAssignedToProject}
                    className="hover:scale-100"
                    showDocumentStatus={isAssignedToProject}
                  />
                );
              })}
            </div>
          
          {/* Pagination Controls */}
          {filteredCandidates.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredCandidates.length)} of {filteredCandidates.length} candidates
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first page, last page, current page, and pages around current
                      if (page === 1 || page === totalPages || 
                          (page >= currentPage - 1 && page <= currentPage + 1)) {
                        return true;
                      }
                      return false;
                    })
                    .map((page, idx, arr) => (
                      <>
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span key={`ellipsis-${page}`} className="px-2 text-gray-400">...</span>
                        )}
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      </>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verification Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={verifyConfirm.isOpen}
        onClose={() => setVerifyConfirm({ isOpen: false, candidateId: "", candidateName: "", roleNeededId: undefined, notes: "" })}
        onConfirm={handleSendForVerification}
        title="Send for Verification"
        description={
          <div className="space-y-4">
            <p>Are you sure you want to send {verifyConfirm.candidateName} for verification? This will notify the verification team.</p>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <Select value={verifyConfirm.roleNeededId} onValueChange={(v) => setVerifyConfirm(prev => ({ ...prev, roleNeededId: v }))}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projectData?.data?.rolesNeeded?.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.designation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Candidate-Project Comparison */}
            {verifyConfirm.candidateId && projectData && (() => {
              const candidate = getCandidateById(verifyConfirm.candidateId);
              const project = (projectData as any)?.data || projectData;
              if (!candidate || !project) return null;
              
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Candidate vs Project Requirements
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    {/* Experience Comparison */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Experience:</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-white">
                          Candidate: {candidate.totalExperience || candidate.experience || 0} years
                        </Badge>
                        <span className="text-gray-400">vs</span>
                        <Badge variant="outline" className="bg-white">
                          Required: {(project as any).minExperience || 0}-{(project as any).maxExperience || 0} years
                        </Badge>
                      </div>
                    </div>

                    {/* Role Comparison */}
                    {candidate.currentRole && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Current Role:</span>
                        <Badge variant="outline" className="bg-white">
                          {candidate.currentRole}
                        </Badge>
                      </div>
                    )}

                    {/* Skills Comparison */}
                    {candidate.skills && candidate.skills.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-gray-700">Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2">
              <label htmlFor="verify-notes" className="text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <Textarea
                id="verify-notes"
                placeholder="Add any notes for the verification team..."
                value={verifyConfirm.notes}
                onChange={(e) => setVerifyConfirm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full"
              />
            </div>
          </div>
        }
        confirmText="Send for Verification"
        cancelText="Cancel"
        isLoading={false}
        variant="default"
        icon={
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Send className="h-5 w-5 text-blue-600" />
          </div>
        }
      />

      {/* Assignment Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={assignConfirm.isOpen}
        onClose={() => setAssignConfirm({ isOpen: false, candidateId: "", candidateName: "", roleNeededId: undefined, notes: "" })}
        onConfirm={handleAssignSingleCandidate}
        // make the confirmation dialog wider so Candidate vs Project comparison doesn't break layout
        className="w-full max-w-3xl sm:max-w-4xl p-6 max-h-[90vh] overflow-y-auto"
        title="Assign to Project"
        description={
          <div className="space-y-4">
            <p>Are you sure you want to assign {assignConfirm.candidateName} to this project?</p>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <Select value={assignConfirm.roleNeededId} onValueChange={(v) => setAssignConfirm(prev => ({ ...prev, roleNeededId: v }))}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projectData?.data?.rolesNeeded?.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.designation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Candidate-Project Comparison */}
            {assignConfirm.candidateId && projectData && (() => {
              const candidate = getCandidateById(assignConfirm.candidateId);
              const project = (projectData as any)?.data || projectData;
              if (!candidate || !project) return null;
              
              const candidateExp = candidate.totalExperience || candidate.experience || 0;
              const minExp = (project as any).minExperience || 0;
              const maxExp = (project as any).maxExperience || 0;
              const expMatch = candidateExp >= minExp && candidateExp <= maxExp;
              
              return (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-green-900 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Candidate vs Project Requirements
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    {/* Experience Comparison */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Experience:</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={expMatch ? "bg-green-100 text-green-800" : "bg-white"}>
                          Candidate: {candidateExp} years
                        </Badge>
                        <span className="text-gray-400">vs</span>
                        <Badge variant="outline" className="bg-white">
                          Required: {minExp}-{maxExp} years
                        </Badge>
                        {expMatch && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      </div>
                    </div>

                    {/* Role Comparison */}
                    {candidate.currentRole && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Current Role:</span>
                        <Badge variant="outline" className="bg-white">
                          {candidate.currentRole}
                        </Badge>
                      </div>
                    )}

                    {/* Qualifications */}
                    {candidate.qualifications && candidate.qualifications.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-gray-700">Qualifications:</span>
                        <div className="flex flex-wrap gap-1">
                          {candidate.qualifications.slice(0, 2).map((qual: any) => (
                            <Badge key={qual.id} variant="secondary" className="text-xs">
                              {qual.qualification?.shortName || qual.qualification?.name}
                            </Badge>
                          ))}
                          {candidate.qualifications.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{candidate.qualifications.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Skills Comparison */}
                    {candidate.skills && candidate.skills.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-gray-700">Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 5).map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {candidate.skills.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{candidate.skills.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this assignment..."
                value={assignConfirm.notes}
                onChange={(e) => setAssignConfirm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full"
              />
            </div>
          </div>
        }
        confirmText="Assign to Project"
        cancelText="Cancel"
        isLoading={isAssigning}
        variant="default"
        icon={
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <UserPlus className="h-5 w-5 text-green-600" />
          </div>
        }
      />
    </div>
  );
}