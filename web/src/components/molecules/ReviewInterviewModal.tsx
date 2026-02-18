import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ClipboardCheck, User, Briefcase, Check, X as XIcon, ChevronRight, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageViewer } from "./ImageViewer";

type Outcome = "completed" | "passed" | "failed";

export interface ReviewInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The interview(s) to review. Can be a single object or an array of objects. */
  interview?: any | any[];
  /** Called when user confirms. Returns an array of updates. */
  onSubmit: (updates: { id: string; interviewStatus: Outcome; subStatus?: string; reason?: string }[]) => Promise<any>;
}

const statusMeta: Record<Outcome, { label: string; note: string; badgeClass: string; activeClass: string; icon: React.ReactNode }> = {
  passed: {
    label: "Passed",
    note: "Candidate qualified",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    activeClass: "bg-emerald-600 text-white shadow-emerald-200",
    icon: <Check className="h-3 w-3" />,
  },
  failed: {
    label: "Failed",
    note: "Not qualified",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    activeClass: "bg-red-600 text-white shadow-red-200",
    icon: <XIcon className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    note: "Interview finished",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    activeClass: "bg-blue-600 text-white shadow-blue-200",
    icon: <ClipboardCheck className="h-3 w-3" />,
  },
};

export default function ReviewInterviewModal({ isOpen, onClose, interview, onSubmit }: ReviewInterviewModalProps) {
  const [idToStatus, setIdToStatus] = useState<Record<string, Outcome>>({});
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Normalize interview data to an array
  const items = useMemo(() => {
    if (!interview) return [];
    if (Array.isArray(interview)) return interview;
    // Handle the old { isBulk, count } dummy object if it somehow sneaks in
    if (interview.isBulk) return []; 
    return [interview];
  }, [interview]);

  useEffect(() => {
    if (isOpen && items.length > 0) {
      const initial: Record<string, Outcome> = {};
      items.forEach((it) => {
        const outcome = it.outcome?.toLowerCase();
        if (outcome === "passed" || outcome === "failed" || outcome === "completed") {
          initial[it.id] = outcome as Outcome;
        } else {
          // Default to completed if none set
          initial[it.id] = "completed";
        }
      });
      setIdToStatus(initial);
      setReason("");
    }
  }, [isOpen, items]);

  const applyToAll = (status: Outcome) => {
    const updated = { ...idToStatus };
    items.forEach((it) => {
      updated[it.id] = status;
    });
    setIdToStatus(updated);
  };

  const handleConfirm = async () => {
    const updates = items.map((it) => {
      const status = idToStatus[it.id] || "completed";
      const mappedSubStatus = 
        status === "passed" ? "interview_passed" : 
        status === "failed" ? "interview_failed" : 
        "interview_completed";
      
      return {
        id: it.id,
        interviewStatus: status,
        subStatus: mappedSubStatus,
        reason: reason || undefined,
      };
    });

    if (updates.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(updates);
      onClose();
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allSameStatus = useMemo(() => {
    if (items.length <= 1) return null;
    const first = idToStatus[items[0]?.id];
    if (!first) return null;
    return items.every(it => idToStatus[it.id] === first) ? first : null;
  }, [items, idToStatus]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Review Interviews</DialogTitle>
              <DialogDescription className="mt-1">
                {items.length > 1 
                  ? `Evaluate ${items.length} selected candidates in bulk or individually.` 
                  : "Submit your final decision for this interview."
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {items.length > 1 && (
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                  Quick Apply to All
                </span>
                {allSameStatus && (
                  <Badge variant="outline" className="bg-white dark:bg-slate-800 border-indigo-100 text-indigo-600 text-[10px] uppercase font-bold tracking-wider">
                    All set to {allSameStatus}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(["passed", "failed", "completed"] as Outcome[]).map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    onClick={() => applyToAll(s)}
                    className={cn(
                      "h-10 text-xs font-medium border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-all",
                      allSameStatus === s && "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500"
                    )}
                  >
                    {statusMeta[s].icon}
                    <span className="ml-2">Mark all {statusMeta[s].label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <ScrollArea className="flex-1 px-6">
            <div className="py-4 space-y-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Candidates List
              </div>
              {items.map((it, idx) => {
                const cand = it.candidateProjectMap?.candidate || it.candidate;
                const role = it.candidateProjectMap?.roleNeeded || it.roleNeeded;
                const currentStatus = idToStatus[it.id];

                return (
                  <div key={it.id} className="group">
                    <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-all">
                      <ImageViewer
                        src={cand?.profileImage}
                        title={cand ? `${cand.firstName} ${cand.lastName}` : "Candidate"}
                        className="h-10 w-10 shrink-0"
                        enableHoverPreview={false}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {cand ? `${cand.firstName} ${cand.lastName}` : "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                          <Briefcase className="h-3 w-3" />
                          {role?.designation || "Unknown Role"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                        {(["passed", "failed", "completed"] as Outcome[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => setIdToStatus((prev) => ({ ...prev, [it.id]: s }))}
                            className={cn(
                              "px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all flex items-center gap-1.5",
                              currentStatus === s 
                                ? statusMeta[s].activeClass 
                                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                            )}
                            title={statusMeta[s].note}
                          >
                            {statusMeta[s].icon}
                            <span className="hidden sm:inline">{statusMeta[s].label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="p-6 pt-0 border-t bg-slate-50/50 dark:bg-slate-900/30">
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Overall Remarks (shared for all)
                </label>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Info className="h-3 w-3" />
                  Optional
                </div>
              </div>
              <Textarea
                className="min-h-[100px] text-sm resize-none bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-indigo-500"
                placeholder="Add final feedback, reasons for success/rejection, or any other notes..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t gap-3 flex-row items-center justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="font-medium">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isSubmitting || Object.keys(idToStatus).length < items.length}
            className="min-w-[140px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 dark:shadow-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Submit {items.length > 1 ? `${items.length} Reviews` : "Review"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Missing icon from imports in previous thought
import { CheckCircle2, Loader2 } from "lucide-react";
