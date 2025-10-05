import React, { useState } from "react";
import { useParams } from "react-router-dom";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Building2,
  Users,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  TrendingUp,
  AlertTriangle,
  Info,
  Star,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Briefcase,
  Target,
  Shield,
  UserCheck,
  Activity,
  BarChart3,
  History,
  Settings,
  Download,
  Share2,
  Eye,
  ArrowRight,
  User,
  GraduationCap,
  Award,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  SkipForward,
  SkipBack,
} from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";

// Helper function to format date - following FE guidelines: DD MMM YYYY
const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Helper function to format currency
const formatCurrency = (amount?: number) => {
  if (!amount) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    active: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle,
    },
    inactive: {
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: XCircle,
    },
    pending: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: Clock,
    },
    interviewing: {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: UserCheck,
    },
    placed: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle2,
    },
    rejected: {
      color: "bg-red-100 text-red-800 border-red-200",
      icon: XCircle,
    },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} border gap-1 px-2 py-1`}>
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

// Pipeline Stage Component
const PipelineStage = ({
  stage,
  isActive,
  isCompleted,
  isCurrent,
  title,
  description,
  date,
  icon: Icon,
  isLast = false,
}: {
  stage: string;
  isActive: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  title: string;
  description: string;
  date?: string;
  icon: any;
  isLast?: boolean;
}) => {
  return (
    <div className="flex flex-col items-center">
      {/* Stage Circle */}
      <div className="relative">
        <div
          className={cn(
            "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm",
            isCompleted &&
              "bg-green-500 border-green-500 text-white shadow-green-200",
            isCurrent &&
              "bg-blue-500 border-blue-500 text-white shadow-blue-200",
            !isCompleted &&
              !isCurrent &&
              "bg-gray-100 border-gray-300 text-gray-500"
          )}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6" />
          ) : (
            <Icon className="h-5 w-5 md:h-6 md:w-6" />
          )}
        </div>

        {/* Current stage indicator */}
        {isCurrent && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full border-2 border-white animate-pulse" />
        )}
      </div>

      {/* Stage Title */}
      <div className="text-center mt-2 max-w-20 md:max-w-24">
        <div className="text-xs md:text-sm font-medium text-slate-900">
          {title}
        </div>
        {date && (
          <div className="text-xs text-slate-500 mt-1">{formatDate(date)}</div>
        )}
      </div>

      {/* Connecting Line */}
      {!isLast && (
        <div className="hidden md:block w-full mt-4">
          <div
            className={cn(
              "h-0.5 transition-all duration-300",
              isCompleted ? "bg-green-500" : "bg-gray-200"
            )}
          />
        </div>
      )}
    </div>
  );
};

// Mobile Pipeline Stage Component
const MobilePipelineStage = ({
  stage,
  isActive,
  isCompleted,
  isCurrent,
  title,
  description,
  date,
  icon: Icon,
}: {
  stage: string;
  isActive: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  title: string;
  description: string;
  date?: string;
  icon: any;
}) => {
  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg border bg-white/50">
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 flex-shrink-0",
          isCompleted && "bg-green-500 border-green-500 text-white",
          isCurrent && "bg-blue-500 border-blue-500 text-white",
          !isCompleted &&
            !isCurrent &&
            "bg-gray-100 border-gray-300 text-gray-500"
        )}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">{description}</div>
        {date && (
          <div className="text-xs text-slate-400 mt-1">{formatDate(date)}</div>
        )}
      </div>
      {isCurrent && (
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
      )}
    </div>
  );
};

// Mock data for demonstration
const mockCandidate = {
  id: "1",
  name: "Sarah Johnson",
  email: "sarah.johnson@email.com",
  phone: "+1 (555) 123-4567",
  location: "San Francisco, CA",
  experience: 5,
  skills: ["Nursing", "ICU", "Emergency Care", "Patient Assessment", "CPR"],
  status: "interviewing",
  currentRole: "ICU Nurse",
  targetRole: "Senior ICU Nurse",
  expectedSalary: 85000,
  availability: "immediate",
  lastContact: "2024-12-01T10:00:00Z",
  assignedRecruiter: "John Smith",
  dateOfBirth: "1990-05-15",
  currentEmployer: "City General Hospital",
  createdAt: "2024-11-15T09:00:00Z",
  updatedAt: "2024-12-01T14:30:00Z",
  pipeline: {
    currentStage: "medical_clearance",
    stages: [
      {
        stage: "applied",
        title: "Applied",
        description: "Candidate submitted application",
        date: "2024-11-15T09:00:00Z",
        isCompleted: true,
        isCurrent: false,
        icon: FileText,
      },
      {
        stage: "screening",
        title: "Screening",
        description: "Initial phone screening completed",
        date: "2024-11-20T14:00:00Z",
        isCompleted: true,
        isCurrent: false,
        icon: Phone,
      },
      {
        stage: "interviewing",
        title: "Interviewing",
        description: "Technical and HR interviews",
        date: "2024-12-01T10:00:00Z",
        isCompleted: true,
        isCurrent: false,
        icon: UserCheck,
      },
      {
        stage: "offer",
        title: "Offer",
        description: "Offer extended and accepted",
        date: "2024-12-05T16:00:00Z",
        isCompleted: true,
        isCurrent: false,
        icon: Award,
      },
      {
        stage: "documentation",
        title: "Documentation",
        description: "Document verification and collection",
        date: "2024-12-08T11:00:00Z",
        isCompleted: true,
        isCurrent: false,
        icon: FileText,
      },
      {
        stage: "qvp_clearance",
        title: "QVP Clearance",
        description: "Quality verification process",
        date: "2024-12-10T14:00:00Z",
        isCompleted: true,
        isCurrent: false,
        icon: Shield,
      },
      {
        stage: "medical_clearance",
        title: "Medical Clearance",
        description: "Medical examination and clearance",
        date: "2024-12-12T09:00:00Z",
        isCompleted: false,
        isCurrent: true,
        icon: Activity,
      },
      {
        stage: "visa_processing",
        title: "Visa Processing",
        description: "Visa application and approval",
        date: undefined,
        isCompleted: false,
        isCurrent: false,
        icon: FileText,
      },
      {
        stage: "travel_arrangements",
        title: "Travel Arrangements",
        description: "Flight booking and travel prep",
        date: undefined,
        isCompleted: false,
        isCurrent: false,
        icon: ExternalLink,
      },
      {
        stage: "onboarding",
        title: "Onboarding",
        description: "Client onboarding and placement",
        date: undefined,
        isCompleted: false,
        isCurrent: false,
        icon: CheckCircle2,
      },
    ],
  },
  projects: [
    {
      id: "1",
      title: "Emergency Department Nurses",
      client: "St. Mary's Medical Center",
      status: "active",
      deadline: "2024-12-31",
      matchScore: 95,
      isAssigned: true,
    },
    {
      id: "2",
      title: "ICU Specialists",
      client: "St. Mary's Medical Center",
      status: "active",
      deadline: "2025-02-28",
      matchScore: 88,
      isAssigned: false,
    },
    {
      id: "3",
      title: "Pediatric Nurses",
      client: "Children's Hospital",
      status: "active",
      deadline: "2025-01-15",
      matchScore: 72,
      isAssigned: false,
    },
  ],
  history: [
    {
      id: "1",
      action: "Application Submitted",
      description: "Sarah submitted her application for ICU positions",
      date: "2024-11-15T09:00:00Z",
      user: "System",
    },
    {
      id: "2",
      action: "Phone Screening",
      description: "Initial phone screening completed successfully",
      date: "2024-11-20T14:00:00Z",
      user: "John Smith",
    },
    {
      id: "3",
      action: "Technical Interview",
      description:
        "Technical interview completed with St. Mary's Medical Center",
      date: "2024-12-01T10:00:00Z",
      user: "Jane Doe",
    },
    {
      id: "4",
      action: "Offer Extended",
      description: "Offer extended and accepted by candidate",
      date: "2024-12-05T16:00:00Z",
      user: "John Smith",
    },
    {
      id: "5",
      action: "Documentation Started",
      description: "Document collection and verification process initiated",
      date: "2024-12-08T11:00:00Z",
      user: "System",
    },
    {
      id: "6",
      action: "QVP Clearance",
      description: "Quality verification process completed successfully",
      date: "2024-12-10T14:00:00Z",
      user: "Quality Team",
    },
    {
      id: "7",
      action: "Medical Examination",
      description: "Medical examination scheduled for December 12th",
      date: "2024-12-12T09:00:00Z",
      user: "Medical Team",
    },
  ],
  metrics: {
    totalApplications: 3,
    interviewsScheduled: 2,
    interviewsCompleted: 2,
    offersReceived: 1,
    placements: 0,
    averageResponseTime: 2.5,
    pipelineProgress: 60, // 6 out of 10 stages completed
  },
};

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("overview");

  const canReadCandidates = useCan("read:candidates");
  const canWriteCandidates = useCan("write:candidates");
  const canManageCandidates = useCan("manage:candidates");

  // Mock data - in real app, this would come from RTK Query
  const candidate = mockCandidate;

  const handleEdit = () => {
    toast.info("Edit functionality coming soon");
  };

  const handleDelete = () => {
    toast.error("Delete functionality coming soon");
  };

  if (!candidate) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Candidate Not Found</h2>
          <p className="text-muted-foreground">
            The candidate you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="space-y-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
            {candidate.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={candidate.status} />
            <span className="text-sm text-slate-500">
              {candidate.currentRole} • {candidate.location}
            </span>
            <span className="text-sm text-slate-400">
              Created {formatDate(candidate.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canWriteCandidates && (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canManageCandidates && (
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Pipeline */}
      <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Target className="h-5 w-5 text-blue-600" />
            Recruitment Pipeline
          </CardTitle>
          <CardDescription className="text-slate-600">
            Complete journey from application to placement
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Desktop Pipeline View */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-10 gap-4 items-start">
              {candidate.pipeline.stages.map((stage, index) => (
                <div key={stage.stage} className="flex flex-col items-center">
                  <PipelineStage
                    stage={stage.stage}
                    isActive={stage.isCurrent}
                    isCompleted={stage.isCompleted}
                    isCurrent={stage.isCurrent}
                    title={stage.title}
                    description={stage.description}
                    date={stage.date}
                    icon={stage.icon}
                    isLast={index === candidate.pipeline.stages.length - 1}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Tablet Pipeline View */}
          <div className="hidden md:block lg:hidden">
            <div className="grid grid-cols-5 gap-6 items-start">
              {candidate.pipeline.stages.map((stage, index) => (
                <div key={stage.stage} className="flex flex-col items-center">
                  <PipelineStage
                    stage={stage.stage}
                    isActive={stage.isCurrent}
                    isCompleted={stage.isCompleted}
                    isCurrent={stage.isCurrent}
                    title={stage.title}
                    description={stage.description}
                    date={stage.date}
                    icon={stage.icon}
                    isLast={index === candidate.pipeline.stages.length - 1}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Pipeline View */}
          <div className="md:hidden">
            <div className="space-y-3">
              {candidate.pipeline.stages.map((stage) => (
                <MobilePipelineStage
                  key={stage.stage}
                  stage={stage.stage}
                  isActive={stage.isCurrent}
                  isCompleted={stage.isCompleted}
                  isCurrent={stage.isCurrent}
                  title={stage.title}
                  description={stage.description}
                  date={stage.date}
                  icon={stage.icon}
                />
              ))}
            </div>
          </div>

          {/* Progress Summary */}
          <div className="mt-8 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">
                Overall Progress
              </span>
              <span className="text-sm text-slate-600">
                {candidate.pipeline.stages.filter((s) => s.isCompleted).length}{" "}
                of {candidate.pipeline.stages.length} stages completed
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    (candidate.pipeline.stages.filter((s) => s.isCompleted)
                      .length /
                      candidate.pipeline.stages.length) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Candidate Information */}
            <Card className="xl:col-span-2 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <User className="h-5 w-5 text-blue-600" />
                  Candidate Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Email
                    </label>
                    <p className="text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {candidate.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Phone
                    </label>
                    <p className="text-sm flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {candidate.phone}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Location
                    </label>
                    <p className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {candidate.location}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Experience
                    </label>
                    <p className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {candidate.experience} years
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Current Role
                    </label>
                    <p className="text-sm">{candidate.currentRole}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Target Role
                    </label>
                    <p className="text-sm">{candidate.targetRole}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Expected Salary
                    </label>
                    <p className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {formatCurrency(candidate.expectedSalary)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Availability
                    </label>
                    <p className="text-sm">
                      {candidate.availability.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Skills
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {candidate.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Applications
                  </span>
                  <span className="font-semibold">
                    {candidate.metrics.totalApplications}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Interviews
                  </span>
                  <span className="font-semibold text-blue-600">
                    {candidate.metrics.interviewsScheduled}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Offers</span>
                  <span className="font-semibold text-green-600">
                    {candidate.metrics.offersReceived}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Placements
                  </span>
                  <span className="font-semibold text-purple-600">
                    {candidate.metrics.placements}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Information */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Info className="h-5 w-5 text-blue-600" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Current Employer
                  </label>
                  <p className="text-sm">
                    {candidate.currentEmployer || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Date of Birth
                  </label>
                  <p className="text-sm">{formatDate(candidate.dateOfBirth)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Assigned Recruiter
                  </label>
                  <p className="text-sm">
                    {candidate.assignedRecruiter || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Last Contact
                  </label>
                  <p className="text-sm">{formatDate(candidate.lastContact)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Created
                  </label>
                  <p className="text-sm">{formatDate(candidate.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </label>
                  <p className="text-sm">{formatDate(candidate.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Available Projects
              </CardTitle>
              <CardDescription className="text-slate-600">
                Projects where this candidate can be allocated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Match Score</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidate.projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        {project.title}
                      </TableCell>
                      <TableCell>{project.client}</TableCell>
                      <TableCell>
                        <StatusBadge status={project.status} />
                      </TableCell>
                      <TableCell>{formatDate(project.deadline)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={cn(
                                "h-2 rounded-full",
                                project.matchScore >= 90
                                  ? "bg-green-600"
                                  : project.matchScore >= 80
                                  ? "bg-blue-600"
                                  : project.matchScore >= 70
                                  ? "bg-yellow-600"
                                  : "bg-red-600"
                              )}
                              style={{ width: `${project.matchScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {project.matchScore}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {project.isAssigned ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Assigned
                          </Badge>
                        ) : (
                          <Badge variant="outline">Available</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!project.isAssigned && (
                            <Button variant="outline" size="sm">
                              <UserCheck className="h-4 w-4 mr-1" />
                              Assign
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <History className="h-5 w-5 text-blue-600" />
                Activity History
              </CardTitle>
              <CardDescription className="text-slate-600">
                Recent activities and changes for this candidate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {candidate.history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{item.action}</h4>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(item.date)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        By {item.user}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Applications
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {candidate.metrics.totalApplications}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all projects
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Interviews Scheduled
                </CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {candidate.metrics.interviewsScheduled}
                </div>
                <p className="text-xs text-muted-foreground">
                  {candidate.metrics.interviewsCompleted} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Offers Received
                </CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {candidate.metrics.offersReceived}
                </div>
                <p className="text-xs text-muted-foreground">
                  {candidate.metrics.placements} accepted
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Response Time
                </CardTitle>
                <Clock3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {candidate.metrics.averageResponseTime} days
                </div>
                <p className="text-xs text-muted-foreground">
                  From application to response
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
