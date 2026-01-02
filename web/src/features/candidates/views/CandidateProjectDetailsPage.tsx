import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
    PauseCircle
} from "lucide-react";
import { JSX, useRef, useEffect } from "react";
import { Player } from '@lottiefiles/react-lottie-player';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';


import { useGetCandidateProjectPipelineQuery } from "@/features/candidates/api";
import { calculateProgress as calculateProgressUtil, getMostRecentEntry as getMostRecentEntryUtil, normalizeStatusName as normalizeStatusNameUtil, getNextProgressStatus, mapToProgressKey } from "@/features/candidates/utils/progress";

// Extended type for API response with additional fields
interface ExtendedPipelineResponse {
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
    const lottieRef = useRef<Player>(null);

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
            nominated: <Users className="h-4 w-4" />,
            pending_documents: <Upload className="h-4 w-4" />,
            documents_submitted: <FileText className="h-4 w-4" />,
            verification_in_progress: <Search className="h-4 w-4" />,
            documents_verified: <ShieldCheck className="h-4 w-4" />,
            approved: <ThumbsUp className="h-4 w-4" />,

            // Interview flow
            interview_assigned: <Calendar className="h-4 w-4" />,
            interview_scheduled: <Calendar className="h-4 w-4" />,
            interview_rescheduled: <Calendar className="h-4 w-4" />,
            interview_completed: <MessageCircle className="h-4 w-4" />,
            interview_passed: <Award className="h-4 w-4" />,
            interview_failed: <XCircle className="h-4 w-4" />,
            interview_selected: <CheckCircle2 className="h-4 w-4" />,

            // Screenings
            screening_assigned: <Calendar className="h-4 w-4" />,
            screening_scheduled: <Calendar className="h-4 w-4" />,
            screening_completed: <MessageCircle className="h-4 w-4" />,
            screening_passed: <Award className="h-4 w-4" />,
            screening_failed: <XCircle className="h-4 w-4" />,

            // Training
            training_assigned: <Users className="h-4 w-4" />,
            training_in_progress: <ClipboardList className="h-4 w-4" />,
            training_completed: <CheckCircle2 className="h-4 w-4" />,
            ready_for_reassessment: <Clock className="h-4 w-4" />,

