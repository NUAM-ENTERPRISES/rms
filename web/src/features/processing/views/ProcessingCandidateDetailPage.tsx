import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CalendarDays, Mail, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useGetProcessingDetailQuery,
  useGetProcessingHistoryQuery,
  useUpdateProcessingStepMutation,
} from "../data/processing.endpoints";
import {
  PROCESSING_STEP_META_MAP,
  PROCESSING_STEP_STATUS_META,
} from "../constants/processingSteps";
import { ProcessingStatusBadge } from "../components/ProcessingStatusBadge";
import { ProcessingTimeline } from "../components/ProcessingTimeline";
import { ProcessingStepStatus } from "../types";
import { useCan } from "@/hooks/useCan";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ACTIONS: Array<{
  label: string;
  status: ProcessingStepStatus;
  variant:
    | "default"
    | "secondary"
    | "outline"
    | "destructive"
    | "ghost"
    | "link";
}> = [
  { label: "Pending", status: "IN_PROGRESS", variant: "outline" },
  { label: "Done", status: "DONE", variant: "default" },
  { label: "Rejected", status: "REJECTED", variant: "destructive" },
];

export default function ProcessingCandidateDetailPage() {
  const { candidateProjectMapId } = useParams<{
    candidateProjectMapId: string;
  }>();
  const navigate = useNavigate();
  const canUpdate = useCan("write:processing");

  const { data, isLoading } = useGetProcessingDetailQuery(
    candidateProjectMapId!,
    {
      skip: !candidateProjectMapId,
    }
  );

  const { data: historyData } = useGetProcessingHistoryQuery(
    candidateProjectMapId!,
    {
      skip: !candidateProjectMapId,
    }
  );

  const [updateStep, { isLoading: isUpdating }] =
    useUpdateProcessingStepMutation();

  const steps = useMemo(() => data?.data.steps ?? [], [data]);

  const handleUpdate = async (
    stepKey: string,
    status: ProcessingStepStatus,
    allowNotApplicable?: boolean
  ) => {
    if (!candidateProjectMapId) return;

    if (status === "NOT_APPLICABLE" && !allowNotApplicable) {
      toast.error("You cannot mark this step as not applicable.");
      return;
    }

    await updateStep({
      candidateProjectMapId,
      stepKey: stepKey as any,
      status,
    })
      .unwrap()
      .then(() => toast.success("Step updated"))
      .catch((err) => {
        toast.error(err?.data?.message ?? "Unable to update step");
      });
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto flex h-64 max-w-4xl flex-col items-center justify-center space-y-3 text-slate-500">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-violet-500" />
          <p>Loading processing detail…</p>
        </div>
      </div>
    );
  }

  const detail = data.data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Card className="border-none shadow-xl">
          <CardHeader className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">
                Processing Profile
              </p>
              <CardTitle className="mt-2 text-3xl font-black text-slate-900">
                {detail.candidate.firstName} {detail.candidate.lastName}
              </CardTitle>
              <p className="text-sm text-slate-500">
                {detail.project.title} &mdash;{" "}
                {detail.project.client?.name ?? "Client"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {detail.candidate.email && (
                <Badge variant="outline" className="gap-2">
                  <Mail className="h-3 w-3" />
                  {detail.candidate.email}
                </Badge>
              )}
              {detail.candidate.mobileNumber && (
                <Badge variant="outline" className="gap-2">
                  <Phone className="h-3 w-3" />
                  {detail.candidate.countryCode} {detail.candidate.mobileNumber}
                </Badge>
              )}
              {detail.project.deadline && (
                <Badge variant="outline" className="gap-2">
                  <CalendarDays className="h-3 w-3" />
                  Deadline:{" "}
                  {new Date(detail.project.deadline).toLocaleDateString(
                    "en-GB",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              {steps.map((step) => {
                const meta = PROCESSING_STEP_META_MAP[step.stepKey];
                const statusMeta = PROCESSING_STEP_STATUS_META[step.status];
                const selectedAction =
                  step.status === "NOT_APPLICABLE"
                    ? "NOT_APPLICABLE"
                    : step.status === "IN_PROGRESS"
                    ? "IN_PROGRESS"
                    : step.status;

                return (
                  <div
                    key={step.id}
                    className="rounded-3xl border border-slate-100 bg-white/70 p-4 shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-16 w-16 rounded-2xl border border-white bg-gradient-to-br p-1",
                          meta.accent
                        )}
                      >
                        <DotLottieReact src={meta.lottie} autoplay loop />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {meta.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {meta.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <ProcessingStatusBadge status={step.status} />
                      {step.dueDate && (
                        <span className="text-xs text-slate-500">
                          Due{" "}
                          {new Date(step.dueDate).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      )}
                    </div>
                    <Separator className="my-4" />
                    <div className="flex flex-wrap gap-2">
                      {ACTIONS.map((action) => (
                        <Button
                          key={action.status}
                          variant={
                            selectedAction === action.status
                              ? action.variant
                              : "outline"
                          }
                          size="sm"
                          disabled={!canUpdate || isUpdating}
                          onClick={() =>
                            handleUpdate(
                              meta.key,
                              action.status,
                              meta.allowNotApplicable
                            )
                          }
                        >
                          {action.label}
                        </Button>
                      ))}
                      {meta.allowNotApplicable && (
                        <Button
                          variant={
                            selectedAction === "NOT_APPLICABLE"
                              ? "secondary"
                              : "outline"
                          }
                          size="sm"
                          disabled={!canUpdate || isUpdating}
                          onClick={() =>
                            handleUpdate(
                              meta.key,
                              "NOT_APPLICABLE",
                              meta.allowNotApplicable
                            )
                          }
                        >
                          Mark N/A
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Processing Timeline
                </h2>
              </div>
              <ProcessingTimeline history={historyData?.data ?? []} />
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
