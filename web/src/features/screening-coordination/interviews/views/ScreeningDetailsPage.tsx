import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { format, differenceInYears } from "date-fns";
import { useCan } from "@/hooks/useCan";
import {
  Loader2,
  AlertCircle,
  User,
  Briefcase,
  Calendar,
  ChevronLeft,
  CalendarCheck,
  CheckCircle2,
  FileText,
  MessageCircle,
  ChevronDown,
  Star,
  Clock,
  ExternalLink,
  Phone,
  Mail,
  GraduationCap,
  Building2,
  TrendingUp,
  Globe,
  Flag,
  Layers,
  CheckCheck,
  Video,
  BookOpen,
  Target,
  ChevronRight,
  Sparkles,
  Activity,
  Languages,
  CalendarPlus,
  PlayCircle,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import ImageViewer from "@/components/molecules/ImageViewer";
import {
  useGetScreeningQuery,
  useGetCandidateProjectHistoryQuery
} from "../data";
import { useCreateTrainingAssignmentMutation } from "../../training/data";
import { SCREENING_DECISION } from "../../types";
import { cn } from "@/lib/utils";
import { AssignToTrainerDialog } from "../../training/components/AssignToTrainerDialog";
import { NotifyDocumentationModal } from "../components/NotifyDocumentationModal";
import EditScreeningDialog from "../components/EditScreeningDialog";
import { ScreeningInterviewHistoryModal } from "../components/ScreeningInterviewHistoryModal";
import ScheduleTrainingModal from "../../training/components/ScheduleTrainingModal";
import { UpdateScreeningTrainingModal } from "../components";

// ─── Helpers ────────────────────────────────────────────────────────────────

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: any }) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon && (
        <div className="mt-0.5 h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-slate-500" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700 mt-0.5 truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">{children}</p>
  );
}

function RatingBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1.5">
      <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ScreeningDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const canWriteScreenings = useCan("write:screenings");
  const canConductScreenings = useCan("conduct:screenings");
  const canWriteTraining = useCan("write:training");

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const { data: screeningResponse, isLoading, error, refetch } = useGetScreeningQuery(id as string, {
    skip: !id,
    refetchOnMountOrArgChange: true,
  });

  const selectedInterview = (screeningResponse as any)?.data ?? screeningResponse;

  const { data: historyData, isLoading: isLoadingHistory } = useGetCandidateProjectHistoryQuery(
    selectedInterview?.candidateProjectMap?.id
      ? { candidateProjectMapId: selectedInterview.candidateProjectMap.id, page: historyPage, limit: 10 }
      : undefined,
    { skip: !selectedInterview?.candidateProjectMap?.id }
  );

  const [assignToTrainerOpen, setAssignToTrainerOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);

  const [notifyRecruiterConfirm, setNotifyRecruiterConfirm] = useState<any>({ isOpen: false });

  const [, { isLoading: isCreatingTraining }] = useCreateTrainingAssignmentMutation();

  // ── Auto-scroll to Training Assignments when ?scrollTo=training ──────────
  const location = useLocation();
  const trainingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedInterview) return;
    const params = new URLSearchParams(location.search);
    if (params.get("scrollTo") === "training" && trainingRef.current) {
      // Small delay so the page finishes rendering before scrolling
      const timer = setTimeout(() => {
        trainingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.search, selectedInterview]);

  const getDecisionBadge = (decision: string | null | undefined) => {
    if (!decision) return null;
    switch (decision) {
      case SCREENING_DECISION.APPROVED:
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 gap-1"><CheckCircle2 className="h-3 w-3" />Approved</Badge>;
      case SCREENING_DECISION.NEEDS_TRAINING:
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0 gap-1"><BookOpen className="h-3 w-3" />Needs Training</Badge>;
      case SCREENING_DECISION.ON_HOLD:
        return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-0">On Hold</Badge>;
      case SCREENING_DECISION.REJECTED:
        return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-0">Rejected</Badge>;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-emerald-500 text-white border-0 gap-1 text-[10px]"><CheckCheck className="h-3 w-3" />Completed</Badge>;
      case "scheduled": return <Badge className="bg-blue-500 text-white border-0 gap-1 text-[10px]"><Calendar className="h-3 w-3" />Scheduled</Badge>;
      default: return <Badge variant="secondary" className="capitalize text-[10px]">{status}</Badge>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-rose-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-blue-500 text-white";
      default: return "bg-slate-200 text-slate-700";
    }
  };

  const openDecisionModal = () => {
    setIsDecisionModalOpen(true);
  };

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-3 bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      <p className="text-sm text-slate-500 font-medium">Loading screening details…</p>
    </div>
  );

  if (error || !selectedInterview) return (
    <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
      <div className="h-16 w-16 rounded-2xl bg-rose-100 flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8 text-rose-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-800">Screening Not Found</h2>
      <p className="text-sm text-slate-500 mt-1 mb-6">The screening record you're looking for doesn't exist or was removed.</p>
      <Button onClick={() => navigate(-1)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
        <ChevronLeft className="h-4 w-4 mr-2" /> Go Back
      </Button>
    </div>
  );

  const candidate = selectedInterview.candidateProjectMap?.candidate;
  const project = selectedInterview.candidateProjectMap?.project;
  const roleNeeded = selectedInterview.candidateProjectMap?.roleNeeded;
  const mainStatus = selectedInterview.candidateProjectMap?.mainStatus;
  const subStatus = selectedInterview.candidateProjectMap?.subStatus;
  const coordinator = selectedInterview.coordinator;
  const trainingAssignments = selectedInterview.trainingAssignments || [];
  const qualifications = candidate?.qualifications || [];
  const workExperiences = candidate?.workExperiences || [];

  const hasActiveTraining = trainingAssignments.some(
    (ta: any) => ta.status === "assigned" || ta.status === "scheduled"
  );

  const candidateAge = candidate?.dateOfBirth
    ? differenceInYears(new Date(), new Date(candidate.dateOfBirth))
    : null;

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">

        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-3.5 border-b bg-white flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-8 w-8 rounded-full hover:bg-slate-100"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </Button>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-tight">Screening Details</h1>
              {candidate && (
                <p className="text-xs text-slate-400 font-medium leading-tight">
                  {candidate.firstName} {candidate.lastName} · {roleNeeded?.designation || "—"}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedInterview.decision
              ? getDecisionBadge(selectedInterview.decision)
              : getStatusBadge(selectedInterview.status)}

            {!selectedInterview.conductedAt && canConductScreenings && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm h-8 text-xs"
                onClick={() => navigate(`/screenings/${selectedInterview.id}/conduct`)}
              >
                <CalendarCheck className="h-3.5 w-3.5 mr-1.5" /> Conduct
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs font-semibold border-slate-200 text-slate-600 gap-1.5 px-3"
              onClick={() => setIsHistoryModalOpen(true)}
            >
              <Clock className="h-3.5 w-3.5" /> History
            </Button>

            {!hasActiveTraining && canWriteScreenings && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 text-xs font-semibold border-slate-200 text-slate-600 gap-1.5 px-3">
                    Update Decision <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-xl shadow-xl border-slate-200">
                  <DropdownMenuItem onClick={() => openDecisionModal()} className="text-xs py-2.5 px-3 rounded-lg cursor-pointer gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Evaluation & Decision
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* ─── Scrollable Body ─────────────────────────────────────────────── */}
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5 max-w-7xl mx-auto w-full">

            {/* ── ROW 1: Candidate Profile + Project Details ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

              {/* Candidate Card (3 cols) */}
              <Card className="lg:col-span-3 border-0 shadow-sm bg-white overflow-hidden">
                <CardHeader className="py-3 px-4 border-b bg-gradient-to-r from-indigo-50 to-slate-50">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                    <User className="h-4 w-4 text-indigo-500" /> Candidate Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Top section: Avatar + Name */}
                  <div className="flex items-start gap-4 mb-5">
                    <div className="relative shrink-0">
                      <ImageViewer
                        src={candidate?.profileImage}
                        title={`${candidate?.firstName} ${candidate?.lastName}`}
                        className="h-20 w-20 rounded-2xl object-cover ring-2 ring-indigo-100 shadow-md"
                      />
                      <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white bg-emerald-400 shadow-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-slate-800 leading-tight">
                        {candidate?.firstName} {candidate?.lastName}
                      </h2>
                      {candidate?.candidateCode ? (
                        <div className="mt-1 inline-flex rounded-md bg-red-50 px-2 py-0.5 text-xs font-mono font-bold text-red-700 border border-red-200">
                          {candidate.candidateCode}
                        </div>
                      ) : null}
                      <p className="text-sm text-indigo-600 font-medium mt-0.5">
                        {roleNeeded?.designation || candidate?.currentRole || "—"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {candidate?.gender && (
                          <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-0 capitalize">
                            {candidate.gender.toLowerCase()}
                          </Badge>
                        )}
                        {candidateAge && (
                          <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-0">
                            {candidateAge} yrs
                          </Badge>
                        )}
                        <Badge className="text-[10px] bg-indigo-50 text-indigo-600 border-0 hover:bg-indigo-100 gap-1">
                          <TrendingUp className="h-2.5 w-2.5" />
                          {candidate?.totalExperience ?? candidate?.experience ?? 0} yrs exp
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <InfoRow label="Email" value={candidate?.email} icon={Mail} />
                    <InfoRow label="Phone" value={candidate?.phone} icon={Phone} />
                    <InfoRow
                      label="Date of Birth"
                      value={candidate?.dateOfBirth ? format(new Date(candidate.dateOfBirth), "MMM d, yyyy") : null}
                      icon={Calendar}
                    />
                    <InfoRow
                      label="Referral Company"
                      value={candidate?.referralCompanyName}
                      icon={Building2}
                    />
                  </div>

                  {/* Qualifications */}
                  {qualifications.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <GraduationCap className="h-3.5 w-3.5 text-purple-500" />
                        <SectionLabel>Qualifications</SectionLabel>
                      </div>
                      <div className="space-y-2">
                        {qualifications.map((q: any) => (
                          <div key={q.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-purple-50/50 border border-purple-100">
                            <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                              <GraduationCap className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-700 truncate">{q.qualification?.name || "—"}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {q.graduationYear && (
                                  <span className="text-[10px] text-slate-500">{q.graduationYear}</span>
                                )}
                                {q.gpa && (
                                  <span className="text-[10px] text-slate-400">GPA: {q.gpa}</span>
                                )}
                                {q.isCompleted && (
                                  <span className="text-[10px] text-emerald-600 font-medium">✓ Completed</span>
                                )}
                                {(q.country?.name || q.countryCode) && (
                                  <span className="text-[10px] text-slate-500">
                                    {q.country?.name || q.countryCode}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-700 bg-white capitalize shrink-0">
                              {q.qualification?.level?.toLowerCase() || "degree"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Work Experience */}
                  {workExperiences.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Briefcase className="h-3.5 w-3.5 text-blue-500" />
                        <SectionLabel>Work Experience</SectionLabel>
                      </div>
                      <div className="space-y-2">
                        {workExperiences.map((w: any, i: number) => (
                          <div key={w.id} className="flex gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50/30 transition-colors">
                            <div className="flex flex-col items-center pt-1 shrink-0">
                              <div className={cn("h-2.5 w-2.5 rounded-full", w.isCurrent ? "bg-emerald-400" : "bg-slate-300")} />
                              {i < workExperiences.length - 1 && (
                                <div className="w-0.5 flex-1 bg-slate-200 mt-1 min-h-[12px]" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs font-bold text-slate-700">{w.jobTitle}</p>
                                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Building2 className="h-3 w-3" />
                                    {w.companyName}
                                  </p>
                                </div>
                                {w.isCurrent && (
                                  <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0 shrink-0">Current</Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {w.startDate ? format(new Date(w.startDate), "MMM yyyy") : "—"} —{" "}
                                {w.isCurrent ? "Present" : w.endDate ? format(new Date(w.endDate), "MMM yyyy") : "—"}
                                {(w.country?.name || w.countryCode)
                                  ? ` · ${w.country?.name || w.countryCode}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Project + Status Card (2 cols) */}
              <div className="lg:col-span-2 flex flex-col gap-5">

                {/* Project Card */}
                <Card className="border-0 shadow-sm bg-white overflow-hidden flex-1">
                  <CardHeader className="py-3 px-4 border-b bg-gradient-to-r from-purple-50 to-slate-50">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                      <Briefcase className="h-4 w-4 text-purple-500" /> Project Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {/* Project Title */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <SectionLabel>Project Name</SectionLabel>
                        <p className="text-base font-bold text-slate-800">{project?.title || "—"}</p>
                      </div>
                      <Badge className={cn("shrink-0 text-[10px] mt-1 capitalize border-0", getPriorityColor(project?.priority || ""))}>
                        {project?.priority || "—"}
                      </Badge>
                    </div>

                    {/* Role Applied */}
                    <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                      <SectionLabel>Role Applied For</SectionLabel>
                      <p className="text-sm font-bold text-indigo-700">
                        {roleNeeded?.designation || "—"}
                        {selectedInterview.candidateProjectMap?.roleCatalog?.shortName && (
                          <span className="ml-1.5 text-[10px] font-normal text-indigo-400">
                            ({selectedInterview.candidateProjectMap.roleCatalog.shortName})
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Grid Info */}
                    <div className="grid grid-cols-2 gap-3">
                      <InfoRow label="Country" value={project?.country?.name} icon={Globe} />
                      <InfoRow label="Type" value={project?.projectType} icon={Layers} />
                      <InfoRow
                        label="Deadline"
                        value={project?.deadline ? format(new Date(project.deadline), "MMM d, yyyy") : null}
                        icon={Calendar}
                      />
                      <InfoRow label="Grooming" value={project?.groomingRequired} icon={Sparkles} />
                      <InfoRow label="Client" value={project?.client?.name || "N/A"} icon={Building2} />
                      <InfoRow label="Created By" value={project?.creator?.name} icon={User} />
                    </div>

                    {/* Status Row */}
                    <div className="pt-3 border-t space-y-2">
                      <SectionLabel>Candidate Status</SectionLabel>
                      <div className="flex flex-wrap gap-2">
                        {mainStatus && (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                            style={{
                              color: mainStatus.color,
                              borderColor: mainStatus.color,
                              backgroundColor: `${mainStatus.color}15`,
                            }}
                          >
                            <Activity className="h-3 w-3" />
                            {mainStatus.label}
                          </span>
                        )}
                        {subStatus && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 bg-slate-50 text-slate-600">
                            <ChevronRight className="h-3 w-3" />
                            {subStatus.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Coordinator Mini-Card */}
                <Card className="border-0 shadow-sm bg-white overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                        {coordinator?.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <SectionLabel>Conducted By</SectionLabel>
                        <p className="text-sm font-bold text-slate-800">{coordinator?.name || "—"}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <SectionLabel>Conducted At</SectionLabel>
                        <p className="text-xs font-medium text-slate-600">
                          {selectedInterview.conductedAt
                            ? format(new Date(selectedInterview.conductedAt), "MMM d, yyyy")
                            : "—"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {selectedInterview.conductedAt
                            ? format(new Date(selectedInterview.conductedAt), "h:mm a")
                            : ""}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ── ROW 2: Screening Assessment ── */}
            <Card className="border-0 shadow-sm bg-white overflow-hidden">
              <CardHeader className="py-3 px-4 border-b bg-gradient-to-r from-amber-50 to-slate-50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                  <Star className="h-4 w-4 text-amber-500" /> Screening Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {/* Score + Decision Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {/* Overall Rating */}
                  <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md">
                    <p className="text-[10px] uppercase font-bold opacity-70 tracking-wider">Overall Rating</p>
                    <p className="text-3xl font-black mt-1">
                      {selectedInterview.overallRating ?? 0}
                      <span className="text-sm font-normal opacity-70 ml-1">/ 100</span>
                    </p>
                    <RatingBar value={selectedInterview.overallRating ?? 0} max={100} color="bg-white/60" />
                  </div>

                  {/* Decision */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Decision</p>
                    <div className="mt-2">{getDecisionBadge(selectedInterview.decision) || <span className="text-slate-400 text-sm">—</span>}</div>
                  </div>

                  {/* Good Looking */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Appearance</p>
                    <p className="text-xl font-black text-slate-700">
                      {selectedInterview.goodLooking ?? 0}
                      <span className="text-xs font-normal text-slate-400 ml-1">/ 5</span>
                    </p>
                    <div className="flex gap-0.5 mt-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn("h-3 w-3", s <= (selectedInterview.goodLooking ?? 0) ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-slate-200")}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Fairness */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Fairness</p>
                    <p className="text-xl font-black text-slate-700">
                      {selectedInterview.fairness ?? 0}
                      <span className="text-xs font-normal text-slate-400 ml-1">/ 5</span>
                    </p>
                    <div className="flex gap-0.5 mt-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn("h-3 w-3", s <= (selectedInterview.fairness ?? 0) ? "fill-sky-400 text-sky-400" : "text-slate-200 fill-slate-200")}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Session Info Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-100 mb-5">
                  <div>
                    <SectionLabel>Mode</SectionLabel>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Video className="h-3.5 w-3.5 text-indigo-500" />
                      <span className="text-sm font-semibold text-slate-700 capitalize">{selectedInterview.mode || "—"}</span>
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Duration</SectionLabel>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-700">{selectedInterview.duration || "—"} mins</span>
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Language Proficiency</SectionLabel>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Languages className="h-3.5 w-3.5 text-emerald-500" />
                      <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-0">{selectedInterview.languageProficiency || "—"}</Badge>
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Meeting Link</SectionLabel>
                    {selectedInterview.meetingLink ? (
                      <a
                        href={selectedInterview.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-indigo-600 hover:underline mt-1 font-medium"
                      >
                        Join <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="text-sm text-slate-400 italic mt-1">No link</p>
                    )}
                  </div>
                </div>

                {/* Remarks + Strengths + Improvements */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedInterview.strengths ? (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <SectionLabel>Strengths</SectionLabel>
                      </div>
                      <p className="text-sm text-emerald-700 bg-emerald-50 p-3.5 rounded-xl border border-emerald-100 leading-relaxed">
                        {selectedInterview.strengths}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-dashed border-slate-200 flex items-center gap-2 text-slate-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs">No strengths recorded</span>
                    </div>
                  )}

                  {selectedInterview.areasOfImprovement ? (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
                        <SectionLabel>Areas of Improvement</SectionLabel>
                      </div>
                      <p className="text-sm text-orange-700 bg-orange-50 p-3.5 rounded-xl border border-orange-100 leading-relaxed">
                        {selectedInterview.areasOfImprovement}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-dashed border-slate-200 flex items-center gap-2 text-slate-400">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs">No improvement areas noted</span>
                    </div>
                  )}
                </div>

                {selectedInterview.remarks && (
                  <div className="mt-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <MessageCircle className="h-3.5 w-3.5 text-slate-500" />
                      <SectionLabel>General Remarks</SectionLabel>
                    </div>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                      {selectedInterview.remarks}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── ROW 3: Training Assignments ── */}
            {trainingAssignments.length > 0 && (
              <Card ref={trainingRef} className="border-0 shadow-sm bg-white overflow-hidden">
                <CardHeader className="py-3 px-4 border-b bg-gradient-to-r from-blue-50 to-slate-50">
                  <div className="flex items-center justify-between w-full">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                      <BookOpen className="h-4 w-4 text-blue-500" /> Training Assignments
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">
                        {trainingAssignments.length} Session{trainingAssignments.length !== 1 ? "s" : ""}
                      </Badge>
                      {trainingAssignments[0]?.trainingAttemptTotal && (
                        <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                          Max: {trainingAssignments[0].trainingAttemptTotal} attempts
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {trainingAssignments.map((ta: any) => (
                      <div
                        key={ta.id}
                        className={cn(
                          "relative p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200",
                          ta.status === "scheduled" && "border-blue-200 animate-[scheduledPulse_2.5s_ease-in-out_infinite]",
                          ta.status === "completed" && "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300",
                          ta.status !== "scheduled" && ta.status !== "completed" && "border-slate-100 bg-white hover:border-blue-200"
                        )}
                        style={ta.status === "scheduled" ? {
                          animation: "scheduledPulse 2.5s ease-in-out infinite",
                        } : undefined}
                      >
                        {ta.status === "scheduled" && (
                          <style>{`
                            @keyframes scheduledPulse {
                              0%, 100% { background-color: #eff6ff; border-color: #bfdbfe; }
                              50% { background-color: #dbeafe; border-color: #93c5fd; }
                            }
                          `}</style>
                        )}
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                              {ta.attemptNumber}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">Attempt {ta.attemptNumber}</p>
                              <p className="text-[10px] text-slate-400 font-medium">
                                Assigned {ta.assignedAt ? format(new Date(ta.assignedAt), "MMM d, yyyy") : "—"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={cn(
                              "text-[10px] capitalize border-0",
                              ta.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                            )}>
                              {ta.status === "completed" && <CheckCheck className="h-3 w-3 mr-1" />}
                              {ta.status}
                            </Badge>
                            <Badge className={cn("text-[10px] border-0 capitalize", getPriorityColor(ta.priority || ""))}>
                              {ta.priority}
                            </Badge>
                            {ta.status === "assigned" && canWriteTraining && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7 rounded-lg border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                                    onClick={() => {
                                      setSelectedAssignment(ta);
                                      setSessionFormOpen(true);
                                    }}
                                  >
                                    <CalendarPlus className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  Schedule Training Session
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {ta.status === "scheduled" && (canWriteTraining || canConductScreenings) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold gap-1.5 shadow-sm"
                                    onClick={() =>
                                      navigate(
                                        "/screening-coordination/training/conduct",
                                        { state: { assignments: [ta] } }
                                      )
                                    }
                                  >
                                    <PlayCircle className="h-3.5 w-3.5" />
                                    Conduct Training
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  Start the training session
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                          <div>
                            <SectionLabel>Session Type</SectionLabel>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Video className="h-3.5 w-3.5 text-indigo-400" />
                              <span className="text-xs font-semibold text-slate-700 capitalize">{ta.sessionType || "—"}</span>
                            </div>
                          </div>
                          <div>
                            <SectionLabel>Duration</SectionLabel>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-xs font-semibold text-slate-700">{ta.duration || "60"} mins</span>
                            </div>
                          </div>
                          <div>
                            <SectionLabel>Scheduled For</SectionLabel>
                            <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                              {ta.scheduledTime ? format(new Date(ta.scheduledTime), "MMM d, yyyy") : "—"}
                            </p>
                            {ta.scheduledTime && (
                              <p className="text-[10px] text-slate-400">{format(new Date(ta.scheduledTime), "h:mm a")}</p>
                            )}
                          </div>
                          <div>
                            <SectionLabel>Completed At</SectionLabel>
                            {ta.completedAt ? (
                              <>
                                <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                                  {format(new Date(ta.completedAt), "MMM d, yyyy")}
                                </p>
                                <p className="text-[10px] text-slate-400">{format(new Date(ta.completedAt), "h:mm a")}</p>
                              </>
                            ) : (
                              <p className="text-xs text-slate-400 mt-0.5 italic">Not yet</p>
                            )}
                          </div>
                        </div>

                        {/* Focus Areas */}
                        {ta.focusAreas?.length > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Target className="h-3.5 w-3.5 text-slate-400" />
                              <SectionLabel>Focus Areas</SectionLabel>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {ta.focusAreas.map((area: string) => (
                                <span
                                  key={area}
                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100"
                                >
                                  {area}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {ta.notes && (
                          <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <FileText className="h-3.5 w-3.5 text-slate-400" />
                              <SectionLabel>Training Notes</SectionLabel>
                            </div>
                            <p className="text-xs text-slate-600 italic leading-relaxed">"{ta.notes}"</p>
                          </div>
                        )}

                        {/* Target completion */}
                        {ta.targetCompletionDate && (
                          <div className="mt-3 flex items-center gap-1.5">
                            <Flag className="h-3.5 w-3.5 text-orange-400" />
                            <span className="text-[11px] text-slate-500">
                              Target:{" "}
                              <span className="font-semibold text-orange-600">
                                {format(new Date(ta.targetCompletionDate), "MMM d, yyyy")}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* ─── Decision Modal ──────────────────────────────────────────────── */}
        <UpdateScreeningTrainingModal
          open={isDecisionModalOpen}
          onOpenChange={setIsDecisionModalOpen}
          screening={selectedInterview}
        />

        <AssignToTrainerDialog
          open={assignToTrainerOpen}
          onOpenChange={setAssignToTrainerOpen}
          onSubmit={async () => {
            await refetch();
          }}
          isLoading={isCreatingTraining}
          candidateName={`${candidate?.firstName} ${candidate?.lastName}`}
          screeningId={selectedInterview.id}
        />
        <EditScreeningDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} screeningId={selectedInterview.id} />
        <NotifyDocumentationModal
          isOpen={notifyRecruiterConfirm.isOpen}
          onClose={() => setNotifyRecruiterConfirm({ isOpen: false })}
          data={notifyRecruiterConfirm}
          setData={setNotifyRecruiterConfirm}
          onSuccess={refetch}
        />
        <ScreeningInterviewHistoryModal
          isOpen={isHistoryModalOpen}
          onOpenChange={setIsHistoryModalOpen}
          candidateName={`${candidate?.firstName} ${candidate?.lastName}`}
          historyData={historyData}
          isLoading={isLoadingHistory}
          page={historyPage}
          onPageChange={setHistoryPage}
        />

        {selectedAssignment && (
          <ScheduleTrainingModal
            open={sessionFormOpen}
            onOpenChange={(open) => {
              setSessionFormOpen(open);
              if (!open) setSelectedAssignment(null);
            }}
            selectedAssignments={[selectedAssignment]}
            onSuccess={refetch}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
