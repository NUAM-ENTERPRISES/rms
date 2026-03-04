import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, Phone, Mail } from "lucide-react";
import { ImageViewer } from "@/components/molecules";
import { cn } from "@/lib/utils";
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
  recruiter,
}: ProcessingCandidateHeaderProps) {
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      in_progress: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50",
      assigned: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50",
      completed: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50",
      cancelled: "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50",
    };
    return styles[status] || "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
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
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white dark:bg-black rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl text-slate-600 dark:text-slate-400 hover:text-violet-700 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 shrink-0"
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
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 truncate">
              {candidate.firstName} {candidate.lastName}
            </h1>
            <Badge 
              className={cn(
                "px-2 py-0.5 text-[10px] font-bold border",
                getStatusBadge(processingStatus)
              )}
            >
              {displayStatus(processingStatus)}
            </Badge>
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <Badge 
              variant="outline" 
              className="bg-violet-50 dark:bg-violet-950/40 font-bold border-violet-200 dark:border-violet-800/50 text-violet-700 dark:text-violet-300 text-[10px] px-1.5 py-0"
            >
              <Briefcase className="mr-1 h-3 w-3" /> {project.title}
            </Badge>
            <span className="font-bold text-slate-600 dark:text-slate-300">{role.designation}</span>
            {candidate.email && (
              <span className="flex items-center gap-1 hidden lg:flex">
                <Mail className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                {candidate.email}
              </span>
            )}
            {candidate.mobileNumber && (
              <span className="flex items-center gap-1 hidden lg:flex">
                <Phone className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                {candidate.countryCode} {candidate.mobileNumber}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {recruiter && (
          <p className="text-xs text-slate-400 dark:text-slate-500 hidden md:block">
            Recruited by <span className="font-bold text-slate-600 dark:text-slate-300">{recruiter.name}</span>
          </p>
        )}
        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
          ID: <span className="text-slate-600 dark:text-slate-300 font-mono font-bold">{processingId.slice(-8).toUpperCase()}</span>
        </p>
      </div>
    </div>
  );
}