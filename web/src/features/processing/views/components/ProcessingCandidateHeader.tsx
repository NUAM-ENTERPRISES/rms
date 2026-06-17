import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, Phone, Mail, Hash, Edit3, FileStack, Archive, MapPin } from "lucide-react";
import { ImageViewer } from "@/components/molecules";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
  onEditFileNumber?: () => void;
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
  onEditFileNumber,
  recruiter,
  originalDocumentCollection,
  documentReceivedStepStatus,
}: ProcessingCandidateHeaderProps) {
  const navigate = useNavigate();
  const mergedDocument = originalDocumentCollection?.mergedDocument;
  const showOriginalDocumentBadge = Boolean(
    mergedDocument?.fileUrl &&
      documentReceivedStepStatus &&
      documentReceivedStepStatus !== "cancelled",
  );
  const lockerLocation = originalDocumentCollection?.lockerFileNumber?.trim();

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
              {/* Refined File Number Badge */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={onEditFileNumber}
                      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2 py-1 text-[11px] font-black tracking-tight border border-violet-200 bg-violet-100/50 text-violet-700 rounded-lg hover:bg-violet-200 hover:border-violet-300 transition-all active:scale-95 group shadow-sm"
                    >
                      <div className="flex items-center justify-center w-4 h-4 rounded bg-violet-700 text-white shadow-sm group-hover:bg-violet-800 transition-colors">
                        <Hash className="h-2.5 w-2.5" />
                      </div>
                      <span className="uppercase opacity-70 text-[9px] font-bold">File #</span>
                      <span>{fileNumber || "NOT SET"}</span>
                      <Edit3 className="ml-0.5 h-3 w-3 text-violet-400 group-hover:text-violet-700 opacity-60 group-hover:opacity-100" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800 text-white border-slate-700">
                    <p className="font-bold">{fileNumber ? `File Reference: ${fileNumber}` : "Click to assign a master file record number"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {showOriginalDocumentBadge ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold shadow-sm whitespace-nowrap",
                          documentReceivedStepStatus === "completed"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-teal-200 bg-teal-50 text-teal-800",
                        )}
                      >
                        <FileStack className="h-3 w-3 shrink-0" />
                        <span>Step 2 · Original docs</span>
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
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs bg-slate-800 text-white border-slate-700">
                      <p className="font-bold">Original document collection merged PDF</p>
                      <p className="mt-1 text-xs text-slate-300">
                        Available for Documents Received (Step 2)
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
       
        <p className="text-[10px] font-medium text-slate-400">
          ID: <span className="text-slate-600 font-mono font-bold">{processingId.slice(-8).toUpperCase()}</span>
        </p>
      </div>
    </div>
  );
}
