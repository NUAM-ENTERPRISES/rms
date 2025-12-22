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
  Send,
  CalendarCheck,
  Handshake,
  Trophy,
  Sparkles,
} from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { getAge } from "@/utils";
import { useGetCandidateByIdQuery } from "@/features/candidates";
import { useGetCandidateStatusPipelineQuery } from "@/services/candidatesApi";
import QualificationWorkExperienceModal from "@/components/molecules/QualificationWorkExperienceModal";
import { CandidateResumeList } from "@/components/molecules";
import { DocumentUploadSection } from "../components/DocumentUploadSection";
import { CandidatePipeline } from "../components/CandidatePipeline";
import { StatusUpdateModal } from "../components/StatusUpdateModal";
import { StatusHistoryTable } from "../components/StatusHistoryTable";
import { useStatusConfig } from "../hooks/useStatusConfig";
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
  const { data: pipelineData, isLoading: isPipelineLoading } =
    useGetCandidateStatusPipelineQuery(id!, {
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
      `${
        modalType === "qualification" ? "Qualification" : "Work experience"
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

  const age = getAge(candidate.dateOfBirth);

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
              <p className="text-sm text-muted-foreground">
                Loading pipeline...
              </p>
            </div>
          ) : pipelineData?.data ? (
            <CandidatePipeline pipeline={pipelineData.data.pipeline} />
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
          {/* <TabsTrigger value="pipeline">Pipeline</TabsTrigger> */}
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Candidate Information */}
            <Card className="xl:col-span-2 border border-gray-300 rounded-lg shadow-lg bg-white bg-opacity-90 backdrop-blur-md transition-shadow hover:shadow-2xl">
              <CardHeader className="border-b border-gray-300 px-6 py-4">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900 select-none">
                  <User className="h-6 w-6 text-blue-600" />
                  Candidate Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-w-4xl mx-auto">
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
                        Age
                      </label>
                      <p className="text-sm flex items-center gap-2 mt-1">
                        <User className="h-3 w-3 text-slate-400" />
                        {age !== null ? `${age} years` : "N/A"}
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
                              ? `${years} years ${
                                  months > 0 ? `${months} months` : ""
                                }`
                              : `${months} months`;
                          }
                          return (
                            candidate.totalExperience ||
                            candidate.experience ||
                            0
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
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats - ONLY THIS LINE CHANGED (removed hover:-translate-y-1) */}
            <Card
              className="border-0 shadow-xl bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden 
                   ring-1 ring-gray-200/50 hover:ring-blue-400/30 hover:shadow-2xl 
                   transition-all duration-500"
            >
              {/* ← hover:-translate-y-1 REMOVED → BUG FIXED */}

              {/* Premium Gradient Header */}
              <CardHeader className="border-b border-gray-200 bg-gradient-to-r px-6 py-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/5" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-16 translate-x-16" />

                <CardTitle className="relative flex items-center gap-3 text-black text-lg font-semibold tracking-tight">
                  <div className="p-2.5 backdrop-blur-md rounded-xl border shadow-lg">
                    <BarChart3 className="h-6 w-6 text-black" />
                  </div>
                  <span>Quick Stats</span>
                  <div className="ml-auto flex items-center gap-1">
                    <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs font-medium opacity-90">Live</span>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-white">
                {[
                  {
                    label: "Applications",
                    value: candidate.metrics?.totalApplications ?? 0,
                    icon: "paper-plane",
                    color: "from-gray-500 to-slate-600",
                    bg: "bg-gray-100",
                    hoverBg: "hover:bg-gray-200",
                  },
                  {
                    label: "Interviews",
                    value: candidate.metrics?.interviewsScheduled ?? 0,
                    icon: "calendar-check",
                    color: "from-blue-500 to-blue-600",
                    bg: "bg-blue-50",
                    hoverBg: "hover:bg-blue-100",
                  },
                  {
                    label: "Offers",
                    value: candidate.metrics?.offersReceived ?? 0,
                    icon: "handshake",
                    color: "from-emerald-500 to-green-600",
                    bg: "bg-emerald-50",
                    hoverBg: "hover:bg-emerald-100",
                  },
                  {
                    label: "Placements",
                    value: candidate.metrics?.placements ?? 0,
                    icon: "trophy",
                    color: "from-purple-500 to-indigo-600",
                    bg: "bg-purple-50",
                    hoverBg: "hover:bg-purple-100",
                  },
                ].map(({ label, value, color, bg, hoverBg }) => (
                  <div
                    key={label}
                    className={`group relative flex items-center justify-between px-5 py-4 rounded-xl ${bg} ${hoverBg} 
                      border border-transparent hover:border-gray-300 shadow-sm hover:shadow-md 
                      transition-all duration-300 cursor-default backdrop-blur-sm`}
                  >
                    <div
                      className={`absolute inset-0 rounded-xl bg-gradient-to-r ${color} opacity-0 
                           group-hover:opacity-10 blur-xl transition-opacity duration-500`}
                    />

                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2.5 rounded-lg bg-gradient-to-br ${color} shadow-md`}
                      >
                        {label === "Applications" && (
                          <Send className="h-5 w-5 text-white" />
                        )}
                        {label === "Interviews" && (
                          <CalendarCheck className="h-5 w-5 text-white" />
                        )}
                        {label === "Offers" && (
                          <Handshake className="h-5 w-5 text-white" />
                        )}
                        {label === "Placements" && (
                          <Trophy className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-700 tracking-wide">
                        {label}
                      </span>
                    </div>

                    <span
                      className={`text-2xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent 
                            drop-shadow-sm`}
                    >
                      {value}
                    </span>

                    <div
                      className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent 
                          opacity-0 group-hover:w-full group-hover:opacity-100 transition-all duration-700"
                    />
                  </div>
                ))}
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
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-md overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-2xl">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 pb-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
                    <div className="p-2 bg-blue-100 rounded-xl">
                      <GraduationCap className="h-6 w-6 text-blue-600" />
                    </div>
                    Educational Qualifications
                  </CardTitle>
                  {canWriteCandidates && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => openAddModal("qualification")}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <Plus className="h-4 w-4" />
                      Add Qualification
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-7 pb-2">
                {candidate.qualifications &&
                candidate.qualifications.length > 0 ? (
                  <div className="space-y-6">
                    {candidate.qualifications.map((qual, index) => (
                      <div
                        key={qual.id}
                        className="group relative bg-gradient-to-r from-slate-50 to-blue-50/30 border border-slate-200/80 rounded-xl p-5 hover:border-blue-300 hover:from-blue-50/70 hover:to-indigo-50/50 transition-all duration-300 hover:shadow-md"
                      >
                        {/* Decorative left accent */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="flex items-start justify-between">
                          <div className="flex-1 pr-4">
                            <h3 className="text-lg font-bold text-slate-900 leading-tight">
                              {qual.qualification.name}
                            </h3>
                            <div className="flex items-center gap-3 mt-1 text-sm">
                              {qual.qualification.shortName && (
                                <span className="font-semibold text-blue-700">
                                  {qual.qualification.shortName}
                                </span>
                              )}
                              {qual.university && (
                                <>
                                  {qual.qualification.shortName && (
                                    <span className="text-slate-400">•</span>
                                  )}
                                  <span className="text-slate-600 font-medium">
                                    {qual.university}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className={`font-medium text-xs px-3 py-1.5 rounded-full border-2 transition-all ${
                                qual.isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm"
                                  : "bg-amber-50 text-amber-700 border-amber-300 shadow-sm"
                              }`}
                            >
                              {qual.isCompleted ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  Completed
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3.5 w-3.5 mr-1" />
                                  In Progress
                                </>
                              )}
                            </Badge>

                            {canWriteCandidates && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  openEditModal("qualification", qual)
                                }
                                className="h-9 w-9 rounded-lg hover:bg-blue-100 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-all duration-300"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Details Row */}
                        {(qual.graduationYear || qual.gpa) && (
                          <div className="flex flex-wrap items-center gap-5 mt-4 text-sm text-slate-600">
                            {qual.graduationYear && (
                              <div className="flex items-center gap-2 font-medium">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <span>Graduated {qual.graduationYear}</span>
                              </div>
                            )}
                            {qual.gpa && (
                              <div className="flex items-center gap-2 font-medium">
                                <Trophy className="h-4 w-4 text-amber-500" />
                                <span className="text-slate-800 font-semibold">
                                  GPA: {qual.gpa}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {qual.notes && (
                          <div className="mt-4 p-4 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-lg">
                            <p className="text-sm text-slate-700 italic leading-relaxed">
                              “{qual.notes}”
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Empty State - Enhanced */
                  <div className="py-16 text-center">
                    <div className="max-w-sm mx-auto space-y-6">
                      <div className="relative">
                        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center shadow-inner">
                          <GraduationCap className="h-12 w-12 text-blue-600" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-10 h-10 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">
                          No Educational Qualifications Yet
                        </h3>
                        <p className="mt-2 text-slate-600">
                          Add degrees, certifications, and academic achievements
                          to strengthen this profile.
                        </p>
                      </div>
                      {canWriteCandidates && (
                        <Button
                          onClick={() => openAddModal("qualification")}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Add First Qualification
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Work Experience - LinkedIn Style */}
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-md overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-2xl">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 pb-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
                    <div className="p-2 bg-emerald-100 rounded-xl">
                      <Briefcase className="h-6 w-6 text-emerald-600" />
                    </div>
                    Work Experience
                  </CardTitle>
                  {canWriteCandidates && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => openAddModal("workExperience")}
                      className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <Plus className="h-4 w-4" />
                      Add Experience
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-7 pb-2">
                {candidate.workExperiences &&
                candidate.workExperiences.length > 0 ? (
                  <div className="space-y-6">
                    {candidate.workExperiences.map((exp, index) => (
                      <div
                        key={exp.id}
                        className="group relative bg-gradient-to-r from-slate-50 to-emerald-50/30 border border-slate-200/80 rounded-xl p-6 hover:border-emerald-300 hover:from-emerald-50/70 hover:to-teal-50/50 transition-all duration-300 hover:shadow-lg"
                      >
                        {/* Left accent bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="flex items-start justify-between gap-6">
                          <div className="flex-1">
                            {/* Job Title & Company */}
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                                  {exp.jobTitle}
                                </h3>
                                <p className="text-base font-semibold text-emerald-700 mt-1">
                                  {exp.companyName}
                                </p>
                              </div>
                              {exp.isCurrent && (
                                <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 font-medium px-3 py-1.5 rounded-full shadow-sm">
                                  <span className="relative flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                    Current Role
                                  </span>
                                </Badge>
                              )}
                            </div>

                            {/* Date & Location */}
                            <div className="flex flex-wrap items-center gap-5 text-sm text-slate-600 font-medium mb-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-emerald-600" />
                                <span>
                                  {formatDate(exp.startDate)} –{" "}
                                  {exp.isCurrent
                                    ? "Present"
                                    : exp.endDate
                                    ? formatDate(exp.endDate)
                                    : "Ongoing"}
                                </span>
                              </div>
                              {exp.location && (
                                <>
                                  <span className="text-slate-400">•</span>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-emerald-600" />
                                    <span>{exp.location}</span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Description */}
                            {exp.description && (
                              <p className="text-sm text-slate-700 leading-relaxed mb-5 bg-white/70 backdrop-blur-sm p-4 rounded-lg border border-slate-200">
                                {exp.description}
                              </p>
                            )}

                            {/* Salary */}
                            {exp.salary && (
                              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-4">
                                <DollarSign className="h-5 w-5 text-emerald-600" />
                                <span>{formatCurrency(exp.salary)}</span>
                              </div>
                            )}

                            {/* Achievements */}
                            {exp.achievements && (
                              <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                  <Trophy className="h-5 w-5 text-amber-600" />
                                  <span className="font-bold text-amber-800 uppercase tracking-wider text-xs">
                                    Key Achievements
                                  </span>
                                </div>
                                <p className="text-sm text-amber-900 leading-relaxed">
                                  {exp.achievements}
                                </p>
                              </div>
                            )}

                            {/* Skills */}
                            {exp.skills &&
                              Array.isArray(exp.skills) &&
                              exp.skills.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="h-5 w-5 text-purple-600" />
                                    <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">
                                      Skills Demonstrated
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {exp.skills.map((skill, i) => (
                                      <Badge
                                        key={i}
                                        variant="outline"
                                        className="bg-gradient-to-r from-purple-50 to-pink-50 text-purple-800 border-purple-300 font-medium px-3 py-1 rounded-full shadow-sm hover:shadow transition-shadow"
                                      >
                                        {skill}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>

                          {/* Edit Button (hover reveal) */}
                          <div className="flex-shrink-0">
                            {canWriteCandidates && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  openEditModal("workExperience", exp)
                                }
                                className="h-10 w-10 rounded-xl hover:bg-emerald-100 hover:text-emerald-700 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Enhanced Empty State */
                  <div className="py-16 text-center">
                    <div className="max-w-sm mx-auto space-y-6">
                      <div className="relative">
                        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center shadow-inner">
                          <Briefcase className="h-12 w-12 text-emerald-600" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-10 h-10 bg-emerald-100 rounded-full animate-ping opacity-75"></div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">
                          No Work Experience Added
                        </h3>
                        <p className="mt-2 text-slate-600">
                          Showcase past roles, responsibilities, and
                          achievements to stand out.
                        </p>
                      </div>
                      {canWriteCandidates && (
                        <Button
                          onClick={() => openAddModal("workExperience")}
                          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-lg"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Add First Experience
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-md overflow-hidden rounded-2xl">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-purple-50/50 to-violet-50/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
                    <div className="p-2 bg-purple-100 rounded-xl">
                      <Briefcase className="h-6 w-6 text-purple-600" />
                    </div>
                    Assigned Projects
                  </CardTitle>
                  <CardDescription className="mt-1 text-slate-600">
                    Projects where this candidate is currently assigned or
                    nominated
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {(candidate.projects || []).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-100 transition-colors">
                      <TableHead className="font-semibold text-slate-700">
                        Project
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Recruiter
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Assigned Date
                      </TableHead>
                      <TableHead className="text-right font-semibold text-slate-700">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(candidate.projects || []).map((projectMap) => (
                      <TableRow
                        key={projectMap.id}
                        className="hover:bg-purple-50/50 transition-all duration-200"
                      >
                        <TableCell className="font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Briefcase className="h-5 w-5 text-purple-600" />
                            </div>
                            <span className="truncate">
                              {projectMap.project?.title || "Untitled Project"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <StatusBadge status={projectMap.subStatus.label} />
                        </TableCell>

                        <TableCell>
                          {projectMap.recruiter ? (
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {projectMap.recruiter.name}
                                </p>
                                <p className="text-xs text-slate-500 truncate max-w-32">
                                  {projectMap.recruiter.email}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-orange-600 border-orange-300 bg-orange-50"
                            >
                              Unassigned
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-slate-700">
                          {formatDate(projectMap.assignedAt)}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `/candidate-project/${id}/projects/${projectMap.projectId}`
                                )
                              }
                              className="hover:bg-purple-100"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {projectMap.status === "nominated" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-purple-300 text-purple-700 hover:bg-purple-50"
                              >
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
              ) : (
                /* Clean, Professional, Static Empty State – No Errors, No Animations */
                <div className="py-16 text-center">
                  <div className="max-w-md mx-auto space-y-6">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-100 to-violet-100 rounded-full flex items-center justify-center">
                      <Briefcase className="h-12 w-12 text-purple-600" />
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xl font-bold text-slate-800">
                        No Projects Assigned
                      </h3>
                      <p className="text-slate-600">
                        This candidate is not currently part of any active or
                        nominated projects.
                      </p>
                    </div>

                    <div className="text-sm text-slate-500 space-y-2">
                      <p>
                        Assign them to a project to track performance and
                        progress.
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
            <CandidatePipeline pipeline={pipelineData.data.pipeline} />
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
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-md overflow-hidden rounded-2xl transition-shadow duration-300 hover:shadow-2xl">
            <CardHeader className="border-b border-slate-100 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
                    <div className="p-2 bg-amber-100 rounded-xl shadow-inner">
                      <History className="h-6 w-6 text-amber-600" />
                    </div>
                    Status History
                  </CardTitle>
                  <CardDescription className="mt-2 text-slate-600 font-medium max-w-xl">
                    Complete timeline of all status changes and activities for
                    this candidate
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-8 pb-6">
              {/* Stunning timeline component */}
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
