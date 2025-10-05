import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import {
  ArrowLeft,
  Search,
  Filter,
  User,
  UserPlus,
  Building2,
  Briefcase,
  Star,
  DollarSign,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
} from "lucide-react";
import { useGetProjectQuery } from "@/features/projects";
import { useCan } from "@/hooks/useCan";
import { Can } from "@/components/auth/Can";
import { CandidateStatusBadge } from "@/components/molecules";
import { format } from "date-fns";
import { toast } from "sonner";

// Mock data for demonstration
const mockEligibleCandidates = [
  {
    id: "candidate-1",
    name: "John Doe",
    contact: "+1234567890",
    email: "john@example.com",
    currentStatus: "active",
    experience: 5,
    skills: ["Nursing", "ICU", "Emergency Care", "Patient Care"],
    currentEmployer: "City Hospital",
    expectedSalary: 75000,
    location: "New York, NY",
    availability: "immediate",
    matchScore: 95,
    lastActivity: "2024-01-15T10:30:00Z",
  },
  {
    id: "candidate-2",
    name: "Jane Smith",
    contact: "+1987654321",
    email: "jane@example.com",
    currentStatus: "active",
    experience: 8,
    skills: ["Nursing", "Surgery", "Anesthesia", "Critical Care"],
    currentEmployer: "Regional Medical Center",
    expectedSalary: 85000,
    location: "Los Angeles, CA",
    availability: "2_weeks",
    matchScore: 88,
    lastActivity: "2024-01-14T14:20:00Z",
  },
  {
    id: "candidate-3",
    name: "Mike Wilson",
    contact: "+1122334455",
    email: "mike@example.com",
    currentStatus: "active",
    experience: 3,
    skills: ["Nursing", "Pediatrics", "Family Care"],
    currentEmployer: "Children's Hospital",
    expectedSalary: 65000,
    location: "Chicago, IL",
    availability: "1_month",
    matchScore: 82,
    lastActivity: "2024-01-13T16:45:00Z",
  },
  {
    id: "candidate-4",
    name: "Sarah Johnson",
    contact: "+1555666777",
    email: "sarah@example.com",
    currentStatus: "active",
    experience: 12,
    skills: ["Nursing", "ICU", "Emergency Care", "Leadership", "Training"],
    currentEmployer: "University Hospital",
    expectedSalary: 95000,
    location: "Boston, MA",
    availability: "immediate",
    matchScore: 92,
    lastActivity: "2024-01-12T09:15:00Z",
  },
];

export default function ProjectEligibleCandidatesPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const canReadProjects = useCan("read:projects");
  const canReadCandidates = useCan("read:candidates");
  const canNominateCandidates = useCan("nominate:candidates");

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("matchScore");

  // API
  const { data: projectData, isLoading: projectLoading } = useGetProjectQuery(
    projectId!
  );
  // Mock data for eligible candidates - in real implementation, this would be an API call
  const eligibleCandidatesData = mockEligibleCandidates;
  const candidatesLoading = false;

  // Permission check
  if (!canReadProjects || !canReadCandidates) {
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
                  You don't have permission to view eligible candidates.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const project = projectData;
  const eligibleCandidates = eligibleCandidatesData || mockEligibleCandidates;

  // Filter and sort candidates
  const filteredCandidates = eligibleCandidates
    .filter((candidate) => {
      const matchesSearch =
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.contact.includes(searchTerm) ||
        candidate.skills.some((skill) =>
          skill.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesExperience =
        experienceFilter === "all" ||
        (experienceFilter === "0-2" && candidate.experience <= 2) ||
        (experienceFilter === "3-5" &&
          candidate.experience >= 3 &&
          candidate.experience <= 5) ||
        (experienceFilter === "6-10" &&
          candidate.experience >= 6 &&
          candidate.experience <= 10) ||
        (experienceFilter === "10+" && candidate.experience > 10);

      const matchesAvailability =
        availabilityFilter === "all" ||
        candidate.availability === availabilityFilter;

      return matchesSearch && matchesExperience && matchesAvailability;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "matchScore":
          return b.matchScore - a.matchScore;
        case "experience":
          return b.experience - a.experience;
        case "name":
          return a.name.localeCompare(b.name);
        case "salary":
          return (b.expectedSalary || 0) - (a.expectedSalary || 0);
        default:
          return 0;
      }
    });

  const handleNominateCandidate = (candidateId: string) => {
    navigate(`/projects/${projectId}/nominate/${candidateId}`);
  };

  const handleViewCandidate = (candidateId: string) => {
    navigate(`/candidates/${candidateId}`);
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-amber-600";
    return "text-red-600";
  };

  const getAvailabilityBadge = (availability: string) => {
    const variants = {
      immediate: "bg-green-100 text-green-800",
      "2_weeks": "bg-blue-100 text-blue-800",
      "1_month": "bg-amber-100 text-amber-800",
      "3_months": "bg-red-100 text-red-800",
    };

    const labels = {
      immediate: "Immediate",
      "2_weeks": "2 Weeks",
      "1_month": "1 Month",
      "3_months": "3 Months",
    };

    return (
      <Badge className={variants[availability as keyof typeof variants]}>
        {labels[availability as keyof typeof labels]}
      </Badge>
    );
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
      <div className="max-w-7xl mx-auto space-y-6">
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
                Eligible Candidates
              </h1>
              <p className="text-muted-foreground">
                Candidates matching requirements for {project.title}
              </p>
            </div>
          </div>
          <Can anyOf={["nominate:candidates"]}>
            <Button onClick={() => navigate(`/projects/${projectId}/nominate`)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Nominate Candidates
            </Button>
          </Can>
        </div>

        {/* Project Summary */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-center space-x-3">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Project</p>
                  <p className="font-semibold">{project.title}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Briefcase className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Roles Needed</p>
                  <p className="font-semibold">{project.rolesNeeded.length}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Deadline</p>
                  <p className="font-semibold">
                    {format(new Date(project.deadline), "MMM dd, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Eligible Candidates
                  </p>
                  <p className="font-semibold">{filteredCandidates.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search candidates by name, skills, or contact..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={experienceFilter}
                onValueChange={setExperienceFilter}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Experience</SelectItem>
                  <SelectItem value="0-2">0-2 years</SelectItem>
                  <SelectItem value="3-5">3-5 years</SelectItem>
                  <SelectItem value="6-10">6-10 years</SelectItem>
                  <SelectItem value="10+">10+ years</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={availabilityFilter}
                onValueChange={setAvailabilityFilter}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Availability</SelectItem>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="2_weeks">2 Weeks</SelectItem>
                  <SelectItem value="1_month">1 Month</SelectItem>
                  <SelectItem value="3_months">3 Months</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="matchScore">Match Score</SelectItem>
                  <SelectItem value="experience">Experience</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Candidates Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Eligible Candidates ({filteredCandidates.length})
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
            ) : filteredCandidates.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No Eligible Candidates Found
                  </h3>
                  <p className="text-muted-foreground">
                    No candidates currently match the requirements for this
                    project.
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Match Score</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{candidate.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {candidate.contact} • {candidate.location}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {candidate.experience} years
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 2).map((skill, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              {skill}
                            </Badge>
                          ))}
                          {candidate.skills.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{candidate.skills.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getAvailabilityBadge(candidate.availability)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div
                            className={`font-semibold ${getMatchScoreColor(
                              candidate.matchScore
                            )}`}
                          >
                            {candidate.matchScore}%
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${candidate.matchScore}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {candidate.expectedSalary ? (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              ${candidate.expectedSalary.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Not specified
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewCandidate(candidate.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Can anyOf={["nominate:candidates"]}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleNominateCandidate(candidate.id)
                              }
                              className="text-green-600 hover:text-green-700"
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          </Can>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
