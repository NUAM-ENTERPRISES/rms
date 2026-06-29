import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ProjectStatus } from "@/entities/project/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    AlertCircle,
    FileText,
    User,
    Building,
    Calendar,
    Mail,
    Phone,
    Users,
    Upload,
    Search,
    ShieldCheck,
    ThumbsUp,
    MessageCircle,
    Award,
    ClipboardList,
    Luggage,
    XCircle,
    PauseCircle,
    Hash,
    Settings2,
    History,
    Sparkles,
    Trophy,
    Plane,
    BookOpen,
} from "lucide-react";
import { JSX, useRef, useEffect, useState } from "react";
import { Player } from '@lottiefiles/react-lottie-player';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';


import { useGetCandidateProjectPipelineQuery } from "@/features/candidates/api";
import { calculateProgress as calculateProgressUtil, getMostRecentEntry as getMostRecentEntryUtil, normalizeStatusName as normalizeStatusNameUtil, getNextProgressStatus, mapToProgressKey } from "@/features/candidates/utils/progress";
import { ProjectStatusUpdateModal } from "@/features/candidates/components/ProjectStatusUpdateModal";
import { PendingStatusChangeRequestBanner } from "@/features/candidates/components/PendingStatusChangeRequestBanner";
import { RequesterPendingStatusBanner } from "@/features/candidates/components/RequesterPendingStatusBanner";
import { ReviewedStatusChangeRequestBanner } from "@/features/candidates/components/ReviewedStatusChangeRequestBanner";
import { StatusChangeRequestHistoryModal } from "@/features/candidates/components/StatusChangeRequestHistoryModal";
import { PipelineBlockedBanner } from "@/features/candidates/components/PipelineBlockedBanner";
import {
    STATUS_CHANGE_APPROVER_ROLES,
    STATUS_CHANGE_DIRECT_ROLES,
} from "@/features/candidates/utils/candidateProjectPipelineBlocked";
import { useCan } from "@/hooks/useCan";
import { usePermissions } from "@/shared/hooks/usePermissions";

// Extended type for API response with additional fields
interface ExtendedPipelineResponse {
    candidateProjectMapId?: string;
    isPipelineBlocked?: boolean;
    pipelineBlockedReason?: string | null;
    processingConflict?: {
        projectId: string;
        projectTitle: string;
    } | null;
    pipelineBlockedOnThisProject?: boolean;
    previousMainStatus?: {
        id: string;
        name: string;
        label: string;
    } | null;
    previousSubStatus?: {
        id: string;
        name: string;
        label: string;
    } | null;
    statusBlockedAt?: string | null;
    currentStatus?: {
        mainStatus?: { id: string; name: string; label: string; color?: string };
        subStatus?: { id: string; name: string; label: string; color?: string };
        timeInStatus?: string;
    };
    pendingStatusChangeRequest?: {
        id: string;
        requestType: "block" | "reactivate";
        requestedStatus?: "withdrawn" | "on_hold";
        reason: string;
        createdAt: string;
        requester?: { id: string; name: string; email?: string };
    } | null;
    latestReviewedStatusChangeRequest?: {
        id: string;
        requestType: "block" | "reactivate";
        requestedStatus?: "withdrawn" | "on_hold";
        reason: string;
        status: "approved" | "rejected";
        createdAt: string;
        reviewedAt?: string | null;
        reviewNotes?: string | null;
        requester?: { id: string; name: string; email?: string };
        reviewer?: { id: string; name: string; email?: string };
    } | null;
    candidate: any;
    project: any;
    nominatedRole?: any;
    currentStatus?: any;
    pipeline?: {
        progressOrder?: Array<{
            order: number;
            name: string;
            label: string;
            isCompleted: boolean;
            isCurrent: boolean;
        }>;
        applicationProgress?: number;
        duration?: string;
        nextStep?: {
            name: string;
            label: string;
            type: string;
        };
    };
    history: any[];
    totalEntries: number;
}

