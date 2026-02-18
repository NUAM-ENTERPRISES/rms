import { useState, useEffect, useMemo } from "react";
import { Loader2, CheckCircle2, XCircle, Users, CheckCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageViewer } from "@/components/molecules/ImageViewer";
import { cn } from "@/lib/utils";

type DecisionType = "shortlisted" | "not_shortlisted";

interface SelectedCandidate {
  id: string;
  candidate?: {
    firstName?: string;
    lastName?: string;
    profileImage?: string;
    email?: string;
  };
  roleNeeded?: {
    designation?: string;
  };
  project?: {
    title?: string;
  };
}

export interface CandidateDecision {
  id: string;
  decision: DecisionType;
  notes: string;
}

interface BulkClientDecisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCandidates: SelectedCandidate[];
  onSubmit: (decisions: CandidateDecision[]) => Promise<void>;
  isSubmitting?: boolean;
}

export function BulkClientDecisionModal({
  open,
  onOpenChange,
  selectedCandidates,
  onSubmit,
  isSubmitting = false,
}: BulkClientDecisionModalProps) {
  // Track individual decisions for each candidate
  const [decisions, setDecisions] = useState<Record<string, DecisionType | null>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Reset decisions when modal opens or candidates change
  useEffect(() => {
    if (open) {
      const initialDecisions: Record<string, DecisionType | null> = {};
      const initialNotes: Record<string, string> = {};
      selectedCandidates.forEach((c) => {
        initialDecisions[c.id] = null;
        initialNotes[c.id] = "";
      });
      setDecisions(initialDecisions);
      setNotes(initialNotes);
    }
  }, [open, selectedCandidates]);

  const setDecisionForCandidate = (id: string, decision: DecisionType) => {
    setDecisions((prev) => ({ ...prev, [id]: decision }));
  };

  const setNotesForCandidate = (id: string, note: string) => {
    setNotes((prev) => ({ ...prev, [id]: note }));
  };

  const setAllDecisions = (decision: DecisionType) => {
    const updated: Record<string, DecisionType | null> = {};
    selectedCandidates.forEach((c) => {
      updated[c.id] = decision;
    });
    setDecisions(updated);
  };

  // Summary counts
  const summary = useMemo(() => {
    const shortlisted = Object.values(decisions).filter((d) => d === "shortlisted").length;
    const notShortlisted = Object.values(decisions).filter((d) => d === "not_shortlisted").length;
    const pending = Object.values(decisions).filter((d) => d === null).length;
    return { shortlisted, notShortlisted, pending };
  }, [decisions]);

  const allDecided = summary.pending === 0;

  const handleSubmit = async () => {
    if (!allDecided) return;
    
    const decisionsList: CandidateDecision[] = Object.entries(decisions)
      .filter(([, decision]) => decision !== null)
      .map(([id, decision]) => ({ 
        id, 
        decision: decision as DecisionType,
        notes: notes[id] || ""
      }));
    
    await onSubmit(decisionsList);
    setDecisions({});
    setNotes({});
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setDecisions({});
      setNotes({});
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-600" />
            Bulk Update Client Decision
          </DialogTitle>
          <DialogDescription>
            Set individual status for each candidate. Click on the status buttons to update.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 py-4 space-y-4 overflow-hidden flex flex-col">
          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Quick actions:</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 border-green-200 text-green-700 hover:bg-green-50"
              onClick={() => setAllDecisions("shortlisted")}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Shortlist All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => setAllDecisions("not_shortlisted")}
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject All
            </Button>
          </div>

          {/* Candidates List with Individual Status */}
          <ScrollArea className="flex-1 rounded-md border bg-slate-50/50">
            <div className="p-3 space-y-2">
              {selectedCandidates.map((item) => {
                const currentDecision = decisions[item.id];
                const currentNotes = notes[item.id] || "";
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3 rounded-lg bg-white border transition-all space-y-2",
                      currentDecision === "shortlisted" && "border-green-300 bg-green-50/30",
                      currentDecision === "not_shortlisted" && "border-red-300 bg-red-50/30",
                      currentDecision === null && "border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <ImageViewer
                        src={item.candidate?.profileImage}
                        title={item.candidate ? `${item.candidate.firstName} ${item.candidate.lastName}` : "Unknown"}
                        className="h-10 w-10 shrink-0 rounded-full"
                        enableHoverPreview={false}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {item.candidate ? `${item.candidate.firstName} ${item.candidate.lastName}` : "Unknown Candidate"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="truncate">{item.roleNeeded?.designation || "Unknown Role"}</span>
                          <span>•</span>
                          <span className="truncate">{item.project?.title || "Unknown Project"}</span>
                        </div>
                      </div>
                      
                      {/* Status Selection Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setDecisionForCandidate(item.id, "shortlisted")}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                            currentDecision === "shortlisted"
                              ? "bg-green-600 text-white shadow-sm"
                              : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                          )}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Shortlisted
                        </button>
                        <button
                          type="button"
                          onClick={() => setDecisionForCandidate(item.id, "not_shortlisted")}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                            currentDecision === "not_shortlisted"
                              ? "bg-red-600 text-white shadow-sm"
                              : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                          )}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Not Shortlisted
                        </button>
                      </div>
                    </div>
                    
                    {/* Notes Input */}
                    <div className="pl-13">
                      <Input
                        placeholder={currentDecision === "not_shortlisted" ? "Add reason for rejection..." : "Add notes (optional)..."}
                        value={currentNotes}
                        onChange={(e) => setNotesForCandidate(item.id, e.target.value)}
                        className={cn(
                          "h-8 text-xs",
                          currentDecision === "shortlisted" && "border-green-200 focus-visible:ring-green-500",
                          currentDecision === "not_shortlisted" && "border-red-200 focus-visible:ring-red-500"
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Summary */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              {summary.shortlisted > 0 && (
                <Badge className="bg-green-100 text-green-800 text-xs">
                  {summary.shortlisted} Shortlisted
                </Badge>
              )}
              {summary.notShortlisted > 0 && (
                <Badge className="bg-red-100 text-red-800 text-xs">
                  {summary.notShortlisted} Not Shortlisted
                </Badge>
              )}
              {summary.pending > 0 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {summary.pending} Pending
                </Badge>
              )}
            </div>
            {!allDecided && (
              <p className="text-xs text-amber-600 font-medium">
                Please set status for all candidates
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-4 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!allDecided || isSubmitting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirm All Decisions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
