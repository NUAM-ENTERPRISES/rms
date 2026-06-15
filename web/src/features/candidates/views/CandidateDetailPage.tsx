import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
import { Tabs, TabsContent } from "@/components/ui/tabs";

import {
  ArrowLeft,
  AlertTriangle,
  Target,
  Briefcase,
  FileText,
  TrendingUp,
  ArrowUpRight,
  Clock,
  RefreshCw,
  Calendar,
  
} from "lucide-react";
import { useAppSelector } from "@/app/hooks";
import { useCan, useHasRole } from "@/hooks/useCan";
import { ROLE_NAMES } from "@/config/role-names";
import { cn, formatDate } from "@/lib/utils";
import {
  useGetCandidateByIdQuery,
  useGetDocumentsQuery,
  useUploadDocumentMutation,
  useDeleteWorkExperienceMutation,
  useDeleteCandidateQualificationMutation,
} from "@/features/candidates";
import { useCreateDocumentMutation, useUpdateDocumentMutation } from "@/features/documents/api";
import { DOCUMENT_TYPE } from "@/constants/document-types";
import { useGetCandidateStatusPipelineQuery } from "@/services/candidatesApi";
import QualificationWorkExperienceModal from "@/components/molecules/QualificationWorkExperienceModal";
import { ImageViewer, DeleteConfirmationDialog } from "@/components/molecules";
import { StatusUpdateModal } from "../components/StatusUpdateModal";
import { UpdateJobPreferenceModal } from "../components/UpdateJobPreferenceModal";
import { UpdatePersonalInfoModal } from "../components/UpdatePersonalInfoModal";
import { UpdatePhysicalInfoModal } from "../components/UpdatePhysicalInfoModal";
import { UpdateLicensingModal } from "../components/UpdateLicensingModal";
import { StatusBadge } from "../components/StatusBadge";
import { OperationsReassignedHandoffBadge } from "@/components/molecules/OperationsReassignedHandoffBadge";
import { getCandidateOperationsState } from "../utils/operations-candidate";
import { buildPreferredRoleLabels } from "../utils/role-preference";
import {
  canRecruiterManageCandidatePipeline,
  getRecruiterLockedRnrBlockReason,
} from "../utils/recruiter-candidate-pipeline.util";
import type {
  CandidateQualification,
  WorkExperience,
} from "@/features/candidates/api";

// Tab Components
import { CandidateOverview } from "../components/tabs/CandidateOverview";
import { CandidateProjects } from "../components/tabs/CandidateProjects";
import { CandidateDocuments } from "../components/tabs/CandidateDocuments";
import { CandidateCollectionHistory } from "@/features/original-document-collections/components/CandidateCollectionHistory";
import { CandidateOfferLetterCard } from "../components/CandidateOfferLetterCard";
import { CandidateHistory } from "../components/tabs/CandidateHistory";
import { CandidateMetrics } from "../components/tabs/CandidateMetrics";
import { CandidateProfileCompletion } from "../components/CandidateProfileCompletion";
import { getPassportDocument, DOCUMENT_REPOSITORY_UPLOAD_TYPE } from "../profileCompletion";
const CandidateUploadDocumentModal = React.lazy(
  () => import("@/features/recruiter-docs/components/CandidateUploadDocumentModal")
);
const CandidatePipeline = React.lazy(() =>
  import("../components/CandidatePipeline").then((m) => ({
    default: m.CandidatePipeline,
  }))
);

// Fallback avatar used when candidate has no profileImage
const DEFAULT_PROFILE_IMAGE =
  "https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg";

export type CandidateDetailNavigateState = {
  activeTab?: string;
  uploadDocType?: string;
};

