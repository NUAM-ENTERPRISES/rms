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
import { userHasAnyRole } from "@/config/role-names";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks";
import {
  useGetCandidatesQuery,
  useGetRecruiterMyCandidatesQuery,
  useTransferCandidateMutation,
} from "@/features/candidates/api";
import { TransferCandidateDialog } from "@/features/candidates/components/TransferCandidateDialog";
import { useAppSelector } from "@/app/hooks";
import DashboardWelcomeHeader from "@/components/molecules/DashboardWelcomeHeader";
import { DashboardStatTile } from "@/components/molecules/DashboardStatTile";
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
  const canTransferCandidates = userHasAnyRole(user?.roles ?? [], [
    "Managing Director",
    "Director",
    "Manager",
    "Recruitment Lead",
    "Team Head",
    "Team Lead",
    "System Admin",
  ]);
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

  const isCandidatePipelineFilter = activeFilter === "with-candidates";

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
      { skip: !isAgentCoordinator || !isCandidatePipelineFilter },
    );

  /** Admin / leadership: Total Candidates tile + list via GET /candidates?source=agent (not agents API) */
  const { data: adminAgentCandidatesCounts } = useGetCandidatesQuery(
    { page: 1, limit: 1, source: "agent" },
    { skip: isAgentCoordinator },
  );

  const { data: adminCandidatesPayload, isLoading: adminCandidatesLoading } =
    useGetCandidatesQuery(
      {
        page: candidateListPage,
        limit: candidatePageSize,
        source: "agent",
        search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
      },
      { skip: isAgentCoordinator || !isCandidatePipelineFilter },
    );

  /** When listing agent-sourced candidates, skip the agents grid — still fetch page-1 agents for tile totals. */
  const agentsListSkipped = isCandidatePipelineFilter;
  const { data: agentsForTilesWhenSkipped } = useGetAgentsQuery(
    { page: 1, limit: agentPageSize },
    { skip: !agentsListSkipped },
  );

  /** Non–Agent Coordinator: active-agent count from a larger agents batch */
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

  const totalCandidates = isAgentCoordinator
    ? (agentCoordinatorCountsPayload?.counts?.totalAssigned ?? 0)
    : (adminAgentCandidatesCounts?.pagination?.total ??
      adminAgentCandidatesCounts?.counts?.total ??
      0);

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

  const isRequestsFilter = activeFilter === "candidate-requests";

  const pendingRequestsCount = useAgentCandidateRequestsCount(!isAgentCoordinator);

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

  const pipelineCandidates = isAgentCoordinator
    ? (agentCoordinatorCandidatesPayload?.data ?? [])
    : (adminCandidatesPayload?.data ?? []);
  const pipelineCandidatesLoading = isAgentCoordinator
    ? agentCoordinatorCandidatesLoading
    : adminCandidatesLoading;
  const pipelinePagination = isAgentCoordinator
    ? agentCoordinatorCandidatesPayload?.pagination
    : adminCandidatesPayload?.pagination;
  const pipelineTotalCount =
    pipelinePagination?.totalCount ?? pipelinePagination?.total ?? 0;
  const pipelineTotalPages =
    pipelinePagination?.totalPages ??
    Math.max(1, Math.ceil(pipelineTotalCount / candidatePageSize));
  const showCandidatePipelineTable = isCandidatePipelineFilter;

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
        <div className={cn("grid auto-rows-fr gap-4 grid-cols-1", isAgentCoordinator ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3")}>
          {statTiles.map((stat) => {
            const isActive = activeFilter === stat.statusFilter;
            return (
              <DashboardStatTile
                key={stat.label}
                accent={stat.accent}
                label={stat.label}
                value={stat.value}
                subtitle={stat.subtitle}
                icon={stat.icon}
                active={isActive}
                interactive
                footerText={isActive ? "Viewing now" : "Click to filter"}
                onClick={() => {
                  setActiveFilter(stat.statusFilter as typeof activeFilter);
                  tableRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            );
          })}
        </div>

        {/* ── Main Card ────────────────────────────────────────────── */}
        <div ref={tableRef} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

          {/* Table Header Bar */}
          <div className="border-b border-border bg-gradient-to-r from-muted to-card px-6 py-4">
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
                    ) : isCandidatePipelineFilter ? (
                      <Users className="h-5 w-5 text-white" aria-hidden />
                    ) : (
                      <Handshake className="h-5 w-5 text-white" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-foreground truncate">
                      {isRequestsFilter
                        ? "Candidate Requests"
                        : activeFilter === "all"
                          ? "All Agents"
                          : activeFilter === "active"
                            ? "Active Agents"
                            : "Agent-sourced Candidates"}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isRequestsFilter
                        ? "Requests from project managers for agent-sourced candidates"
                        : showCandidatePipelineTable
                          ? `${pipelineTotalCount} candidate${pipelineTotalCount !== 1 ? "s" : ""}${isAgentCoordinator ? ` (total assigned: ${totalCandidates})` : ""}`
                          : `${agents.length} agent${agents.length !== 1 ? "s" : ""} on this page`}
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
                    placeholder={showCandidatePipelineTable ? "Search candidates…" : "Search agents…"}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm border-border bg-muted focus:bg-card focus:ring-2 focus:ring-blue-100 transition-all rounded-xl"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Candidate Requests Panel ─────────────────────────────── */}
          {isRequestsFilter ? (
            <AgentCandidateRequestsPanel />
          ) : showCandidatePipelineTable ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/80 border-b border-border hover:bg-muted/80">
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Candidate</TableHead>
                      <TableHead className="h-10 px-4 min-w-[7.5rem] text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Passport</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Created By</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Agent</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Created</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Contact</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AgentCoordinatorCandidateTableRows
                      candidates={pipelineCandidates}
                      isLoading={pipelineCandidatesLoading}
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
              {pipelineTotalCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border px-6 py-4 gap-3 bg-muted/50">
                  <p className="text-xs text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{(candidateListPage - 1) * candidatePageSize + 1}</span>–<span className="font-semibold text-foreground">{Math.min(candidateListPage * candidatePageSize, pipelineTotalCount)}</span> of <span className="font-semibold text-foreground">{pipelineTotalCount}</span> candidates
                  </p>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs border-border hover:bg-muted rounded-xl gap-1" disabled={pipelineCandidatesLoading || candidateListPage <= 1} onClick={() => setCandidateListPage((p) => Math.max(1, p - 1))}>
                      Prev
                    </Button>
                    <span className="text-xs tabular-nums text-muted-foreground px-1">Page {candidateListPage} of {pipelineTotalPages}</span>
                    <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs border-border hover:bg-muted rounded-xl gap-1" disabled={pipelineCandidatesLoading || candidateListPage >= pipelineTotalPages} onClick={() => setCandidateListPage((p) => Math.min(pipelineTotalPages, p + 1))}>
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
                    <div key={i} className="rounded-2xl border border-border bg-card shadow-sm p-5 animate-pulse">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-2/3" />
                          <div className="h-3 bg-muted rounded w-1/3" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded w-full" />
                        <div className="h-3 bg-muted rounded w-5/6" />
                        <div className="h-3 bg-muted rounded w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : agents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                    <Handshake className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="font-semibold text-muted-foreground">
                    No agents found
                  </p>
                  <p className="text-sm text-slate-400 max-w-xs text-center">
                    Try adjusting your search or filters.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-6">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      onClick={() => navigate(`/agents/${agent.id}`)}
                      className="group relative bg-card rounded-2xl border border-border border-l-4 border-l-blue-500 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      {/* Card header */}
                      <div className="flex items-start justify-between p-5 pb-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                            {agent.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground truncate leading-tight">{agent.name}</p>
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
                            className="h-8 w-8 rounded-lg hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); navigate(`/agents/${agent.id}`); }}
                            aria-label={`View details for ${agent.name}`}
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="mx-5 border-t border-gray-50" />

                      {/* Card body */}
                      <div className="p-5 pt-3 space-y-2">
                        {agent.companyName && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{agent.companyName}</span>
                          </div>
                        )}
                        {agent.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{agent.location}</span>
                          </div>
                        )}
                        {agent.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{agent.email}</span>
                          </div>
                        )}
                        {agent.mobileNumber && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{agent.mobileNumber}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{agent._count?.candidates || 0} candidate{(agent._count?.candidates || 0) !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
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
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border px-6 py-4 gap-3 bg-muted/50">
                  <p className="text-xs text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{(agentListPage - 1) * agentPageSize + 1}</span>–<span className="font-semibold text-foreground">{Math.min(agentListPage * agentPageSize, agentsPaged.meta.total)}</span> of <span className="font-semibold text-foreground">{agentsPaged.meta.total}</span> agents
                  </p>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs border-border hover:bg-muted rounded-xl" disabled={agentsLoading || agentListPage <= 1} onClick={() => setAgentListPage((p) => Math.max(1, p - 1))}>
                      Prev
                    </Button>
                    <span className="text-xs tabular-nums text-muted-foreground px-1">Page {agentListPage} of {agentsPaged.meta.totalPages}</span>
                    <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs border-border hover:bg-muted rounded-xl" disabled={agentsLoading || agentListPage >= agentsPaged.meta.totalPages} onClick={() => setAgentListPage((p) => Math.min(agentsPaged.meta.totalPages, p + 1))}>
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
