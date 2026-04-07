import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, Calendar, User, Briefcase, Edit3, CheckCircle2, MapPin, Building2, Mail, Phone } from "lucide-react";
import { useGetInterviewQuery, useGetInterviewHistoryQuery, useUpdateBulkInterviewStatusMutation } from "../api";
import { toast } from "sonner";
import ReviewInterviewModal from "@/components/molecules/ReviewInterviewModal";
import InterviewHistory from "@/components/molecules/InterviewHistory";
import EditInterviewDialog from "../components/EditInterviewDialog";
import { ImageViewer } from "@/components/molecules";
import { cn } from "@/lib/utils";
import { FaWhatsapp } from "react-icons/fa";

const getOutcomeBadgeClass = (outcome?: string) => {
  switch (outcome?.toLowerCase()) {
    case "passed": return "bg-emerald-600 text-white";
    case "failed": return "bg-red-600 text-white";
    case "completed": return "bg-blue-600 text-white";
    case "backout": return "bg-amber-600 text-white";
    default: return "bg-zinc-700 text-white";
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
      <div className="p-6 bg-zinc-50 min-h-screen">
        <Alert variant="destructive">
          <AlertDescription>No interview id provided in the URL.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-900" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="p-6 bg-zinc-50 min-h-screen">
        <Alert variant="destructive">
          <AlertDescription>Interview details could not be loaded.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const selected = interview!;
  const candidate = interview?.candidate || interview?.candidateProjectMap?.candidate;
  const project = interview?.project || interview?.candidateProjectMap?.project;
  const role = interview?.roleNeeded || interview?.candidateProjectMap?.roleNeeded;

  const handleReviewSubmit = async (updates: any[]) => {
    try {
      await updateBulkInterviewStatus({ updates }).unwrap();
      toast.success(`${updates.length} interview(s) reviewed successfully`);
      setIsReviewOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
  {/* Top Bar - No side padding */}
  <div className="border-b bg-white sticky top-0 z-50 shadow-sm">
    <div className="w-full px-6 py-4 flex items-center justify-between">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="text-zinc-600 hover:text-black"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      {selected.outcome && (
        <Badge className={cn("px-5 py-1.5 text-sm font-semibold", getOutcomeBadgeClass(selected.outcome))}>
          {selected.outcome.toUpperCase()}
        </Badge>
      )}
    </div>
  </div>

  <ScrollArea className="h-[calc(100vh-65px)]">
    <div className="w-full px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-black">Interview Details</h1>
          <p className="text-zinc-600 mt-1.5 flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            {selected.scheduledTime
              ? format(new Date(selected.scheduledTime), "EEEE, dd MMM yyyy • h:mm a")
              : "Not scheduled"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="border-zinc-300"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </Button>

          <Button
            size="sm"
            onClick={() => setIsReviewOpen(true)}
            className="bg-black hover:bg-zinc-800 text-white"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Review Outcome
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Candidate Card - Colorful */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-white uppercase tracking-wider">
              <User className="h-4 w-4" />
              CANDIDATE PROFILE
            </h3>
          </div>
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              <ImageViewer
                src={candidate?.profileImage || null}
                title={candidate ? `${candidate.firstName} ${candidate.lastName}` : "Candidate"}
                className="h-20 w-20 rounded-2xl border-4 border-white shadow-lg"
              />
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-black">
                  {candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown Candidate"}
                </h3>
                <div className="mt-5 space-y-3 text-sm text-zinc-700">
                  {candidate?.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-zinc-500" />
                      {candidate.email}
                    </div>
                  )}
                  {candidate?.mobileNumber && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-zinc-500" />
                        {candidate.mobileNumber}
                      </div>
                      <button
                        onClick={() => window.open(`https://wa.me/${candidate.mobileNumber.replace(/\D/g, "")}`, "_blank")}
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        <FaWhatsapp className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  {candidate?.totalExperience !== undefined && (
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-4 w-4 text-zinc-500" />
                      {candidate.totalExperience} years experience
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project & Role Card - Colorful */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-white uppercase tracking-wider">
              <Building2 className="h-4 w-4" />
              PROJECT & ROLE
            </h3>
          </div>
          <CardContent className="p-6">
            <div className="space-y-5 text-sm">
              <div>
                <p className="text-zinc-500 text-xs">PROJECT</p>
                <p className="font-medium mt-1 text-black">
                  {project?.title || "Unknown"}
                  {project?.countryCode && (
                    <Badge variant="outline" className="ml-3 text-xs">
                      <MapPin className="h-3 w-3 mr-1" />{project.countryCode}
                    </Badge>
                  )}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">ROLE</p>
                <p className="font-medium mt-1 text-black">{role?.designation || "Unknown"}</p>
              </div>
              {project?.client && (
                <div className="pt-4 border-t border-zinc-100">
                  <p className="text-zinc-500 text-xs">CLIENT</p>
                  <p className="font-medium mt-1 text-black">{project.client.name}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interview Information - Colorful */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">INTERVIEW INFORMATION</h3>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 text-sm">
            <div>
              <p className="text-zinc-500 text-xs">TYPE</p>
              <p className="font-medium mt-1 capitalize">{selected.type || "—"}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">MODE</p>
              <p className="font-medium mt-1 capitalize">{selected.mode?.replace("_", " ") || "—"}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">DURATION</p>
              <p className="font-medium mt-1">{selected.duration ? `${selected.duration} min` : "—"}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">OUTCOME</p>
              <div className="mt-1">
                <Badge className={cn("text-xs px-4 py-1", getOutcomeBadgeClass(selected.outcome))}>
                  {selected.outcome ? selected.outcome.toUpperCase() : "PENDING"}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-zinc-500 text-xs">AIR TICKET</p>
              <p className="font-medium mt-1 capitalize">{selected.airTicket || "Not requested"}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">ACCOMMODATION</p>
              <p className="font-medium mt-1">{selected.accommodation ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">SCHEDULED</p>
              <p className="font-medium mt-1">
                {selected.scheduledTime ? format(new Date(selected.scheduledTime), "dd MMM, h:mm a") : "—"}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">INTERVIEWER</p>
              <p className="font-medium mt-1 text-black">{selected.interviewer || selected.interviewerEmail || "Unknown"}</p>
            </div>
          </div>

          {/* Meeting Link with WhatsApp Button */}
          {selected.meetingLink && (
            <div className="mt-8 pt-8 border-t border-zinc-100">
              <p className="text-zinc-500 text-xs mb-3">MEETING LINK</p>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <a
                  href={selected.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all text-sm flex-1"
                >
                  {selected.meetingLink}
                </a>
                {candidate?.mobileNumber && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl"
                    onClick={() => {
                      const phone = candidate.mobileNumber.replace(/\D/g, "");
                      const message = `Hi ${candidate.firstName}, here is the meeting link: ${selected.meetingLink}`;
                      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
                    }}
                  >
                    <FaWhatsapp className="h-4 w-4" />
                    WhatsApp
                  </Button>
                )}
              </div>
            </div>
          )}

          {selected.notes && (
            <div className="mt-8 pt-8 border-t border-zinc-100">
              <p className="text-zinc-500 text-xs mb-2">NOTES</p>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">{selected.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Section */}
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
  </ScrollArea>

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