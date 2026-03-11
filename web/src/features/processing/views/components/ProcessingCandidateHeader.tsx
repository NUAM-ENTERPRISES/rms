import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, Phone, Mail, Hash, Edit3 } from "lucide-react";
import { ImageViewer } from "@/components/molecules";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProcessingCandidateHeaderProps {
  candidate: {
    firstName: string;
    lastName: string;
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
}: ProcessingCandidateHeaderProps) {
  const navigate = useNavigate();

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

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black text-slate-900 truncate">
              {candidate.firstName} {candidate.lastName}
            </h1>
            <Badge className={`px-2 py-0.5 text-[10px] font-bold border ${getStatusBadge(processingStatus)}`}>
              {displayStatus(processingStatus)}
            </Badge>

            {/* Refined File Number Badge */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={onEditFileNumber}
                    className="flex items-center gap-2 px-2.5 py-1 text-[11px] font-black tracking-tight border border-violet-200 bg-violet-100/50 text-violet-700 rounded-lg hover:bg-violet-200 hover:border-violet-300 transition-all active:scale-95 group shadow-sm"
                  >
                    <div className="flex items-center justify-center w-4 h-4 rounded bg-violet-700 text-white shadow-sm group-hover:bg-violet-800 transition-colors">
                      <Hash className="h-2.5 w-2.5" />
                    </div>
                    <span className="uppercase opacity-70 text-[9px] font-bold">File #</span>
                    <span className="min-w-[40px] text-center">{fileNumber || "NOT SET"}</span>
                    <Edit3 className="ml-0.5 h-3 w-3 text-violet-400 group-hover:text-violet-700 opacity-60 group-hover:opacity-100" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-800 text-white border-slate-700">
                  <p className="font-bold">{fileNumber ? `File Reference: ${fileNumber}` : "Click to assign a master file record number"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
