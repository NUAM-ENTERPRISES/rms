import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { JSX } from "react";

import { useGetCandidateProjectPipelineQuery } from "@/features/candidates/api";

export default function CandidateProjectDetailsPage() {

    const { candidateId, projectId } = useParams() as { candidateId: string; projectId: string };
    const navigate = useNavigate();

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
            interview_scheduled: <Calendar className="h-4 w-4" />,
            interview_completed: <MessageCircle className="h-4 w-4" />,
            interview_passed: <Award className="h-4 w-4" />,
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
            interview_scheduled: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
            interview_completed: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
            interview_passed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
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
            interview_scheduled: 'Interview Scheduled',
            interview_completed: 'Interview Completed',
            interview_passed: 'Interview Passed',
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

    // Returns the most recent project status name from history (if available)
    const getLatestProjectStatusName = (): string | undefined => {
        const history = pipelineResponse?.data?.history;
        if (!history || history.length === 0) return undefined;
        // pick the most recent entry by statusChangedAt
        let latest = history[0];
        for (const entry of history) {
            if (new Date(entry.statusChangedAt).getTime() > new Date(latest.statusChangedAt).getTime()) {
                latest = entry;
            }
        }
        return latest.projectStatus?.statusName;
    };

    // Calculate progress based on the candidate-project's latest project status
    const calculateProgress = () => {
        const currentStatusName = getLatestProjectStatusName();
        if (!currentStatusName) return 0;
        const totalStatuses = 12;
        const statusOrder = [
            'nominated', 'pending_documents', 'documents_submitted', 
            'verification_in_progress', 'documents_verified', 'approved',
            'interview_scheduled', 'interview_completed', 'interview_passed',
            'selected', 'processing', 'hired'
        ];
        const currentIndex = statusOrder.indexOf(currentStatusName);
        return currentIndex >= 0 ? Math.round(((currentIndex + 1) / totalStatuses) * 100) : 0;
    };

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

    const history = pipelineResponse?.data?.history || [];
    const projectDeadline = pipelineResponse?.data?.project?.deadline;
    const progress = calculateProgress();
    const latestProjectStatusName = getLatestProjectStatusName();
    // Reverse history to show most recent first
    const sortedHistory = [...history].reverse();

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
                            {latestProjectStatusName ? getStatusLabel(latestProjectStatusName) : 'N/A'}
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

        {/* Progress Bar with Milestones */}
        <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Progress</span>
                <span className="font-bold text-gray-900">{progress}%</span>
            </div>
            
            {/* Enhanced Progress Bar */}
            <div className="relative">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                        className={`h-full ${getStatusColor(latestProjectStatusName || '').dot} transition-all duration-1000 ease-out rounded-full relative`}
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                    </div>
                </div>
                
                {/* Milestone Markers */}
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

        {/* Stage Indicators */}
        <div className="grid grid-cols-4 gap-2 mt-6">
            {[
                { name: 'Nomination', statuses: ['nominated'], icon: Users },
                { name: 'Documents', statuses: ['pending_documents', 'documents_submitted', 'verification_in_progress', 'documents_verified'], icon: FileText },
                { name: 'Interview', statuses: ['approved', 'interview_scheduled', 'interview_completed', 'interview_passed'], icon: MessageCircle },
                { name: 'Final', statuses: ['selected', 'processing', 'hired'], icon: CheckCircle2 }
            ].map((stage, index) => {
                const isActive = stage.statuses.includes(latestProjectStatusName || '');
                const isPassed = stage.statuses.some(s => {
                    const statusOrder = [
                        'nominated', 'pending_documents', 'documents_submitted', 
                        'verification_in_progress', 'documents_verified', 'approved',
                        'interview_scheduled', 'interview_completed', 'interview_passed',
                        'selected', 'processing', 'hired'
                    ];
                    return statusOrder.indexOf(s) < statusOrder.indexOf(latestProjectStatusName || '');
                });
                const StageIcon = stage.icon;
                
                return (
                    <div 
                        key={stage.name}
                        className={`relative rounded-lg p-3 text-center transition-all duration-300 ${
                            isActive 
                                ? `${getStatusColor(latestProjectStatusName || '').bg} border-2 ${getStatusColor(latestProjectStatusName || '').border} shadow-md scale-105` 
                                : isPassed
                                    ? 'bg-green-50 border-2 border-green-200'
                                    : 'bg-gray-50 border-2 border-gray-200'
                        }`}
                    >
                        <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${
                            isActive 
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
                        <p className={`text-xs font-semibold ${
                            isActive 
                                ? getStatusColor(latestProjectStatusName || '').text 
                                : isPassed
                                    ? 'text-green-700'
                                    : 'text-gray-500'
                        }`}>
                            {stage.name}
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
                    {history.length > 0 
                        ? Math.ceil((new Date().getTime() - new Date(history[0].statusChangedAt).getTime()) / (1000 * 60 * 60 * 24))
                        : 0
                    } days
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
                            {(() => {
                                const statusOrder = [
                                    'nominated', 'pending_documents', 'documents_submitted', 
                                    'verification_in_progress', 'documents_verified', 'approved',
                                    'interview_scheduled', 'interview_completed', 'interview_passed',
                                    'selected', 'processing', 'hired'
                                ];
                                const currentIndex = statusOrder.indexOf(latestProjectStatusName);
                                const nextStatus = statusOrder[currentIndex + 1];
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
                                                const statusName = item.projectStatus?.statusName;
                                                const colors = getStatusColor(statusName);
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
                                                                        {getStatusIcon(statusName)}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className={`font-semibold ${colors.text}`}>
                                                                            {statusName ? getStatusLabel(statusName) : 'Unknown Status'}
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
                                                            {item.changedBy && (
                                                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                                                    <User className="h-3.5 w-3.5" />
                                                                    <span>Changed by: <span className="font-medium">{item.changedBy.name}</span></span>
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
                                    Candidate
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
                                </div>

                                <div className="space-y-2 pt-3 border-t">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-700">{pipelineResponse?.data?.candidate?.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-700">
                                            {pipelineResponse?.data?.candidate?.countryCode} {pipelineResponse?.data?.candidate?.mobileNumber}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Project Info */}
                        <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Building className="h-5 w-5 text-green-600" />
                                    Project
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{pipelineResponse?.data?.project?.title}</h3>
                                    <p className="text-gray-600 text-sm mt-1">{pipelineResponse?.data?.project?.description}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Type</label>
                                        <p className="text-sm font-medium capitalize mt-0.5">{pipelineResponse?.data?.project?.projectType}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Priority</label>
                                        <p className="text-sm font-medium capitalize mt-0.5">{pipelineResponse?.data?.project?.priority}</p>
                                    </div>
                                </div>

                                {pipelineResponse?.data?.project?.deadline && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 pt-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>Deadline: {projectDeadline ? new Date(projectDeadline).toLocaleDateString() : ''}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

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
                                        {history.length > 0 
                                            ? Math.ceil((new Date().getTime() - new Date(history[0].statusChangedAt).getTime()) / (1000 * 60 * 60 * 24))
                                            : 0
                                        }
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