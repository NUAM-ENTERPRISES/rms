import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Star,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Briefcase,
  Target,
  UserCheck,
  BarChart3,
  History,
  Eye,
  User,
  GraduationCap,
  Award,
  Clock3,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { useGetCandidateByIdQuery } from "@/features/candidates";
import { useGetCandidateStatusPipelineQuery } from "@/services/candidatesApi";
import QualificationWorkExperienceModal from "@/components/molecules/QualificationWorkExperienceModal";
import { CandidateResumeList } from "@/components/molecules";
import { DocumentUploadSection } from "../components/DocumentUploadSection";
import { CandidatePipeline } from "../components/CandidatePipeline";
import { StatusUpdateModal } from "../components/StatusUpdateModal";
import { StatusHistoryTable } from "../components/StatusHistoryTable";
import { useStatusConfig } from '../hooks/useStatusConfig';
import type {
  CandidateQualification,
  WorkExperience,
} from "@/features/candidates/api";

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


export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<
    "qualification" | "workExperience"
  >("qualification");
  const [editData, setEditData] = useState<
    CandidateQualification | WorkExperience | undefined
  >();

  // Status update modal state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const { statusConfig } = useStatusConfig();

  // Status badge component
  const StatusBadge = ({ status }: { status?: string }) => {
    const safeStatus = status || "unknown";
    const config = statusConfig[safeStatus];

    if (!config) {
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-200 border gap-1 px-2 py-1">
          <AlertTriangle className="h-3 w-3" />
          {safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
        </Badge>
      );
    }

    // Map icon names to actual components
    const iconMap: Record<string, any> = {
      User: User,
      ThumbsUp: CheckCircle,
      XCircle: XCircle,
      MessageCircle: Clock,
      Clock: Clock,
      Pause: Clock,
      PhoneOff: XCircle,
      CheckCircle: CheckCircle2,
      UserPlus: UserCheck,
      UserCheck: UserCheck,
      Users: UserCheck,
      Star: Star,
      Cog: Clock,
      BadgeCheck: CheckCircle2,
    };

    const Icon = iconMap[config.icon] || AlertTriangle;

    return (
      <Badge className={`${config.badgeClass} border gap-1 px-2 py-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // All roles can read candidate details
  const canWriteCandidates = useCan("write:candidates");
  const canManageCandidates = useCan("write:candidates");

  // Fetch candidate data from API
  const {
    data: candidate,
    isLoading,
    error,
  } = useGetCandidateByIdQuery(id!, {
    skip: !id,
  });

  // Fetch candidate status pipeline
  const {
    data: pipelineData,
    isLoading: isPipelineLoading,
  } = useGetCandidateStatusPipelineQuery(id!, {
    skip: !id,
  });

  const handleEdit = () => {
    navigate(`/candidates/${id}/edit`);
  };

  const handleDelete = () => {
    toast.error("Delete functionality coming soon");
  };

  // Modal handlers
  const openAddModal = (type: "qualification" | "workExperience") => {
    setModalType(type);
    setEditData(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (
    type: "qualification" | "workExperience",
    data: CandidateQualification | WorkExperience
  ) => {
    setModalType(type);
    setEditData(data);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditData(undefined);
  };

  const handleModalSuccess = () => {
    // The candidate data will be refetched automatically due to cache invalidation
    toast.success(
      `${modalType === "qualification" ? "Qualification" : "Work experience"
      } saved successfully`
    );
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Loading Candidate...
          </h3>
          <p className="text-muted-foreground">
            Please wait while we fetch the candidate details.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Candidate fetch error:", error);
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Error Loading Candidate
          </h3>
          <p className="text-muted-foreground mb-6">
            There was an error loading the candidate details.
          </p>
          <Button onClick={() => navigate("/candidates")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Candidates
          </Button>
        </div>
      </div>
    );
  }

  if (!candidate) {
    console.log("No candidate data received");
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Candidate Not Found
          </h3>
          <p className="text-muted-foreground mb-6">
            The candidate you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/candidates")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Candidates
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
              {candidate.firstName} {candidate.lastName}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Status:</span>
              <StatusBadge status={candidate.currentStatus.statusName} />
              <span className="text-sm text-slate-600">
                {statusConfig[candidate.currentStatus.statusName]?.description}
              </span>
              {canWriteCandidates && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsStatusModalOpen(true)}
                  className="h-6 w-6 p-0 hover:bg-slate-100"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">
              {candidate.currentRole || "No role specified"}
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
            Candidate Status Pipeline
          </CardTitle>
          <CardDescription className="text-slate-600">
            Track status changes and progression
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isPipelineLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading pipeline...</p>
            </div>
          ) : pipelineData?.data ? (
            <CandidatePipeline
              pipeline={pipelineData.data.pipeline}
            
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No pipeline data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
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
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Email
                    </label>
                    <p className="text-sm flex items-center gap-2 mt-1">
                      <Mail className="h-3 w-3 text-slate-400" />
                      {candidate.email || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Phone
                    </label>
                    <p className="text-sm flex items-center gap-2 mt-1">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {candidate.mobileNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Date of Birth
                    </label>
                    <p className="text-sm flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {formatDate(candidate.dateOfBirth)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Experience
                    </label>
                    <p className="text-sm flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {(() => {
                        if (
                          candidate.workExperiences &&
                          candidate.workExperiences.length > 0
                        ) {
                          // Calculate total experience from work experiences
                          let totalMonths = 0;
                          candidate.workExperiences.forEach((exp) => {
                            const startDate = new Date(exp.startDate);
                            const endDate = exp.isCurrent
                              ? new Date()
                              : new Date(exp.endDate || new Date());
                            const months =
                              (endDate.getFullYear() -
                                startDate.getFullYear()) *
                              12 +
                              (endDate.getMonth() - startDate.getMonth());
                            totalMonths += months;
                          });
                          const years = Math.floor(totalMonths / 12);
                          const months = totalMonths % 12;
                          return years > 0
                            ? `${years} years ${months > 0 ? `${months} months` : ""
                            }`
                            : `${months} months`;
                        }
                        return (
                          candidate.totalExperience || candidate.experience || 0
                        );
                      })()}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Expected Salary
                    </label>
                    <p className="text-sm flex items-center gap-2 mt-1">
                      <DollarSign className="h-3 w-3 text-slate-400" />
                      {candidate.expectedSalary
                        ? formatCurrency(candidate.expectedSalary)
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Source
                    </label>
                    <p className="text-sm mt-1 capitalize">
                      {candidate.source || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Created
                    </label>
                    <p className="text-sm mt-1">
                      {formatDate(candidate.createdAt)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Last Updated
                    </label>
                    <p className="text-sm mt-1">
                      {formatDate(candidate.updatedAt)}
                    </p>
                  </div>
                </div>

                {/* Skills Section */}
                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
                      Skills
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {candidate.skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="text-xs px-2 py-1"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
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
                    {candidate.metrics?.totalApplications ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Interviews
                  </span>
                  <span className="font-semibold text-blue-600">
                    {candidate.metrics?.interviewsScheduled ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Offers</span>
                  <span className="font-semibold text-green-600">
                    {candidate.metrics?.offersReceived ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Placements
                  </span>
                  <span className="font-semibold text-purple-600">
                    {candidate.metrics?.placements ?? 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resume List */}
          <div className="mb-8">
            <CandidateResumeList candidateId={id!} />
          </div>

          {/* Educational Qualifications and Work Experience - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Educational Qualifications - LinkedIn Style */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                    Educational Qualifications
                  </CardTitle>
                  {canWriteCandidates && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddModal("qualification")}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {candidate.qualifications &&
                  candidate.qualifications.length > 0 ? (
                  <div className="space-y-4">
                    {candidate.qualifications.map((qual) => (
                      <div
                        key={qual.id}
                        className="border-l-4 border-blue-200 pl-4 py-3 hover:border-blue-400 transition-colors duration-200"
                      >
                        {/* Qualification Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-slate-900 mb-1">
                              {qual.qualification.name}
                            </h3>
                            {qual.qualification.shortName && (
                              <p className="text-xs text-slate-600 font-medium mb-1">
                                {qual.qualification.shortName}
                              </p>
                            )}
                            {qual.university && (
                              <p className="text-xs text-slate-700 font-medium">
                                {qual.university}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                qual.isCompleted ? "default" : "secondary"
                              }
                              className={`text-xs px-2 py-1 ${qual.isCompleted
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : "bg-yellow-100 text-yellow-800 border-yellow-200"
                                }`}
                            >
                              {qual.isCompleted ? "Completed" : "In Progress"}
                            </Badge>
                            {canWriteCandidates && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  openEditModal("qualification", qual)
                                }
                                className="h-8 w-8 p-0 hover:bg-slate-100"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Qualification Details */}
                        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                          {qual.graduationYear && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-500" />
                              <span>{qual.graduationYear}</span>
                            </div>
                          )}
                          {qual.gpa && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-amber-500" />
                              <span>GPA: {qual.gpa}</span>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {qual.notes && (
                          <div className="mt-3 p-2 bg-slate-50 rounded-md">
                            <p className="text-xs text-slate-700 italic">
                              "{qual.notes}"
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                        <GraduationCap className="h-8 w-8 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-slate-600 font-medium">
                          No educational qualifications
                        </p>
                        <p className="text-sm text-slate-500">
                          Add degrees and certifications to showcase expertise
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Work Experience - LinkedIn Style */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                    Work Experience
                  </CardTitle>
                  {canWriteCandidates && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddModal("workExperience")}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {candidate.workExperiences &&
                  candidate.workExperiences.length > 0 ? (
                  <div className="space-y-4">
                    {candidate.workExperiences.map((exp) => (
                      <div
                        key={exp.id}
                        className="border-l-4 border-emerald-200 pl-4 py-3 hover:border-emerald-400 transition-colors duration-200"
                      >
                        {/* Job Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-slate-900 mb-1">
                              {exp.jobTitle}
                            </h3>
                            <p className="text-xs text-emerald-600 font-medium mb-2">
                              {exp.companyName}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-slate-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-500" />
                                <span>
                                  {formatDate(exp.startDate)} -{" "}
                                  {exp.isCurrent
                                    ? "Present"
                                    : exp.endDate
                                      ? formatDate(exp.endDate)
                                      : "Not specified"}
                                </span>
                              </div>
                              {exp.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-slate-500" />
                                  <span>{exp.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {exp.isCurrent && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs px-2 py-1">
                                Current
                              </Badge>
                            )}
                            {canWriteCandidates && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  openEditModal("workExperience", exp)
                                }
                                className="h-8 w-8 p-0 hover:bg-slate-100"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Job Details */}
                        <div className="space-y-3">
                          {/* Description */}
                          {exp.description && (
                            <div>
                              <p className="text-xs text-slate-700 leading-relaxed">
                                {exp.description}
                              </p>
                            </div>
                          )}

                          {/* Salary */}
                          {exp.salary && (
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <DollarSign className="h-3 w-3 text-green-500" />
                              <span className="font-medium">
                                {formatCurrency(exp.salary)}
                              </span>
                            </div>
                          )}

                          {/* Achievements */}
                          {exp.achievements && (
                            <div className="p-2 bg-amber-50 rounded-md border border-amber-200">
                              <div className="flex items-center gap-1 mb-1">
                                <Award className="h-3 w-3 text-amber-600" />
                                <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">
                                  Achievements
                                </span>
                              </div>
                              <p className="text-xs text-amber-800">
                                {exp.achievements}
                              </p>
                            </div>
                          )}

                          {/* Skills */}
                          {exp.skills &&
                            Array.isArray(exp.skills) &&
                            exp.skills.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1 mb-1">
                                  <Star className="h-3 w-3 text-purple-500" />
                                  <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                    Skills
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {exp.skills.map((skill, index) => (
                                    <Badge
                                      key={index}
                                      variant="secondary"
                                      className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 border-purple-200"
                                    >
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                        <Briefcase className="h-8 w-8 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-slate-600 font-medium">
                          No work experience
                        </p>
                        <p className="text-sm text-slate-500">
                          Add professional experience to build credibility
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Assigned Projects
              </CardTitle>
              <CardDescription className="text-slate-600">
                Projects where this candidate is currently assigned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recruiter</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(candidate.projects || []).map((projectMap) => (
                    <TableRow key={projectMap.id}>
                      <TableCell className="font-medium">
                        {projectMap.project?.title || "Unknown Project"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={projectMap.currentProjectStatus.statusName} />
                      </TableCell>
                      <TableCell>
                        {projectMap.recruiter ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {projectMap.recruiter.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {projectMap.recruiter.email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-orange-600 border-orange-200"
                          >
                            Unassigned
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDate(projectMap.assignedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/candidate-project/${id}/projects/${projectMap.projectId}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {projectMap.status === "nominated" && (
                            <Button variant="outline" size="sm">
                              <UserCheck className="h-4 w-4 mr-1" />
                              Review
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

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-6">
          {isPipelineLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading pipeline...</p>
            </div>
          ) : pipelineData?.data ? (
            <CandidatePipeline
              pipeline={pipelineData.data.pipeline}
  
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              <p>No pipeline data available</p>
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <DocumentUploadSection candidateId={id!} />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <History className="h-5 w-5 text-blue-600" />
                Status History
              </CardTitle>
              <CardDescription className="text-slate-600">
                Track all status changes for this candidate
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <StatusHistoryTable candidateId={id!} />
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
                  {candidate.metrics?.totalApplications ?? 0}
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
                  {candidate.metrics?.interviewsScheduled ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {candidate.metrics?.interviewsCompleted ?? 0} completed
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
                  {candidate.metrics?.offersReceived ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {candidate.metrics?.placements ?? 0} accepted
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
                  {candidate.metrics?.averageResponseTime ?? 0} days
                </div>
                <p className="text-xs text-muted-foreground">
                  From application to response
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal for adding/editing qualifications and work experience */}
      <QualificationWorkExperienceModal
        isOpen={isModalOpen}
        onClose={closeModal}
        candidateId={id!}
        type={modalType}
        editData={editData}
        onSuccess={handleModalSuccess}
      />

      {/* Status update modal */}
      <StatusUpdateModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        candidateId={id!}
        currentStatus={candidate.currentStatus.statusName}
        candidateName={`${candidate.firstName} ${candidate.lastName}`}
      />
    </div>
  );
}
