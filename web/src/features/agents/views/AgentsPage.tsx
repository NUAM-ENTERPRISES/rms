import { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Handshake,
  Building2,
  Mail,
  Phone,
  Users,
  UserPlus,
  LayoutGrid,
  ArrowUpRight,
  Calendar,
  Eye,
  UserRoundSearch,
  MapPin,
} from "lucide-react";
import { useGetAgentsQuery } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCan, useIsAgentCoordinator } from "@/hooks/useCan";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks";
import {
  useGetRecruiterMyCandidatesQuery,
  useTransferCandidateMutation,
} from "@/features/candidates/api";
import { TransferCandidateDialog } from "@/features/candidates/components/TransferCandidateDialog";
import { useAppSelector } from "@/app/hooks";
import DashboardWelcomeHeader from "@/components/molecules/DashboardWelcomeHeader";
import { AgentCoordinatorCandidateTableRows } from "../components/AgentCoordinatorCandidateTableRows";
import { CreateAgentDialog } from "../components/CreateAgentDialog";
import {
  AgentCandidateRequestsPanel,
  useAgentCandidateRequestsCount,
} from "../components/AgentCandidateRequestsTile";

export default function AgentsPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLDivElement>(null);
  const { user } = useAppSelector((state) => state.auth);
  
  const canWrite = useCan("write:agents");
  /** Create API uses write:candidates; CreateCandidatePage also checks manage:candidates */
  const canCreateCandidate =
    useCan("write:candidates") || useCan("manage:candidates");
  // Temporarily hide Add Candidate for admin/manager roles (UI only).
  const isAddCandidateRestrictedRole = (user?.roles ?? []).some((role) => {
    const normalized = String(role).trim().toLowerCase();
    return (
      normalized === "admin" ||
      normalized === "manager" ||
      normalized === "system admin" ||
      // In RMS, "admin" users often come through as CEO/Director roles.
      normalized === "ceo" ||
      normalized === "director"
    );
  });
  const canCreateCandidateUi = canCreateCandidate && !isAddCandidateRestrictedRole;
  const canWriteCandidates = useCan("write:candidates");
  const canTransferCandidates = user?.roles?.some((role) =>
    ["CEO", "Director", "Manager", "Recruiter Manager", "Team Head", "Team Lead", "System Admin"].includes(role),
  );
  const isAgentCoordinator = useIsAgentCoordinator();

  const [transferDialog, setTransferDialog] = useState<{
    isOpen: boolean;
    candidateId?: string;
    candidateName?: string;
    currentRecruiter?: { id: string; name?: string; email?: string } | null;
  }>({ isOpen: false });
  const [transferCandidateMutation, { isLoading: isTransferring }] =
    useTransferCandidateMutation();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 350);
  const [agentListPage, setAgentListPage] = useState(1);
  const agentPageSize = 10;

  const [candidateListPage, setCandidateListPage] = useState(1);
  const candidatePageSize = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "with-candidates" | "candidate-requests"
  >(() => (isAgentCoordinator ? "candidate-requests" : "all"));

  /** Agent Coordinator: my-candidates (agent source) tile uses counts.totalAssigned from API */
  const { data: agentCoordinatorCountsPayload } = useGetRecruiterMyCandidatesQuery(
    { page: 1, limit: 1, source: "agent" },
    { skip: !isAgentCoordinator },
  );

  const { data: agentCoordinatorCandidatesPayload, isLoading: agentCoordinatorCandidatesLoading } =
    useGetRecruiterMyCandidatesQuery(
      {
        page: candidateListPage,
        limit: candidatePageSize,
        source: "agent",
        search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
      },
      { skip: !isAgentCoordinator || activeFilter !== "with-candidates" },
    );
  /** When the main agent table is skipped (Agent Coordinator on Total Candidates view), still need page-1 totals for tiles — limit 10 only (matches list page size). */
  const agentsListSkipped =
    isAgentCoordinator && activeFilter === "with-candidates";
  const { data: agentsForTilesWhenSkipped } = useGetAgentsQuery(
    { page: 1, limit: agentPageSize },
    { skip: !agentsListSkipped },
  );

  /** Roles other than Agent Coordinator: sum candidate counts across many agents */
  const { data: agentsForStatSum } = useGetAgentsQuery(
    { page: 1, limit: 500 },
    { skip: isAgentCoordinator },
  );

  const { data: agentsPaged, isLoading: agentsLoading } = useGetAgentsQuery(
    {
      page: agentListPage,
      limit: agentPageSize,
      search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
      isActive: activeFilter === "active" ? true : undefined,
    },
    { skip: agentsListSkipped },
  );

  const agents = agentsPaged?.data ?? [];

  const filteredAgents = agents.filter((agent) => {
    if (activeFilter === "with-candidates") {
      return (agent._count?.candidates || 0) > 0;
    }
    return true;
  });

  const totalCandidatesFromAgentRows = useMemo(
    () =>
      (agentsForStatSum?.data ?? []).reduce(
        (acc, curr) => acc + (curr._count?.candidates || 0),
        0,
      ),
    [agentsForStatSum],
  );

  const totalCandidates = isAgentCoordinator
    ? (agentCoordinatorCountsPayload?.counts?.totalAssigned ?? 0)
    : totalCandidatesFromAgentRows;

  const totalAgentsCount =
    agentsPaged?.meta?.total ??
    agentsForTilesWhenSkipped?.meta?.total ??
    0;

  /** No separate GET /agents?isActive=true on load — use table meta when Active filter is on; else derive from stat batch (non–Agent Coordinator) or current page rows (Agent Coordinator). */
  const activeAgentsCount = useMemo(() => {
    if (activeFilter === "active") {
      return agentsPaged?.meta?.total ?? 0;
    }
    if (!isAgentCoordinator) {
      return (agentsForStatSum?.data ?? []).filter(
        (a) => a.isActive !== false,
      ).length;
    }
    return (
      agentsPaged?.data ??
      agentsForTilesWhenSkipped?.data ??
      []
    ).filter((a) => a.isActive !== false).length;
  }, [
    activeFilter,
    agentsPaged?.meta?.total,
    agentsPaged?.data,
    agentsForTilesWhenSkipped?.data,
    agentsForStatSum?.data,
    isAgentCoordinator,
  ]);

  useEffect(() => {
    setAgentListPage(1);
  }, [activeFilter, debouncedSearch]);

  useEffect(() => {
    setCandidateListPage(1);
  }, [debouncedSearch, activeFilter]);

  const handleTransferConfirm = async (data: {
    targetRecruiterId: string;
    reason: string;
  }) => {
    if (!transferDialog.candidateId) return;
    try {
      await transferCandidateMutation({
        candidateId: transferDialog.candidateId,
        targetRecruiterId: data.targetRecruiterId,
        reason: data.reason,
      }).unwrap();
      setTransferDialog({ isOpen: false });
      toast.success("Candidate transferred");
    } catch {
      toast.error("Failed to transfer candidate");
    }
  };

  const isCandidatePipelineFilter = activeFilter === "with-candidates";
  const isRequestsFilter = activeFilter === "candidate-requests";

  const pendingRequestsCount = useAgentCandidateRequestsCount(!isAgentCoordinator);

  const accentStyles: Record<string, { card: string; icon: string; iconBg: string; value: string; ring: string; dot: string }> = {
    amber:  { card: "from-amber-50 via-white to-amber-50/30 border-amber-100",   icon: "text-amber-600",  iconBg: "bg-amber-100",  value: "text-amber-700",  ring: "ring-amber-400/50",  dot: "bg-amber-500" },
    blue:   { card: "from-blue-50 via-white to-blue-50/30 border-blue-100",      icon: "text-blue-600",   iconBg: "bg-blue-100",   value: "text-blue-700",   ring: "ring-blue-400/50",   dot: "bg-blue-500" },
    indigo: { card: "from-indigo-50 via-white to-indigo-50/30 border-indigo-100", icon: "text-indigo-600", iconBg: "bg-indigo-100", value: "text-indigo-700", ring: "ring-indigo-400/50", dot: "bg-indigo-500" },
    purple: { card: "from-purple-50 via-white to-purple-50/30 border-purple-100", icon: "text-purple-600", iconBg: "bg-purple-100", value: "text-purple-700", ring: "ring-purple-400/50", dot: "bg-purple-500" },
  };

  const baseTiles = [
    { label: "Total Agents",     value: totalAgentsCount,  icon: Handshake,       statusFilter: "all",             accent: "blue",   subtitle: "Registered partners" },
    { label: "Total Candidates", value: totalCandidates,   icon: Users,           statusFilter: "with-candidates", accent: "indigo", subtitle: isAgentCoordinator ? "Agent-sourced assignments" : "Referral volume" },
    { label: "Active Agents",    value: activeAgentsCount, icon: LayoutGrid,      statusFilter: "active",          accent: "purple", subtitle: "Currently sourcing" },
  ];

  const statTiles = isAgentCoordinator
    ? [
        { label: "Candidate Requests", value: pendingRequestsCount, icon: UserRoundSearch, statusFilter: "candidate-requests", accent: "amber", subtitle: "Pending from managers" },
        ...baseTiles,
      ]
    : baseTiles;

  const agentCoordinatorCandidates =
    agentCoordinatorCandidatesPayload?.data ?? [];
  const agentCoordinatorPagination = agentCoordinatorCandidatesPayload?.pagination;
  const showAgentCoordinatorCandidateTable =
    isAgentCoordinator && isCandidatePipelineFilter;

  return (
    <div className="min-h-screen">
      <div className="w-full mx-auto space-y-5 mt-2 px-6">
        {isAgentCoordinator && (
          <DashboardWelcomeHeader
            userName={user?.name || "Agent Coordinator"}
            subtitle="Manage agents, track agent-sourced candidates, and oversee referral pipeline."
          />
        )}

        {/* ── Stat Tiles ───────────────────────────────────────────── */}
        <div className={cn("grid gap-4 grid-cols-1", isAgentCoordinator ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3")}>
          {statTiles.map((stat) => {
            const Icon = stat.icon;
            const s = accentStyles[stat.accent];
            const isActive = activeFilter === stat.statusFilter;
            return (
              <button
                key={stat.label}
                type="button"
                onClick={() => {
                  setActiveFilter(stat.statusFilter as any);
                  tableRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className={cn(
                  "group relative text-left rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-200 focus:outline-none",
                  s.card,
                  isActive
                    ? `ring-2 shadow-md ${s.ring}`
                    : "hover:-translate-y-0.5 hover:shadow-md"
                )}
              >
                {isActive && (
                  <span className={cn("absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse", s.dot)} />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                    <p className={cn("text-3xl font-bold tabular-nums", s.value)}>{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.subtitle}</p>
                  </div>
                  <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
                    <Icon className={cn("h-5 w-5", s.icon)} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                  <span>{isActive ? "Viewing now" : "Click to filter"}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Main Card ────────────────────────────────────────────── */}
        <div ref={tableRef} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

          {/* Table Header Bar */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn(
                    "shrink-0 rounded-xl p-2.5 shadow-md",
                    isRequestsFilter
                      ? "bg-gradient-to-br from-amber-400 to-orange-500"
                      : "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500"
                  )}>
                    {isRequestsFilter ? (
                      <UserRoundSearch className="h-5 w-5 text-white" aria-hidden />
                    ) : isCandidatePipelineFilter && isAgentCoordinator ? (
                      <Users className="h-5 w-5 text-white" aria-hidden />
                    ) : (
                      <Handshake className="h-5 w-5 text-white" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-gray-900 truncate">
                      {isRequestsFilter
                        ? "Candidate Requests"
                        : activeFilter === "all"
                          ? "All Agents"
                          : activeFilter === "active"
                            ? "Active Agents"
                            : isAgentCoordinator
                              ? "Agent Coordinator Candidates"
                              : "Agents with Candidates"}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isRequestsFilter
                        ? "Requests from project managers for agent-sourced candidates"
                        : showAgentCoordinatorCandidateTable
                          ? `${agentCoordinatorPagination?.totalCount ?? 0} candidate${(agentCoordinatorPagination?.totalCount ?? 0) !== 1 ? "s" : ""} (total assigned: ${totalCandidates})`
                          : `${filteredAgents.length} agent${filteredAgents.length !== 1 ? "s" : ""} on this page`}
                    </p>
                  </div>
                </div>
                {!isRequestsFilter && (
                  <div className="flex items-center gap-2 shrink-0">
                    {activeFilter === "with-candidates" && canCreateCandidateUi && (
                      <Button
                        type="button"
                        onClick={() => navigate("/candidates/create")}
                        size="sm"
                        className="h-9 px-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm gap-1.5"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Add Candidate
                      </Button>
                    )}
                    {canWrite && !(activeFilter === "with-candidates" && canCreateCandidateUi) && (
                      <Button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        size="sm"
                        className="h-9 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Agent
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Search (hidden for requests view) */}
              {!isRequestsFilter && (
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={showAgentCoordinatorCandidateTable ? "Search candidates…" : "Search agents…"}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all rounded-xl"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Candidate Requests Panel ─────────────────────────────── */}
          {isRequestsFilter ? (
            <AgentCandidateRequestsPanel />
          ) : showAgentCoordinatorCandidateTable ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 border-b border-gray-200 hover:bg-slate-50/80">
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Candidate</TableHead>
                      <TableHead className="h-10 px-4 min-w-[7.5rem] text-[10px] font-bold uppercase tracking-widest text-slate-500">Passport</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Created By</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Agent</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Created</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Contact</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AgentCoordinatorCandidateTableRows
                      candidates={agentCoordinatorCandidates}
                      isLoading={agentCoordinatorCandidatesLoading}
                      canWriteCandidates={canWriteCandidates}
                      canTransferCandidates={!!canTransferCandidates}
                      onTransfer={(candidate, recruiter) =>
                        setTransferDialog({
                          isOpen: true,
                          candidateId: candidate.id,
                          candidateName: `${candidate.firstName} ${candidate.lastName}`,
                          currentRecruiter: recruiter,
                        })
                      }
                    />
                  </TableBody>
                </Table>
              </div>
              {agentCoordinatorPagination && agentCoordinatorPagination.totalCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 px-6 py-4 gap-3 bg-slate-50/50">
                  <p className="text-xs text-slate-500">
                    Showing <span className="font-semibold text-slate-700">{(candidateListPage - 1) * candidatePageSize + 1}</span>–<span className="font-semibold text-slate-700">{Math.min(candidateListPage * candidatePageSize, agentCoordinatorPagination.totalCount)}</span> of <span className="font-semibold text-slate-700">{agentCoordinatorPagination.totalCount}</span> candidates
                  </p>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs border-slate-200 hover:bg-slate-100 rounded-xl gap-1" disabled={agentCoordinatorCandidatesLoading || candidateListPage <= 1} onClick={() => setCandidateListPage((p) => Math.max(1, p - 1))}>
                      Prev
                    </Button>
                    <span className="text-xs tabular-nums text-slate-600 px-1">Page {candidateListPage} of {agentCoordinatorPagination.totalPages}</span>
                    <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs border-slate-200 hover:bg-slate-100 rounded-xl gap-1" disabled={agentCoordinatorCandidatesLoading || candidateListPage >= agentCoordinatorPagination.totalPages} onClick={() => setCandidateListPage((p) => Math.min(agentCoordinatorPagination.totalPages, p + 1))}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* ── Agents Card Grid ─────────────────────────────────── */}
              {agentsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 animate-pulse">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-gray-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-100 rounded w-2/3" />
                          <div className="h-3 bg-gray-100 rounded w-1/3" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-full" />
                        <div className="h-3 bg-gray-100 rounded w-5/6" />
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Handshake className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="font-semibold text-slate-600">
                    {isCandidatePipelineFilter ? "No agents with candidates" : "No agents found"}
                  </p>
                  <p className="text-sm text-slate-400 max-w-xs text-center">
                    {isCandidatePipelineFilter
                      ? "No agents currently have linked candidates, or none match your search."
                      : "Try adjusting your search or filters."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-6">
                  {filteredAgents.map((agent) => (
                    <div
                      key={agent.id}
                      onClick={() => navigate(`/agents/${agent.id}`)}
                      className="group relative bg-white rounded-2xl border border-gray-100 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      {/* Card header */}
                      <div className="flex items-start justify-between p-5 pb-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                            {agent.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 truncate leading-tight">{agent.name}</p>
                            {agent.agentType && (
                              <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                {agent.agentType}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* View button */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-gray-100"
                            onClick={(e) => { e.stopPropagation(); navigate(`/agents/${agent.id}`); }}
                            aria-label={`View details for ${agent.name}`}
                          >
                            <Eye className="h-4 w-4 text-gray-500" />
                          </Button>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="mx-5 border-t border-gray-50" />

                      {/* Card body */}
                      <div className="p-5 pt-3 space-y-2">
                        {agent.companyName && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{agent.companyName}</span>
                          </div>
                        )}
                        {agent.location && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{agent.location}</span>
                          </div>
                        )}
                        {agent.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{agent.email}</span>
                          </div>
                        )}
                        {agent.mobileNumber && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{agent.mobileNumber}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span>{agent._count?.candidates || 0} candidate{(agent._count?.candidates || 0) !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>Added {new Date(agent.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {agentsPaged?.meta && agentsPaged.meta.total > 0 && (agentsPaged.meta.totalPages ?? 0) > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 px-6 py-4 gap-3 bg-slate-50/50">
                  <p className="text-xs text-slate-500">
                    Showing <span className="font-semibold text-slate-700">{(agentListPage - 1) * agentPageSize + 1}</span>–<span className="font-semibold text-slate-700">{Math.min(agentListPage * agentPageSize, agentsPaged.meta.total)}</span> of <span className="font-semibold text-slate-700">{agentsPaged.meta.total}</span> agents
                  </p>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs border-slate-200 hover:bg-slate-100 rounded-xl" disabled={agentsLoading || agentListPage <= 1} onClick={() => setAgentListPage((p) => Math.max(1, p - 1))}>
                      Prev
                    </Button>
                    <span className="text-xs tabular-nums text-slate-600 px-1">Page {agentListPage} of {agentsPaged.meta.totalPages}</span>
                    <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs border-slate-200 hover:bg-slate-100 rounded-xl" disabled={agentsLoading || agentListPage >= agentsPaged.meta.totalPages} onClick={() => setAgentListPage((p) => Math.min(agentsPaged.meta.totalPages, p + 1))}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <CreateAgentDialog open={isModalOpen} onOpenChange={setIsModalOpen} />

      {transferDialog.isOpen ? (
        <TransferCandidateDialog
          open={transferDialog.isOpen}
          onOpenChange={(open) => setTransferDialog((prev) => ({ ...prev, isOpen: open }))}
          candidateName={transferDialog.candidateName || "Candidate"}
          currentRecruiter={transferDialog.currentRecruiter}
          onConfirm={handleTransferConfirm}
          isLoading={isTransferring}
        />
      ) : null}
    </div>
  );
}
