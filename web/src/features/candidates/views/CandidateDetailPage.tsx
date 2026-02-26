import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  ArrowLeft,
  Edit,
  Trash2,
  AlertTriangle,
  Target,
  Briefcase,
  FileText,
  TrendingUp,
} from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { formatDate } from "@/lib/utils";
import {
  useGetCandidateByIdQuery,
  useGetCandidateProjectsQuery,
  useGetDocumentsQuery,
} from "@/features/candidates";
import { useGetCandidateStatusPipelineQuery } from "@/services/candidatesApi";
import QualificationWorkExperienceModal from "@/components/molecules/QualificationWorkExperienceModal";
import { ImageViewer } from "@/components/molecules";
import { CandidatePipeline } from "../components/CandidatePipeline";
import { StatusUpdateModal } from "../components/StatusUpdateModal";
import { UpdateJobPreferenceModal } from "../components/UpdateJobPreferenceModal";
import { UpdatePersonalInfoModal } from "../components/UpdatePersonalInfoModal";
import { UpdatePhysicalInfoModal } from "../components/UpdatePhysicalInfoModal";
import { StatusBadge } from "../components/StatusBadge";
import { useAppSelector } from "@/app/hooks";
import type {
  CandidateQualification,
  WorkExperience,
} from "@/features/candidates/api";

// Tab Components
import { CandidateOverview } from "../components/tabs/CandidateOverview";
import { CandidateProjects } from "../components/tabs/CandidateProjects";
import { CandidateDocuments } from "../components/tabs/CandidateDocuments";
import { CandidateHistory } from "../components/tabs/CandidateHistory";
import { CandidateMetrics } from "../components/tabs/CandidateMetrics";

// Fallback avatar used when candidate has no profileImage
const DEFAULT_PROFILE_IMAGE =
  "https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg";

