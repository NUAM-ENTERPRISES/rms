import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, FileCheck, RefreshCw, Calendar, Send, Edit2, CheckCircle2 } from "lucide-react";
import { DatePicker } from "@/components/molecules/DatePicker";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useGetEmigrationRequirementsQuery, useCompleteStepMutation, useSubmitHrdDateMutation, useUpdateStepStatusMutation } from "@/services/processingApi";
import { ProcessingStepActionButtons } from "../../components/ProcessingStepActionButtons";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ConfirmSubmitDateModal from "../../components/ConfirmSubmitDateModal";
import ConfirmEditSubmitDateModal from "../../components/ConfirmEditSubmitDateModal";
import ConfirmEmigrationModal from "./ConfirmEmigrationModal";
import { ProcessingActionLockBanner } from "../../components/ProcessingActionLockBanner";
import { LockedProcessingActionButton } from "../../components/LockedProcessingActionButton";
import { useProcessingActionLock } from "@/features/processing/context/ProcessingActionLockContext";

interface EmigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  processingId: string;
  onComplete?: () => void | Promise<void>;
}

export function EmigrationModal({ isOpen, onClose, processingId, onComplete }: EmigrationModalProps) {
  const { isLocked } = useProcessingActionLock();
  const { data, isLoading, error, refetch } = useGetEmigrationRequirementsQuery(processingId, { skip: !isOpen || !processingId });

  const [completeStep, { isLoading: isCompletingStep }] = useCompleteStepMutation();
  const [submitHrdDate, { isLoading: isSubmittingDate }] = useSubmitHrdDateMutation();
  const [updateStepStatus] = useUpdateStepStatusMutation();

  const [emigrationSubmissionDate, setEmigrationSubmissionDate] = useState<Date | undefined>(undefined);
  const [isEmigrationCompletedCheck, setIsEmigrationCompletedCheck] = useState(false);

  useEffect(() => {
    if (data?.step) {
      setIsEmigrationCompletedCheck(data.step.isEmigrationCompleted || false);
    }
  }, [data?.step]);

  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [editSubmitOpen, setEditSubmitOpen] = useState(false);
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);

  const activeStep = data?.step;

  const isEmigrationCompleted = data?.step?.isEmigrationCompleted ?? data?.isEmigrationCompleted ?? false;
  const isStepCancelled = activeStep?.status === "cancelled";

  const hasSubmittedAt = Boolean(activeStep?.submittedAt);

  const handleSubmitEmigrationDate = async (date?: Date) => {
    const payloadDate = date ?? emigrationSubmissionDate;
    if (!activeStep?.id) { toast.error("No active step found"); return false; }
    if (!payloadDate) { toast.error("Please select a date and time"); return false; }

    try {
      await submitHrdDate({ stepId: activeStep.id, submittedAt: payloadDate.toISOString() }).unwrap();
      toast.success("Emigration submission date saved successfully");
      await refetch();
      return true;
    } catch (err: any) {
      console.error("Submit Emigration date failed", err);
      toast.error(err?.data?.message || "Failed to save Emigration submission date");
      return false;
    }
  };

  const canComplete = () => {
    return Boolean(activeStep?.id) && (hasSubmittedAt || emigrationSubmissionDate) && !isEmigrationCompleted && !isStepCancelled;
  };

  const handleConfirmComplete = async (notes?: string) => {
    if (!activeStep?.id) return false;
    if (!hasSubmittedAt && !emigrationSubmissionDate) { toast.error("Please set a submission date"); return false; }

    try {
      // Save isEmigrationCompleted from local checkbox state before marking the step complete
      await updateStepStatus({
        stepId: activeStep.id,
        data: { status: activeStep.status as any, isEmigrationCompleted: isEmigrationCompletedCheck },
      }).unwrap();

      await completeStep({ stepId: activeStep.id, notes }).unwrap();
      toast.success("Emigration step marked complete");

      setCompleteConfirmOpen(false);
      await refetch();
      if (onComplete) await onComplete();
      onClose();
      return true;
    } catch (err: any) {
      console.error("Complete emigration failed", err);
      toast.error(err?.data?.message || "Failed to complete emigration step");
      return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex max-h-[min(90dvh,720px)] w-[min(100%,calc(100vw-1rem))] flex-col overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 rounded-t-lg border-b bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-white sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card/10 sm:h-10 sm:w-10">
                <FileCheck className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-white sm:text-lg">Emigration</DialogTitle>
                <DialogDescription className="text-xs text-white/70 sm:text-sm">
                  Submit emigration status and date
                </DialogDescription>
              </div>
            </div>
            {data?.processingCandidate?.candidate && (
              <div className="min-w-0 pl-12 sm:pl-0 sm:text-right">
                <div className="truncate text-sm font-semibold text-white">
                  {data.processingCandidate.candidate.firstName}{" "}
                  {data.processingCandidate.candidate.lastName}
                </div>
                <div className="truncate text-xs text-white/60">
                  {data.processingCandidate.project?.title}
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-4 py-4 sm:px-6 sm:py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : error || !data ? (
            <Card className="p-6 text-center sm:p-8">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50">
                <AlertCircle className="h-7 w-7 text-rose-500" />
              </div>
              <div className="text-sm text-muted-foreground">Could not load Emigration details.</div>
            </Card>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <ProcessingActionLockBanner />

              <div className="overflow-hidden rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="border-b border-blue-200 bg-blue-100 px-3 py-1.5">
                  <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span className="leading-snug">Emigration Agency Submission Date & Time</span>
                  </h4>
                </div>
                <div className="p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <Label className="mb-1 block text-xs text-muted-foreground">
                        Select submission date and time
                      </Label>

                      {activeStep?.submittedAt ? (
                        <div className="flex flex-wrap items-center gap-2 sm:justify-between sm:gap-3">
                          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                            <div className="text-sm font-semibold text-foreground break-words">
                              {format(new Date(activeStep.submittedAt), "PPP 'at' p")}
                            </div>
                            <Badge className="shrink-0 bg-emerald-100 px-2 text-[11px] text-emerald-700">
                              Submitted
                            </Badge>
                          </div>
                          {!isEmigrationCompleted && !isStepCancelled && (
                            <LockedProcessingActionButton forceDisabled={isLocked}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 shrink-0 rounded-full bg-card p-0 shadow-sm disabled:opacity-80"
                                disabled={isLocked}
                                onClick={() => {
                                  setEditDate(new Date(activeStep.submittedAt));
                                  setEditSubmitOpen(true);
                                }}
                                title="Edit submission date"
                              >
                                <Edit2 className="h-4 w-4 text-foreground" />
                              </Button>
                            </LockedProcessingActionButton>
                          )}
                        </div>
                      ) : (
                        <>
                          <DatePicker
                            value={emigrationSubmissionDate}
                            onChange={setEmigrationSubmissionDate}
                            placeholder="Pick date and time"
                            compact
                            className="h-8 w-full"
                            disabled={isEmigrationCompleted || isLocked}
                          />
                          <div className="mt-2 text-xs text-muted-foreground">
                            Pick a date then click <span className="font-medium">Submit Date</span>.
                          </div>
                        </>
                      )}
                    </div>

                    {!activeStep?.submittedAt && !isStepCancelled && (
                      <div className="w-full shrink-0 sm:w-auto">
                        <LockedProcessingActionButton forceDisabled={isLocked}>
                          <Button
                            size="sm"
                            className="h-8 w-full bg-blue-600 text-white sm:w-auto"
                            onClick={() => setSubmitConfirmOpen(true)}
                            disabled={
                              isSubmittingDate ||
                              !emigrationSubmissionDate ||
                              isEmigrationCompleted ||
                              isLocked
                            }
                          >
                            {isSubmittingDate ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="mr-1 h-3.5 w-3.5" />
                            )}
                            Submit Date
                          </Button>
                        </LockedProcessingActionButton>
                      </div>
                    )}
                  </div>

                  {isEmigrationCompleted && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Emigration is completed. Submission date cannot be modified.
                    </p>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                <div className="border-b bg-muted px-3 py-2">
                  <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    Emigration Completion Status
                  </h4>
                </div>
                <div className="p-3 sm:p-4">
                  <div className="flex items-start gap-3 rounded-md border border-border bg-muted p-3 sm:items-center">
                    <Checkbox
                      id="isEmigrationCompleted"
                      checked={isEmigrationCompletedCheck}
                      onCheckedChange={(checked) => setIsEmigrationCompletedCheck(!!checked)}
                      disabled={isStepCancelled || isEmigrationCompleted || isLocked}
                      className="mt-0.5 h-5 w-5 shrink-0 border-border data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 sm:mt-0"
                    />
                    <div className="min-w-0 flex-1 grid gap-1.5 leading-none">
                      <label
                        htmlFor="isEmigrationCompleted"
                        className="cursor-pointer text-sm font-semibold text-foreground"
                      >
                        Emigration Completed
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Check this then click{" "}
                        <span className="font-medium">Mark Emigration Complete</span> to save.
                      </p>
                    </div>
                    {isCompletingStep && (
                      <Loader2 className="ml-auto h-4 w-4 shrink-0 animate-spin text-slate-400" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && data && (
          <div className="flex shrink-0 flex-col gap-3 border-t bg-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="text-xs text-muted-foreground">
              {hasSubmittedAt ? (
                <span className="font-medium text-emerald-600">Submission date recorded ✓</span>
              ) : (
                <span className="font-medium text-amber-600">Submission date not set</span>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto"
                onClick={async () => {
                  await refetch();
                  toast.success("Refreshed");
                }}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
              </Button>

              {!isEmigrationCompleted && !isStepCancelled && (
                <ProcessingStepActionButtons
                  processingStepId={activeStep?.id}
                  show={!isEmigrationCompleted && !isStepCancelled}
                  onSubmitted={async () => {
                    await refetch();
                    if (onComplete) await onComplete();
                  }}
                />
              )}

              {isEmigrationCompleted ? (
                <Badge className="w-fit bg-emerald-100 px-2 text-[11px] text-emerald-700">
                  Emigration Completed ✓
                </Badge>
              ) : isStepCancelled ? (
                <Badge className="w-fit bg-rose-100 px-2 text-[11px] text-rose-700">
                  Step Cancelled
                </Badge>
              ) : isLocked ? (
                <LockedProcessingActionButton forceDisabled>
                  <Button size="sm" disabled className="w-full opacity-80 sm:w-auto" aria-disabled>
                    Mark Emigration Complete
                  </Button>
                </LockedProcessingActionButton>
              ) : !hasSubmittedAt ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full sm:w-auto">
                        <Button size="sm" disabled className="w-full opacity-80 sm:w-auto">
                          Mark Emigration Complete
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Submission date required.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setCompleteConfirmOpen(true)}
                  disabled={isCompletingStep || !canComplete() || isLocked}
                >
                  {isCompletingStep ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Mark Emigration Complete"
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      <ConfirmSubmitDateModal isOpen={submitConfirmOpen} onClose={() => setSubmitConfirmOpen(false)} date={emigrationSubmissionDate} onConfirm={async () => { const ok = await handleSubmitEmigrationDate(); if (ok) setSubmitConfirmOpen(false); }} isSubmitting={isSubmittingDate} />

      <ConfirmEditSubmitDateModal isOpen={editSubmitOpen} onClose={() => setEditSubmitOpen(false)} existingDate={editDate ? editDate.toISOString() : activeStep?.submittedAt} onConfirm={async (newDate: Date) => { const ok = await handleSubmitEmigrationDate(newDate); return ok; }} isSubmitting={isSubmittingDate} />

      <ConfirmEmigrationModal
        isOpen={!!completeConfirmOpen}
        onClose={() => { setCompleteConfirmOpen(false); }}
        isSubmitting={isCompletingStep}
        onConfirm={async () => {
          const ok = await handleConfirmComplete();
          return ok;
        }}
      />

    </Dialog>
  );
}

export default EmigrationModal;
