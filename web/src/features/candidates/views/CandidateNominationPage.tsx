import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label as FormLabel } from "@/components/ui/label";
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
import {
  ArrowLeft,
  UserPlus,
  User,
  Building2,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  Briefcase,
  MapPin,
  DollarSign,
} from "lucide-react";
import { useNominateCandidateMutation } from "@/features/candidates";
import { useGetProjectQuery } from "@/features/projects";
import { useCan } from "@/hooks/useCan";
import { Can } from "@/components/auth/Can";
import { CandidateStatusBadge } from "@/components/molecules";
import { format } from "date-fns";

// ==================== VALIDATION SCHEMA ====================

const nominateCandidateSchema = z.object({
  candidateId: z.string().uuid("Please select a candidate"),
  notes: z.string().optional(),
});

type NominateCandidateFormData = z.infer<typeof nominateCandidateSchema>;

// ==================== COMPONENT ====================

export default function CandidateNominationPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const canNominateCandidates = useCan("nominate:candidates");

  // State
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [nominationDialog, setNominationDialog] = useState(false);
  const [nominationNotes, setNominationNotes] = useState("");

  // API
  const [nominateCandidate, { isLoading }] = useNominateCandidateMutation();
  const { data: projectData, isLoading: projectLoading } = useGetProjectQuery(
    projectId!
  );
  // Mock data for eligible candidates - in real implementation, this would be an API call
  const eligibleCandidatesData = [];
  const candidatesLoading = false;

  // Form
  const form = useForm<NominateCandidateFormData>({
    resolver: zodResolver(nominateCandidateSchema),
    defaultValues: {
      candidateId: "",
      notes: "",
    },
  });

  // Permission check
  if (!canNominateCandidates) {
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
                  You don't have permission to nominate candidates.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const project = projectData;
  const eligibleCandidates = eligibleCandidatesData || [];

  const handleNominateCandidate = (candidate: any) => {
    setSelectedCandidate(candidate);
    setNominationDialog(true);
  };

  const handleSubmitNomination = async () => {
    if (!selectedCandidate || !projectId) return;

    try {
      await nominateCandidate({
        candidateId: selectedCandidate.id,
        projectId,
        notes: nominationNotes,
      }).unwrap();

      toast.success("Candidate nominated successfully");
      setNominationDialog(false);
      setNominationNotes("");
      setSelectedCandidate(null);
      navigate(`/projects/${projectId}`);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to nominate candidate");
    }
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Loading project details...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Project Not Found
                </h2>
                <p className="text-muted-foreground">
                  The requested project could not be found.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/projects/${projectId}`)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Project</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Nominate Candidates
              </h1>
              <p className="text-muted-foreground">
                Select eligible candidates for {project.title}
              </p>
            </div>
          </div>
        </div>

        {/* Project Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Project Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  {project.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {project.description}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Deadline:{" "}
                    {format(new Date(project.deadline), "MMM dd, yyyy")}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {project.client?.name || "No client assigned"}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {project.rolesNeeded.length} role(s) needed
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Priority: {project.priority}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Eligible Candidates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Eligible Candidates ({eligibleCandidates.length})</span>
            </CardTitle>
            <CardDescription>
              Candidates who match the project requirements and are available
              for nomination
            </CardDescription>
          </CardHeader>
          <CardContent>
            {candidatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Loading eligible candidates...
                  </p>
                </div>
              </div>
            ) : eligibleCandidates.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No Eligible Candidates
                  </h3>
                  <p className="text-muted-foreground">
                    No candidates currently match the requirements for this
                    project.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eligibleCandidates.map((candidate) => (
                  <Card
                    key={candidate.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {candidate.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {candidate.contact}
                            </p>
                          </div>
                        </div>
                        <CandidateStatusBadge
                          status={candidate.currentStatus.statusName}
                        />
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center space-x-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {candidate.experience} years experience
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Star className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {candidate.skills.length} skills
                          </span>
                        </div>
                        {candidate.expectedSalary && (
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              ${candidate.expectedSalary.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-1">
                          Skills:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 3).map((skill, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-muted text-xs rounded-md"
                            >
                              {skill}
                            </span>
                          ))}
                          {candidate.skills.length > 3 && (
                            <span className="px-2 py-1 bg-muted text-xs rounded-md">
                              +{candidate.skills.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      <Can anyOf={["nominate:candidates"]}>
                        <Button
                          onClick={() => handleNominateCandidate(candidate)}
                          className="w-full"
                          disabled={isLoading}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Nominate Candidate
                        </Button>
                      </Can>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nomination Dialog */}
        <Dialog open={nominationDialog} onOpenChange={setNominationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nominate Candidate</DialogTitle>
              <DialogDescription>
                Confirm the nomination of {selectedCandidate?.name} for{" "}
                {project.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCandidate && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedCandidate.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCandidate.contact} •{" "}
                        {selectedCandidate.experience} years experience
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <FormLabel>Nomination Notes (Optional)</FormLabel>
                <Textarea
                  placeholder="Add any notes about this nomination..."
                  value={nominationNotes}
                  onChange={(e) => setNominationNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setNominationDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitNomination} disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Nominating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <UserPlus className="h-4 w-4" />
                    <span>Nominate Candidate</span>
                  </div>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
