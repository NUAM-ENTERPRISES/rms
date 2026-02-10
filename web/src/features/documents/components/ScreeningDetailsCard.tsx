import { Badge } from "@/components/ui/badge";
import { useGetScreeningDetailsQuery } from "@/features/screening-coordination/interviews/data";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Video,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Star,
  User,
  Link2,
  ClipboardList,
  CheckCircle,
  XCircle,
  AlertTriangle,
  GraduationCap,
  Shield,
  FileCheck,
  RefreshCw,
} from "lucide-react";

interface ScreeningDetailsCardProps {
  candidateId: string;
  projectId: string;
  roleCatalogId: string;
}

export function ScreeningDetailsCard({
  candidateId,
  projectId,
  roleCatalogId,
}: ScreeningDetailsCardProps) {
  const { data, isLoading, error } = useGetScreeningDetailsQuery(
    { candidateId, projectId, roleCatalogId },
    { skip: !candidateId || !projectId || !roleCatalogId }
  );

  // API may return { success, data: screening } or the screening object directly
  const screening = (data as any)?.data ?? data;

  // Don't render anything if loading, error, or no data
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border border-white/30 bg-white/90 backdrop-blur-xl shadow-lg overflow-hidden"
      >
        <div className="p-6 flex items-center justify-center gap-2 text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading screening details...</span>
        </div>
      </motion.div>
    );
  }

  if (error || !screening || !screening.id) {
    return null;
  }

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "video":
        return <Video className="h-3.5 w-3.5" />;
      case "phone":
        return <Phone className="h-3.5 w-3.5" />;
      case "in_person":
        return <MapPin className="h-3.5 w-3.5" />;
      default:
        return <Video className="h-3.5 w-3.5" />;
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "scheduled":
        return { label: "Scheduled", color: "bg-blue-100 text-blue-700", icon: Calendar };
      case "in_progress":
        return { label: "In Progress", color: "bg-amber-100 text-amber-700", icon: Clock };
      case "completed":
        return { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle };
      case "cancelled":
        return { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle };
      case "pending":
        return { label: "Pending", color: "bg-slate-100 text-slate-700", icon: Clock };
      default:
        return { label: status, color: "bg-slate-100 text-slate-700", icon: Clock };
    }
  };

  const getDecisionConfig = (decision: string) => {
    switch (decision) {
      case "approved":
        return { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle };
      case "rejected":
        return { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle };
      case "needs_training":
        return { label: "Needs Training", color: "bg-amber-100 text-amber-700", icon: GraduationCap };
      default:
        return null;
    }
  };

  const statusConfig = getStatusConfig(screening.status);
  const decisionConfig = screening.decision ? getDecisionConfig(screening.decision) : null;
  const StatusIcon = statusConfig.icon;

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-xl border border-white/30 bg-white/90 backdrop-blur-xl shadow-lg overflow-hidden"
    >
      {/* Accent bar */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          screening.status === "completed"
            ? screening.decision === "approved"
              ? "bg-green-500"
              : screening.decision === "rejected"
              ? "bg-red-500"
              : "bg-amber-500"
            : screening.status === "scheduled"
            ? "bg-blue-500"
            : "bg-slate-300"
        )}
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100">
            <Shield className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Screening Details</h2>
            <p className="text-xs text-slate-500">
              {screening.template?.name || "Screening"} • Coordinator: {screening.coordinator?.name || "Unassigned"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-xs font-semibold", statusConfig.color)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
          {decisionConfig && (
            <Badge className={cn("text-xs font-semibold", decisionConfig.color)}>
              <decisionConfig.icon className="h-3 w-3 mr-1" />
              {decisionConfig.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
        {/* Scheduled Time */}
        {screening.scheduledTime && (
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <div>
              <p className="text-slate-400">Scheduled</p>
              <p className="font-semibold text-slate-700">
                {formatDateTime(screening.scheduledTime)}
              </p>
            </div>
          </div>
        )}

        {/* Duration */}
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <div>
            <p className="text-slate-400">Duration</p>
            <p className="font-semibold text-slate-700">{screening.duration} min</p>
          </div>
        </div>

        {/* Mode */}
        <div className="flex items-center gap-2">
          {getModeIcon(screening.mode)}
          <div>
            <p className="text-slate-400">Mode</p>
            <p className="font-semibold text-slate-700 capitalize">{screening.mode?.replace("_", " ") || "N/A"}</p>
          </div>
        </div>

        {/* Coordinator */}
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-slate-400" />
          <div>
            <p className="text-slate-400">Coordinator</p>
            <p className="font-semibold text-slate-700 truncate max-w-[120px]">
              {screening.coordinator?.name || "Unassigned"}
            </p>
          </div>
        </div>

        {/* Role */}
        {screening.candidateProjectMap?.roleCatalog && (
          <div className="flex items-center gap-2">
            <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
            <div>
              <p className="text-slate-400">Role</p>
              <p className="font-semibold text-slate-700 truncate max-w-[120px]">
                {screening.candidateProjectMap.roleCatalog.name || screening.candidateProjectMap.roleCatalog.label}
              </p>
            </div>
          </div>
        )}

        {/* Doc Verification Status */}
        <div className="flex items-center gap-2">
          <FileCheck className="h-3.5 w-3.5 text-slate-400" />
          <div>
            <p className="text-slate-400">Doc Verified</p>
            <p className={cn(
              "font-semibold",
              screening.isDocumentVerified ? "text-green-600" : "text-amber-600"
            )}>
              {screening.isDocumentVerified ? "Yes" : "No"}
            </p>
          </div>
        </div>
      </div>

      {/* Meeting Link */}
      {screening.meetingLink && (
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-semibold text-slate-600">Meeting Link:</span>
            <a
              href={screening.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline truncate max-w-[400px]"
            >
              {screening.meetingLink}
            </a>
          </div>
        </div>
      )}

      {/* Conducted details (after screening) */}
      {screening.conductedAt && (
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <div>
                <p className="text-slate-400">Conducted At</p>
                <p className="font-semibold text-slate-700">{formatDateTime(screening.conductedAt)}</p>
              </div>
            </div>
            {screening.overallRating != null && (
              <div className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-amber-400" />
                <div>
                  <p className="text-slate-400">Overall Score</p>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-slate-700">{screening.overallRating}%</p>
                    <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          (screening.overallRating || 0) >= 80
                            ? "bg-green-500"
                            : (screening.overallRating || 0) >= 60
                            ? "bg-amber-500"
                            : "bg-red-500"
                        )}
                        style={{ width: `${Math.min(screening.overallRating || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Remarks / Strengths / Areas of Improvement */}
      {(screening.remarks || screening.strengths || screening.areasOfImprovement) && (
        <div className="px-4 py-3 border-t border-slate-100 space-y-2">
          {screening.remarks && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Remarks</p>
              <p className="text-xs text-slate-700">{screening.remarks}</p>
            </div>
          )}
          {screening.strengths && (
            <div>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-0.5">Strengths</p>
              <p className="text-xs text-slate-700">{screening.strengths}</p>
            </div>
          )}
          {screening.areasOfImprovement && (
            <div>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Areas of Improvement</p>
              <p className="text-xs text-slate-700">{screening.areasOfImprovement}</p>
            </div>
          )}
        </div>
      )}

      {/* Checklist Items */}
      {screening.checklistItems && screening.checklistItems.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">
              Checklist ({screening.checklistItems.length} items)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {screening.checklistItems.map((item: any) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs",
                  item.passed
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                )}
              >
                {item.passed ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-slate-800 truncate block">{item.criterion || item.category}</span>
                  {item.category && item.criterion && (
                    <span className="text-slate-400 text-[10px]">{item.category}</span>
                  )}
                </div>
                {(item.score != null || item.rating != null) && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                    {item.score != null ? `${item.score}%` : `${item.rating}/5`}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template Info */}
      {screening.template && (
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-xs font-semibold text-slate-600">Template:</span>
            <span className="text-xs text-slate-700">{screening.template.name}</span>
            {screening.template.items && screening.template.items.length > 0 && (
              <Badge variant="outline" className="text-[10px] ml-1">
                {screening.template.items.length} criteria
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Training Assignments */}
      {screening.trainingAssignments && (screening.trainingAssignments as any[]).length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-slate-600">
              Training Assignments ({(screening.trainingAssignments as any[]).length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(screening.trainingAssignments as any[]).map((training: any) => (
              <div
                key={training.id}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-amber-50 rounded-lg border border-amber-200 text-xs"
              >
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span className="font-medium text-slate-800 capitalize">
                  {training.trainingType?.replace("_", " ") || "Training"}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    training.status === "completed"
                      ? "border-green-300 text-green-700"
                      : training.status === "in_progress"
                      ? "border-blue-300 text-blue-700"
                      : "border-slate-300 text-slate-600"
                  )}
                >
                  {training.status?.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
