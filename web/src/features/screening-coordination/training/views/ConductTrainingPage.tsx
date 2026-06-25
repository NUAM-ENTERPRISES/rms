import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import {
  Users,
  ChevronLeft,
  MessageSquare,
  Save,
  Loader2,
  TrendingUp,
  User,
  Briefcase,
  Calendar,
  Clock,
  Target,
  Mail,
  Phone,
  Video,
  MapPin,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  useBulkCompleteSessionsMutation,
  useLazyGetTrainingAssignmentQuery,
} from "../data/training.endpoints";
import { TrainingAssignment, TRAINING_PERFORMANCE } from "../../types";
import { cn } from "@/lib/utils";

interface ConductTrainingState {
  assignments?: TrainingAssignment[];
}

type ConductFormEntry = {
  sessionId: string;
  remarks: string;
  performanceRating: string;
};

const SESSION_MODE_LABELS: Record<string, string> = {
  video: "Video Call",
  phone: "Phone Call",
  in_person: "In Person",
};

function getCandidatePhone(candidate?: Record<string, unknown> | null): string | undefined {
  if (!candidate) return undefined;
  const phone = typeof candidate.phone === "string" ? candidate.phone : undefined;
  const countryCode = typeof candidate.countryCode === "string" ? candidate.countryCode : undefined;
  const mobileNumber =
    typeof candidate.mobileNumber === "string" ? candidate.mobileNumber : undefined;

  if (phone?.trim()) return phone.trim();
  if (mobileNumber?.trim()) {
    return [countryCode, mobileNumber].filter(Boolean).join(" ").trim();
  }
  return undefined;
}

function resolveTrainerName(assignment: TrainingAssignment): string | undefined {
  const record = assignment as unknown as Record<string, unknown>;
  const trainer = record.trainer;
  if (trainer && typeof trainer === "object" && "name" in trainer && typeof trainer.name === "string") {
    return trainer.name;
  }

  const assignedByUser = record.assignedByUser;
  if (
    assignedByUser &&
    typeof assignedByUser === "object" &&
    "name" in assignedByUser &&
    typeof assignedByUser.name === "string"
  ) {
    return assignedByUser.name;
  }

  const assignedBy = record.assignedBy;
  if (assignedBy && typeof assignedBy === "object" && "name" in assignedBy && typeof assignedBy.name === "string") {
    return assignedBy.name;
  }

  return undefined;
}

function formatSessionMode(mode?: string | null): string {
  if (!mode) return "Not specified";
  return SESSION_MODE_LABELS[mode] ?? mode.replace(/_/g, " ");
}

function buildInitialFormData(assignments: TrainingAssignment[]): Record<string, ConductFormEntry> {
  const initial: Record<string, ConductFormEntry> = {};
  assignments.forEach((assignment) => {
    initial[assignment.id] = {
      sessionId: assignment.id,
      remarks: "",
      performanceRating: TRAINING_PERFORMANCE.FAIR,
    };
  });
  return initial;
}

