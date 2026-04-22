import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  ChevronLeft,
  Calendar,
  User,
  Briefcase,
  Edit3,
  CheckCircle2,
  MapPin,
  Building2,
  Mail,
  Phone,
  Clock,
  Link2,
  FileText,
  Activity,
  Target,
  AlertCircle,
} from "lucide-react";
import { useGetInterviewQuery, useGetInterviewHistoryQuery, useUpdateBulkInterviewStatusMutation } from "../api";
import { toast } from "sonner";
import ReviewInterviewModal from "@/components/molecules/ReviewInterviewModal";
import InterviewHistory from "@/components/molecules/InterviewHistory";
import EditInterviewDialog from "../components/EditInterviewDialog";
import { ImageViewer } from "@/components/molecules";
import { cn } from "@/lib/utils";
import { FaWhatsapp } from "react-icons/fa";

const getOutcomeConfig = (outcome?: string) => {
  switch (outcome?.toLowerCase()) {
    case "passed":
      return {
        label: "Passed",
        variant: "default" as const,
        bgClass: "bg-emerald-600 text-white",
        dotClass: "bg-emerald-500",
        icon: CheckCircle2,
      };
    case "failed":
      return {
        label: "Failed",
        variant: "destructive" as const,
        bgClass: "bg-red-600 text-white",
        dotClass: "bg-red-500",
        icon: AlertCircle,
      };
    case "completed":
      return {
        label: "Completed",
        variant: "default" as const,
        bgClass: "bg-blue-600 text-white",
        dotClass: "bg-blue-500",
        icon: CheckCircle2,
      };
    case "backout":
      return {
        label: "Backout",
        variant: "secondary" as const,
        bgClass: "bg-amber-600 text-white",
        dotClass: "bg-amber-500",
        icon: AlertCircle,
      };
    default:
      return {
        label: "Pending",
        variant: "secondary" as const,
        bgClass: "bg-zinc-700 text-white",
        dotClass: "bg-slate-400",
        icon: Clock,
      };
  }
};

