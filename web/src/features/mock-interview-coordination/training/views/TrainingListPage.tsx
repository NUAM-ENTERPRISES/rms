import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  GraduationCap,
  Search,
  Loader2,
  AlertCircle,
  User,
  Briefcase,
  Calendar,
  CheckCircle2,
  Target,
  Plus,
  X,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useGetTrainingAssignmentsQuery } from "../data";
import { useCan } from "@/hooks/useCan";
import { SessionCard } from "../components/SessionCard";
import { SessionFormDialog } from "../components/SessionFormDialog";
import { useCompleteTrainingMutation } from "../data";
import { TRAINING_STATUS, TRAINING_PRIORITY } from "../../types";
import { cn } from "@/lib/utils";

export default function TrainingListPage() {
  const canWrite = useCan("write:training");

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    priority: "all",
  });

  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(
    null
  );
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  const { data, isLoading, error } = useGetTrainingAssignmentsQuery();
  const [completeTraining, { isLoading: isCompleting }] =
    useCompleteTrainingMutation();

  const trainings = data?.data || [];

  // Filter trainings
  const filteredTrainings = useMemo(() => {
    let filtered = trainings;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.mockInterview?.candidateProjectMap?.candidate?.firstName
            ?.toLowerCase()
            .includes(searchLower) ||
          t.mockInterview?.candidateProjectMap?.candidate?.lastName
            ?.toLowerCase()
            .includes(searchLower) ||
          t.mockInterview?.candidateProjectMap?.project?.title
            ?.toLowerCase()
            .includes(searchLower) ||
          t.trainingType?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter((t) => t.status === filters.status);
    }

    if (filters.priority && filters.priority !== "all") {
      filtered = filtered.filter((t) => t.priority === filters.priority);
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    );
  }, [trainings, filters]);

  // Auto-select first training
  const selectedTraining = useMemo(() => {
    if (selectedTrainingId) {
      return filteredTrainings.find((t) => t.id === selectedTrainingId);
    }
    return filteredTrainings[0];
  }, [filteredTrainings, selectedTrainingId]);

  // Calculate stats
  const stats = useMemo(() => {
    const active = trainings.filter(
      (t) => t.status === TRAINING_STATUS.IN_PROGRESS
    ).length;
    const completed = trainings.filter(
      (t) => t.status === TRAINING_STATUS.COMPLETED
    ).length;
    const total = trainings.length;
    return { active, completed, total };
  }, [trainings]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case TRAINING_STATUS.ASSIGNED:
        return {
          label: "Assigned",
          color: "text-slate-600 dark:text-slate-400",
          bgColor: "bg-slate-100 dark:bg-slate-900",
          borderColor: "border-slate-300 dark:border-slate-700",
        };
      case TRAINING_STATUS.IN_PROGRESS:
        return {
          label: "In Progress",
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950",
          borderColor: "border-blue-300 dark:border-blue-700",
        };
      case TRAINING_STATUS.COMPLETED:
        return {
          label: "Completed",
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-950",
          borderColor: "border-green-300 dark:border-green-700",
        };
      case TRAINING_STATUS.CANCELLED:
        return {
          label: "Cancelled",
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-950",
          borderColor: "border-red-300 dark:border-red-700",
        };
      default:
        return {
          label: status,
          color: "text-muted-foreground",
          bgColor: "bg-muted",
          borderColor: "border-muted",
        };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case TRAINING_PRIORITY.HIGH:
        return (
          <Badge variant="destructive" className="text-xs">
            High
          </Badge>
        );
      case TRAINING_PRIORITY.MEDIUM:
        return (
          <Badge className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-300">
            Medium
          </Badge>
        );
      case TRAINING_PRIORITY.LOW:
        return (
          <Badge variant="secondary" className="text-xs">
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleCompleteTraining = async () => {
    if (!selectedTraining) return;

    const sessions = selectedTraining.sessions || [];
    const allSessionsCompleted = sessions.every((s) => s.completedAt);

    if (!allSessionsCompleted) {
      toast.error(
        "Please complete all training sessions before marking the training as complete"
      );
      return;
    }

    if (
      !confirm(
        "Are you sure you want to mark this training program as complete?"
      )
    ) {
      return;
    }

    try {
      await completeTraining({
        id: selectedTraining.id,
        data: {
          overallPerformance: "satisfactory",
          recommendations: "",
        },
      }).unwrap();
      toast.success("Training program marked as complete");
    } catch (error: any) {
      toast.error(
        error?.data?.message || "Failed to complete training program"
      );
    }
  };

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: TRAINING_STATUS.ASSIGNED, label: "Assigned" },
    { value: TRAINING_STATUS.IN_PROGRESS, label: "In Progress" },
    { value: TRAINING_STATUS.COMPLETED, label: "Completed" },
    { value: TRAINING_STATUS.CANCELLED, label: "Cancelled" },
  ];

  const priorityOptions = [
    { value: "all", label: "All Priorities" },
    { value: TRAINING_PRIORITY.HIGH, label: "High" },
    { value: TRAINING_PRIORITY.MEDIUM, label: "Medium" },
    { value: TRAINING_PRIORITY.LOW, label: "Low" },
  ];

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load training programs. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Training Programs
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage candidate training and development
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.active}
                </div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search candidates, projects, training type..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="pl-10"
              />
            </div>

            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.priority}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, priority: value }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(filters.search ||
              filters.status !== "all" ||
              filters.priority !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFilters({ search: "", status: "all", priority: "all" })
                }
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Training List */}
        <div className="w-96 border-r bg-muted/20">
          <ScrollArea className="h-full">
            {filteredTrainings.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm font-medium mb-1">
                  No training programs found
                </p>
                <p className="text-xs">
                  {filters.search ||
                  filters.status !== "all" ||
                  filters.priority !== "all"
                    ? "Try adjusting your filters"
                    : "Training programs will appear here once assigned"}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredTrainings.map((training) => {
                  const candidate =
                    training.mockInterview?.candidateProjectMap?.candidate;
                  const statusConfig = getStatusConfig(training.status);
                  const isSelected =
                    training.id ===
                    (selectedTraining?.id || filteredTrainings[0]?.id);
                  const sessions = training.sessions || [];
                  const completedSessions = sessions.filter(
                    (s) => s.completedAt
                  ).length;
                  const progress =
                    sessions.length > 0
                      ? (completedSessions / sessions.length) * 100
                      : 0;

                  return (
                    <button
                      key={training.id}
                      onClick={() => setSelectedTrainingId(training.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all",
                        "hover:bg-accent/50",
                        isSelected
                          ? "bg-accent border-primary shadow-sm"
                          : "bg-card border-transparent"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {candidate
                                ? `${candidate.firstName} ${candidate.lastName}`
                                : "Unknown Candidate"}
                            </span>
                            {training.priority &&
                              getPriorityBadge(training.priority)}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {training.trainingType}
                          </p>
                        </div>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 flex-shrink-0 transition-transform",
                            isSelected && "text-primary"
                          )}
                        />
                      </div>

                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs mb-2",
                          statusConfig.bgColor,
                          statusConfig.borderColor,
                          "border"
                        )}
                      >
                        <div
                          className={cn("h-1.5 w-1.5 rounded-full", {
                            "bg-slate-600":
                              training.status === TRAINING_STATUS.ASSIGNED,
                            "bg-blue-600":
                              training.status === TRAINING_STATUS.IN_PROGRESS,
                            "bg-green-600":
                              training.status === TRAINING_STATUS.COMPLETED,
                            "bg-red-600":
                              training.status === TRAINING_STATUS.CANCELLED,
                          })}
                        />
                        <span className={statusConfig.color}>
                          {statusConfig.label}
                        </span>
                      </div>

                      {sessions.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Progress
                            </span>
                            <span className="font-medium">
                              {completedSessions}/{sessions.length} sessions
                            </span>
                          </div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(training.assignedAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - Training Details */}
        <div className="flex-1 overflow-hidden">
          {selectedTraining ? (
            <ScrollArea className="h-full">
              <div className="p-6 max-w-5xl mx-auto space-y-6">
                {/* Header Section */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-semibold">
                        {selectedTraining.trainingType}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Assigned on{" "}
                        {format(
                          new Date(selectedTraining.assignedAt),
                          "MMMM d, yyyy"
                        )}
                      </p>
                    </div>

                    {canWrite &&
                      selectedTraining.status === TRAINING_STATUS.IN_PROGRESS &&
                      (selectedTraining.sessions || []).every(
                        (s) => s.completedAt
                      ) &&
                      (selectedTraining.sessions || []).length > 0 && (
                        <Button
                          onClick={handleCompleteTraining}
                          disabled={isCompleting}
                          className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                        >
                          {isCompleting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Completing...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Complete Training
                            </>
                          )}
                        </Button>
                      )}
                  </div>

                  {/* Progress Card */}
                  {(selectedTraining.sessions || []).length > 0 && (
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold">Training Progress</h3>
                          </div>
                          <div className="text-3xl font-bold text-primary">
                            {(
                              ((selectedTraining.sessions || []).filter(
                                (s) => s.completedAt
                              ).length /
                                (selectedTraining.sessions || []).length) *
                              100
                            ).toFixed(0)}
                            %
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{
                              width: `${
                                ((selectedTraining.sessions || []).filter(
                                  (s) => s.completedAt
                                ).length /
                                  (selectedTraining.sessions || []).length) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {
                            (selectedTraining.sessions || []).filter(
                              (s) => s.completedAt
                            ).length
                          }{" "}
                          of {(selectedTraining.sessions || []).length} sessions
                          completed
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Content */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Sessions */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          Training Sessions
                        </h3>
                        {canWrite &&
                          selectedTraining.status !==
                            TRAINING_STATUS.COMPLETED &&
                          selectedTraining.status !==
                            TRAINING_STATUS.CANCELLED && (
                            <Button
                              size="sm"
                              onClick={() => setSessionDialogOpen(true)}
                              className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                            >
                              <Plus className="h-4 w-4" />
                              Add Session
                            </Button>
                          )}
                      </div>

                      {(selectedTraining.sessions || []).length === 0 ? (
                        <Card>
                          <CardContent className="py-12">
                            <div className="text-center text-muted-foreground">
                              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p className="font-medium mb-2">
                                No sessions yet
                              </p>
                              <p className="text-sm mb-4">
                                Get started by adding the first training session
                              </p>
                              {canWrite &&
                                selectedTraining.status !==
                                  TRAINING_STATUS.COMPLETED &&
                                selectedTraining.status !==
                                  TRAINING_STATUS.CANCELLED && (
                                  <Button
                                    variant="outline"
                                    onClick={() => setSessionDialogOpen(true)}
                                    className="gap-2"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add Session
                                  </Button>
                                )}
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-3">
                          {(selectedTraining.sessions || [])
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
                    </div>
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    {/* Candidate Info */}
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          Candidate
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">
                              Name
                            </p>
                            <p className="font-medium">
                              {
                                selectedTraining.mockInterview
                                  ?.candidateProjectMap?.candidate?.firstName
                              }{" "}
                              {
                                selectedTraining.mockInterview
                                  ?.candidateProjectMap?.candidate?.lastName
                              }
                            </p>
                          </div>
                          {selectedTraining.mockInterview?.candidateProjectMap
                            ?.candidate?.email && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">
                                Email
                              </p>
                              <p className="font-medium text-xs break-all">
                                {
                                  selectedTraining.mockInterview
                                    ?.candidateProjectMap?.candidate?.email
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Project Info */}
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-primary" />
                          Project & Role
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">
                              Project
                            </p>
                            <p className="font-medium">
                              {
                                selectedTraining.mockInterview
                                  ?.candidateProjectMap?.project?.title
                              }
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">
                              Role
                            </p>
                            <p className="font-medium">
                              {
                                selectedTraining.mockInterview
                                  ?.candidateProjectMap?.roleNeeded?.designation
                              }
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Focus Areas */}
                    {selectedTraining.focusAreas && (
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            Focus Areas
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {selectedTraining.focusAreas}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Final Assessment */}
                    {selectedTraining.completedAt &&
                      selectedTraining.overallPerformance && (
                        <Card>
                          <CardContent className="p-4">
                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              Final Assessment
                            </h4>
                            <div className="space-y-3 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">
                                  Performance
                                </p>
                                <Badge
                                  variant={
                                    selectedTraining.overallPerformance ===
                                    "excellent"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {selectedTraining.overallPerformance}
                                </Badge>
                              </div>
                              {selectedTraining.recommendations && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    Recommendations
                                  </p>
                                  <p className="text-sm whitespace-pre-wrap">
                                    {selectedTraining.recommendations}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">
                                  Completed
                                </p>
                                <p className="text-sm">
                                  {format(
                                    new Date(selectedTraining.completedAt),
                                    "MMMM d, yyyy"
                                  )}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <GraduationCap className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No training selected</p>
                <p className="text-sm">
                  Select a training program from the list to view details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Session Form Dialog */}
      {selectedTraining && (
        <SessionFormDialog
          open={sessionDialogOpen}
          onOpenChange={setSessionDialogOpen}
          trainingId={selectedTraining.id}
        />
      )}
    </div>
  );
}
