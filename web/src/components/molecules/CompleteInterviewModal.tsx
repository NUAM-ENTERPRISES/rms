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
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardCheck, Briefcase, Info } from "lucide-react";

export interface CompleteInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The interview(s) to complete. Can be a single object or an array of objects. */
  interview?: any | any[];
  /** Called when user confirms. Returns an array of updates. */
  onSubmit: (updates: { id: string; interviewStatus: string; subStatus?: string; reason?: string }[]) => Promise<any>;
}

export default function CompleteInterviewModal({ isOpen, onClose, interview, onSubmit }: CompleteInterviewModalProps) {
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Normalize interview data to an array
  const items = useMemo(() => {
    if (!interview) return [];
    if (Array.isArray(interview)) return interview;
    return [interview];
  }, [interview]);

  useEffect(() => {
    if (isOpen) {
      setReason("");
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    const updates = items.map((it) => {
      return {
        id: it.id,
        interviewStatus: "completed",
        subStatus: "interview_completed",
        reason: reason || undefined,
      };
    });

    if (updates.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(updates);
      onClose();
    } catch (err) {
      console.error("Failed to submit completion:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-900/40 text-green-600 dark:text-green-400">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Complete Interview</DialogTitle>
              <DialogDescription className="mt-1">
                {items.length > 1 
                  ? `Mark ${items.length} selected interviews as completed.` 
                  : "Mark this interview as completed to proceed with the review."
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 px-6">
            <div className="py-4 space-y-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Candidates List
              </div>
              {items.map((it) => {
                const cand = it.candidateProjectMap?.candidate || it.candidate;
                const role = it.candidateProjectMap?.roleNeeded || it.roleNeeded;

                return (
                  <div key={it.id} className="group">
                    <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-all">
                      <div className="h-10 w-10 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 font-bold">
                        {cand?.firstName?.[0] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {cand ? `${cand.firstName} ${cand.lastName}` : "Unknown Candidate"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                          <Briefcase className="h-3 w-3" />
                          {role?.designation || role?.label || "Unknown Role"}
                        </p>
                      </div>
                      <div className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md">
                        Ready to Complete
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="p-6 border-t bg-slate-50/50 dark:bg-slate-900/30">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Notes / Feedback
                </label>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Info className="h-3 w-3" />
                  Optional
                </div>
              </div>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px] text-sm resize-none bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-green-500"
                placeholder="Add any interview notes, initial feedback, or comments here..."
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-white dark:bg-slate-950">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isSubmitting ? "Completing..." : `Complete ${items.length > 1 ? "Interviews" : "Interview"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