export default function CandidateDetailPage() { 
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [pendingUploadDocType, setPendingUploadDocType] = useState<string | null>(
    null
  );

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<
    "qualification" | "workExperience"
  >("qualification");

 


  const [editData, setEditData] = useState<
    CandidateQualification | WorkExperience | undefined
  >();
  const [editModalExistingDocs, setEditModalExistingDocs] = useState<any[]>([]);

  // Delete confirmation state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteItemType, setDeleteItemType] = useState<"qualification" | "workExperience" | null>(null);

  // Status update modal state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Job preference update modal state
  const [isJobPreferenceModalOpen, setIsJobPreferenceModalOpen] = useState(false);

  // Personal info update modal state
  const [isPersonalInfoModalOpen, setIsPersonalInfoModalOpen] = useState(false);

  // Physical info update modal state
  const [isPhysicalModalOpen, setIsPhysicalModalOpen] = useState(false);

  // Licensing update modal state
  const [isLicensingModalOpen, setIsLicensingModalOpen] = useState(false);

  // Work experience document upload (link to a specific work experience)
  const [isWorkExpDocModalOpen, setIsWorkExpDocModalOpen] = useState(false);
  const [targetWorkExperienceId, setTargetWorkExperienceId] = useState<string | undefined>(undefined);

  // Image viewer is provided by the reusable `ImageViewer` molecule (handles its own state)

  const hasOperationsRole = useHasRole(ROLE_NAMES.OPERATIONS);
  const hasLegacyCreRole = useHasRole("CRE");
  const isOperations = hasOperationsRole || hasLegacyCreRole;
  const canWriteCandidates = useCan("write:candidates") && !isOperations;
  const { user } = useAppSelector((state) => state.auth);
  const isRecruiterPipelineUser =
    user?.roles?.includes("Recruiter") ||
    user?.roles?.includes(ROLE_NAMES.AGENT_COORDINATOR);
  const isLeadership =
    user?.roles?.some((role) =>
      [
        "CEO",
        "Director",
        "Manager",
        "Recruiter Manager",
        "Team Head",
        "Team Lead",
        "Admin",
        "SuperAdmin",
        "System Admin",
      ].includes(role),
    ) ?? false;

  // Mutations
  const [deleteWorkExperience, { isLoading: isDeletingExp }] = useDeleteWorkExperienceMutation();
  const [deleteQualification, { isLoading: isDeletingQual }] = useDeleteCandidateQualificationMutation();
  const [uploadDocument, { isLoading: isUploadingDoc }] = useUploadDocumentMutation();
  const [createDocument, { isLoading: isCreatingDoc }] = useCreateDocumentMutation();
  const [updateDocument] = useUpdateDocumentMutation();

  // Fetch candidate data from API
  const {
    data: candidate,
    isLoading,
    isFetching: isCandidateFetching,
    error,
  } = useGetCandidateByIdQuery(id!, {
    skip: !id,
  });

  const { data: pipelineData } = useGetCandidateStatusPipelineQuery(id!, {
    skip: !id,
  });

  const { data: documentsData } = useGetDocumentsQuery(
    { candidateId: id!, page: 1, limit: 100 },
    { skip: !id }
  );

  const activityStats = candidate?.activitySnapshot;
  const isActivityStatsLoading = isLoading;
  const isActivityStatsFetching = isCandidateFetching;

  const passportDocument = getPassportDocument(
    documentsData?.data?.documents ?? []
  );

  const handleOpenPassportDocuments = () => {
    setActiveTab("documents");
    setPendingUploadDocType(DOCUMENT_REPOSITORY_UPLOAD_TYPE.passport);
  };

  useEffect(() => {
    const state = location.state as CandidateDetailNavigateState | null;
    if (!state) return;
    if (state.activeTab) {
      setActiveTab(state.activeTab);
    }
    if (state.uploadDocType) {
      setPendingUploadDocType(state.uploadDocType);
    }
  }, [location.key, location.state]);

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
    if (type === "workExperience") {
      const linked = (documentsData?.data?.documents ?? []).filter(
        (d: any) => d.workExperienceId === (data as WorkExperience).id
      );
      setEditModalExistingDocs(linked);
    } else {
      setEditModalExistingDocs([]);
    }
    setIsModalOpen(true);
  };

  const openDeleteConfirm = (id: string, type: "qualification" | "workExperience") => {
    setDeleteItemId(id);
    setDeleteItemType(type);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItemId || !deleteItemType) return;

    try {
      if (deleteItemType === "workExperience") {
        await deleteWorkExperience(deleteItemId).unwrap();
        toast.success("Work experience deleted successfully");
      } else {
        await deleteQualification(deleteItemId).unwrap();
        toast.success("Educational qualification deleted successfully");
      }
      setIsDeleteConfirmOpen(false);
      setDeleteItemId(null);
      setDeleteItemType(null);
    } catch (error) {
      toast.error(`Failed to delete ${deleteItemType === "workExperience" ? "work experience" : "educational qualification"}`);
      console.error("Delete error:", error);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditData(undefined);
    setEditModalExistingDocs([]);
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

  const operations = getCandidateOperationsState(candidate);
  const isRecruiterRnrStatusLocked =
    Boolean(
      candidate &&
        isRecruiterPipelineUser &&
        !isLeadership &&
        !isOperations &&
        canWriteCandidates &&
        !canRecruiterManageCandidatePipeline(candidate),
    );

  const handleStatusClick = () => {
    if (isRecruiterRnrStatusLocked) {
      toast.error(getRecruiterLockedRnrBlockReason());
      return;
    }
    setIsStatusModalOpen(true);
  };

  // isOnHold: check candidate status directly (instant, no waiting on pipeline)
  const isOnHold =
    !!candidate?.currentStatus?.statusName?.toLowerCase().includes("hold") ||
    candidate?.currentStatus?.statusName?.toLowerCase() === "backout";

  const isFuture =
    candidate?.currentStatus?.statusName?.toLowerCase() === "future";

  type Stat = {
    label: string;
    value: number;
    subtitle: string;
    icon: any;
    tab: "overview" | "projects" | "documents" | "history" | "metrics";
    accent: "emerald" | "blue" | "purple" | "orange";
  };

  const stats: Stat[] = [
    {
      label: "Overview",
      value:
        candidate.activitySnapshot?.profileCompletion ??
        candidate.profileCompletion?.percent ??
        0,
      subtitle: "Profile ready",
      icon: Target,
      tab: "overview",
      accent: "emerald",
    },
    {
      label: "Projects Assigned",
      value: candidate.activitySnapshot?.projectsAssigned ?? 0,
      subtitle: "Assigned tasks",
      icon: Briefcase,
      tab: "projects",
      accent: "blue",
    },
    {
      label: "Total Documents",
      value: documentsData?.data?.pagination?.total ?? 0,
      subtitle: "Verified files",
      icon: FileText,
      tab: "documents",
      accent: "purple",
    },
    {
      label: "Status History",
      value: candidate.activitySnapshot?.pipelineUpdates ?? 0,
      subtitle: "Status changes",
      icon: TrendingUp,
      tab: "history",
      accent: "orange",
    },
  ];

  const accentStyles: Record<
    Stat["accent"],
    { card: string; icon: string; iconBg: string; value: string; ring: string; dot: string }
  > = {
    emerald: { card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100", icon: "text-emerald-600", iconBg: "bg-emerald-100", value: "text-emerald-700", ring: "ring-emerald-400/50", dot: "bg-emerald-500" },
    blue:    { card: "from-blue-50 via-white to-blue-50/30 border-blue-100",       icon: "text-blue-600",    iconBg: "bg-blue-100",    value: "text-blue-700",    ring: "ring-blue-400/50",    dot: "bg-blue-500"    },
    purple:  { card: "from-purple-50 via-white to-purple-50/30 border-purple-100", icon: "text-purple-600",  iconBg: "bg-purple-100",  value: "text-purple-700",  ring: "ring-purple-400/50",  dot: "bg-purple-500"  },
    orange:  { card: "from-orange-50 via-white to-orange-50/30 border-orange-100", icon: "text-orange-600",  iconBg: "bg-orange-100",  value: "text-orange-700",  ring: "ring-orange-400/50",  dot: "bg-orange-500"  },
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

           <div className="flex items-center justify-between">
  
  {/* Candidate Name (LEFT) */}
  <div>
    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
      {candidate.firstName} {candidate.lastName}
    </h1>
    {candidate.candidateCode ? (
      <div className="mt-1 inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-sm font-bold text-red-700 font-mono border border-red-200">
        {candidate.candidateCode}
      </div>
    ) : null}
  </div>

  {/* Status (RIGHT - Clickable) */}
  <div
    onClick={handleStatusClick}
    className={cn(
      "group ml-4 mb-6",
      isRecruiterRnrStatusLocked ? "cursor-not-allowed" : "cursor-pointer",
    )}
    title={
      isRecruiterRnrStatusLocked
        ? getRecruiterLockedRnrBlockReason()
        : "Click to update status"
    }
  >
    {isOnHold ? (
      <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-3 shadow-sm transition-all duration-200 group-hover:shadow-md">
        <div className="flex flex-col items-start gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest leading-none text-amber-500">
            Status
          </span>
          <div className="scale-105 origin-left">
            <StatusBadge status={candidate.currentStatus?.statusName ?? "unknown"} />
          </div>
        </div>
        <div className="h-10 w-px bg-amber-200" />
        <div className="flex flex-col gap-1">
          {candidate.updatedAt && (
            <div className="flex items-center gap-2 opacity-70">
              <RefreshCw className="h-3.5 w-3.5 text-amber-500" aria-hidden />
              <span className="text-[10px] font-medium text-amber-600">
                Updated {formatDate(candidate.updatedAt)}
              </span>
            </div>
          )}
          {candidate.onHoldDuration != null && (
            <div className="flex items-center gap-2 opacity-80">
              <Clock className="h-3.5 w-3.5 text-amber-500" aria-hidden />
              <span className="text-[10px] font-medium text-amber-600">
                Duration: {candidate.onHoldDuration} day
                {candidate.onHoldDuration !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          {candidate.onHoldUntil && (
            <div className="flex items-center gap-2 opacity-80">
              <Calendar className="h-3.5 w-3.5 text-amber-500" aria-hidden />
              <span className="text-[10px] font-medium text-amber-600">
                Until: {formatDate(candidate.onHoldUntil)}
              </span>
            </div>
          )}
        </div>
      </div>
    ) : isFuture ? (
      <div className="flex items-center gap-4 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-5 py-3 shadow-sm transition-all duration-200 group-hover:shadow-md">
        <div className="flex flex-col items-start gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest leading-none text-indigo-500">
            Status
          </span>
          <div className="scale-105 origin-left">
            <StatusBadge status={candidate.currentStatus?.statusName ?? "unknown"} />
          </div>
        </div>
        <div className="h-10 w-px bg-indigo-200" />
        <div className="flex flex-col gap-1">
          {candidate.updatedAt && (
            <div className="flex items-center gap-2 opacity-70">
              <RefreshCw className="h-3.5 w-3.5 text-indigo-500" aria-hidden />
              <span className="text-[10px] font-medium text-indigo-600">
                Updated {formatDate(candidate.updatedAt)}
              </span>
            </div>
          )}
          {candidate.futureDate && (
            <div className="flex items-center gap-2 opacity-80">
              <Calendar className="h-3.5 w-3.5 text-indigo-500" aria-hidden />
              <span className="text-[10px] font-medium text-indigo-600">
                Available: {formatDate(candidate.futureDate)}
              </span>
            </div>
          )}
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-4 rounded-2xl border border-transparent px-4 py-2.5 transition-all duration-200 group-hover:border-slate-200 group-hover:bg-slate-50/80 group-hover:shadow-sm">
        <span className="ml-1 text-md font-bold uppercase tracking-widest leading-none text-slate-400">
          Status
        </span>
        <StatusBadge
          size="lg"
          status={candidate.currentStatus?.statusName ?? "unknown"}
        />
      </div>
    )}
  </div>

</div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* <span className="text-sm text-slate-500">
              {candidate.currentRole || "No role specified"}
            </span> */}
            <span className="text-sm text-slate-400">
              Added {formatDate(candidate.createdAt)}
            </span>
            {candidate.createdBy && (
              <div className="flex items-center gap-2 bg-blue-50/50 px-2.5 py-1 rounded-full border border-blue-100/50">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Created By:</span>
                <span className="text-xs font-semibold text-blue-700">{candidate.createdBy.name}</span>
                <span className="text-[10px] text-blue-400 font-medium">({candidate.createdBy.email})</span>
              </div>
            )}
            {operations.isOperationsReassigned && (
              <OperationsReassignedHandoffBadge
                note={operations.operationsStatusNote}
                operationsStatus={operations.operationsStatusName}
                candidateName={`${candidate.firstName} ${candidate.lastName}`}
              />
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0 self-start">
          <CandidateProfileCompletion
            candidate={candidate}
            documents={documentsData?.data?.documents}
            variant="circular"
            onNavigateToOverview={() => setActiveTab("overview")}
          />
        </div>
        {/* <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {canManageCandidates && (
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div> */}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const s = accentStyles[stat.accent];
          const isActive = activeTab === stat.tab;
          return (
            <motion.button
              key={i}
              type="button"
              onClick={() => setActiveTab(stat.tab)}
              className={cn(
                "group relative text-left rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-200 focus:outline-none",
                s.card,
                isActive ? `ring-2 shadow-md ${s.ring}` : "hover:-translate-y-0.5 hover:shadow-md"
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              {isActive && (
                <span className={cn("absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse", s.dot)} />
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {stat.label}
                  </p>
                  <p className={cn("text-3xl font-bold tabular-nums", s.value)}>
                    {stat.label === "Overview" ? `${stat.value}%` : stat.value}
                  </p>
                  <p className="text-xs text-slate-500">{stat.subtitle}</p>
                </div>
                <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
                  <Icon className={cn("h-5 w-5", s.icon)} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                <span>{isActive ? "Viewing now" : "Click to open"}</span>
                <ArrowUpRight className="h-3 w-3" />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        {/* <TabsList className="grid w-full grid-cols-2 gap-1 md:grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList> */}

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <CandidateOverview
            candidate={candidate}
            isCandidateLoading={isLoading}
            canWriteCandidates={canWriteCandidates}
            openAddModal={openAddModal}
            openEditModal={openEditModal}
            onDeleteWorkExperience={(id) => openDeleteConfirm(id, "workExperience")}
            onDeleteQualification={(id) => openDeleteConfirm(id, "qualification")}
            onEditJobPreferences={() => setIsJobPreferenceModalOpen(true)}
            onEditPersonalInfo={() => setIsPersonalInfoModalOpen(true)}
            onEditPhysicalInfo={() => setIsPhysicalModalOpen(true)}
            onEditLicensing={() => setIsLicensingModalOpen(true)}
            workExperienceDocs={documentsData?.data?.documents ?? []}
            passportDocument={passportDocument}
            onOpenPassportDocuments={handleOpenPassportDocuments}
            activityStats={activityStats}
            isActivityStatsLoading={isActivityStatsLoading}
            isActivityStatsFetching={isActivityStatsFetching}
            onNavigateToTab={setActiveTab}
          />

          {pipelineData?.data?.pipeline && pipelineData.data.pipeline.length > 0 ? (
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="text-slate-900">Candidate Pipeline</CardTitle>
                <CardDescription className="text-slate-600">
                  Status progression for this candidate
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <React.Suspense
                  fallback={
                    <div
                      className="flex justify-center py-8"
                      role="status"
                      aria-label="Loading status pipeline"
                    >
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  }
                >
                  <CandidatePipeline pipeline={pipelineData.data.pipeline} />
                </React.Suspense>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <DeleteConfirmationDialog
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={handleDeleteConfirm}
          title={deleteItemType === "workExperience" ? "Work Experience" : "Educational Qualification"}
          itemType={deleteItemType === "workExperience" ? "work experience entry" : "qualification entry"}
          isLoading={isDeletingExp || isDeletingQual}
          description={`Are you sure you want to delete this ${deleteItemType === "workExperience" ? "work experience" : "educational qualification"}? This action cannot be undone.`}
        />

        {/* Projects Tab - Optimized with independent API call */}
        <TabsContent value="projects" className="space-y-6">
          <CandidateProjects
            candidateId={id!}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <CandidateCollectionHistory candidateId={id!} />
          <CandidateOfferLetterCard
            candidateId={id!}
            candidateName={`${candidate?.firstName ?? ""} ${candidate?.lastName ?? ""}`.trim()}
          />
          <CandidateDocuments
            candidateId={id!}
            candidatePassportNumber={candidate?.passportNumber}
            initialUploadDocType={pendingUploadDocType}
            onInitialUploadDocTypeHandled={() => setPendingUploadDocType(null)}
          />
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
        existingDocuments={editModalExistingDocs}
        onSuccess={handleModalSuccess}
      />

      {/* Work experience certificate upload modal */}
      <React.Suspense fallback={null}>
        <CandidateUploadDocumentModal
          isOpen={isWorkExpDocModalOpen}
          initialDocType={DOCUMENT_TYPE.EXPERIENCE_LETTERS}
          initialWorkExperienceId={targetWorkExperienceId}
          workExperiences={candidate?.workExperiences}
          isUploading={isUploadingDoc || isCreatingDoc}
          onClose={() => {
            setIsWorkExpDocModalOpen(false);
            setTargetWorkExperienceId(undefined);
          }}
          onUpload={async (file, meta) => {
            try {
              const candidateId = id!;
              const formData = new FormData();
              formData.append("file", file);
              formData.append("docType", meta.docType);
              if (meta.roleCatalogId) {
                formData.append("roleCatalogId", meta.roleCatalogId);
              }
              if (meta.workExperienceId) {
                formData.append("workExperienceId", meta.workExperienceId);
              }
              if (meta.docName) {
                formData.append("docName", meta.docName);
              }
              if (meta.documentNumber) {
                formData.append("documentNumber", meta.documentNumber);
              }
              if (meta.expiryDate) {
                formData.append("expiryDate", meta.expiryDate);
              }
              if (meta.notes) {
                formData.append("notes", meta.notes);
              }

              const uploadResp = await uploadDocument({ candidateId, formData }).unwrap();
              const uploadData: any = uploadResp.data;
              const uploadedDocument =
                uploadData?.document && uploadData.document.id
                  ? uploadData.document
                  : uploadData?.id
                    ? uploadData
                    : null;

              const desiredDocName =
                (meta.docName && meta.docName.trim()) || "";

              if (uploadedDocument?.id) {
                await updateDocument({
                  id: uploadedDocument.id,
                  docName: desiredDocName || undefined,
                  documentNumber: meta.documentNumber,
                  expiryDate: meta.expiryDate
                    ? new Date(meta.expiryDate).toISOString()
                    : undefined,
                  notes: meta.notes,
                }).unwrap();
              } else {
                await createDocument({
                  candidateId,
                  docType: meta.docType,
                  docName: desiredDocName || undefined,
                  fileName: uploadData.fileName,
                  fileUrl: uploadData.fileUrl,
                  fileSize: uploadData.fileSize,
                  mimeType: uploadData.mimeType,
                  notes: meta.notes,
                  documentNumber: meta.documentNumber,
                  expiryDate: meta.expiryDate ? new Date(meta.expiryDate).toISOString() : undefined,
                  roleCatalogId: meta.roleCatalogId,
                  workExperienceId: meta.workExperienceId,
                }).unwrap();
              }

              toast.success("Experience certificate uploaded and linked");
              setIsWorkExpDocModalOpen(false);
              setTargetWorkExperienceId(undefined);
            } catch (e) {
              console.error(e);
              toast.error("Failed to upload experience certificate");
            }
          }}
        />
      </React.Suspense>

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
          professionTypeName: candidate.professionType?.name,
          expectedMinSalary: candidate.expectedMinSalary,
          sectorType: candidate.sectorType,
          visaType: candidate.visaType,
          preferredCountries: candidate.preferredCountries?.map(pc => pc.country.code),
          facilityPreferences: candidate.facilityPreferences?.map(fp => fp.facilityType),
          preferredRoles: candidate.rolePreferences?.map(rp => rp.roleCatalogId),
          preferredRoleLabels: buildPreferredRoleLabels(candidate.rolePreferences),
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
          professionTypeId: candidate.professionTypeId ?? candidate.professionType?.id,
          addressCountryCode: candidate.addressCountryCode,
          addressStateId: candidate.addressStateId,
          address: candidate.address,
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
          religionId: candidate.religionId ?? candidate.religion?.id,
        }}
      />

      {/* Licensing update modal */}
      <UpdateLicensingModal
        isOpen={isLicensingModalOpen}
        onClose={() => setIsLicensingModalOpen(false)}
        candidateId={id!}
        initialData={{
          licensingExam: candidate.licensingExam,
          dataFlow: candidate.dataFlow,
          eligibility: candidate.eligibility,
          eligibilityNumber: candidate.eligibilityNumber,
        }}
      />

    </div>
  );
}
