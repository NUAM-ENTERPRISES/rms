import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, Calendar, User, Briefcase, Edit3, CheckCircle2, MessageCircle, MapPin, Building2, Mail, Phone } from "lucide-react";
import { useGetInterviewQuery, useGetInterviewHistoryQuery, useUpdateBulkInterviewStatusMutation } from "../api";
import { toast } from "sonner";
import ReviewInterviewModal from "@/components/molecules/ReviewInterviewModal";
import InterviewHistory from "@/components/molecules/InterviewHistory";
import EditInterviewDialog from "../components/EditInterviewDialog";
import { ImageViewer } from "@/components/molecules";
import { cn } from "@/lib/utils";
import { FaWhatsapp } from "react-icons/fa";

const outcomeCounters = (outcome?: string) => {
  const set = {
    scheduled: 0,
    completed: 0,
    passed: 0,
    rejected: 0,
    backout: 0,
  };

  if (!outcome || outcome === "scheduled") {
    set.scheduled = 1;
  }

  if (outcome === "completed") {
    set.completed = 1;
  }

  if (outcome === "passed") {
    set.passed = 1;
  }

  if (outcome === "failed") {
    set.rejected = 1;
  }

  if (outcome === "backout") {
    set.backout = 1;
  }

  return set;
};

const getOutcomeBadgeClass = (outcome?: string) => {
  switch (outcome?.toLowerCase()) {
    case "passed":
      return "bg-emerald-600 text-white";
    case "failed":
      return "bg-red-600 text-white";
    case "completed":
      return "bg-blue-600 text-white";
    case "backout":
      return "bg-amber-600 text-white";
    default:
      return "bg-zinc-600 text-white";
  }
};