export default function CandidateProjectDetailsPage() {

    const { candidateId, projectId } = useParams() as { candidateId: string; projectId: string };
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const lottieRef = useRef<Player>(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const { hasRole, user } = usePermissions();
    const canManageCandidateProjects = useCan("manage:candidates");

    // Add null checks before using the hook
    const { data: pipelineResponse, error, isLoading } = useGetCandidateProjectPipelineQuery(
        candidateId && projectId
            ? { candidateId, projectId }
            : { candidateId: '', projectId: '' },
        { skip: !candidateId || !projectId }
    );

    // Status icons mapping
    const getStatusIcon = (statusName?: string) => {
        const icons: Record<string, JSX.Element> = {
            // Nominated
            nominated: <Users className="h-4 w-4" />,
            nominated_initial: <Users className="h-4 w-4" />,

            // Documents
            pending_documents: <Clock className="h-4 w-4" />,
            documents_submitted: <Upload className="h-4 w-4" />,
            verification_in_progress: <Search className="h-4 w-4" />,
            verification_in_progress_document: <Search className="h-4 w-4" />,
            documents_verified: <ShieldCheck className="h-4 w-4" />,
            documents_re_submission_requested: <AlertCircle className="h-4 w-4" />,
            submitted_to_client: <FileText className="h-4 w-4" />,
            approved: <ThumbsUp className="h-4 w-4" />,

            // Interview flow
            shortlisted: <ThumbsUp className="h-4 w-4" />,
            not_shortlisted: <XCircle className="h-4 w-4" />,
            interview_assigned: <Calendar className="h-4 w-4" />,
            interview_scheduled: <Calendar className="h-4 w-4" />,
            interview_rescheduled: <Calendar className="h-4 w-4" />,
            interview_completed: <MessageCircle className="h-4 w-4" />,
            interview_passed: <Award className="h-4 w-4" />,
            interview_failed: <XCircle className="h-4 w-4" />,
            interview_backout: <PauseCircle className="h-4 w-4" />,
            interview_selected: <CheckCircle2 className="h-4 w-4" />,

            // Screenings (formerly Mock Interview)
            screening_assigned: <Calendar className="h-4 w-4" />,
            screening_scheduled: <Calendar className="h-4 w-4" />,
            screening_completed: <MessageCircle className="h-4 w-4" />,
            screening_passed: <Award className="h-4 w-4" />,
            screening_failed: <XCircle className="h-4 w-4" />,

            // Training
            training_assigned: <ClipboardList className="h-4 w-4" />,
            training_scheduled: <Calendar className="h-4 w-4" />,
            training_in_progress: <Clock className="h-4 w-4" />,
            training_completed: <CheckCircle2 className="h-4 w-4" />,
            ready_for_reassessment: <Clock className="h-4 w-4" />,

            // Processing
            transfered_to_processing: <ClipboardList className="h-4 w-4" />,
            processing_in_progress: <Clock className="h-4 w-4" />,
            processing_completed: <CheckCircle2 className="h-4 w-4" />,
            processing_cancelled: <XCircle className="h-4 w-4" />,
            ready_for_final: <CheckCircle2 className="h-4 w-4" />,

            // Final/Selection
            selected: <CheckCircle2 className="h-4 w-4" />,
            processing: <ClipboardList className="h-4 w-4" />,
            hired: <Trophy className="h-4 w-4" />,

            // Processing extra
            processing_hold: <PauseCircle className="h-4 w-4" />,
            client_revision_requested: <AlertCircle className="h-4 w-4" />,
            screening_needs_training: <BookOpen className="h-4 w-4" />,
            screening_on_hold: <PauseCircle className="h-4 w-4" />,

            // Rejected / Withdrawn / Misc
            rejected_documents: <XCircle className="h-4 w-4" />,
            rejected_interview: <XCircle className="h-4 w-4" />,
            rejected_selection: <XCircle className="h-4 w-4" />,
            withdrawn: <PauseCircle className="h-4 w-4" />,
            on_hold: <PauseCircle className="h-4 w-4" />
        };
        const key = statusName?.toLowerCase() || '';
        return icons[key] || icons[key.replace(/\s+/g, '_')] || <FileText className="h-4 w-4" />;
    };

    // Status color mapping
    const getStatusColor = (statusName: string) => {
        const colors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
            // Nominated
            nominated: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
            nominated_initial: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },

            // Documents
            pending_documents: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
            documents_submitted: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
            verification_in_progress: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
            verification_in_progress_document: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
            documents_verified: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
            documents_re_submission_requested: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
            submitted_to_client: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
            approved: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },

            // Interview flow
            shortlisted: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
            not_shortlisted: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
            interview_assigned: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
            interview_scheduled: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
            interview_rescheduled: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
            interview_completed: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
            interview_passed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
            interview_failed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
            interview_backout: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' },
            interview_selected: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },

            // Screenings
            screening_assigned: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
            screening_scheduled: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
            screening_completed: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
            screening_passed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
            screening_failed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },

            // Training
            training_assigned: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
            training_scheduled: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
            training_in_progress: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
            training_completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
            ready_for_reassessment: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },

            // Processing
            transfered_to_processing: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
            processing_in_progress: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
            processing_completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
            processing_cancelled: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
            processing_hold: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
            ready_for_final: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
            client_revision_requested: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
            screening_needs_training: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
            screening_on_hold: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },

            // Final / selection
            selected: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
            processing: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
            hired: { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700', dot: 'bg-emerald-400' },

            // Rejections / Withdrawn / Misc
            rejected_documents: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
            rejected_interview: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
            rejected_selection: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
            withdrawn: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' },
            on_hold: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' }
        };
        const key = statusName?.toLowerCase() || '';
        return colors[key] || colors[key.replace(/\s+/g, '_')] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' };
    };

    // Status label mapping
    const getStatusLabel = (statusName: string) => {
        const labels: Record<string, string> = {
            nominated: 'Nominated',
            nominated_initial: 'Initial Nomination',
            pending_documents: 'Pending Documents',
            documents_submitted: 'Documents Submitted',
            verification_in_progress: 'Verification In Progress',
            verification_in_progress_document: 'Verifying Documents',
            documents_verified: 'Documents Verified',
            documents_re_submission_requested: 'Re-submission Requested',
            submitted_to_client: 'Submitted to Client',
            approved: 'Approved',
            shortlisted: 'Shortlisted',
            not_shortlisted: 'Not Shortlisted',
            interview_assigned: 'Interview Assigned',
            interview_scheduled: 'Interview Scheduled',
            interview_rescheduled: 'Interview Rescheduled',
            interview_completed: 'Interview Completed',
            interview_passed: 'Interview Passed',
            interview_failed: 'Interview Failed',
            interview_backout: 'Interview Backout',
            screening_assigned: 'Screening Assigned',
            screening_scheduled: 'Screening Scheduled',
            screening_completed: 'Screening Completed',
            screening_passed: 'Screening Passed',
            screening_failed: 'Screening Failed',
            training_assigned: 'Training Assigned',
            training_scheduled: 'Training Scheduled',
            training_in_progress: 'Training In Progress',
            training_completed: 'Training Completed',
            ready_for_reassessment: 'Ready For Reassessment',
            interview_selected: 'Interview Selected',
            transfered_to_processing: 'Transferred to Processing',
            processing_in_progress: 'Processing In Progress',
            processing_completed: 'Processing Completed',
            processing_cancelled: 'Processing Cancelled',
            ready_for_final: 'Ready For Final',
            selected: 'Selected',
            processing: 'Processing',
            hired: 'Hired',
            rejected_documents: 'Rejected - Documents',
            rejected_interview: 'Rejected - Interview',
            rejected_selection: 'Rejected - Selection',
            withdrawn: 'Withdrawn',
            on_hold: 'On Hold'
        };
        const key = statusName?.toLowerCase() || '';
        return labels[key] || labels[key.replace(/\s+/g, '_')] || statusName;
    };

    // Format date
    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // use the shared normalization helper

    // Returns the most recent project status name from history (normalized)
    const getLatestProjectStatusName = (): string | undefined => {
        const history = pipelineResponse?.data?.history;
        if (!history || history.length === 0) return undefined;
        const latest = getMostRecentEntryUtil(history);
        // normalize -> then map to canonical progress key so UI comparisons are stable
        const raw = normalizeStatusNameUtil(latest);
        return raw ? mapToProgressKey(raw) : undefined;
    };

    // Calculate progress using the shared helper (includes all interview sub-statuses)
    const calculateProgress = () => {
        const history = pipelineResponse?.data?.history || [];
        const { progress } = calculateProgressUtil(history);
        return progress;
    };

    // Calculate data for rendering
    const history = pipelineResponse?.data?.history || [];
    // Cast to extended type to access additional API fields
    const extendedData = pipelineResponse?.data as ExtendedPipelineResponse | undefined;
    const pipelineData = extendedData; // Alias for convenience
    const isPipelineBlocked = extendedData?.isPipelineBlocked ?? false;
    const pipelineBlockedOnThisProject =
        extendedData?.pipelineBlockedOnThisProject ?? false;
    const pendingStatusChangeRequest = extendedData?.pendingStatusChangeRequest ?? null;
    const latestReviewedStatusChangeRequest =
        extendedData?.latestReviewedStatusChangeRequest ?? null;
    const candidateProjectMapId =
        extendedData?.candidateProjectMapId ??
        history.find((entry) => entry?.candidateProjectMapId)?.candidateProjectMapId ??
        "";
    const canApproveStatusChange = hasRole([...STATUS_CHANGE_APPROVER_ROLES]);
    const canDirectApplyStatusChange = hasRole([...STATUS_CHANGE_DIRECT_ROLES]);
    const isRequester =
        pendingStatusChangeRequest?.requester?.id === user?.id ||
        latestReviewedStatusChangeRequest?.requester?.id === user?.id;
    // Allow status change requests for both active and blocked candidates
    // - Active: can request to block (Withdrawn/On Hold)
    // - Blocked: can request to reactivate or change blocked status
    const canRequestStatusChange =
        canManageCandidateProjects &&
        !pendingStatusChangeRequest &&
        !pipelineBlockedOnThisProject;
    const canViewStatusChangeHistory =
        Boolean(candidateProjectMapId) &&
        (canManageCandidateProjects || canApproveStatusChange);
    const showReviewedStatusBanner =
        !pendingStatusChangeRequest &&
        latestReviewedStatusChangeRequest &&
        (isRequester ||
            canManageCandidateProjects ||
            canApproveStatusChange);
    const statusRequestParam = searchParams.get("statusRequest");
    const shouldExpandPendingBanner =
        Boolean(statusRequestParam) &&
        pendingStatusChangeRequest?.id === statusRequestParam;
    const candidateFullName = `${pipelineResponse?.data?.candidate?.firstName ?? ""} ${pipelineResponse?.data?.candidate?.lastName ?? ""}`.trim();
    const projectTitle = pipelineResponse?.data?.project?.title ?? "Project";
    // most-recent raw entry (used for display label) — keep canonical progress separate
    const latestEntry = getMostRecentEntryUtil(history);
    const projectDeadline = pipelineResponse?.data?.project?.deadline;
    // Use API's applicationProgress if available, otherwise calculate locally
    const progress = extendedData?.pipeline?.applicationProgress ?? calculateProgress();
    const latestProjectStatusName = getLatestProjectStatusName();
    const isHired = latestProjectStatusName === 'hired' || extendedData?.currentStatus?.subStatus?.name === 'hired';
    const latestDisplayLabel = (() => {
        // Prefer explicit human-friendly labels from API
        if (latestEntry?.subStatus?.label) return latestEntry.subStatus.label;
        if (latestEntry?.mainStatus?.label) return latestEntry.mainStatus.label;

        // If labels not provided, normalize the entry and map to a friendly label
        const normalized = normalizeStatusNameUtil(latestEntry);
        if (normalized) return getStatusLabel(normalized);

        // Fallback to any raw snapshot or project status name
        return latestEntry?.subStatusSnapshot || latestEntry?.mainStatusSnapshot || latestEntry?.projectStatus?.statusName || undefined;
    })();
    const sortedHistory = [...history].reverse();

    // Play lottie animation when progress changes
    useEffect(() => {
        if (lottieRef.current && !isLoading && !error) {
            lottieRef.current.play();
        }
    }, [progress, isLoading, error]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading pipeline...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
                        <p className="text-gray-600">Unable to load candidate pipeline information.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className={`min-h-screen w-full transition-colors duration-500 ${isHired ? 'bg-emerald-50/60' : 'bg-gray-50'}`}>
            <div className="w-full">
                {/* Hired Celebration Banner */}
                {isHired && (
                    <div className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 shadow-xl shadow-emerald-500/20">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.15),transparent_60%)]" />
                        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
                        <div className="absolute -right-4 -bottom-6 h-24 w-24 rounded-full bg-white/10" />
                        <div className="relative flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-sm">
                                    <Trophy className="h-8 w-8 text-yellow-300 drop-shadow" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-2xl font-black text-white">{candidateFullName}</h2>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-0.5 text-xs font-black text-white uppercase tracking-widest">
                                            <Sparkles className="h-3 w-3" /> Hired
                                        </span>
                                    </div>
                                    <p className="text-emerald-100 font-medium">Successfully hired for <span className="font-black text-white">{projectTitle}</span></p>
                                </div>
                            </div>
                            <Plane className="h-12 w-12 text-white/20 hidden sm:block shrink-0" />
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => navigate(-1)}
                            className={`rounded-lg w-9 h-9 p-0 ${isHired ? 'border-emerald-300 hover:bg-emerald-50' : ''}`}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className={`text-2xl font-bold ${isHired ? 'text-emerald-900' : 'text-gray-900'}`}>Candidate Project Pipeline</h1>
                            <p className={`text-sm ${isHired ? 'text-emerald-700' : 'text-gray-600'}`}>Tracking candidate progress through project stages</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {canRequestStatusChange && candidateProjectMapId && (
                            <Button
                                type="button"
                                onClick={() => setIsStatusModalOpen(true)}
                                className="gap-2"
                            >
                                <Settings2 className="h-4 w-4" />
                                Project Updates
                            </Button>
                        )}
                        {canViewStatusChangeHistory && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsHistoryModalOpen(true)}
                                className="gap-2"
                            >
                                <History className="h-4 w-4" />
                                Request History
                            </Button>
                        )}
                    </div>
                </div>

                <div className="mb-6 space-y-4">
                    {pendingStatusChangeRequest && isRequester && (
                        <RequesterPendingStatusBanner
                            request={pendingStatusChangeRequest}
                        />
                    )}
                    {canApproveStatusChange && pendingStatusChangeRequest && !isRequester && candidateId && projectId && (
                        <PendingStatusChangeRequestBanner
                            request={pendingStatusChangeRequest}
                            candidateId={candidateId}
                            projectId={projectId}
                            candidateProjectMapId={candidateProjectMapId}
                            projectTitle={projectTitle}
                            countryName={
                                pipelineResponse?.data?.project?.country?.name ??
                                pipelineResponse?.data?.project?.countryCode
                            }
                            projectCountryCode={
                                pipelineResponse?.data?.project?.countryCode ??
                                pipelineResponse?.data?.project?.country?.code
                            }
                            currentStatus={pipelineData?.currentStatus?.mainStatus?.name}
                            previousStatus={pipelineData?.previousMainStatus}
                            defaultExpanded={shouldExpandPendingBanner}
                        />
                    )}
                    {showReviewedStatusBanner && latestReviewedStatusChangeRequest && (
                        <ReviewedStatusChangeRequestBanner
                            request={latestReviewedStatusChangeRequest}
                        />
                    )}
                    {isPipelineBlocked && (
                        <PipelineBlockedBanner
                            mainStatusName={extendedData?.currentStatus?.mainStatus?.name}
                            pipelineBlockedReason={extendedData?.pipelineBlockedReason}
                            pipelineBlockedOnThisProject={pipelineBlockedOnThisProject}
                        />
                    )}
                </div>

                {candidateProjectMapId && candidateId && projectId && (
                    <>
                        <ProjectStatusUpdateModal
                            open={isStatusModalOpen}
                            onOpenChange={setIsStatusModalOpen}
                            candidateProjectMapId={candidateProjectMapId}
                            candidateId={candidateId}
                            projectId={projectId}
                            candidateName={candidateFullName}
                            projectName={projectTitle}
                            canDirectApply={canDirectApplyStatusChange}
                            currentMainStatus={pipelineData?.currentStatus?.mainStatus?.name}
                            previousStatus={pipelineData?.previousMainStatus}
                        />
                        <StatusChangeRequestHistoryModal
                            isOpen={isHistoryModalOpen}
                            onClose={() => setIsHistoryModalOpen(false)}
                            candidateProjectMapId={candidateProjectMapId}
                            candidateName={candidateFullName}
                            projectTitle={projectTitle}
                        />
                    </>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Pipeline Section */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Advanced Progress Summary */}
                        <Card className={`shadow-lg border-0 transition-all duration-500 ${isHired ? 'bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-200' : 'bg-gradient-to-br from-white to-gray-50'}`}>
                            <CardContent className="p-6">
                                {/* Header Section */}
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`p-2 rounded-lg ${getStatusColor(latestProjectStatusName || '').bg} ${getStatusColor(latestProjectStatusName || '').border} border-2`}>
                                                {getStatusIcon(latestProjectStatusName)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-xl">Application Progress</h3>
                                                <p className="text-gray-500 text-xs mt-0.5">Track your candidate's journey</p>
                                            </div>
                                        </div>
                                    </div>
                                    <Badge className={`${getStatusColor(latestProjectStatusName || '').bg} ${getStatusColor(latestProjectStatusName || '').text} border-2 ${getStatusColor(latestProjectStatusName || '').border} px-4 py-2 text-sm font-bold shadow-sm`}>
                                        {progress}% Complete
                                    </Badge>
                                </div>

                                {/* Current Status Display */}
                                <div className={`${getStatusColor(latestProjectStatusName || '').bg} border-2 ${getStatusColor(latestProjectStatusName || '').border} rounded-xl p-5 mb-6 shadow-sm`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl bg-white shadow-sm border ${getStatusColor(latestProjectStatusName || '').border}`}>
                                                {getStatusIcon(latestProjectStatusName)}
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Current Pipeline Status</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className={`${getStatusColor(latestProjectStatusName || '').text} font-black text-xl leading-none`}>
                                                        {latestDisplayLabel ? latestDisplayLabel : (latestProjectStatusName ? getStatusLabel(latestProjectStatusName) : 'N/A')}
                                                    </p>
                                                    <div className={`w-2 h-2 rounded-full ${getStatusColor(latestProjectStatusName || '').dot} animate-pulse`}></div>
                                                </div>
                                            </div>
                                        </div>
                                        {sortedHistory.length > 0 && (
                                            <div className="text-right bg-white/40 px-3 py-1.5 rounded-lg border border-white/50">
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Last Activity</p>
                                                <p className="text-sm font-bold text-gray-700 mt-0.5 whitespace-nowrap">
                                                    {new Date(sortedHistory[0].statusChangedAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Progress Bar with Lottie Airplane Animation */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-gray-700">Progress</span>
                                        <span className="font-bold text-gray-900">{progress}%</span>
                                    </div>

                                    {/* Enhanced Progress Bar with Lottie Airplane */}
                                    <div className="relative">
                                        {/* Progress Bar Background */}
                                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${getStatusColor(latestProjectStatusName || '').dot} transition-all duration-1000 ease-out rounded-full relative`}
                                                style={{ width: `${progress}%` }}
                                            >
                                                <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                                            </div>
                                        </div>

                                        {/* Lottie Airplane positioned according to progress */}
                                        <div
                                            className="absolute top-0 transform -translate-y-1/2 transition-all duration-1000 ease-out"
                                            style={{ left: `calc(${progress}% - 80px)` }}
                                        >
                                            <div className="relative w-[130px] h-[150px]">
                                                <DotLottieReact
                                                    src="https://lottie.host/059d48f3-3d30-41a0-bffb-3f5e9680c9ff/iTt1pDCekJ.lottie"
                                                    loop
                                                    autoplay
                                                />
                                                {/* Flying trail effect */}
                                                <div className="absolute -left-6 top-1/2 w-6 h-2 bg-blue-400 opacity-40 rounded-full blur-sm"></div>
                                            </div>
                                        </div>

                                        {/* Runway Markers */}
                                        <div className="absolute top-0 left-0 right-0 flex justify-between px-1">
                                            {[0, 25, 50, 75, 100].map((milestone) => (
                                                <div
                                                    key={milestone}
                                                    className={`w-1 h-3 rounded-full ${progress >= milestone ? getStatusColor(latestProjectStatusName || '').dot : 'bg-gray-300'} transition-colors duration-500`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Stage Indicators - Dynamic from API */}
                                <div className="grid gap-2 mt-6" style={{ gridTemplateColumns: `repeat(${extendedData?.pipeline?.progressOrder?.length || 5}, minmax(0, 1fr))` }}>
                                    {(extendedData?.pipeline?.progressOrder || [
                                        { name: 'nominated', label: 'Nominated' },
                                        { name: 'documents', label: 'Documents' },
                                        { name: 'interview', label: 'Interview' },
                                        { name: 'processing', label: 'Processing' },
                                        { name: 'final', label: 'Final' }
                                    ]).map((stage: any) => {
                                        const isActive = stage.isCurrent;
                                        const isPassed = stage.isCompleted;

                                        // Icon mapping based on stage name
                                        const iconMap: Record<string, any> = {
                                            nominated: Users,
                                            documents: FileText,
                                            interview: MessageCircle,
                                            processing: ClipboardList,
                                            final: CheckCircle2,
                                            selection: Award
                                        };
                                        const StageIcon = iconMap[stage.name] || FileText;

                                        // Use global getStatusColor for dynamic staging if is current
                                        const stageColors = isActive
                                            ? getStatusColor(latestProjectStatusName || stage.name)
                                            : isPassed
                                                ? { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' }
                                                : { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-100', dot: 'bg-gray-200' };

                                        return (
                                            <div
                                                key={stage.name}
                                                className={`relative rounded-xl p-3 text-center transition-all duration-300 group ${isActive
                                                    ? `${stageColors.bg} border-2 ${stageColors.border} shadow-md scale-105 z-10`
                                                    : isPassed
                                                        ? 'bg-green-50 border-2 border-green-100 hover:border-green-200'
                                                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                                                    }`}
                                            >
                                                <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-500 ${isActive
                                                    ? `${stageColors.dot} text-white ring-4 ring-offset-2 ${stageColors.border.replace('border-', 'ring-')}`
                                                    : isPassed
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-gray-200 text-gray-400'
                                                    }`}>
                                                    {isPassed && !isActive ? (
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    ) : (
                                                        <StageIcon className={`h-5 w-5 ${isActive ? 'animate-pulse' : ''}`} />
                                                    )}
                                                </div>
                                                <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-tight truncate ${isActive
                                                    ? stageColors.text
                                                    : isPassed
                                                        ? 'text-green-700'
                                                        : 'text-gray-400 font-medium'
                                                    }`}>
                                                    {stage.label}
                                                </p>

                                                {/* Connecting Line (except for last) */}
                                                {isActive && (
                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white animate-ping"></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Quick Action Insights */}
                                <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-gray-200">
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-1.5 mb-1">
                                            <Clock className="h-4 w-4 text-blue-500" />
                                            <p className="text-xs font-medium text-gray-500">Duration</p>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">
                                            {extendedData?.pipeline?.duration || (history.length > 0
                                                ? `${Math.ceil((new Date().getTime() - new Date(history[0].statusChangedAt).getTime()) / (1000 * 60 * 60 * 24))} days`
                                                : '0 days'
                                            )}
                                        </p>
                                    </div>
                                    <div className="text-center border-l border-r border-gray-200">
                                        <div className="flex items-center justify-center gap-1.5 mb-1">
                                            <ClipboardList className="h-4 w-4 text-purple-500" />
                                            <p className="text-xs font-medium text-gray-500">Changes</p>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">{history.length}</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-1.5 mb-1">
                                            <Award className="h-4 w-4 text-green-500" />
                                            <p className="text-xs font-medium text-gray-500">Progress</p>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">{progress}%</p>
                                    </div>
                                </div>

                                {/* Next Step Indicator */}
                                {progress < 100 && latestProjectStatusName && !isPipelineBlocked && (
                                    <div className="mt-6 pt-6 border-t border-gray-200">
                                        <div className="flex items-center gap-3 bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                <ArrowLeft className="h-4 w-4 text-white rotate-180" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Next Step</p>
                                                <p className="text-sm font-semibold text-blue-900 mt-0.5">
                                                    {extendedData?.pipeline?.nextStep?.label || (() => {
                                                        // Use canonical progress order for next step as fallback
                                                        const nextStatus = getNextProgressStatus(latestProjectStatusName);
                                                        return nextStatus ? getStatusLabel(nextStatus) : 'Completion';
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {progress === 100 && (
                                    <div className="mt-6 pt-6 border-t border-gray-200">
                                        <div className="flex items-center gap-3 bg-green-50 border-2 border-green-200 rounded-lg p-3">
                                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                <CheckCircle2 className="h-4 w-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Status</p>
                                                <p className="text-sm font-semibold text-green-900 mt-0.5">
                                                    Pipeline Completed Successfully! 🎉
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>



                        {/* Status History Timeline */}
                        <Card className={`shadow-sm overflow-hidden ${isHired ? 'border border-emerald-200' : 'border-0 bg-gray-50/50'}`}>
                            <CardHeader className={`flex flex-row items-center justify-between pb-4 border-b ${isHired ? 'bg-gradient-to-r from-emerald-100 to-teal-100' : 'bg-gradient-to-r from-slate-800 to-slate-700'}`}>
                                <CardTitle className={`text-lg font-bold flex items-center gap-2 ${isHired ? 'text-emerald-800' : 'text-white'}`}>
                                    <Clock className={`h-5 w-5 ${isHired ? 'text-emerald-600' : 'text-white/80'}`} />
                                    Journey Timeline
                                </CardTitle>
                                {sortedHistory.length > 0 && (
                                    <Badge className={`font-bold border-0 ${isHired ? 'bg-emerald-200 text-emerald-800' : 'bg-white/10 text-white'}`}>
                                        {sortedHistory.length} Milestones
                                    </Badge>
                                )}
                            </CardHeader>
                            <CardContent className="p-0">
                                {sortedHistory.length === 0 ? (
                                    <div className="text-center py-16 bg-white">
                                        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                            <Clock className="h-8 w-8 text-gray-300" />
                                        </div>
                                        <p className="text-gray-400 font-bold text-sm tracking-tight">No history recorded yet</p>
                                    </div>
                                ) : (
                                    <div className="max-h-[680px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent hover:scrollbar-thumb-gray-300 transition-colors">
                                        <div className="relative p-6">
                                            {/* Vertical Timeline Line */}
                                            <div className={`absolute left-[35px] top-8 bottom-8 w-0.5 bg-gradient-to-b ${isHired ? 'from-emerald-500 via-emerald-200' : 'from-violet-400 via-slate-200'} to-transparent`}></div>

                                            {/* Timeline entries */}
                                            <div className="space-y-5">
                                                {sortedHistory.map((item, index) => {
                                                    const statusKey = normalizeStatusNameUtil(item) || '';
                                                    const it: any = item;
                                                    const explicitLabel = it?.subStatus?.label || it?.mainStatus?.label;
                                                    let statusLabel = explicitLabel;
                                                    if (!statusLabel) {
                                                        const normalized = normalizeStatusNameUtil(it) || it?.subStatusSnapshot || it?.mainStatusSnapshot || it?.projectStatus?.statusName;
                                                        statusLabel = normalized ? getStatusLabel(String(normalized)) : (it?.subStatusSnapshot || it?.mainStatusSnapshot || it?.projectStatus?.statusName);
                                                    }
                                                    const colors = getStatusColor(statusKey);
                                                    const isFirst = index === 0;
                                                    const isLast = index === sortedHistory.length - 1;

                                                    return (
                                                        <div key={item.id} className="relative pl-16 group">
                                                            {/* Icon Marker */}
                                                            <div className={`absolute left-0 top-1 w-12 h-12 rounded-2xl flex items-center justify-center z-10 transition-all duration-300 group-hover:scale-110 shadow-md
                                                                ${isFirst
                                                                    ? `${colors.dot} shadow-lg ring-4 ring-offset-2 ring-${colors.dot.replace('bg-', '')}/30`
                                                                    : `bg-white border-2 ${colors.border} shadow-sm`
                                                                }`}>
                                                                <div className={isFirst ? 'text-white' : colors.text}>
                                                                    {getStatusIcon(statusKey)}
                                                                </div>
                                                                {isFirst && (
                                                                    <span className="absolute inset-0 rounded-2xl animate-ping bg-white opacity-20" />
                                                                )}
                                                            </div>

                                                            {/* Step Number Badge */}
                                                            <div className={`absolute left-9 -top-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black z-20 border-2 border-white shadow-sm
                                                                ${isFirst ? 'bg-white text-slate-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                {sortedHistory.length - index}
                                                            </div>

                                                            {/* Card */}
                                                            <div className={`relative rounded-2xl overflow-hidden transition-all duration-300
                                                                ${isFirst
                                                                    ? `border-2 ${colors.border} shadow-lg`
                                                                    : 'border border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-slate-200'
                                                                }
                                                                ${isLast ? 'mb-0' : ''}`}>

                                                                {/* Top color strip for current item */}
                                                                {isFirst && (
                                                                    <div className={`h-1 w-full ${colors.dot} opacity-60`} />
                                                                )}

                                                                <div className={`p-4 ${isFirst ? colors.bg : 'bg-white'}`}>
                                                                    {/* Header Row */}
                                                                    <div className="flex items-start justify-between gap-2 mb-3">
                                                                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                                                                            <h4 className={`font-black text-base leading-tight truncate ${isFirst ? colors.text : 'text-slate-800'}`}>
                                                                                {statusLabel || (statusKey ? getStatusLabel(statusKey) : 'Unknown Status')}
                                                                            </h4>
                                                                            {isFirst && (
                                                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white ${colors.dot}`}>
                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                                                                                    Current
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {/* Date/time chip */}
                                                                        <div className={`shrink-0 rounded-xl px-2.5 py-1.5 text-right text-[10px] leading-tight ${isFirst ? 'bg-white/50' : 'bg-slate-50 border border-slate-100'}`}>
                                                                            <div className="font-black text-slate-600">
                                                                                {new Date(item.statusChangedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                            </div>
                                                                            <div className="text-slate-400 font-medium">
                                                                                {new Date(item.statusChangedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Updated By */}
                                                                    {((item as any).changedByName || (item as any).changedBy) && (
                                                                        <div className={`inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 mb-3 border
                                                                            ${isFirst ? 'bg-white/60 border-white/40' : 'bg-slate-50 border-slate-100'}`}>
                                                                            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm ${colors.dot} text-white uppercase shrink-0`}>
                                                                                {((item as any).changedByName || (item as any).changedBy?.name)?.charAt(0) || '?'}
                                                                            </div>
                                                                            <span className="text-[10px] font-semibold text-slate-500">
                                                                                by <span className="text-slate-800 font-black">{(item as any).changedByName ?? (item as any)?.changedBy?.name}</span>
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    {/* Reason & Notes */}
                                                                    {(item.reason || item.notes) && (
                                                                        <div className="space-y-2">
                                                                            {item.reason && (
                                                                                <div className={`flex items-start gap-2.5 p-2.5 rounded-xl text-xs border
                                                                                    ${isFirst ? 'bg-white/60 border-white/40' : 'bg-orange-50 border-orange-100'}`}>
                                                                                    <AlertCircle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                                                                                    <div>
                                                                                        <span className="font-black text-orange-600 uppercase tracking-widest text-[9px] block mb-0.5">Reason</span>
                                                                                        <p className="text-slate-700 font-semibold">{item.reason}</p>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {item.notes && (
                                                                                <div className={`relative pl-3 py-2 text-xs border-l-2 ${colors.dot.replace('bg-', 'border-')} ${isFirst ? 'opacity-90' : ''}`}>
                                                                                    <span className="font-black text-slate-400 uppercase tracking-widest text-[9px] block mb-1 flex items-center gap-1">
                                                                                        <FileText className="h-3 w-3" /> Notes
                                                                                    </span>
                                                                                    <p className="text-slate-600 leading-relaxed italic">"{item.notes}"</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Hover accent bar */}
                                                                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${colors.dot} scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left opacity-50`} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <div className={`px-6 py-3 border-t flex justify-center items-center gap-3 ${isHired ? 'bg-emerald-50' : 'bg-white'}`}>
                                <div className={`h-px flex-1 ${isHired ? 'bg-emerald-200' : 'bg-gray-100'}`}></div>
                                <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${isHired ? 'text-emerald-400' : 'text-gray-300'}`}>End of History</span>
                                <div className={`h-px flex-1 ${isHired ? 'bg-emerald-200' : 'bg-gray-100'}`}></div>
                            </div>
                        </Card>

                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Candidate Info */}
                        <Card className={`shadow-sm ${isHired ? 'border-emerald-200 bg-emerald-50/30' : ''}`}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className={`h-5 w-5 ${isHired ? 'text-emerald-600' : 'text-blue-600'}`} />
                                    Candidate Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg mx-auto mb-3">
                                        {`${pipelineResponse?.data?.candidate?.firstName?.[0] || ''}${pipelineResponse?.data?.candidate?.lastName?.[0] || ''}`}
                                    </div>
                                    <h3 className="font-semibold text-gray-900">
                                        {pipelineResponse?.data?.candidate?.firstName} {pipelineResponse?.data?.candidate?.lastName}
                                    </h3>
                                    <Badge className="mt-2 capitalize">{pipelineResponse?.data?.candidate?.gender?.toLowerCase()}</Badge>
                                </div>

                                <div className="space-y-2 pt-3 border-t">
                                    {pipelineResponse?.data?.candidate?.candidateCode ? (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Hash className="h-4 w-4 text-gray-400 shrink-0" />
                                            <span className="inline-flex rounded-md bg-red-50 px-2 py-0.5 text-xs font-mono font-bold text-red-700 border border-red-200">
                                                {pipelineResponse.data.candidate.candidateCode}
                                            </span>
                                        </div>
                                    ) : null}
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-700 truncate">{pipelineResponse?.data?.candidate?.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-700">
                                            {pipelineResponse?.data?.candidate?.countryCode} {pipelineResponse?.data?.candidate?.mobileNumber}
                                        </span>
                                    </div>
                                    {pipelineResponse?.data?.candidate?.dateOfBirth && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span className="text-gray-700">
                                                {new Date(pipelineResponse.data.candidate.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                {' '}({new Date().getFullYear() - new Date(pipelineResponse.data.candidate.dateOfBirth).getFullYear()} years)
                                            </span>
                                        </div>
                                    )}
                                    {pipelineResponse?.data?.candidate?.experience != null && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Award className="h-4 w-4 text-gray-400" />
                                            <span className="text-gray-700">{pipelineResponse.data.candidate.experience} years experience</span>
                                        </div>
                                    )}
                                </div>

                                {/* Qualifications */}
                                {pipelineResponse?.data?.candidate?.qualifications && pipelineResponse.data.candidate.qualifications.length > 0 && (
                                    <div className="pt-3 border-t">
                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Qualifications</p>
                                        <div className="space-y-2">
                                            {pipelineResponse.data.candidate.qualifications.map((qual: any) => (
                                                <div key={qual.id} className="bg-blue-50 border border-blue-200 rounded p-2">
                                                    <p className="text-sm font-semibold text-blue-900">{qual.qualification.shortName}</p>
                                                    <p className="text-xs text-blue-700 mt-0.5">{qual.university}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-blue-600">Graduated: {qual.graduationYear}</span>
                                                        <span className="text-xs text-blue-600">•</span>
                                                        <span className="text-xs text-blue-600">GPA: {qual.gpa}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Current Status */}
                                <div className="pt-3 border-t">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Source</p>
                                    <Badge variant="outline" className="capitalize">{pipelineResponse?.data?.candidate?.source}</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Project Info */}
                        <Card className={`shadow-sm ${isHired ? 'border-emerald-200 bg-emerald-50/30' : ''}`}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Building className={`h-5 w-5 ${isHired ? 'text-emerald-600' : 'text-green-600'}`} />
                                    Project Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{pipelineResponse?.data?.project?.title}</h3>
                                    {pipelineResponse?.data?.project?.description && (
                                        <p className="text-gray-600 text-sm mt-1">{pipelineResponse.data.project.description}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Type</label>
                                        <p className="text-sm font-medium capitalize mt-0.5">{pipelineResponse?.data?.project?.projectType}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Priority</label>
                                        <Badge className={`mt-0.5 ${
                                            pipelineResponse?.data?.project?.priority === 'high' ? 'bg-red-100 text-red-700' :
                                            pipelineResponse?.data?.project?.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {pipelineResponse?.data?.project?.priority}
                                        </Badge>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Status</label>
                                        <Badge className="mt-0.5 capitalize" variant={pipelineResponse?.data?.project?.status === ProjectStatus.IN_PROGRESS ? 'default' : 'secondary'}>
                                            {pipelineResponse?.data?.project?.status}
                                        </Badge>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Country</label>
                                        <p className="text-sm font-medium mt-0.5">{extendedData?.project?.country?.name}</p>
                                    </div>
                                </div>

                                {pipelineResponse?.data?.project?.deadline && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t">
                                        <Calendar className="h-4 w-4" />
                                        <span>Deadline: {projectDeadline ? new Date(projectDeadline).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</span>
                                    </div>
                                )}

                                {/* Project Requirements */}
                                <div className="pt-3 border-t space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase">Requirements</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center gap-1">
                                            {extendedData?.project?.requiredScreening ? (
                                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                            ) : (
                                                <XCircle className="h-3 w-3 text-gray-400" />
                                            )}
                                            <span className="text-gray-700">Screening</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {extendedData?.project?.resumeEditable ? (
                                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                            ) : (
                                                <XCircle className="h-3 w-3 text-gray-400" />
                                            )}
                                            <span className="text-gray-700">Editable Resume</span>
                                        </div>
                                        {extendedData?.project?.groomingRequired && (
                                            <div className="flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                <span className="text-gray-700 capitalize">Grooming: {extendedData.project.groomingRequired}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                            {extendedData?.project?.hideContactInfo ? (
                                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                            ) : (
                                                <XCircle className="h-3 w-3 text-gray-400" />
                                            )}
                                            <span className="text-gray-700">Hide Contact</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Document Requirements */}
                                {extendedData?.project?.documentRequirements && extendedData.project.documentRequirements.length > 0 && (
                                    <div className="pt-3 border-t">
                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Document Requirements</p>
                                        <div className="space-y-1.5">
                                            {extendedData.project.documentRequirements.map((doc: any) => (
                                                <div key={doc.id} className="flex items-center gap-2 text-xs">
                                                    <FileText className="h-3 w-3 text-blue-600" />
                                                    <span className="text-gray-700 capitalize">{doc.docType.replace(/_/g, ' ')}</span>
                                                    {doc.mandatory && (
                                                        <Badge variant="destructive" className="h-4 text-[10px] px-1">Required</Badge>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Creator Info */}
                                {extendedData?.project?.creator && (
                                    <div className="pt-3 border-t">
                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Created By</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-xs font-semibold">
                                                {extendedData.project.creator.name[0]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-900">{extendedData.project.creator.name}</p>
                                                <p className="text-[10px] text-gray-500">{extendedData.project.creator.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Nominated Role Info */}
                        {extendedData?.nominatedRole && (() => {
                            const role = extendedData.nominatedRole;
                            return (
                            <Card className="shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Award className="h-5 w-5 text-purple-600" />
                                        Nominated Role
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{role.designation}</h3>
                                        <p className="text-xs text-gray-600 mt-0.5">{role.roleCatalog.description}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase tracking-wide">Quantity</label>
                                            <p className="text-sm font-medium mt-0.5">{role.quantity} positions</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase tracking-wide">Priority</label>
                                            <Badge className={`mt-0.5 capitalize ${
                                                role.priority === 'high' ? 'bg-red-100 text-red-700' :
                                                role.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {role.priority}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Experience & Employment */}
                                    <div className="pt-3 border-t space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-500">Experience</span>
                                            <span className="font-medium text-gray-900">
                                                {role.minExperience} - {role.maxExperience} years
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-500">Employment</span>
                                            <Badge variant="outline" className="capitalize text-[10px]">
                                                {role.employmentType}
                                            </Badge>
                                        </div>
                                        {role.visaType && (
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500">Visa Type</span>
                                                <Badge variant="outline" className="capitalize text-[10px]">
                                                    {role.visaType}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>

                                    {/* Age Requirements */}
                                    {(role.minAge || role.maxAge) && (
                                        <div className="pt-3 border-t">
                                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Age Requirements</p>
                                            <p className="text-sm text-gray-700">
                                                {role.minAge} - {role.maxAge} years
                                            </p>
                                        </div>
                                    )}

                                    {/* Benefits */}
                                    <div className="pt-3 border-t">
                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Benefits</p>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div className="flex items-center gap-1">
                                                {role.accommodation ? (
                                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                ) : (
                                                    <XCircle className="h-3 w-3 text-gray-400" />
                                                )}
                                                <span className="text-gray-700">Housing</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {role.food ? (
                                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                ) : (
                                                    <XCircle className="h-3 w-3 text-gray-400" />
                                                )}
                                                <span className="text-gray-700">Food</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {role.transport ? (
                                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                ) : (
                                                    <XCircle className="h-3 w-3 text-gray-400" />
                                                )}
                                                <span className="text-gray-700">Transport</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Screening Requirements */}
                                    <div className="pt-3 border-t">
                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Screening</p>
                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex items-center gap-1">
                                                {role.backgroundCheckRequired ? (
                                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                ) : (
                                                    <XCircle className="h-3 w-3 text-gray-400" />
                                                )}
                                                <span className="text-gray-700">Background Check</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {role.drugScreeningRequired ? (
                                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                ) : (
                                                    <XCircle className="h-3 w-3 text-gray-400" />
                                                )}
                                                <span className="text-gray-700">Drug Screening</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            );
                        })()}

                        {/* Quick Stats */}
                        <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Pipeline Statistics</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-sm text-gray-600">Total Status Changes</span>
                                    <span className="font-semibold text-gray-900 text-lg">{history.length}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-sm text-gray-600">Days in Pipeline</span>
                                    <span className="font-semibold text-gray-900 text-lg">
                                        {extendedData?.pipeline?.duration?.replace(' day', '') || (history.length > 0
                                            ? Math.ceil((new Date().getTime() - new Date(history[0].statusChangedAt).getTime()) / (1000 * 60 * 60 * 24))
                                            : 0
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm text-gray-600">Completion Progress</span>
                                    <span className="font-semibold text-gray-900 text-lg">{progress}%</span>
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>
        </div>
    );
}