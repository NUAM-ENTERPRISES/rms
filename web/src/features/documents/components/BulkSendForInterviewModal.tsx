import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  User,
  Mail,
  Phone,
  Building2,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { useBulkSendForInterviewMutation } from "@/features/projects/api";

interface BulkSendForInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Array<{
    id?: string;
    candidateProjectMapId?: string;
    candidate: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      mobileNumber: string;
      profileImage?: string;
    };
    project: {
      id: string;
      title: string;
      clientName?: string;
      client?: {
        id: string;
        name: string;
        email?: string;
        phone?: string;
      };
    };
    roleNeeded?: {
      roleCatalog?: {
        id: string;
        label: string;
      };
    };
    docsStatus?: string;
  }>;
  onSuccess?: () => void;
}

export function BulkSendForInterviewModal({
  isOpen,
  onClose,
  candidates,
  onSuccess,
}: BulkSendForInterviewModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16; // 4 rows × 4 columns
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [candidateNotes, setCandidateNotes] = useState<Record<string, string>>({});


  // Local visibility set so user can remove candidates from the batch before sending
  const [visibleCandidateKeys, setVisibleCandidateKeys] = useState<Set<string>>(new Set());

  const [bulkSendForInterview] = useBulkSendForInterviewMutation();

  const removeCandidate = (key: string) => {
    setVisibleCandidateKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);

      const newSize = next.size;
      if (newSize === 0) {
        // close modal if no candidates remain
        onClose();
      } else {
        const newTotalPages = Math.max(1, Math.ceil(newSize / itemsPerPage));
        setCurrentPage((p) => Math.min(p, newTotalPages));
      }

      return next;
    });
  }

  // Initialize a local visible-candidates set so users can remove cards locally
  useEffect(() => {
    if (isOpen) {
      // set visible candidates to incoming list
      const keys = new Set(candidates.map(c => c.id || c.candidateProjectMapId || ""));
      setVisibleCandidateKeys(keys);
    } else {
      // Reset state when modal closes
      setNotes("");
      setCandidateNotes({});
      setCurrentPage(1);
      setVisibleCandidateKeys(new Set());
    }
  }, [isOpen, candidates]);

  // Compute visible candidates (allows per-card removal)
  const visibleCandidates = useMemo(() => {
    if (visibleCandidateKeys.size === 0) return candidates;
    return candidates.filter(c => visibleCandidateKeys.has(c.id || c.candidateProjectMapId || ""));
  }, [candidates, visibleCandidateKeys]);

  // Pagination calculations (based on visible candidates)
  const totalPages = Math.ceil(visibleCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCandidates = visibleCandidates.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };



  const handleSendToClient = async () => {
    if (visibleCandidates.length === 0) {
      toast.error("No candidates selected");
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine individual candidate notes if any
      const individualNotes = visibleCandidates
        .filter(c => candidateNotes[c.candidate.id]?.trim())
        .map(c => `${c.candidate.firstName} ${c.candidate.lastName}: ${candidateNotes[c.candidate.id].trim()}`)
        .join("\n");

      const payload = {
        projectId: visibleCandidates[0]?.project.id,
        candidateIds: visibleCandidates.map(c => c.candidate.id),
        type: "interview_assigned" as const,
        notes: individualNotes || notes || `Bulk assignment for ${visibleCandidates.length} candidates for interview.`
      }; 

      console.log("Bulk Send for Interview Payload:", payload);
      
      await bulkSendForInterview(payload).unwrap();

      toast.success(`Candidates assigned for interview successfully (${visibleCandidates.length}).`);
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Bulk send error:", error);
      toast.error(error?.data?.message || error?.message || "Failed to send candidates");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="!max-w-[1400px] w-[90vw] max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none"
        showCloseButton={false}
      >
        <DialogHeader className="px-6 pt-5 pb-3 border-b bg-white dark:bg-gray-900 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Send className="h-6 w-6 text-purple-600" />
                Bulk Send for Interview
              </DialogTitle>
              <DialogDescription className="mt-1">
                Review and send {visibleCandidates.length} candidates to client for interview. All
                documents are verified.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-3">

              {totalPages > 1 && (
                <Badge
                  variant="outline"
                  className="border-purple-300 text-purple-700 font-bold px-3 py-1"
                >
                  Page {currentPage} of {totalPages}
                </Badge>
              )}
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-700 border-purple-200 font-bold px-3 py-1"
              >
                {visibleCandidates.length} Selected
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4 bg-slate-50/50 dark:bg-gray-950/50">
          <div className="max-w-5xl mx-auto space-y-2 mb-6">


            <div className="flex items-center gap-2 px-2">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">Candidates</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>

          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-4">
            {currentCandidates.map((candidate) => {
              const roleLabel =
                candidate.roleNeeded?.roleCatalog?.label || "Role Not Specified";
              const candidateName = `${candidate.candidate.firstName} ${candidate.candidate.lastName}`;
              const candidateKey = candidate.id || candidate.candidateProjectMapId || "";

              return (
                <Card
                  key={candidateKey}
                  className="relative border-purple-100 dark:border-purple-900/30 shadow-sm transition-all h-fit overflow-hidden bg-white dark:bg-gray-900"
                >
                  {/* Close / remove from batch button */}
                <div className="absolute top-2 right-2 z-30">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCandidate(candidateKey)}
                        aria-label={`Remove ${candidateName} from batch`}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-900 text-white">Remove from batch</TooltipContent>
                  </Tooltip>
                </div>

                  <CardContent className="p-4 space-y-3">
                    {/* Profile Section */}
                    <div className="flex items-start gap-3 border-b pb-3">
                      <div className="flex-shrink-0">
                        {candidate.candidate.profileImage ? (
                          <img
                            src={candidate.candidate.profileImage}
                            alt={candidateName}
                            className="h-12 w-12 rounded-full object-cover shadow-md border-2 border-purple-100"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 shadow-lg text-sm font-bold text-white">
                            {candidate.candidate.firstName?.[0]?.toUpperCase() ||
                              "A"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {candidateName}
                        </h4>
                        {candidate.docsStatus && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] mt-1",
                              candidate.docsStatus === "verified"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                            )}
                          >
                            {candidate.docsStatus}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">

                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-2">
                      {/* Email */}
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <a
                          href={`mailto:${candidate.candidate.email}`}
                          className="text-xs text-purple-600 hover:underline truncate"
                          title={candidate.candidate.email}
                        >
                          {candidate.candidate.email}
                        </a>
                      </div>

                      {/* Phone */}
                      {candidate.candidate.mobileNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <a
                            href={`tel:${candidate.candidate.mobileNumber}`}
                            className="text-xs text-purple-600 hover:underline"
                            title={candidate.candidate.mobileNumber}
                          >
                            {candidate.candidate.mobileNumber}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Project & Role */}
                    <div className="space-y-2 border-t pt-2">
                      {/* Project */}
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">
                            Project
                          </p>
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {candidate.project.title}
                          </p>
                        </div>
                      </div>

                      {/* Role Catalog */}
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">
                            Position
                          </p>
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {roleLabel}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Notes Field */}
                    <div className="pt-2 border-t">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold mb-1">
                        Candidate Notes
                      </p>
                      <Textarea
                        placeholder="Add specific notes for this candidate..."
                        className="text-xs min-h-[60px] resize-none bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        value={candidateNotes[candidate.candidate.id] || ""}
                        onChange={(e) => {
                          setCandidateNotes((prev) => ({
                            ...prev,
                            [candidate.candidate.id]: e.target.value,
                          }));
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </TooltipProvider>
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-white dark:bg-gray-900 mt-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Ready to send {visibleCandidates.length} candidate{visibleCandidates.length !== 1 ? 's' : ''} for interview
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Click <span className="font-semibold">Send for Interview</span> to notify the client and assign these candidates for interview.
                </p>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="h-8 px-3 gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-xs text-muted-foreground px-2">
                    Showing {startIndex + 1}-{Math.min(endIndex, candidates.length)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSendToClient}
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2 min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {"Queuing..."}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send for Interview
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>




  </>
  );
}
