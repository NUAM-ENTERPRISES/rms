import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, ArrowLeft, Calendar, User, Briefcase, Edit3, 
  CheckCircle2, MapPin, Building2, Mail, Phone, ExternalLink,
  Clock, Layers, Info
} from "lucide-react";
import { useGetInterviewQuery, useGetInterviewHistoryQuery, useUpdateBulkInterviewStatusMutation } from "../api";
import { toast } from "sonner";
import ReviewInterviewModal from "@/components/molecules/ReviewInterviewModal";
import CompleteInterviewModal from "@/components/molecules/CompleteInterviewModal";
import InterviewHistory from "@/components/molecules/InterviewHistory";
import EditInterviewDialog from "../components/EditInterviewDialog";
import { ImageViewer } from "@/components/molecules";
import { cn } from "@/lib/utils";
import { FaWhatsapp } from "react-icons/fa";

const getOutcomeBadgeClass = (outcome?: string) => {
  switch (outcome?.toLowerCase()) {
    case "passed": return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    case "failed": return "bg-rose-500/10 text-rose-600 border-rose-200";
    case "completed": return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "backout": return "bg-amber-500/10 text-amber-600 border-amber-200";
    default: return "bg-zinc-100 text-zinc-600 border-zinc-200";
  }
};

export default function InterviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetInterviewQuery(id ?? "", { skip: !id });
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
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
      <div className="p-6 bg-zinc-50/50 min-h-screen flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>No interview id provided in the URL.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-zinc-900" />
          <p className="text-zinc-500 font-medium animate-pulse">Loading experience...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="p-6 bg-zinc-50 min-h-screen flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
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
      toast.success(`${updates.length} interview(s) updated successfully`);
      setIsReviewOpen(false);
      setIsCompleteOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      {/* Top Navigation Bar */}
      <div className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="group text-zinc-500 hover:text-black transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> 
            Back to Dashboard
          </Button>

          <div className="flex items-center gap-4">
             {selected.outcome && (
              <Badge variant="outline" className={cn("px-4 py-1 rounded-full text-xs font-bold tracking-tight uppercase", getOutcomeBadgeClass(selected.outcome))}>
                {selected.outcome}
              </Badge>
            )}
            <div className="h-4 w-px bg-zinc-200 mx-2 hidden sm:block" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest hidden sm:block">ID: {id.slice(-6)}</span>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-73px)]">
        <div className="max-w-[1400px] mx-auto px-6 py-10 space-y-10">
          
          {/* Hero Section */}
          <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-4 border-b border-zinc-200">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                 <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                 <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Interview Management</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
                Session <span className="text-zinc-400 font-light">Details</span>
              </h1>
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-zinc-500">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  {selected.scheduledTime
                    ? format(new Date(selected.scheduledTime), "EEEE, dd MMM yyyy")
                    : "Unscheduled"}
                </p>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  {selected.scheduledTime ? format(new Date(selected.scheduledTime), "h:mm a") : "Time TBD"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsEditOpen(true)}
                className="bg-white hover:bg-zinc-50 border-zinc-200 rounded-xl px-6"
              >
                <Edit3 className="h-4 w-4 mr-2 text-zinc-500" />
                Edit Details
              </Button>

              {selected.outcome === "completed" ? (
                <Button
                  size="lg"
                  onClick={() => setIsReviewOpen(true)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl px-8 shadow-xl shadow-zinc-200 transition-all active:scale-95"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Review Outcome
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={() => setIsCompleteOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 shadow-xl shadow-emerald-100 transition-all active:scale-95"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Finish Interview
                </Button>
              )}
            </div>
          </section>

          {/* Core Info Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Candidate Card */}
            <Card className="lg:col-span-2 border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden group">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-stretch min-h-[240px]">
                  <div className="w-full md:w-64 bg-zinc-50 p-8 flex flex-col items-center justify-center border-r border-zinc-100">
                    <ImageViewer
                      src={candidate?.profileImage || null}
                      title={candidate ? `${candidate.firstName} ${candidate.lastName}` : "Candidate"}
                      className="h-32 w-32 rounded-3xl object-cover ring-4 ring-white shadow-2xl transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="mt-6 flex flex-col items-center">
                      <Badge variant="secondary" className="bg-white text-zinc-500 border-zinc-100 text-[10px] uppercase font-bold tracking-widest mb-1">Experience</Badge>
                      <p className="text-lg font-bold text-zinc-900">{candidate?.totalExperience ?? 0} Years</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-8">
                     <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-sm font-bold text-blue-600 uppercase tracking-[0.2em] mb-1">Candidate Profile</h3>
                          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">
                            {candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unnamed Candidate"}
                          </h2>
                        </div>
                        {candidate?.mobileNumber && (
                           <button
                            onClick={() => window.open(`https://wa.me/${candidate.mobileNumber.replace(/\D/g, "")}`, "_blank")}
                            className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all duration-300 shadow-sm"
                          >
                            <FaWhatsapp className="h-6 w-6" />
                          </button>
                        )}
                     </div>

                     <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1 group/item">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Email Address</p>
                          <div className="flex items-center gap-2 text-zinc-700">
                            <Mail className="h-4 w-4 text-zinc-300" />
                            <span className="font-medium truncate">{candidate?.email || "No email provided"}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Contact Number</p>
                          <div className="flex items-center gap-2 text-zinc-700">
                            <Phone className="h-4 w-4 text-zinc-300" />
                            <span className="font-medium">{candidate?.mobileNumber || "No number provided"}</span>
                          </div>
                        </div>
                     </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Details Card */}
            <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Building2 className="h-24 w-24" />
              </div>
              <CardContent className="p-8">
                <h3 className="text-sm font-bold text-purple-600 uppercase tracking-[0.2em] mb-6">Assignment</h3>
                
                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Project Name</p>
                    <div className="flex items-center gap-3">
                      <p className="text-xl font-bold text-zinc-900 tracking-tight">{project?.title || "Internal Development"}</p>
                      {project?.countryCode && (
                        <Badge variant="outline" className="rounded-md bg-zinc-50 border-zinc-200">
                          <MapPin className="h-3 w-3 mr-1" />{project.countryCode}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Target Role</p>
                    <div className="inline-flex items-center px-3 py-1 bg-zinc-900 text-white rounded-lg text-sm font-medium">
                      <Briefcase className="h-3.5 w-3.5 mr-2" />
                      {role?.designation || "Senior Specialist"}
                    </div>
                  </div>

                  {project?.client && (
                    <div className="pt-6 border-t border-zinc-100">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Client Entity</p>
                      <p className="text-sm font-semibold text-zinc-600">{project.client.name}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interview Details Data Grid */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden">
            <div className="border-b border-zinc-50 px-8 py-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-900 rounded-xl text-white">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold tracking-tight">Technical Specification</h3>
              </div>
              <Badge className="bg-zinc-100 text-zinc-600 border-0 hover:bg-zinc-200 transition-colors uppercase tracking-widest text-[9px] font-bold">Standard Protocol</Badge>
            </div>
            
            <CardContent className="p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-12">
                <DataField label="Interview Type" value={selected.type} icon={Info} capitalize />
                <DataField label="Mode" value={selected.mode?.replace("_", " ")} icon={ExternalLink} capitalize />
                <DataField label="Estimated Duration" value={selected.duration ? `${selected.duration} Minutes` : "N/A"} icon={Clock} />
                <div>
                   <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Outcome Status</p>
                   <Badge className={cn("text-[11px] px-4 py-1 border rounded-full font-bold uppercase", getOutcomeBadgeClass(selected.outcome))}>
                    {selected.outcome || "Pending"}
                  </Badge>
                </div>
                
                <DataField label="Air Ticket" value={selected.airTicket || "Not Required"} />
                <DataField label="Accommodation" value={selected.accommodation ? "Provided" : "Not Provided"} />
                <DataField label="Reporting Time" value={selected.scheduledTime ? format(new Date(selected.scheduledTime), "dd MMM, hh:mm a") : "—"} />
                <DataField label="Assigned Lead" value={selected.interviewer || selected.interviewerEmail || "TBD"} />
              </div>

              {/* Meeting Link */}
              {selected.meetingLink && (
                <div className="mt-12 group">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Virtual Access Link</p>
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-50 p-3 pl-5 rounded-2xl border border-zinc-100 transition-all group-hover:border-blue-100 group-hover:bg-blue-50/30">
                    <div className="flex-1 min-w-0">
                       <a
                        href={selected.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 font-medium hover:underline break-all text-sm flex items-center gap-2"
                      >
                        {selected.meetingLink}
                      </a>
                    </div>
                    {candidate?.mobileNumber && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white border-zinc-200 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl shadow-sm w-full sm:w-auto"
                        onClick={() => {
                          const phone = candidate.mobileNumber.replace(/\D/g, "");
                          const message = `Hi ${candidate.firstName}, please join your interview here: ${selected.meetingLink}`;
                          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
                        }}
                      >
                        <FaWhatsapp className="h-4 w-4 mr-2" />
                        Share to WhatsApp
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Notes Section */}
              {selected.notes && (
                <div className="mt-12 bg-amber-50/50 p-8 rounded-3xl border border-amber-100/50">
                  <p className="text-[10px] font-bold text-amber-700/60 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Edit3 className="h-3 w-3" /> Technical Notes & Briefing
                  </p>
                  <p className="text-[15px] text-zinc-700 whitespace-pre-wrap leading-relaxed font-medium italic">
                    "{selected.notes}"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* History Section */}
          <div className="pt-6">
            <h3 className="text-2xl font-bold tracking-tight mb-6">Activity Log</h3>
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border-0">
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
      </ScrollArea>

      {/* Modals */}
      <ReviewInterviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        interview={selected}
        onSubmit={handleReviewSubmit}
      />
      <CompleteInterviewModal
        isOpen={isCompleteOpen}
        onClose={() => setIsCompleteOpen(false)}
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

/** * Reusable component for data fields to keep the grid clean 
 */
function DataField({ label, value, icon: Icon, capitalize = false }: { label: string, value?: string, icon?: any, capitalize?: boolean }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-zinc-300" />}
        <p className={cn("text-[15px] font-semibold text-zinc-900", capitalize && "capitalize")}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}