import { format } from "date-fns";
import {
  User,
  Briefcase,
  MoveRight,
  CheckCircle2,
  ClipboardCheck,
  Mail,
  Phone,
  GraduationCap,
  CalendarDays,
  Layers,
  Users,
  Clock,
  ShieldCheck,
  Eye,
  Upload,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ImageViewer } from "@/components/molecules";
import { ProcessingHistory } from "@/features/processing/components/ProcessingHistory";
import { OfferLetterBadge } from "./OfferLetterBadge";
import { getOfferLetterUploaderName, hasOfferLetter } from "../utils/offerLetter";
import { getAge } from "@/utils/getAge";
import { cn } from "@/lib/utils";

export interface PassedCandidateDetailPanelProps {
  interview: any;
  offerLetterOverrides: Record<string, string>;
  isOfferVerified: boolean;
  isUpdating: boolean;
  onClose: () => void;
  onTransfer: () => void;
  onViewOfferLetter: (candidate: any) => void;
  onUploadOfferLetter: (candidateId: string, interviewId: string) => void;
}

export function PassedCandidateDetailPanel({
  interview,
  offerLetterOverrides,
  isOfferVerified,
  isUpdating,
  onClose,
  onTransfer,
  onViewOfferLetter,
  onUploadOfferLetter,
}: PassedCandidateDetailPanelProps) {
  const candidate = interview.candidateProjectMap?.candidate || interview.candidate;
  const candidateCode =
    candidate?.candidateCode ??
    (candidate as any)?.candidate_code ??
    undefined;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-950 dark:to-black">
      <div className="shrink-0 px-4 sm:px-6 py-4 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="h-9 gap-1.5" onClick={onClose}>
          <ChevronLeft className="h-4 w-4" />
          Back to Ready for Processing
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full [&>div>div]:!block">
          <div className="p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden w-full max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Candidate Details</h2>
            {interview.isTransferredToProcessing && (
              <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200 uppercase tracking-wider text-[10px]">
                Already Transferred
              </Badge>
            )}
          </div>
          {isOfferVerified ? (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 uppercase tracking-wider text-[10px] mb-2">
              Offer Letter Verified
            </Badge>
          ) : (
            hasOfferLetter(interview, offerLetterOverrides) && (
              <OfferLetterBadge
                className="mb-2"
                label="Offer Letter Ready"
                uploaderName={getOfferLetterUploaderName(interview)}
              />
            )
          )}
          <p className="text-sm text-muted-foreground">Passed on {format(new Date(interview.updatedAt || interview.scheduledTime), "PPP")}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Button 
            onClick={onTransfer}
            disabled={isUpdating || interview.isTransferredToProcessing}
            className={cn(
              "shadow-md transition-all hover:scale-105 h-9 min-w-[120px]",
              interview.isTransferredToProcessing 
                ? "bg-slate-200 text-slate-500 cursor-not-allowed hover:scale-100" 
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            )}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : interview.isTransferredToProcessing ? (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            ) : (
              <MoveRight className="h-4 w-4 mr-2" />
            )}
            {interview.isTransferredToProcessing ? "Transferred" : "Transfer"}
          </Button>

          <div className="flex items-center gap-0.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-0.5 shadow-sm overflow-hidden">
            {(interview.isOfferLetterUploaded || offerLetterOverrides[(interview.candidateProjectMap?.candidate || interview.candidate)?.id] || isOfferVerified) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => onViewOfferLetter(interview.candidateProjectMap?.candidate || interview.candidate)}
                title="View Offer Letter"
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden md:inline text-[10px] font-medium">View</span>
              </Button>
            )}
            {!isOfferVerified && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 gap-1 px-1.5",
                  (interview.isOfferLetterUploaded || offerLetterOverrides[(interview.candidateProjectMap?.candidate || interview.candidate)?.id])
                    ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    : "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                )}
                onClick={() => {
                            const c = interview.candidateProjectMap?.candidate || interview.candidate;
                            onUploadOfferLetter(c?.id, interview.id);
                          }}
                title={(interview.isOfferLetterUploaded || offerLetterOverrides[(interview.candidateProjectMap?.candidate || interview.candidate)?.id]) ? "Re-upload Offer" : "Upload Offer"}
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden md:inline text-[10px] font-medium">
                  {(interview.isOfferLetterUploaded || offerLetterOverrides[(interview.candidateProjectMap?.candidate || interview.candidate)?.id]) ? "Re-upload" : "Upload"}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Candidate Information Card */}
        <Card className="border-emerald-100 dark:border-emerald-900/30 overflow-hidden shadow-sm w-full">
          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 px-6 py-4 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
              <User className="h-5 w-5 shrink-0" />
              Candidate Details
            </h3>
            {(interview.candidateProjectMap?.candidate || interview.candidate)?.experience && (
              <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">
                {(interview.candidateProjectMap?.candidate || interview.candidate).experience} Years Experience
              </Badge>
            )}
          </div>
          <CardContent className="p-6 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="space-y-4 min-w-0 overflow-hidden">
                <div>
                  <div className="flex items-center gap-4">
                    <ImageViewer
                      src={candidate?.profileImage}
                      title={`${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim()}
                      className="h-18 w-18"
                      ariaLabel={`View profile image for ${candidate?.firstName || ''} ${candidate?.lastName || ''}`}
                      enableHoverPreview
                      hoverPosition="right"
                    />

                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Full Name</p>
                      <p className="font-bold text-xl text-slate-800 dark:text-slate-200 truncate">
                        {candidate?.firstName} {candidate?.lastName}
                      </p>
                      {candidateCode ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1">{candidateCode}</p>
                      ) : null}
                      {candidate?.currentRole || candidate?.email ? (
                        <p className="text-sm text-muted-foreground truncate mt-1">{candidate?.currentRole || candidate?.email}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">
                    <Mail className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Email Address</p>
                    <p className="text-sm font-medium truncate">{(interview.candidateProjectMap?.candidate || interview.candidate)?.email || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">
                    <Phone className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Contact Number</p>
                    <p className="text-sm font-medium truncate">
                      {(interview.candidateProjectMap?.candidate || interview.candidate)?.countryCode || "+91"} {(interview.candidateProjectMap?.candidate || interview.candidate)?.mobileNumber || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 min-w-0 overflow-hidden">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Personal Info</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium capitalize">{(interview.candidateProjectMap?.candidate || interview.candidate)?.gender?.toLowerCase() || "N/A"}</p>
                      <span className="text-slate-300">•</span>
                      <p className="text-sm font-medium">
                        {getAge((interview.candidateProjectMap?.candidate || interview.candidate)?.dateOfBirth) ? `${getAge((interview.candidateProjectMap?.candidate || interview.candidate)?.dateOfBirth)} years` : "Age N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {(() => {
                  const agentName =
                    interview.agentName ||
                    (interview.candidateProjectMap?.candidate || interview.candidate)?.agent?.name ||
                    "";
                  const agentType =
                    interview.agentType ||
                    (interview.candidateProjectMap?.candidate || interview.candidate)?.agent?.agentType ||
                    "";

                  if (!agentName && !agentType) return null;

                  const typeKey = String(agentType || "").toLowerCase();
                  const typeBadgeClass =
                    typeKey === "agency"
                      ? "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-800"
                      : typeKey === "sub-agent" || typeKey === "sub agent" || typeKey === "subagent"
                        ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800"
                        : typeKey === "freelancer"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800"
                          : typeKey === "international partner"
                            ? "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800"
                            : "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-800";

                  return (
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-full bg-violet-100/70 dark:bg-violet-900/30 shrink-0 ring-1 ring-violet-200 dark:ring-violet-800">
                        <Users className="h-4 w-4 text-violet-700 dark:text-violet-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Agent</p>
                        <div className="flex items-center gap-2 min-w-0 mt-1 flex-wrap">
                          {agentName ? (
                            <Badge
                              variant="outline"
                              className="bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800 font-bold"
                            >
                              {agentName}
                            </Badge>
                          ) : null}
                          {agentType ? (
                            <Badge
                              variant="outline"
                              className={cn("font-black uppercase tracking-wide text-[10px]", typeBadgeClass)}
                            >
                              {agentType}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                          
                {((interview.candidateProjectMap?.candidate || interview.candidate)?.qualifications?.length ?? 0) > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">
                      <GraduationCap className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Qualifications</p>
                      <div className="space-y-1 mt-1">
                        {(interview.candidateProjectMap?.candidate || interview.candidate).qualifications.map((q: any) => (
                          <div key={q.id} className="text-sm">
                            <p className="font-medium truncate leading-tight">{q.qualification?.name || q.qualification?.shortName || "Degree"}</p>
                            <p className="text-[11px] text-muted-foreground">{q.university} • {q.graduationYear}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 min-w-0 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Work Status</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Experience</span>
                      <span className="text-xs font-bold text-emerald-600">{(interview.candidateProjectMap?.candidate || interview.candidate)?.totalExperience || "0"}y</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full" 
                        style={{ width: `${Math.min(((interview.candidateProjectMap?.candidate || interview.candidate)?.totalExperience || 0) * 10, 100)}%` }} 
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">Current: {(interview.candidateProjectMap?.candidate || interview.candidate)?.currentRole || "Not Specified"}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project & Handoff Context Card */}
        <Card className="border-indigo-100 dark:border-indigo-900/30 overflow-hidden shadow-sm w-full">
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 px-6 py-4 border-b border-indigo-100 dark:border-indigo-900/30">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-indigo-800 dark:text-indigo-400">
              <Briefcase className="h-5 w-5 shrink-0" />
              Project Context
            </h3>
          </div>
          <CardContent className="p-6 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="space-y-4 min-w-0 overflow-hidden">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Target Project</p>
                  <p className="font-bold text-lg text-slate-800 dark:text-slate-200 truncate">
                    {interview.candidateProjectMap?.project?.title || interview.project?.title}
                  </p>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-900/40 shrink-0">
                    <Layers className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Hiring Designation</p>
                    <p className="text-sm font-medium truncate">{(interview.candidateProjectMap?.roleNeeded || interview.roleNeeded)?.designation || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-900/40 shrink-0">
                    <Clock className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Deadline & Status</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-amber-600 border-amber-200 shrink-0">
                        {interview.candidateProjectMap?.project?.priority || "Medium"}
                      </Badge>
                      <span className="text-xs font-medium">
                        {interview.candidateProjectMap?.project?.deadline ? format(new Date(interview.candidateProjectMap.project.deadline), "MMM d, yyyy") : "No Deadline"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 min-w-0 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Requirement Details</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Type</p>
                      <p className="text-sm font-medium truncate">{(interview.candidateProjectMap?.project?.type || "Bulk").replace("_", " ")}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Creator</p>
                      <p className="text-sm font-medium truncate">{interview.candidateProjectMap?.project?.createdBy?.name || "System"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Grooming Standard</p>
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <p className="text-xs font-medium truncate">{interview.candidateProjectMap?.project?.groomingStandard || "A-Grade"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 min-w-0 overflow-hidden">
                <div className="p-4 bg-indigo-50/30 dark:bg-indigo-900/20 rounded-xl border border-indigo-50 dark:border-indigo-900/40 overflow-hidden">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assigned Recruiter</p>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800 shrink-0">
                      <AvatarFallback className="bg-indigo-500 text-white text-xs">
                        {interview.candidateProjectMap?.recruiter?.name?.split(" ").map((n: string) => n[0]).join("") || "R"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{interview.candidateProjectMap?.recruiter?.name || "System Assigned"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{interview.candidateProjectMap?.recruiter?.email || "recruiter@system.com"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-emerald-100 dark:border-emerald-900/30 overflow-hidden w-full">
        <CardContent className="p-6 overflow-hidden">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            Interview Summary
          </h3>
          <div className="space-y-4 overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm overflow-hidden">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg overflow-hidden">
                <p className="text-muted-foreground text-xs uppercase font-semibold">Final Outcome</p>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 mt-1">PASSED</Badge>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg">
                <p className="text-muted-foreground text-xs uppercase font-semibold">Mode</p>
                <p className="font-medium capitalize mt-1">{interview.mode?.replace("_", " ") || "—"}</p>
              </div>
            </div>
                      
            {interview.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm font-semibold mb-2">Interviewer Feedback & Notes</p>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm border italic text-slate-700 dark:text-slate-300 leading-relaxed">
                  "{interview.notes}"
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {interview.isTransferredToProcessing && 
       interview.candidateProjectMap?.candidate?.id && 
       interview.candidateProjectMap?.project?.id && 
       interview.candidateProjectMap?.roleNeeded?.roleCatalogId && (
        <div className="w-full">
          <ProcessingHistory
            candidateId={interview.candidateProjectMap.candidate.id}
            projectId={interview.candidateProjectMap.project.id}
            roleCatalogId={interview.candidateProjectMap.roleNeeded.roleCatalogId}
          />
        </div>
      )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