            // Final/other
            selected: <CheckCircle2 className="h-4 w-4" />,
            processing: <ClipboardList className="h-4 w-4" />,
            hired: <Luggage className="h-4 w-4" />,
            rejected_documents: <XCircle className="h-4 w-4" />,
            rejected_interview: <XCircle className="h-4 w-4" />,
            rejected_selection: <XCircle className="h-4 w-4" />,
            withdrawn: <PauseCircle className="h-4 w-4" />,
            on_hold: <Clock className="h-4 w-4" />
        };
        return icons[statusName || ''] || <FileText className="h-4 w-4" />;
    };

    // Status color mapping
    const getStatusColor = (statusName: string) => {
        const colors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
            nominated: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
            pending_documents: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
            documents_submitted: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
            verification_in_progress: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
            documents_verified: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
            approved: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },

            // Interview flow
            interview_assigned: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
            interview_scheduled: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
            interview_rescheduled: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
            interview_completed: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
            interview_passed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
            interview_failed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
            interview_selected: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },

            // Screenings
            screening_assigned: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
            screening_scheduled: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
            screening_completed: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
            screening_passed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
            screening_failed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },

            // Training
            training_assigned: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
            training_in_progress: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
            training_completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
            ready_for_reassessment: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
            selected: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
            processing: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
            hired: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
            rejected_documents: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
            rejected_interview: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
            rejected_selection: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
            withdrawn: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' },
            on_hold: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' }
        };
        return colors[statusName] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' };
    };

    // Status label mapping
    const getStatusLabel = (statusName: string) => {
        const labels: Record<string, string> = {
            nominated: 'Nominated',
            pending_documents: 'Pending Documents',
            documents_submitted: 'Documents Submitted',
            verification_in_progress: 'Verification In Progress',
            documents_verified: 'Documents Verified',
            approved: 'Approved',
            interview_assigned: 'Interview Assigned',
            interview_scheduled: 'Interview Scheduled',
            interview_rescheduled: 'Interview Rescheduled',
            interview_completed: 'Interview Completed',
            interview_passed: 'Interview Passed',
            interview_failed: 'Interview Failed',
            screening_assigned: 'Screening Assigned',
            screening_scheduled: 'Screening Scheduled',
            screening_completed: 'Screening Completed',
            screening_passed: 'Screening Passed',
            screening_failed: 'Screening Failed',
            training_assigned: 'Training Assigned',
            training_in_progress: 'Training In Progress',
            training_completed: 'Training Completed',
            ready_for_reassessment: 'Ready For Reassessment',
            interview_selected: 'Interview Selected',
            selected: 'Selected',
            processing: 'Processing',
            hired: 'Hired',
            rejected_documents: 'Rejected - Documents',
            rejected_interview: 'Rejected - Interview',
            rejected_selection: 'Rejected - Selection',
            withdrawn: 'Withdrawn',
            on_hold: 'On Hold'
        };
        return labels[statusName] || statusName;
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
    // most-recent raw entry (used for display label) — keep canonical progress separate
    const latestEntry = getMostRecentEntryUtil(history);
    const projectDeadline = pipelineResponse?.data?.project?.deadline;
    // Use API's applicationProgress if available, otherwise calculate locally
    const progress = extendedData?.pipeline?.applicationProgress ?? calculateProgress();
    const latestProjectStatusName = getLatestProjectStatusName();
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
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => navigate(-1)}
                            className="rounded-lg w-9 h-9 p-0"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Candidate Project Pipeline</h1>
                            <p className="text-gray-600 text-sm">Tracking candidate progress through project stages</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Pipeline Section */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Advanced Progress Summary */}
                        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
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
                                <div className={`${getStatusColor(latestProjectStatusName || '').bg} border-2 ${getStatusColor(latestProjectStatusName || '').border} rounded-xl p-4 mb-6`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${getStatusColor(latestProjectStatusName || '').dot} animate-pulse`}></div>
                                            <div>
                                                <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Current Status</p>
                                                <p className={`${getStatusColor(latestProjectStatusName || '').text} font-bold text-lg mt-0.5`}>
                                                    {latestDisplayLabel ? latestDisplayLabel : (latestProjectStatusName ? getStatusLabel(latestProjectStatusName) : 'N/A')}
                                                </p>
                                            </div>
                                        </div>
                                        {sortedHistory.length > 0 && (
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500">Last Updated</p>
                                                <p className="text-sm font-semibold text-gray-700 mt-0.5">
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
                                <div className="grid gap-2 mt-6" style={{ gridTemplateColumns: `repeat(${extendedData?.pipeline?.progressOrder?.length || 4}, minmax(0, 1fr))` }}>
                                    {(extendedData?.pipeline?.progressOrder || []).map((stage: any) => {
                                        const isActive = stage.isCurrent;
                                        const isPassed = stage.isCompleted;
                                        
                                        // Icon mapping based on stage name
                                        const iconMap: Record<string, any> = {
                                            nominated: Users,
                                            documents: FileText,
                                            interview: MessageCircle,
                                            processing: ClipboardList,
                                            final: CheckCircle2
                                        };
                                        const StageIcon = iconMap[stage.name] || FileText;

                                        return (
                                            <div
                                                key={stage.name}
                                                className={`relative rounded-lg p-3 text-center transition-all duration-300 ${isActive
                                                    ? `${getStatusColor(latestProjectStatusName || '').bg} border-2 ${getStatusColor(latestProjectStatusName || '').border} shadow-md scale-105`
                                                    : isPassed
                                                        ? 'bg-green-50 border-2 border-green-200'
                                                        : 'bg-gray-50 border-2 border-gray-200'
                                                    }`}
                                            >
                                                <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${isActive
                                                    ? getStatusColor(latestProjectStatusName || '').dot + ' text-white'
                                                    : isPassed
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-gray-300 text-gray-500'
                                                    }`}>
                                                    {isPassed && !isActive ? (
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    ) : (
                                                        <StageIcon className="h-4 w-4" />
                                                    )}
                                                </div>
                                                <p className={`text-xs font-semibold ${isActive
                                                    ? getStatusColor(latestProjectStatusName || '').text
                                                    : isPassed
                                                        ? 'text-green-700'
                                                        : 'text-gray-500'
                                                    }`}>
                                                    {stage.label}
                                                </p>
                                                {isActive && (
                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
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
                                {progress < 100 && latestProjectStatusName && (
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



                        {/* Pipeline Timeline */}

                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Status History Timeline</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                {sortedHistory.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                        <p className="text-gray-600">No status history available</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        {/* Timeline line */}
                                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                                        {/* Timeline items */}
                                        <div className="space-y-6">
                                            {sortedHistory.map((item, index) => {
                                                // get normalized key and human label
                                                const statusKey = normalizeStatusNameUtil(item) || '';
                                                const it: any = item;
                                                // Choose a human friendly label when possible. Prefer API-provided labels, then normalize
                                                const explicitLabel = it?.subStatus?.label || it?.mainStatus?.label;
                                                let statusLabel = explicitLabel;
                                                if (!statusLabel) {
                                                    const normalized = normalizeStatusNameUtil(it) || it?.subStatusSnapshot || it?.mainStatusSnapshot || it?.projectStatus?.statusName;
                                                    statusLabel = normalized ? getStatusLabel(String(normalized)) : (it?.subStatusSnapshot || it?.mainStatusSnapshot || it?.projectStatus?.statusName);
                                                }
                                                const colors = getStatusColor(statusKey);
                                                const isFirst = index === 0;
                                                return (
                                                    <div key={item.id} className="relative pl-12">
                                                        {/* Timeline dot */}
                                                        <div className={`absolute left-3 top-1 w-6 h-6 rounded-full ${colors.dot} border-4 border-white shadow-md flex items-center justify-center`}>
                                                            {isFirst && (
                                                                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                                            )}
                                                        </div>

                                                        {/* Content card */}
                                                        <div className={`border-2 ${colors.border} ${colors.bg} rounded-lg p-4 transition-all hover:shadow-md ${isFirst ? 'shadow-md ring-2 ring-offset-2 ' + colors.dot.replace('bg-', 'ring-') : ''}`}>
                                                            <div className="flex items-start justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`p-1.5 rounded-lg ${colors.bg} border ${colors.border}`}>
                                                                        {getStatusIcon(statusKey)}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className={`font-semibold ${colors.text}`}>
                                                                            {statusLabel ? statusLabel : (statusKey ? getStatusLabel(statusKey) : 'Unknown Status')}
                                                                        </h4>
                                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                                            {formatDate(item.statusChangedAt)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {isFirst && (
                                                                    <Badge variant="secondary" className="text-xs font-semibold">
                                                                        Current
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            {/* Changed by */}
                                                            {(item as any).changedByName || item.changedBy && (
                                                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                                                    <User className="h-3.5 w-3.5" />
                                                                    <span>Changed by: <span className="font-medium">{(item as any).changedByName ?? item?.changedBy?.name}</span></span>
                                                                </div>
                                                            )}

                                                            {/* Reason */}
                                                            {item.reason && (
                                                                <div className="text-sm text-gray-700 mb-2">
                                                                    <span className="font-medium">Reason:</span> {item.reason}
                                                                </div>
                                                            )}

                                                            {/* Notes */}
                                                            {item.notes && (
                                                                <div className="text-sm text-gray-700 bg-white bg-opacity-50 rounded p-3 mt-2 border border-gray-200">
                                                                    <span className="font-medium block mb-1">Notes:</span>
                                                                    <p className="text-gray-600">{item.notes}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Candidate Info */}
                        <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="h-5 w-5 text-blue-600" />
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
                        <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Building className="h-5 w-5 text-green-600" />
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
                                        <Badge className="mt-0.5 capitalize" variant={pipelineResponse?.data?.project?.status === 'active' ? 'default' : 'secondary'}>
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