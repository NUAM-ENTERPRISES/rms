import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useGetProjectsQuery,
  useGetProjectStatsQuery,
  QueryProjectsRequest,
  useGetRecruiterAnalyticsQuery,
  RecruiterAnalytics,
} from "@/features/projects";
import ProjectStats from "@/components/organisms/ProjectStats";
import ProjectFilters from "@/components/molecules/ProjectFilters";
import ProjectGrid from "@/components/organisms/ProjectGrid";
import { useCan } from "@/hooks/useCan";
import { useAppSelector } from "@/app/hooks";
import { Project } from "@/features/projects";
import {
  AlertTriangle,
  CalendarClock,
  Target,
  UserCheck2,
  UserMinus,
} from "lucide-react";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const canManageProjects = useCan("manage:projects");
  const canReadProjects = useCan("read:projects");
  const { user } = useAppSelector((state) => state.auth);
  const isProcessingExecutive =
    user?.roles?.some?.((role) => role === "Processing Executive") ?? false;
  const isRecruiter =
    user?.roles?.some?.((role) => role === "Recruiter") ?? false;

  // State for filters and pagination
  const [filters, setFilters] = useState<QueryProjectsRequest>({
    page: 1,
    limit: 12,
    sortBy: undefined,
    sortOrder: "desc",
    status: undefined,
    clientId: undefined,
    teamId: undefined,
  });

  // RTK Query hooks
  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = useGetProjectsQuery(filters);

  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
  } = useGetProjectStatsQuery();

  const {
    data: recruiterAnalyticsResponse,
    isLoading: recruiterAnalyticsLoading,
  } = useGetRecruiterAnalyticsQuery(undefined, {
    skip: !isRecruiter,
  });
  const recruiterAnalytics = recruiterAnalyticsResponse?.data;

  // Handle filter changes
  const handleFiltersChange = (newFilters: QueryProjectsRequest) => {
    setFilters(newFilters);
  };

  // Handle page changes
  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  // Handle project actions
  const handleViewProject = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  const handleCreateProject = () => {
    navigate("/projects/create");
  };

  const handleExportProjects = () => {
    // TODO: Implement export functionality
    toast.info("Export functionality coming soon");
  };

  // Error handling
  if (projectsError || statsError) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {canReadProjects
                ? "Error Loading Projects"
                : "Project Access Limited"}
            </h2>
            <p className="text-gray-600">
              {canReadProjects
                ? "There was an error loading the projects. Please try again later."
                : "You have limited access to project information. Contact your administrator for full access."}
            </p>
            {canReadProjects && (
              <Button onClick={() => window.location.reload()} className="mt-4">
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full space-y-6 py-2">
        {isRecruiter && canReadProjects && (
          <RecruiterPulse
            analytics={recruiterAnalytics}
            loading={recruiterAnalyticsLoading}
            onProjectNavigate={(projectId) =>
              navigate(`/projects/${projectId}`)
            }
          />
        )}

        {!statsLoading &&
          statsData?.data &&
          canReadProjects &&
          !isProcessingExecutive && (
            <ProjectStats stats={statsData.data} className="px-0" />
          )}

        {canReadProjects && (
          <div className="rounded-3xl border border-white/60 bg-white/95 shadow-lg shadow-slate-200/50">
            <div className="p-5">
              <ProjectFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onExport={handleExportProjects}
                onCreateProject={handleCreateProject}
                canCreateProject={canManageProjects}
              />
            </div>
          </div>
        )}

        {canReadProjects ? (
          <div className="rounded-3xl border border-white/60 bg-white/95 shadow-lg shadow-slate-200/60">
            <div className="flex flex-col gap-2 border-b border-slate-100/80 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Project roster
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  All active engagements
                </h2>
              </div>
              {projectsData?.data && (
                <span className="text-sm text-slate-500">
                  {projectsData.data.pagination.total} total projects
                </span>
              )}
            </div>
            <div className="p-6">
              <ProjectGrid
                projects={projectsData?.data?.projects || []}
                pagination={projectsData?.data?.pagination}
                onPageChange={handlePageChange}
                onView={canReadProjects ? handleViewProject : undefined}
                loading={projectsLoading}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/90 p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Project access limited
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              You don&apos;t have permission to view project details. Contact
              your administrator to request access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RecruiterPulse({
  analytics,
  loading,
  onProjectNavigate,
}: {
  analytics?: RecruiterAnalytics;
  loading: boolean;
  onProjectNavigate: (projectId: string) => void;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-28 rounded-2xl border border-white/50 bg-white/80 shadow-inner shadow-slate-200/70 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  const urgentProject = analytics.urgentProject;
  const overdueProjects = analytics.overdueProjects ?? [];
  const untouchedCandidates = analytics.untouchedCandidates ?? [];
  const daysToDeadline = urgentProject
    ? Math.max(urgentProject.daysUntilDeadline ?? 0, 0)
    : 0;

  type CardListItem = {
    id: string;
    heading: string;
    subheading: string;
  };

  type PulseCard = {
    id: string;
    label: string;
    primary: string;
    helper: string;
    icon: typeof Target;
    gradient: string;
    iconWrapper: string;
    iconColor: string;
    textColor?: string;
    helperColor?: string;
    labelColor?: string;
    chip?: string;
    suffix?: string;
    footnote?: string;
    clickable?: boolean;
    onClick?: () => void;
    listTitle?: string;
    list?: CardListItem[];
  };

  const cards: PulseCard[] = [
    {
      id: "urgent",
      label: "Urgent project",
      primary: urgentProject ? daysToDeadline.toString() : "0",
      suffix: urgentProject
        ? daysToDeadline === 1
          ? "day"
          : "days"
        : undefined,
      helper: urgentProject?.title ?? "No high-priority requests",
      icon: Target,
      gradient: "from-rose-600 via-orange-500 to-amber-400",
      iconWrapper: "bg-white/15 shadow-inner shadow-rose-900/30",
      iconColor: "text-amber-50",
      chip: urgentProject?.clientName ?? "Up to date",
      footnote: `Covering ${analytics.assignedProjectCount} active project${
        analytics.assignedProjectCount === 1 ? "" : "s"
      }`,
      clickable: Boolean(urgentProject),
      onClick: urgentProject
        ? () => onProjectNavigate(urgentProject.id)
        : undefined,
    },
    {
      id: "hired",
      label: "Hired / Selected",
      primary: analytics.hiredOrSelectedCount.toString(),
      helper: "Closed placements",
      icon: UserCheck2,
      gradient: "from-emerald-500 via-teal-500 to-cyan-500",
      iconWrapper: "bg-white/15 shadow-inner shadow-emerald-900/20",
      iconColor: "text-emerald-50",
      chip: "Wins this quarter",
    },
    {
      id: "overdue",
      label: "Overdue projects",
      primary: overdueProjects.length.toString(),
      helper: overdueProjects.length ? "Needs escalation" : "All on track",
      icon: AlertTriangle,
      gradient: "from-slate-900 via-slate-800 to-slate-900",
      iconWrapper: "bg-white/10 shadow-inner shadow-black/40",
      iconColor: "text-rose-200",
      footnote: `${analytics.activeCandidateCount} active nominees in motion`,
      listTitle: "Overdue queue",
      list: overdueProjects.map((project) => ({
        id: project.id,
        heading: project.title,
        subheading: `${project.clientName ?? "Client TBD"} • ${
          project.overdueDays
            ? `${project.overdueDays} day${
                project.overdueDays > 1 ? "s" : ""
              } overdue`
            : "Deadline missing"
        }`,
      })),
    },
    {
      id: "untouched",
      label: "Untouched leads",
      primary: analytics.untouchedCandidatesCount.toString(),
      helper: analytics.untouchedCandidatesCount
        ? "Warm them up today"
        : "Everyone engaged",
      icon: UserMinus,
      gradient: "from-indigo-600 via-blue-600 to-cyan-500",
      iconWrapper: "bg-white/15 shadow-inner shadow-indigo-900/30",
      iconColor: "text-indigo-50",
      listTitle: "Top untouched",
      list: untouchedCandidates.map((candidate) => ({
        id: candidate.id,
        heading: candidate.name || "Unassigned candidate",
        subheading: `${candidate.currentRole ?? "Role TBD"} • ${
          candidate.assignedProjectTitle ?? "No project mapped"
        }${candidate.countryCode ? ` • ${candidate.countryCode}` : ""}`,
      })),
    },
    {
      id: "interviews",
      label: "Upcoming interviews",
      primary: analytics.upcomingInterviewsCount.toString(),
      helper: "Next 14 days",
      icon: CalendarClock,
      gradient: "from-violet-600 via-purple-600 to-pink-500",
      iconWrapper: "bg-white/15 shadow-inner shadow-purple-900/30",
      iconColor: "text-pink-50",
      chip: "Stay prepared",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const textColor = card.textColor ?? "text-white";
        const labelColor = card.labelColor ?? "text-white/70";
        const helperColor = card.helperColor ?? "text-white/80";

        return (
          <div key={card.id} className="group relative">
            <article
              role={card.clickable ? "button" : undefined}
              tabIndex={card.clickable ? 0 : -1}
              onClick={card.onClick}
              onKeyDown={(event) => {
                if (
                  card.clickable &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault();
                  card.onClick?.();
                }
              }}
              className={`relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br ${
                card.gradient
              } p-4 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.95)] transition-all ${
                card.clickable
                  ? "cursor-pointer hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-[0.25em] ${labelColor}`}
                  >
                    {card.label}
                  </p>
                  <div className={`flex items-baseline gap-1 ${textColor}`}>
                    <span className="text-2xl font-black leading-none">
                      {card.primary}
                    </span>
                    {card.suffix && (
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        {card.suffix}
                      </span>
                    )}
                  </div>
                  <p className={`text-[13px] ${helperColor}`}>{card.helper}</p>
                  {card.footnote && (
                    <p className={`text-[10px] ${helperColor}`}>
                      {card.footnote}
                    </p>
                  )}
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconWrapper}`}
                >
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
              {card.chip && (
                <div className="mt-3 inline-flex items-center rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/90">
                  {card.chip}
                </div>
              )}
            </article>

            {card.list && card.list.length > 0 && (
              <div className="pointer-events-none absolute left-1/2 top-full z-20 hidden w-60 -translate-x-1/2 translate-y-2 rounded-2xl border border-slate-100 bg-white/95 p-3 text-xs text-slate-600 shadow-2xl transition-all group-hover:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  {card.listTitle}
                </p>
                <div className="mt-2 space-y-2">
                  {card.list.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-100/80 bg-white/90 p-2 shadow-sm"
                    >
                      <p className="text-[12px] font-semibold text-slate-900">
                        {item.heading}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {item.subheading}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