export default function CandidateDetailPage() { 
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const {} = useAppSelector((state) => state.auth);

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

  // Job preference update modal state
  const [isJobPreferenceModalOpen, setIsJobPreferenceModalOpen] = useState(false);

  // Personal info update modal state
  const [isPersonalInfoModalOpen, setIsPersonalInfoModalOpen] = useState(false);

  // Physical info update modal state
  const [isPhysicalModalOpen, setIsPhysicalModalOpen] = useState(false);

  // Image viewer is provided by the reusable `ImageViewer` molecule (handles its own state)

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

  // Fetch counts for stat cards
  const { data: projectsData } = useGetCandidateProjectsQuery(
    { candidateId: id!, page: 1, limit: 1 },
    { skip: !id }
  );

  const { data: documentsData } = useGetDocumentsQuery(
    { candidateId: id!, page: 1, limit: 1 },
    { skip: !id }
  );

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

  const stats = [
    {
      label: "Projects Assigned",
      value: projectsData?.meta?.total ?? 0,
      subtitle: "Assigned tasks",
      icon: Briefcase,
      color: "from-blue-500 to-cyan-500",
      tab: "projects",
    },
    {
      label: "Total Documents",
      value: documentsData?.data?.pagination?.total ?? 0,
      subtitle: "Verified files",
      icon: FileText,
      color: "from-purple-500 to-pink-500",
      tab: "documents",
    },
    {
      label: "Status History",
      value: pipelineData?.data?.pipeline?.length ?? 0,
      subtitle: "Status changes",
      icon: TrendingUp,
      color: "from-orange-500 to-red-500",
      tab: "history",
    },
  ];

  const gradientMap: Record<
    string,
    { bg: string; iconBg: string; text: string }
  > = {
    "from-blue-500 to-cyan-500": {
      bg: "from-blue-50 to-blue-100/50",
      iconBg: "bg-blue-200/40",
      text: "text-blue-600",
    },
    "from-purple-500 to-pink-500": {
      bg: "from-purple-50 to-purple-100/50",
      iconBg: "bg-purple-200/40",
      text: "text-purple-600",
    },
    "from-orange-500 to-red-500": {
      bg: "from-orange-50 to-orange-100/50",
      iconBg: "bg-orange-200/40",
      text: "text-orange-600",
    },
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <ImageViewer
              title={`${candidate.firstName} ${candidate.lastName}`}
              src={candidate.profileImage || null}
              fallbackSrc={DEFAULT_PROFILE_IMAGE}
              className="h-16 w-16"
              ariaLabel={`View full image for ${candidate.firstName} ${candidate.lastName}`}
            /> 

            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
                {candidate.firstName} {candidate.lastName}
              </h1>
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
          <div className="flex items-center gap-3 mt-1 bg-slate-50/50 p-1.5 px-2.5 rounded-2xl border border-slate-100/50 w-fit">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Candidate Status</span>
              <StatusBadge status={candidate.currentStatus?.statusName ?? "unknown"} />
            </div>
            
            <div className="h-4 w-[1px] bg-slate-200 mx-1" />

            {canWriteCandidates && (
            <button
  onClick={() => setIsStatusModalOpen(true)}
  className="group relative flex items-center gap-2.5 px-3 py-1.5 bg-white/50 backdrop-blur-sm border border-slate-200/60 rounded-full shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300"
>
  <Edit className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 transition-transform group-hover:rotate-12" />
  <span className="text-[10px] font-black text-slate-500 group-hover:text-blue-700 uppercase tracking-widest">
    Update Status
  </span>
</button>
            )}
          </div>
        <div className="flex items-center gap-2">
          {canManageCandidates && (
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const colors = gradientMap[stat.color];
          return (
            <motion.div
              key={i}
              onClick={() => stat.tab && setActiveTab(stat.tab)}
              className="cursor-pointer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Card
                className={`border-0 shadow-md bg-gradient-to-br ${colors.bg} backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5`}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${colors.iconBg}`}>
                    <Icon className={`h-6 w-6 ${colors.text}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {stat.label}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-bold text-slate-900">
                        {stat.value}
                      </h3>
                      <span className="text-xs text-slate-400 font-normal">
                        {stat.subtitle}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {/* <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger> */}
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <CandidateOverview
            candidate={candidate}
            canWriteCandidates={canWriteCandidates}
            openAddModal={openAddModal}
            openEditModal={openEditModal}
            onEditJobPreferences={() => setIsJobPreferenceModalOpen(true)}
            onEditPersonalInfo={() => setIsPersonalInfoModalOpen(true)}
            onEditPhysicalInfo={() => setIsPhysicalModalOpen(true)}
          />
        </TabsContent>

        {/* Projects Tab - Optimized with independent API call */}
        <TabsContent value="projects" className="space-y-6">
          <CandidateProjects
            candidateId={id!}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <CandidateDocuments candidateId={id!} />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <CandidateHistory candidateId={id!} />
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          <CandidateMetrics candidate={candidate} />
        </TabsContent>
      </Tabs>

      {/* Pipeline */}
      <Card className="mt-6 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
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
        currentStatus={candidate.currentStatus?.statusName ?? ""}
        candidateName={`${candidate.firstName} ${candidate.lastName}`}
      />

      {/* Job preference update modal */}
      <UpdateJobPreferenceModal
        isOpen={isJobPreferenceModalOpen}
        onClose={() => setIsJobPreferenceModalOpen(false)}
        candidateId={id!}
        initialData={{
          expectedMinSalary: candidate.expectedMinSalary,
          expectedMaxSalary: candidate.expectedMaxSalary,
          sectorType: candidate.sectorType,
          visaType: candidate.visaType,
          preferredCountries: candidate.preferredCountries?.map(pc => pc.country.code),
          facilityPreferences: candidate.facilityPreferences?.map(fp => fp.facilityType),
        }}
      />

      {/* Personal info update modal */}
      <UpdatePersonalInfoModal
        isOpen={isPersonalInfoModalOpen}
        onClose={() => setIsPersonalInfoModalOpen(false)}
        candidateId={id!}
        initialData={{
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          profileImage: candidate.profileImage,
          countryCode: candidate.countryCode,
          mobileNumber: candidate.mobileNumber,
          email: candidate.email,
          source: candidate.source,
          gender: candidate.gender,
          dateOfBirth: candidate.dateOfBirth,
          referralCompanyName: candidate.referralCompanyName,
          referralEmail: candidate.referralEmail,
          referralCountryCode: candidate.referralCountryCode,
          referralPhone: candidate.referralPhone,
          referralDescription: candidate.referralDescription,
        }}
      />

      {/* Physical info update modal */}
      <UpdatePhysicalInfoModal
        isOpen={isPhysicalModalOpen}
        onClose={() => setIsPhysicalModalOpen(false)}
        candidateId={id!}
        initialData={{
          height: candidate.height,
          weight: candidate.weight,
          skinTone: candidate.skinTone,
          languageProficiency: candidate.languageProficiency,
          smartness: candidate.smartness,
        }}
      />

    </div>
  );
}