export default function InterviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetInterviewQuery(id ?? "", { skip: !id });
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [updateBulkInterviewStatus] = useUpdateBulkInterviewStatusMutation();
  const interview = data?.data;
  const { data: historyResp, isLoading: isHistoryLoading } = useGetInterviewHistoryQuery(
    { id: interview?.id ?? "", page: historyPage, limit: historyLimit },
    { skip: !interview?.id }
  );

  useEffect(() => {
    if (error) toast.error("Failed to load interview details");
  }, [error]);

  if (!id) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No interview id provided in the URL.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Interview details could not be loaded.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const selected = interview!;
  const candidate = interview?.candidate || interview?.candidateProjectMap?.candidate;
  const project = interview?.project || interview?.candidateProjectMap?.project;
  const role = interview?.roleNeeded || interview?.candidateProjectMap?.roleNeeded;

  const outcomeConfig = getOutcomeConfig(selected.outcome);
  const OutcomeIcon = outcomeConfig.icon;

  const handleReviewSubmit = async (updates: { id: string; interviewStatus: any; subStatus?: string; reason?: string }[]) => {
    try {
      await updateBulkInterviewStatus({ updates }).unwrap();
      toast.success(`${updates.length} interview(s) updated successfully`);
      setIsReviewOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      {/* Sticky Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-50 rounded-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Candidate Profile */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-8 w-8 rounded-full hover:bg-slate-100 shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="relative shrink-0">
                <ImageViewer
                  src={candidate?.profileImage || null}
                  title={candidate ? `${candidate.firstName} ${candidate.lastName}` : "Candidate"}
                  className="h-14 w-14 rounded-xl shadow-sm border border-slate-200 object-cover"
                />
                <div
                  className={cn(
                    "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center",
                    outcomeConfig.dotClass
                  )}
                >
                  <OutcomeIcon className="h-2.5 w-2.5 text-white" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 truncate">
                    {candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown Candidate"}
                  </h1>
                  <Badge
                    className={cn("rounded-full px-2 py-0 h-5 text-[9px] uppercase font-bold tracking-wider", outcomeConfig.bgClass)}
                  >
                    {outcomeConfig.label}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <div className="flex items-center gap-3">
                    {candidate?.email && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <Mail className="h-3 w-3 text-indigo-400" />
                        {candidate.email}
                      </div>
                    )}
                    {candidate?.mobileNumber && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <Phone className="h-3 w-3 text-indigo-400" />
                        {candidate.mobileNumber}
                      </div>
                    )}
                  </div>

                  <div className="hidden sm:block h-3 w-px bg-slate-200" />

                  <div className="flex items-center gap-3">
                    {(candidate as any)?.totalExperience !== undefined && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <Briefcase className="h-3 w-3 text-amber-400" />
                        {(candidate as any).totalExperience}y Exp
                      </div>
                    )}
                    {(candidate as any)?.gender && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <User className="h-3 w-3 text-blue-400" />
                        <span className="capitalize">{(candidate as any).gender}</span>
                      </div>
                    )}
                    {selected.scheduledTime && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <Calendar className="h-3 w-3 text-rose-400" />
                        {format(new Date(selected.scheduledTime), "dd MMM yyyy")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Meta + Action */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <div className="min-w-[100px]">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-1">Project</p>
                  <p className="text-[11px] font-bold text-slate-700 truncate max-w-[150px]">{project?.title || "N/A"}</p>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-1">Role</p>
                  <p className="text-[11px] font-bold text-slate-700 truncate max-w-[150px]">{role?.designation || "N/A"}</p>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-1">Type</p>
                  <p className="text-[11px] font-bold text-slate-700 capitalize">{selected.type || "N/A"}</p>
                </div>
              </div>

              {selected.outcome === "completed" ||
              selected.outcome === "passed" ||
              selected.outcome === "failed" ||
              selected.outcome === "backout" ? (
                <Button
                  size="sm"
                  onClick={() => setIsReviewOpen(true)}
                  className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm px-4 text-xs font-semibold"
                >
                  <Target className="h-3.5 w-3.5 mr-2" />
                  Review Outcome
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setIsReviewOpen(true)}
                  className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm px-4 text-xs font-semibold"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                  Complete Interview
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container py-6 space-y-6">

        {/* Interview & Candidate Details Card */}
        <Card className="border-indigo-100 shadow-sm overflow-hidden rounded-xl bg-white">
          <div className="bg-gradient-to-r from-indigo-50/80 to-transparent px-5 py-4 border-b border-indigo-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Interview & Candidate Details</h3>
                  <p className="text-xs text-slate-500 font-medium">Scheduling, role, project, and candidate information</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditOpen(true)}
                className="h-8 text-xs font-semibold border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                Edit Interview
              </Button>
            </div>
          </div>

          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-12">
              {/* Left Column */}
              <div className="md:col-span-4 border-r border-slate-100 flex flex-col">
                {/* Candidate Info */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/30">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-indigo-500" />
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Candidate Info</h4>
                  </div>
                  <div className="space-y-3">
                    {candidate?.email && (
                      <div className="flex items-center gap-2.5 text-sm text-slate-700">
                        <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <Mail className="h-3.5 w-3.5 text-indigo-500" />
                        </div>
                        <a href={`mailto:${candidate.email}`} className="hover:underline truncate text-[12px]">
                          {candidate.email}
                        </a>
                      </div>
                    )}
                    {candidate?.mobileNumber && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-sm text-slate-700">
                          <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                            <Phone className="h-3.5 w-3.5 text-indigo-500" />
                          </div>
                          <span className="text-[12px]">{candidate.mobileNumber}</span>
                        </div>
                        <button
                          onClick={() =>
                            candidate.mobileNumber &&
                            window.open(`https://wa.me/${candidate.mobileNumber.replace(/\D/g, "")}`, "_blank")
                          }
                          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                        >
                          <FaWhatsapp className="h-3.5 w-3.5" />
                          Chat
                        </button>
                      </div>
                    )}
                    {(candidate as any)?.totalExperience !== undefined && (
                      <div className="flex items-center gap-2.5 text-sm text-slate-700">
                        <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                          <Briefcase className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                        <span className="text-[12px]">{(candidate as any).totalExperience} yrs experience</span>
                      </div>
                    )}
                    {(candidate as any)?.highestEducation && (
                      <div className="flex items-center gap-2.5 text-sm text-slate-700">
                        <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <Building2 className="h-3.5 w-3.5 text-blue-500" />
                        </div>
                        <span className="text-[12px] line-clamp-1">{(candidate as any).highestEducation}</span>
                      </div>
                    )}
                    {(candidate as any)?.gender && (
                      <div className="flex items-center gap-2.5 text-sm text-slate-700">
                        <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <span className="text-[12px] capitalize">{(candidate as any).gender}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Schedule Details */}
                <div className="p-5 bg-slate-50/30 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Schedule Details</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mb-1">Mode</p>
                        <p className="text-[12px] font-bold text-slate-700 capitalize">{selected.mode?.replace("_", " ") || "—"}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mb-1">Duration</p>
                        <p className="text-[12px] font-bold text-slate-700">{selected.duration ? `${selected.duration} min` : "—"}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mb-1">Air Ticket</p>
                        <p className="text-[12px] font-bold text-slate-700 capitalize">{selected.airTicket || "No"}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mb-1">Accommodation</p>
                        <p className="text-[12px] font-bold text-slate-700">{selected.accommodation ? "Yes" : "No"}</p>
                      </div>
                    </div>

                    {selected.scheduledTime && (
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span className="text-[11px] font-bold text-indigo-700">
                          {format(new Date(selected.scheduledTime), "EEE, dd MMM yyyy • hh:mm a")}
                        </span>
                      </div>
                    )}

                    {selected.outcome && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Outcome:</span>
                        <Badge className={cn("text-[9px] px-2 py-0 h-4 uppercase font-bold", outcomeConfig.bgClass)}>
                          {selected.outcome}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="md:col-span-8 p-6 space-y-6 bg-white">
                {/* Project & Role */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-indigo-500" />
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Project & Role</h4>
                    </div>
                    {(project as any)?.countryCode && (
                      <Badge variant="outline" className="text-[9px] px-2 h-4">
                        <MapPin className="h-2.5 w-2.5 mr-1" /> {(project as any).countryCode}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-[9px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Project</p>
                      <p className="text-sm font-bold text-slate-800">{project?.title || "Unknown Project"}</p>
                      {(project as any)?.deadline && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          Deadline: {format(new Date((project as any).deadline), "dd MMM yyyy")}
                        </p>
                      )}
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-[9px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Role</p>
                      <p className="text-sm font-bold text-slate-800">{role?.designation || "Unknown Role"}</p>
                      {(role as any)?.minExperience !== undefined && (role as any)?.maxExperience !== undefined && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          {(role as any).minExperience}–{(role as any).maxExperience} yrs exp required
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-[9px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Screening</p>
                      <p className="text-[11px] font-bold text-slate-700">
                        {(project as any)?.requiredScreening ? "Required" : "No"}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-[9px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Resume</p>
                      <p className="text-[11px] font-bold text-slate-700">
                        {(project as any)?.resumeEditable ? "Editable" : "Locked"}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-[9px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Grooming</p>
                      <p className="text-[11px] font-bold text-slate-700 capitalize">
                        {((project as any)?.groomingRequired || "not_specified").replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Meeting Link */}
                {selected.meetingLink && (
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <Link2 className="h-4 w-4 text-indigo-500" />
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Meeting Link</h4>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 border border-slate-100 p-4 rounded-xl shadow-sm">
                      <a
                        href={selected.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-indigo-600 hover:text-indigo-700 text-[12px] break-all"
                      >
                        {selected.meetingLink}
                      </a>
                      {candidate?.mobileNumber && (
                        <Button
                          onClick={() => {
                            const mobile = candidate.mobileNumber;
                            if (!mobile) return;
                            const phone = mobile.replace(/\D/g, "");
                            const message = `Hi ${candidate?.firstName}, here is the meeting link: ${selected.meetingLink}`;
                            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
                          }}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 h-8 text-xs shrink-0"
                        >
                          <FaWhatsapp className="h-3.5 w-3.5" />
                          WhatsApp
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selected.notes && (
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <FileText className="h-4 w-4 text-indigo-500" />
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Notes</h4>
                    </div>
                    <div className="text-sm text-slate-700 bg-slate-50 border border-slate-100 p-4 rounded-xl leading-relaxed shadow-sm whitespace-pre-wrap min-h-[80px]">
                      {selected.notes}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!selected.meetingLink && !selected.notes && (
                  <div className="flex flex-col items-center justify-center text-center py-12 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200">
                    <Activity className="h-10 w-10 text-slate-200 mb-3" />
                    <p className="text-sm font-bold text-slate-400">No additional details</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      No meeting link or notes have been recorded for this interview.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interview History */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800">Complete Interview History</h3>
            <p className="text-xs text-slate-500">Timeline of all interactions and status changes</p>
          </div>
          <div className="p-6">
            <InterviewHistory
              items={Array.isArray(historyResp?.data) ? historyResp?.data : historyResp?.data?.items ?? []}
              isLoading={isHistoryLoading}
              pagination={historyResp?.data?.pagination ?? null}
              onPageChange={(p) => setHistoryPage(p)}
              onLimitChange={(l) => {
                setHistoryLimit(l);
                setHistoryPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <ReviewInterviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        interview={selected}
        onSubmit={handleReviewSubmit}
      />

      {selected && (
        <EditInterviewDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          interviewId={selected.id}
        />
      )}
    </div>
  );
}