export default function ConductTrainingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const state = location.state as ConductTrainingState | null;
  const stateAssignments = state?.assignments ?? [];

  const assignmentIds = useMemo(() => {
    const fromState = stateAssignments.map((assignment) => assignment.id).filter(Boolean);
    const fromUrl = (searchParams.get("ids") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    return fromState.length > 0 ? fromState : fromUrl;
  }, [searchParams, stateAssignments]);

  const [fetchAssignment] = useLazyGetTrainingAssignmentQuery();
  const [resolvedAssignments, setResolvedAssignments] = useState<TrainingAssignment[]>(stateAssignments);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(assignmentIds.length > 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [bulkCompleteSessions, { isLoading: isSubmitting }] = useBulkCompleteSessionsMutation();
  const [formData, setFormData] = useState<Record<string, ConductFormEntry>>(() =>
    buildInitialFormData(stateAssignments),
  );

  useEffect(() => {
    if (assignmentIds.length === 0) {
      setResolvedAssignments([]);
      setIsLoadingAssignments(false);
      return;
    }

    let cancelled = false;

    const loadAssignments = async () => {
      setIsLoadingAssignments(true);
      setLoadError(null);

      try {
        const results = await Promise.all(
          assignmentIds.map((id) => fetchAssignment(id).unwrap()),
        );
        if (cancelled) return;

        const loaded = results
          .map((response) => response.data)
          .filter((assignment): assignment is TrainingAssignment => Boolean(assignment));

        setResolvedAssignments(loaded);
        setFormData(buildInitialFormData(loaded));
      } catch (error: unknown) {
        if (cancelled) return;
        const message =
          (error as { data?: { message?: string } })?.data?.message ??
          "Failed to load training session details";
        setLoadError(message);
        if (stateAssignments.length > 0) {
          setResolvedAssignments(stateAssignments);
          setFormData(buildInitialFormData(stateAssignments));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAssignments(false);
        }
      }
    };

    void loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [assignmentIds, fetchAssignment, stateAssignments]);

  const assignments = resolvedAssignments;

  const handleInputChange = (id: string, field: keyof ConductFormEntry, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    try {
      const payload = Object.values(formData).map((data) => ({
        sessionId: data.sessionId,
        performanceRating: data.performanceRating,
        sessionNotes: data.remarks || undefined,
      }));

      await bulkCompleteSessions({ sessions: payload }).unwrap();

      toast.success("Training records updated successfully");
      navigate(-1);
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "Failed to update training records";
      toast.error(message);
    }
  };

  if (isLoadingAssignments) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-slate-500">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-indigo-600" />
        <p>Loading training session details...</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-slate-500">
        <Users className="mb-4 h-12 w-12 opacity-20" />
        <p>No candidates selected for training.</p>
        <Button variant="link" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const primaryCandidate = assignments[0]?.candidateProjectMap?.candidate;
  const primaryName = primaryCandidate
    ? `${primaryCandidate.firstName ?? ""} ${primaryCandidate.lastName ?? ""}`.trim()
    : "";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
              Conduct Training Session
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {assignments.length === 1 && primaryName
                ? `Recording outcomes for ${primaryName}`
                : `Recording outcomes for ${assignments.length} candidates`}
            </p>
          </div>
        </div>

        {assignments.length > 1 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-indigo-100 bg-white p-3 shadow-sm">
            <div className="text-sm font-medium text-slate-600">Bulk Apply:</div>
            <Input
              placeholder="Common Remarks"
              className="h-9 w-full min-w-[12rem]"
              id="bulk-remarks"
            />
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              onClick={() => {
                const remarks = (document.getElementById("bulk-remarks") as HTMLInputElement).value;
                const updated = { ...formData };
                assignments.forEach((assignment) => {
                  updated[assignment.id] = {
                    ...updated[assignment.id],
                    ...(remarks ? { remarks } : {}),
                  };
                });
                setFormData(updated);
                toast.success("Applied to all candidates");
              }}
            >
              Apply to All
            </Button>
          </div>
        )}
      </div>

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-6">
        {assignments.map((assignment) => {
          const candidate = assignment.candidateProjectMap?.candidate;
          const project = assignment.candidateProjectMap?.project;
          const role = assignment.candidateProjectMap?.roleNeeded;
          const data = formData[assignment.id];
          const candidateName = candidate
            ? `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim() || "Unknown Candidate"
            : "Unknown Candidate";
          const candidatePhone = getCandidatePhone(candidate as Record<string, unknown> | undefined);
          const trainerName = resolveTrainerName(assignment);
          const scheduledTime = (assignment as TrainingAssignment & { scheduledTime?: string }).scheduledTime;
          const duration = (assignment as TrainingAssignment & { duration?: number }).duration;
          const sessionType = (assignment as TrainingAssignment & { sessionType?: string }).sessionType;
          const meetingLink = (assignment as TrainingAssignment & { meetingLink?: string }).meetingLink;
          const screening = (assignment as TrainingAssignment & {
            screening?: {
              overallRating?: number;
              remarks?: string;
              areasOfImprovement?: string;
              conductedAt?: string;
            };
          }).screening;

          return (
            <Card
              key={assignment.id}
              className="overflow-hidden border-indigo-100 shadow-sm transition-all hover:shadow-md"
            >
              <CardHeader className="border-b bg-slate-50/50 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-100 text-lg font-bold text-indigo-700">
                      {candidate?.firstName?.[0]}
                      {candidate?.lastName?.[0]}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="text-lg text-slate-900">{candidateName}</CardTitle>
                      <CardDescription className="text-sm">
                        {project?.title ?? "Project not available"}
                        {role?.designation ? ` • ${role.designation}` : ""}
                      </CardDescription>
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
                        {candidate?.email ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {String(candidate.email)}
                          </span>
                        ) : null}
                        {candidatePhone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {candidatePhone}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="w-fit bg-amber-100 text-amber-700 border-amber-200 capitalize"
                  >
                    {assignment.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                    <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-500">
                      <User className="h-4 w-4" />
                      Candidate
                    </p>
                    <p className="font-semibold text-slate-900">{candidateName}</p>
                    <p className="mt-1 text-sm text-slate-500">{candidate?.email ?? "Email not available"}</p>
                    <p className="mt-1 text-sm text-slate-500">{candidatePhone ?? "Phone not available"}</p>
                  </div>

                  <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4">
                    <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-500">
                      <Briefcase className="h-4 w-4" />
                      Context
                    </p>
                    <p className="font-semibold text-slate-900">{project?.title ?? "N/A"}</p>
                    <p className="mt-1 text-sm text-slate-500">{role?.designation ?? "Role not specified"}</p>
                    {trainerName ? (
                      <p className="mt-2 text-xs text-slate-500">Trainer: {trainerName}</p>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                    <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-500">
                      <Calendar className="h-4 w-4" />
                      Session
                    </p>
                    <p className="font-semibold text-slate-900">
                      {scheduledTime
                        ? format(new Date(scheduledTime), "EEE, MMM d, yyyy • h:mm a")
                        : "Not scheduled"}
                    </p>
                    <div className="mt-2 space-y-1 text-sm text-slate-500">
                      {duration ? (
                        <p className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {duration} minutes
                        </p>
                      ) : null}
                      <p className="inline-flex items-center gap-1.5">
                        {sessionType === "in_person" ? (
                          <MapPin className="h-3.5 w-3.5" />
                        ) : (
                          <Video className="h-3.5 w-3.5" />
                        )}
                        {formatSessionMode(sessionType)}
                      </p>
                      {meetingLink ? (
                        <a
                          href={meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-indigo-600 hover:underline"
                        >
                          {meetingLink}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>

                {assignment.focusAreas?.length ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                      <Target className="h-4 w-4" />
                      Focus Areas
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {assignment.focusAreas.map((area) => (
                        <Badge key={area} variant="outline" className="bg-white capitalize">
                          {area.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {assignment.notes ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                      Assignment Notes
                    </p>
                    <p className="text-sm leading-relaxed text-slate-700">{assignment.notes}</p>
                  </div>
                ) : null}

                {screening ? (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-600">
                        Screening Context
                      </p>
                      {screening.overallRating ? (
                        <Badge className="border-amber-200 bg-amber-100 text-amber-700">
                          Score: {screening.overallRating}/100
                        </Badge>
                      ) : null}
                    </div>
                    {screening.conductedAt ? (
                      <p className="mb-2 text-xs text-amber-700/80">
                        Conducted on {format(new Date(screening.conductedAt), "MMM d, yyyy")}
                      </p>
                    ) : null}
                    {screening.remarks ? (
                      <p className="text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Remarks: </span>
                        {screening.remarks}
                      </p>
                    ) : null}
                    {screening.areasOfImprovement ? (
                      <p className="mt-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Areas to improve: </span>
                        {screening.areasOfImprovement}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label
                    htmlFor={`remarks-${assignment.id}`}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Training Remarks & Observations
                  </label>
                  <Textarea
                    id={`remarks-${assignment.id}`}
                    placeholder="Enter detailed observations about the candidate's performance during this session..."
                    value={data?.remarks ?? ""}
                    onChange={(event) =>
                      handleInputChange(assignment.id, "remarks", event.target.value)
                    }
                    className="min-h-[120px] resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  size="lg"
                  className={cn(
                    "bg-indigo-600 px-8 shadow-xl shadow-indigo-100 hover:bg-indigo-700",
                    isSubmitting && "opacity-70",
                  )}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Complete Training Session
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>Save remarks and mark the scheduled session as completed</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
