import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Plus,
  ArrowLeft,
  Loader2,
  FileText,
  Video,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  useGetTrainingAssignmentQuery,
  useCompleteTrainingMutation,
} from "../data";
import { useCan } from "@/hooks/useCan";
import { SessionFormDialog } from "../components/SessionFormDialog";
import { SessionCard } from "../components/SessionCard";
import { TRAINING_STATUS, TRAINING_PRIORITY } from "../../types";

export default function TrainingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canWrite = useCan("write:training");

  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  const {
    data: trainingData,
    isLoading,
    error,
  } = useGetTrainingAssignmentQuery(id!);
  const [completeTraining, { isLoading: isCompleting }] =
    useCompleteTrainingMutation();

  const training = trainingData?.data;
  const candidate = training?.screening?.candidateProjectMap?.candidate;
  const project = training?.screening?.candidateProjectMap?.project;
  const role = training?.screening?.candidateProjectMap?.roleNeeded;
  const sessions = training?.sessions || [];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case TRAINING_STATUS.ASSIGNED:
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
        };
      case TRAINING_PRIORITY.MEDIUM:
        return {
          label: "Medium Priority",
          variant: "default" as const,
        };
      case TRAINING_PRIORITY.LOW:
        return {
          label: "Low Priority",
          variant: "secondary" as const,
        };
      default:
        return {
          label: priority,
          variant: "secondary" as const,
        };
    }
  };

  const handleCompleteTraining = async () => {
    if (!training) return;

    // Check if all sessions are completed
    const allSessionsCompleted = sessions.every((s) => s.completedAt);
    if (!allSessionsCompleted) {
      toast.error(
        "Please complete all training sessions before marking the training as complete"
      );
      return;
    }

    if (
      !confirm(
        "Are you sure you want to mark this training program as complete? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await completeTraining({
        id: training.id,
        data: {
          overallPerformance: "satisfactory", // This should come from a form
          recommendations: "", // This should come from a form
        },
      }).unwrap();
      toast.success("Training program marked as complete");
    } catch (error: any) {
      toast.error(
        error?.data?.message || "Failed to complete training program"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !training) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load training details. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const statusConfig = getStatusConfig(training.status);
  const priorityConfig = getPriorityConfig(training.priority);
  const StatusIcon = statusConfig.icon;

  const completedSessions = sessions.filter((s) => s.completedAt).length;
  const progressPercentage =
    sessions.length > 0 ? (completedSessions / sessions.length) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/screenings/training")}
          className="mb-4 hover:bg-emerald-500/5 hover:text-emerald-600"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Training Program
        </Button>

        <div className="relative">
          <div className="absolute -top-4 -left-4 w-72 h-72 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent rounded-full blur-3xl -z-10" />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div
                className={`p-3 rounded-xl bg-gradient-to-br ${statusConfig.bgGradient} border ${statusConfig.borderColor} shadow-sm`}
              >
                <GraduationCap className={`h-6 w-6 ${statusConfig.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={statusConfig.variant}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                  <Badge variant={priorityConfig.variant}>
                    {priorityConfig.label}
                  </Badge>
                </div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-emerald-600 to-teal-600 bg-clip-text">
                  {training.trainingType}
                </h1>
                <p className="text-muted-foreground mt-2">
                  Assigned on{" "}
                  {format(new Date(training.assignedAt), "MMMM d, yyyy")}
                </p>
              </div>
            </div>
            {canWrite &&
              training.status === TRAINING_STATUS.IN_PROGRESS &&
              sessions.every((s) => s.completedAt) && (
                <Button
                  onClick={handleCompleteTraining}
                  disabled={isCompleting}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md hover:shadow-lg transition-all"
                >
                  {isCompleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Complete Training
                    </>
                  )}
                </Button>
              )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Card */}
          {sessions.length > 0 && (
            <Card className="border-muted/50 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Training Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Completed Sessions
                  </span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {completedSessions}/{sessions.length}
                  </span>
                </div>
                <div className="w-full bg-muted/50 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {progressPercentage.toFixed(0)}% Complete
                </p>
              </CardContent>
            </Card>
          )}

          {/* Training Sessions */}
          <Card className="border-muted/50 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Training Sessions
                </CardTitle>
                {canWrite &&
                  training.status !== TRAINING_STATUS.COMPLETED &&
                  training.status !== TRAINING_STATUS.CANCELLED && (
                    <Button
                      size="sm"
                      onClick={() => setSessionDialogOpen(true)}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Session
                    </Button>
                  )}
              </div>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No sessions yet</p>
                  <p className="text-sm">
                    Get started by adding the first training session
                  </p>
                  {canWrite &&
                    training.status !== TRAINING_STATUS.COMPLETED &&
                    training.status !== TRAINING_STATUS.CANCELLED && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setSessionDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Session
                      </Button>
                    )}
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions
                    .sort(
                      (a, b) =>
                        new Date(a.sessionDate).getTime() -
                        new Date(b.sessionDate).getTime()
                    )
                    .map((session, index) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        sessionNumber={index + 1}
                        canComplete={canWrite}
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Candidate Information */}
          <Card className="border-muted/50 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Candidate Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidate && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Name</p>
                    <p className="font-medium">
                      {candidate.firstName} {candidate.lastName}
                    </p>
                  </div>
                  {candidate.email && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Email
                      </p>
                      <p className="font-medium text-sm break-words">
                        {candidate.email}
                      </p>
                    </div>
                  )}
                  {candidate.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Phone
                      </p>
                      <p className="font-medium">{candidate.phone}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Project & Role Information */}
          <Card className="border-muted/50 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Project & Role
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Project</p>
                  <p className="font-medium">{project.title}</p>
                </div>
              )}
              {role && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Role</p>
                  <p className="font-medium">{role.designation}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Training Details */}
          {training.focusAreas && (
            <Card className="border-muted/50 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Focus Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {training.focusAreas}
                </p>
              </CardContent>
            </Card>
          )}

          {training.completedAt && training.overallPerformance && (
            <Card className="border-muted/50 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Final Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Performance
                  </p>
                  <Badge
                    variant={
                      training.overallPerformance === "excellent"
                        ? "success"
                        : training.overallPerformance === "satisfactory"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {training.overallPerformance}
                  </Badge>
                </div>
                {training.recommendations && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Recommendations
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {training.recommendations}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Completed On
                  </p>
                  <p className="text-sm">
                    {format(new Date(training.completedAt), "MMMM d, yyyy")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Session Form Dialog */}
      <SessionFormDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        trainingId={training.id}
      />
    </div>
  );
}
