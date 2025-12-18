import { format } from "date-fns";
import {
  GraduationCap,
  Calendar,
  User,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  Target,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrainingAssignment,
  TRAINING_STATUS,
  TRAINING_PRIORITY,
} from "../../types";

interface TrainingCardProps {
  training: TrainingAssignment;
  onView: (training: TrainingAssignment) => void;
}

export function TrainingCard({ training, onView }: TrainingCardProps) {
  const candidate = training.screening?.candidateProjectMap?.candidate;
  const project = training.screening?.candidateProjectMap?.project;
  const role = training.screening?.candidateProjectMap?.roleNeeded;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case TRAINING_STATUS.PENDING:
        return {
          label: "Pending",
          variant: "secondary" as const,
          icon: Clock,
          color: "text-slate-600 dark:text-slate-400",
          bgGradient: "from-slate-500/10 to-slate-600/10",
          borderColor: "border-slate-500/20",
        };
      case TRAINING_STATUS.IN_PROGRESS:
        return {
          label: "In Progress",
          variant: "default" as const,
          icon: Target,
          color: "text-blue-600 dark:text-blue-400",
          bgGradient: "from-blue-500/10 to-blue-600/10",
          borderColor: "border-blue-500/20",
        };
      case TRAINING_STATUS.COMPLETED:
        return {
          label: "Completed",
          variant: "default" as const,
          icon: CheckCircle2,
          color: "text-green-600 dark:text-green-400",
          bgGradient: "from-green-500/10 to-green-600/10",
          borderColor: "border-green-500/20",
        };
      case TRAINING_STATUS.CANCELLED:
        return {
          label: "Cancelled",
          variant: "destructive" as const,
          icon: AlertCircle,
          color: "text-red-600 dark:text-red-400",
          bgGradient: "from-red-500/10 to-red-600/10",
          borderColor: "border-red-500/20",
        };
      default:
        return {
          label: status,
          variant: "secondary" as const,
          icon: Clock,
          color: "text-muted-foreground",
          bgGradient: "from-muted/10 to-muted/20",
          borderColor: "border-muted/20",
        };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case TRAINING_PRIORITY.HIGH:
        return {
          label: "High Priority",
          variant: "destructive" as const,
          color: "text-red-600 dark:text-red-400",
        };
      case TRAINING_PRIORITY.MEDIUM:
        return {
          label: "Medium Priority",
          variant: "default" as const,
          color: "text-orange-600 dark:text-orange-400",
        };
      case TRAINING_PRIORITY.LOW:
        return {
          label: "Low Priority",
          variant: "secondary" as const,
          color: "text-slate-600 dark:text-slate-400",
        };
      default:
        return {
          label: priority,
          variant: "secondary" as const,
          color: "text-muted-foreground",
        };
    }
  };

  const statusConfig = getStatusConfig(training.status);
  const priorityConfig = getPriorityConfig(training.priority);
  const StatusIcon = statusConfig.icon;

  // Calculate progress
  const totalSessions = training.sessions?.length || 0;
  const completedSessions =
    training.sessions?.filter((s) => s.completedAt).length || 0;
  const progressPercentage =
    totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-muted/50 hover:border-emerald-500/30 overflow-hidden">
      {/* Gradient header */}
      <div className={`h-1.5 bg-gradient-to-r ${statusConfig.bgGradient}`} />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-lg bg-gradient-to-br ${statusConfig.bgGradient} border ${statusConfig.borderColor}`}
            >
              <GraduationCap className={`h-4 w-4 ${statusConfig.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">
                {training.trainingType}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={statusConfig.variant} className="text-xs">
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                {training.priority && (
                  <Badge variant={priorityConfig.variant} className="text-xs">
                    {priorityConfig.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Candidate Info */}
        {candidate && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate text-muted-foreground">
              {candidate.firstName} {candidate.lastName}
            </span>
          </div>
        )}

        {/* Project Info */}
        {project && (
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate text-muted-foreground">
              {project.title}
            </span>
          </div>
        )}

        {/* Role Info */}
        {role && (
          <div className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate text-muted-foreground">
              {role.designation}
            </span>
          </div>
        )}

        {/* Date Info */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">
            Assigned {format(new Date(training.assignedAt), "MMM d, yyyy")}
          </span>
        </div>

        {/* Progress */}
        {totalSessions > 0 && (
          <div className="space-y-2 pt-2 border-t border-muted/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Progress
              </span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {completedSessions}/{totalSessions} sessions
              </span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full group-hover:bg-emerald-500/5 group-hover:border-emerald-500/50 group-hover:text-emerald-600 transition-colors"
            onClick={() => onView(training)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
