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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  ArrowLeft,
  Edit,
  Trash2,
  AlertTriangle,
  Target,
} from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { getAge } from "@/utils";
import { formatDate } from "@/lib/utils";
import {
  useGetCandidateByIdQuery
} from "@/features/candidates";
import { useGetCandidateStatusPipelineQuery } from "@/services/candidatesApi";
import QualificationWorkExperienceModal from "@/components/molecules/QualificationWorkExperienceModal";
import { ImageViewer } from "@/components/molecules";
import { CandidatePipeline } from "../components/CandidatePipeline";
import { StatusUpdateModal } from "../components/StatusUpdateModal";
import { StatusBadge } from "../components/StatusBadge";
import { useStatusConfig } from "../hooks/useStatusConfig";
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
  const { user } = useAppSelector((state) => state.auth);
  const isCRE = user?.roles?.includes("CRE");

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

  // Image viewer is provided by the reusable `ImageViewer` molecule (handles its own state)

  // All roles can read candidate details
  const canWriteCandidates = useCan("write:candidates");
  const canManageCandidates = useCan("write:candidates");
  const canTransferBack = useCan("transfer_back:candidates");

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

              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-500">Status:</span>
                <StatusBadge status={candidate.currentStatus?.statusName ?? "unknown"} />
                <span className="text-sm text-slate-600">
                  {statusConfig[candidate.currentStatus?.statusName ?? ""]?.description}
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
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <CandidateOverview
            candidate={candidate}
            canWriteCandidates={canWriteCandidates}
            openAddModal={openAddModal}
            openEditModal={openEditModal}
          />
        </TabsContent>

        {/* Projects Tab - Optimized with independent API call */}
        <TabsContent value="projects" className="space-y-6">
          <CandidateProjects
            candidateId={id!}
            StatusBadge={StatusBadge}
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

    </div>
  );
}
