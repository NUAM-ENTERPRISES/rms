import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, Phone, Mail, FileStack, Archive, MapPin } from "lucide-react";
import { ImageViewer } from "@/components/molecules";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AffiniksOriginalDocsModal } from "./AffiniksOriginalDocsModal.tsx";

interface OriginalDocumentCollectionSummary {
  id: string;
  status: string;
  lockerFileNumber?: string | null;
  mergedDocument?: {
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType?: string;
  } | null;
}

interface ProcessingCandidateHeaderProps {
  candidate: {
    firstName: string;
    lastName: string;
    candidateCode?: string | null;
    email?: string;
    mobileNumber?: string;
    countryCode?: string;
    dateOfBirth?: string;
    gender?: string;
    totalExperience?: number;
    profileImage?: string | null;
  };
  project: {
    title: string;
  };
  role: {
    designation: string;
  };
  processingStatus: string;
  processingId: string;
  fileNumber?: string | null;
  recruiter?: {
    name: string;
  };
  originalDocumentCollection?: OriginalDocumentCollectionSummary | null;
  documentReceivedStepStatus?: string | null;
}

export function ProcessingCandidateHeader({
  candidate,
  project,
  role,
  processingStatus,
  processingId,
  fileNumber,
  recruiter,
  originalDocumentCollection,
  documentReceivedStepStatus,
}: ProcessingCandidateHeaderProps) {
  const navigate = useNavigate();
  const [originalDocsOpen, setOriginalDocsOpen] = useState(false);
  const mergedDocument = originalDocumentCollection?.mergedDocument;
  const hasOriginalDocCollection = Boolean(originalDocumentCollection?.id);
  const showOriginalDocumentBadge =
    documentReceivedStepStatus !== "cancelled" &&
    (hasOriginalDocCollection || Boolean(documentReceivedStepStatus));
  const lockerLocation = originalDocumentCollection?.lockerFileNumber?.trim();
  const showCollectedLabel =
    documentReceivedStepStatus === "completed" && Boolean(mergedDocument?.fileUrl);
  const showSubmittedLabel = !showCollectedLabel && hasOriginalDocCollection;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      in_progress: "bg-blue-100 text-blue-700 border-blue-200",
      assigned: "bg-indigo-100 text-indigo-700 border-indigo-200",
      completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
      cancelled: "bg-rose-100 text-rose-700 border-rose-200",
    };
    return styles[status] || "bg-slate-100 text-slate-700";
  };

  const displayStatus = (status: string) => {
    const labels: Record<string, string> = {
      assigned: "Ready for Processing",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white rounded-2xl shadow-xl border border-slate-100">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl text-slate-600 hover:text-violet-700 hover:bg-violet-50 shrink-0"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <ImageViewer
          title={`${candidate.firstName} ${candidate.lastName}`}
          src={candidate.profileImage || null}
          className="h-14 w-14 rounded-xl"
          ariaLabel={`View full image for ${candidate.firstName} ${candidate.lastName}`}
          enableHoverPreview={true}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
            <h1 className="shrink-0 text-xl font-black text-slate-900 whitespace-nowrap">
              {candidate.firstName} {candidate.lastName}
            </h1>
            {candidate.candidateCode && (
              <div className="inline-flex shrink-0 items-center rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-mono font-bold text-red-700 border border-red-200 whitespace-nowrap">
                {candidate.candidateCode}
              </div>
            )}
            <Badge className={`shrink-0 whitespace-nowrap px-2 py-0.5 text-[10px] font-bold border ${getStatusBadge(processingStatus)}`}>
              {displayStatus(processingStatus)}
            </Badge>

            <div className="flex shrink-0 items-center gap-1.5 flex-nowrap">
              {showOriginalDocumentBadge ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setOriginalDocsOpen(true)}
                        className={cn(
                          "relative inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-xl border px-2.5 py-1.5 text-[10px] font-black shadow-sm whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          showCollectedLabel
                            ? "border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 text-emerald-900 hover:shadow-md hover:bg-emerald-50"
                            : "border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50 text-amber-950 hover:shadow-md hover:bg-amber-50",
                        )}
                        aria-label="View original document collection details"
                      >
                        {/* Glow + glancing sheen (motion-safe) */}
                        <span
                          aria-hidden="true"
                          className={cn(
                            "pointer-events-none absolute inset-0 opacity-0 transition-opacity",
                            "motion-safe:opacity-100",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute -inset-x-10 -inset-y-6",
                              "bg-gradient-to-r from-transparent via-white/60 to-transparent",
                              "motion-safe:animate-pulse",
                              showCollectedLabel ? "via-emerald-200/40" : "via-amber-200/40",
                            )}
                          />
                          <span
                            className={cn(
                              "absolute inset-0",
                              showCollectedLabel
                                ? "shadow-[0_0_22px_rgba(16,185,129,0.25)]"
                                : "shadow-[0_0_22px_rgba(245,158,11,0.22)]",
                            )}
                          />
                        </span>
                        <span
                          className={cn(
                            "mr-0.5 inline-flex h-5 w-5 items-center justify-center rounded-lg shadow-sm ring-1 ring-inset",
                            showCollectedLabel
                              ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                              : "bg-amber-100 text-amber-700 ring-amber-200",
                          )}
                        >
                          <FileStack className="h-3 w-3 shrink-0" />
                        </span>
                        <span>
                          {showCollectedLabel
                            ? "Document collected"
                            : showSubmittedLabel
                              ? "Original Documents submitted"
                              : "Original Documents not submitted"}
                        </span>
                        {fileNumber ? (
                          <span className="inline-flex items-center gap-0.5 font-mono">
                            <span className="opacity-50">·</span>
                            <span
                              className={cn(
                                "rounded-md px-1.5 py-0.5 text-[10px] font-black shadow-sm ring-1 ring-inset",
                                showCollectedLabel
                                  ? "bg-white text-slate-900 ring-emerald-200"
                                  : "bg-white text-slate-900 ring-amber-200",
                              )}
                            >
                              {fileNumber}
                            </span>
                          </span>
                        ) : null}
                        {lockerLocation ? (
                          <span className="inline-flex items-center gap-0.5 font-mono">
                            <span className="opacity-50">·</span>
                            <Archive className="h-2.5 w-2.5" />
                            {lockerLocation}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 opacity-80">
                            <span className="opacity-50">·</span>
                            <MapPin className="h-2.5 w-2.5" />
                            In collection
                          </span>
                        )}

                        <span
                          className={cn(
                            "ml-0.5 inline-flex h-1.5 w-1.5 rounded-full",
                            showCollectedLabel ? "bg-emerald-500" : "bg-amber-500",
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs bg-slate-800 text-white border-slate-700">
                      <p className="font-bold">
                        {showCollectedLabel
                          ? "Original document collection by Affiniks"
                          : showSubmittedLabel
                            ? "Original documents submitted"
                            : "Original documents pending"}
                      </p>
                      <p className="mt-1 text-xs text-slate-300">
                        {showCollectedLabel
                          ? "Available for Documents Received (Step 2)"
                          : showSubmittedLabel
                            ? "Documents are submitted (merge may still be processing)"
                            : "Documents have not been submitted for Step 2 yet"}
                        {lockerLocation ? ` · Locker ${lockerLocation}` : ""}
                      </p>
                      {mergedDocument?.fileName ? (
                        <p className="mt-1 truncate text-xs text-slate-400">{mergedDocument.fileName}</p>
                      ) : null}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
            </div>
          </div>

          <AffiniksOriginalDocsModal
            open={originalDocsOpen}
            onOpenChange={setOriginalDocsOpen}
            processingId={processingId}
            fileNumber={fileNumber ?? null}
            originalDocumentCollection={originalDocumentCollection ?? null}
          />

          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            <Badge variant="outline" className="bg-violet-50 font-bold border-violet-200 text-violet-700 text-[10px] px-1.5 py-0">
              <Briefcase className="mr-1 h-3 w-3" /> {project.title}
            </Badge>
            <span className="font-bold text-slate-600">{role.designation}</span>
            {candidate.email && (
              <span className="flex items-center gap-1 hidden lg:flex">
                <Mail className="h-3 w-3 text-slate-400" />
                {candidate.email}
              </span>
            )}
            {candidate.mobileNumber && (
              <span className="flex items-center gap-1 hidden lg:flex">
                <Phone className="h-3 w-3 text-slate-400" />
                {candidate.countryCode} {candidate.mobileNumber}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {recruiter && (
          <p className="text-xs text-slate-400 hidden md:block">
            Recruited by <span className="font-bold text-slate-600">{recruiter.name}</span>
          </p>
        )}
       
        {/* <p className="text-[10px] font-medium text-slate-400">
          ID: <span className="text-slate-600 font-mono font-bold">{processingId.slice(-8).toUpperCase()}</span>
        </p> */}
      </div>
    </div>
  );
}