export default function InterviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetInterviewQuery(id ?? "", {
    skip: !id,
  });

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
    if (error) {
      toast.error("Failed to load interview details");
    }
  }, [error]);

  if (!id) {
    return (
      <div className="p-8 bg-white">
        <Alert variant="destructive">
          <AlertDescription>No interview id provided in the URL.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-900" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="p-8 bg-white">
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

  const handleReviewSubmit = async (updates: { id: string; interviewStatus: "passed" | "failed" | "completed" | "backout"; subStatus?: string; reason?: string }[]) => {
    try {
      await updateBulkInterviewStatus({ updates }).unwrap();
      toast.success(`${updates.length} interview(s) reviewed successfully`);
      setIsReviewOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      {/* Top Bar */}
      <div className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-zinc-700 hover:text-black">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-65px)]">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-semibold text-black">Interview Details</h1>
              <p className="text-zinc-600 mt-3 text-lg flex items-center gap-3">
                <Calendar className="h-5 w-5" />
                {selected.scheduledTime
                  ? format(new Date(selected.scheduledTime), "EEEE, MMMM d, yyyy • h:mm a")
                  : "Not scheduled"}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setIsEditOpen(true)} className="border-zinc-300 hover:bg-zinc-100">
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Interview
              </Button>

              <Button onClick={() => setIsReviewOpen(true)} className="bg-black hover:bg-zinc-800 text-white">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Review Outcome
              </Button>

              {selected.outcome && (
                <Badge className={cn("px-6 py-2 text-base font-semibold", getOutcomeBadgeClass(selected.outcome))}>
                  {selected.outcome.charAt(0).toUpperCase() + selected.outcome.slice(1)}
                </Badge>
              )}
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Candidate Card */}
            <Card className="border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <ImageViewer
                    src={candidate?.profileImage || null}
                    title={candidate ? `${candidate.firstName} ${candidate.lastName}` : "Candidate"}
                    className="h-24 w-24 rounded-2xl border-4 border-white shadow-md"
                  />
                  <div className="flex-1 pt-1">
                    <h3 className="text-2xl font-semibold text-black flex items-center gap-3">
                      <User className="h-6 w-6 text-zinc-700" />
                      {candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown Candidate"}
                    </h3>

                    <div className="mt-6 space-y-4 text-[15px]">
                      {candidate?.email && (
                        <div className="flex items-center gap-3 text-zinc-700">
                          <Mail className="h-4 w-4" />
                          {candidate.email}
                        </div>
                      )}
                      {candidate?.mobileNumber && (
                        <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-3 text-zinc-700">
                            <Phone className="h-4 w-4" />
                            {candidate.mobileNumber}
                          </div>
                          <button
                            onClick={() => window.open(`https://wa.me/${candidate.mobileNumber.replace(/\D/g, "")}`, "_blank")}
                            className="text-emerald-600 hover:text-emerald-700 transition-colors"
                          >
                            <FaWhatsapp className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                      {candidate?.totalExperience !== undefined && (
                        <div className="flex items-center gap-3 text-zinc-700">
                          <Briefcase className="h-4 w-4" />
                          {candidate.totalExperience} years of experience
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project & Role Card */}
            <Card className="border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-black mb-6 flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-zinc-700" />
                  Project & Role
                </h3>

                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-zinc-500">Project</p>
                    <p className="font-medium text-lg mt-1 text-black">
                      {project?.title || "Unknown"}
                      {project?.countryCode && (
                        <Badge variant="outline" className="ml-3 border-zinc-300 text-zinc-700">
                          <MapPin className="h-3 w-3 mr-1" />
                          {project.countryCode}
                        </Badge>
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Role</p>
                    <p className="font-medium text-lg mt-1 text-black">{role?.designation || "Unknown"}</p>
                  </div>

                  {project?.client && (
                    <div className="pt-4 border-t border-zinc-100">
                      <p className="text-sm text-zinc-500">Client</p>
                      <p className="font-medium text-black mt-1">{project.client.name}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interview Information */}
          <Card className="border border-zinc-200 shadow-sm">
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold text-black mb-6">Interview Information</h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-7 text-sm">
                <div>
                  <p className="text-zinc-500">Type</p>
                  <p className="font-medium mt-1 text-black capitalize">{selected.type || "—"}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Mode</p>
                  <p className="font-medium mt-1 text-black capitalize">{selected.mode?.replace("_", " ") || "—"}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Duration</p>
                  <p className="font-medium mt-1 text-black">{selected.duration ? `${selected.duration} minutes` : "—"}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Outcome</p>
                  <div className="mt-2">
                    <Badge className={cn("text-sm px-5 py-1.5", getOutcomeBadgeClass(selected.outcome))}>
                      {selected.outcome ? selected.outcome.toUpperCase() : "PENDING"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-zinc-500">Air Ticket</p>
                  <p className="font-medium mt-1 text-black capitalize">{selected.airTicket || "Not requested"}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Accommodation</p>
                  <p className="font-medium mt-1 text-black">{selected.accommodation ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Scheduled At</p>
                  <p className="font-medium mt-1 text-black">
                    {selected.scheduledTime ? format(new Date(selected.scheduledTime), "d MMM yyyy, h:mm a") : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500">Interviewer</p>
                  <p className="font-medium mt-1 text-black">{selected.interviewer || selected.interviewerEmail || "Unknown"}</p>
                </div>
              </div>

              {selected.meetingLink && (
                <div className="mt-10 pt-8 border-t border-zinc-100">
                  <p className="text-zinc-500 mb-3">Meeting Link</p>
                  <div className="flex flex-wrap gap-4">
                    <a
                      href={selected.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all font-medium"
                    >
                      {selected.meetingLink}
                    </a>
                    {candidate?.mobileNumber && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const phone = candidate.mobileNumber.replace(/\D/g, "");
                          const message = `Hi ${candidate.firstName}, here is the meeting link: ${selected.meetingLink}`;
                          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
                        }}
                      >
                        Send via WhatsApp
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {selected.notes && (
                <div className="mt-10 pt-8 border-t border-zinc-100">
                  <p className="text-zinc-500 mb-3">Notes</p>
                  <p className="whitespace-pre-wrap text-zinc-700 leading-relaxed">{selected.notes}</p>
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