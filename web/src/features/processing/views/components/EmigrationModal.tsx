import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, FileCheck, RefreshCw, Calendar, Send, Edit2, XCircle } from "lucide-react";
import { DatePicker } from "@/components/molecules/DatePicker";
import { format } from "date-fns";
import React, { useState } from "react";
import { useGetEmigrationRequirementsQuery, useCompleteStepMutation, useCancelStepMutation, useSubmitHrdDateMutation } from "@/services/processingApi";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ConfirmSubmitDateModal from "../../components/ConfirmSubmitDateModal";
import ConfirmEditSubmitDateModal from "../../components/ConfirmEditSubmitDateModal";
import ConfirmCancelStepModal from "../../components/ConfirmCancelStepModal";
import ConfirmEmigrationModal from "./ConfirmEmigrationModal";

interface EmigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  processingId: string;
  onComplete?: () => void | Promise<void>;
}

export function EmigrationModal({ isOpen, onClose, processingId, onComplete }: EmigrationModalProps) {
  const { data, isLoading, error, refetch } = useGetEmigrationRequirementsQuery(processingId, { skip: !isOpen || !processingId });

  const [completeStep, { isLoading: isCompletingStep }] = useCompleteStepMutation();
  const [cancelStep, { isLoading: isCancelling }] = useCancelStepMutation();
  const [submitHrdDate, { isLoading: isSubmittingDate }] = useSubmitHrdDateMutation();

  const [emigrationSubmissionDate, setEmigrationSubmissionDate] = useState<Date | undefined>(undefined);

  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [editSubmitOpen, setEditSubmitOpen] = useState(false);
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);

  const activeStep = data?.step;

  const isEmigrationCompleted = data?.isEmigrationCompleted ?? false;
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

  const handleConfirmCancel = async (reason: string): Promise<void> => {
    if (!activeStep?.id) { toast.error("No active step found"); return; }
    try {
      await cancelStep({ stepId: activeStep.id, reason }).unwrap();
      toast.success("Processing step cancelled");
      setCancelOpen(false);
      await refetch();
      if (onComplete) await onComplete();
      onClose();
      return;
    } catch (err: any) {
      console.error("Cancel step failed", err);
      toast.error(err?.data?.message || "Failed to cancel step");
      return;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[70vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">Emigration</DialogTitle>
                <DialogDescription className="text-sm text-white/70">Submit emigration status and date</DialogDescription>
              </div>
            </div>
            {data?.processingCandidate?.candidate && (
              <div className="text-right">
                <div className="text-sm font-semibold text-white">{data.processingCandidate.candidate.firstName} {data.processingCandidate.candidate.lastName}</div>
                <div className="text-xs text-white/60">{data.processingCandidate.project?.title}</div>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
          ) : error || !data ? (
            <Card className="p-8 text-center">
              <div className="h-14 w-14 rounded-full bg-rose-50 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle className="h-7 w-7 text-rose-500" />
              </div>
              <div className="text-sm text-slate-600">Could not load Emigration details.</div>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="border rounded-lg overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="bg-blue-100 px-3 py-1 border-b border-blue-200">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Emigration Submission Date & Time
                  </h4>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs text-slate-600 mb-1 block">Select submission date and time</Label>

                      {activeStep?.submittedAt ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-semibold text-slate-800">{format(new Date(activeStep.submittedAt), "PPP 'at' p")}</div>
                            <Badge className="text-[11px] bg-emerald-100 text-emerald-700 px-2">Submitted</Badge>
                          </div>
                          {!isEmigrationCompleted && !isStepCancelled && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full bg-white shadow-sm" onClick={() => { setEditDate(new Date(activeStep.submittedAt)); setEditSubmitOpen(true); }} title="Edit submission date">
                              <Edit2 className="h-4 w-4 text-slate-700" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <>
                          <DatePicker value={emigrationSubmissionDate} onChange={setEmigrationSubmissionDate} placeholder="Pick date and time" compact className="w-full sm:min-w-[220px] h-8" disabled={isEmigrationCompleted} />
                          <div className="mt-2 text-xs text-slate-500">Pick a date then click <span className="font-medium">Submit Date</span>.</div>
                        </>
                      )}
                    </div>

                    {!activeStep?.submittedAt && !isStepCancelled && (
                      <div>
                        <Button size="sm" className="h-8 bg-blue-600 text-white" onClick={() => setSubmitConfirmOpen(true)} disabled={isSubmittingDate || !emigrationSubmissionDate || isEmigrationCompleted}>
                          {isSubmittingDate ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}Submit Date
                        </Button>
                      </div>
                    )}
                  </div>

                  {isEmigrationCompleted && <p className="text-xs text-slate-500 mt-3">Emigration is completed. Submission date cannot be modified.</p>}
                </div>
              </div>



            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && data && (
          <div className="px-6 py-3 border-t bg-slate-50 flex items-center justify-between">
            <div className="text-xs text-slate-500">{hasSubmittedAt ? ( <span className="text-emerald-600 font-medium">Submission date recorded ✓</span>) : (<span className="text-amber-600 font-medium">Submission date not set</span>)}</div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={async () => { await refetch(); toast.success('Refreshed'); }}><RefreshCw className="h-3.5 w-3.5 mr-1"/> Refresh</Button>

              {!isEmigrationCompleted && !isStepCancelled && (
                <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)} disabled={isCancelling}>{isCancelling ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Cancel Step</Button>
              )}

              {isEmigrationCompleted ? (
                <Badge className="text-[11px] bg-emerald-100 text-emerald-700 px-2">Emigration Completed ✓</Badge>
              ) : isStepCancelled ? (
                <Badge className="text-[11px] bg-rose-100 text-rose-700 px-2">Step Cancelled</Badge>
              ) : (
                (!hasSubmittedAt) ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button size="sm" disabled className="opacity-80">Mark Emigration Complete</Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Submission date required.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Button size="sm" onClick={() => setCompleteConfirmOpen(true)} disabled={isCompletingStep || !canComplete()}>{isCompletingStep ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Mark Emigration Complete'}</Button>
                )
              )}
            </div>
          </div>
        )}
      </DialogContent>

      <ConfirmSubmitDateModal isOpen={submitConfirmOpen} onClose={() => setSubmitConfirmOpen(false)} date={emigrationSubmissionDate} onConfirm={async () => { const ok = await handleSubmitEmigrationDate(); if (ok) setSubmitConfirmOpen(false); }} isSubmitting={isSubmittingDate} />

      <ConfirmEditSubmitDateModal isOpen={editSubmitOpen} onClose={() => setEditSubmitOpen(false)} existingDate={editDate ? editDate.toISOString() : activeStep?.submittedAt} onConfirm={async (newDate: Date) => { const ok = await handleSubmitEmigrationDate(newDate); return ok; }} isSubmitting={isSubmittingDate} />

      <ConfirmCancelStepModal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={handleConfirmCancel} isCancelling={isCancelling} />

      {/* Emigration confirmation — requires notes when status=FAILED */}
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
