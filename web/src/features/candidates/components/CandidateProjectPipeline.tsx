import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    CheckCircle2,
    Clock,
    FileText,
    User,
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
    Calendar
} from "lucide-react";

// Props interface
interface PipelineProps {
    history: any[];
    currentStatus?: any;
}

export default function CandidateProjectPipeline({ history = [], currentStatus }: PipelineProps) {
    // Status icons mapping
    const getStatusIcon = (statusName: string) => {
        const icons: Record<string, any> = {
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
        return icons[statusName] || <FileText className="h-4 w-4" />;
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

    // Calculate progress
    const calculateProgress = () => {
        if (history.length === 0) return 0;
        
        const totalStatuses = 12; // Total non-terminal statuses
        const currentStatusName = history[0]?.statusNameSnapshot;
        
        const statusOrder = [
            'nominated', 'pending_documents', 'documents_submitted', 
            'verification_in_progress', 'documents_verified', 'approved',
            'interview_scheduled', 'interview_completed', 'interview_passed',
            'selected', 'processing', 'hired'
        ];
        
        const currentIndex = statusOrder.indexOf(currentStatusName);
        return currentIndex >= 0 ? Math.round(((currentIndex + 1) / totalStatuses) * 100) : 0;
    };

    const progress = calculateProgress();
    const latestStatus = history[0];

    return (
        <div className="space-y-6">
            {/* Progress Summary */}
            <Card className="shadow-sm">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-gray-900 text-lg">Application Progress</h3>
                            <p className="text-gray-600 text-sm mt-1">
                                Current Status: <span className="font-medium">{latestStatus?.projectStatus?.label || 'N/A'}</span>
                            </p>
                        </div>
                        <Badge className={`${getStatusColor(latestStatus?.statusNameSnapshot || '').bg} ${getStatusColor(latestStatus?.statusNameSnapshot || '').text} border ${getStatusColor(latestStatus?.statusNameSnapshot || '').border}`}>
                            {progress}% Complete
                        </Badge>
                    </div>
                    <Progress value={progress} className="h-2" />
                </CardContent>
            </Card>

            {/* Pipeline Timeline */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Status History Timeline</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {history.length === 0 ? (
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
                                {history.map((item, index) => {
                                    const colors = getStatusColor(item.statusNameSnapshot);
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
                                                            {getStatusIcon(item.statusNameSnapshot)}
                                                        </div>
                                                        <div>
                                                            <h4 className={`font-semibold ${colors.text}`}>
                                                                {item.projectStatus?.label || item.statusNameSnapshot}
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
                                                {item.changedByName && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                                        <User className="h-3.5 w-3.5" />
                                                        <span>Changed by: <span className="font-medium">{item.changedByName}</span></span>
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
                                ? Math.ceil((new Date().getTime() - new Date(history[history.length - 1].statusChangedAt).getTime()) / (1000 * 60 * 60 * 24))
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
    );
}