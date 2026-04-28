import React, { useState, useRef, useEffect, useMemo } from "react";
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
  Eye
} from "lucide-react";
import { 
  useGetAgentsQuery, 
  useCreateAgentMutation, 
} from "../api";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { StatusTile } from "@/components/molecules";
import { AGENT_TYPES } from "@/constants/agent-types";
import { useCan, useHasRole } from "@/hooks/useCan";
import { useDebounce } from "@/hooks";
import {
  useGetRecruiterMyCandidatesQuery,
  useTransferCandidateMutation,
} from "@/features/candidates/api";
import { TransferCandidateDialog } from "@/features/candidates/components/TransferCandidateDialog";
import { useAppSelector } from "@/app/hooks";
import { ClientCoordinatorCandidateTableRows } from "../components/ClientCoordinatorCandidateTableRows";

export default function AgentsPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLDivElement>(null);
  const { user } = useAppSelector((state) => state.auth);
  
  const canWrite = useCan("write:agents");
  /** Create API uses write:candidates; CreateCandidatePage also checks manage:candidates */
  const canCreateCandidate =
    useCan("write:candidates") || useCan("manage:candidates");
  const canWriteCandidates = useCan("write:candidates");
  const canTransferCandidates = user?.roles?.some((role) =>
    ["CEO", "Director", "Manager", "Team Head", "Team Lead", "System Admin"].includes(role),
  );
  const isClientCoordinator = useHasRole("Client Coordinator");

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
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "with-candidates">("all");

  /** CC: my-candidates (agent source) tile uses counts.totalAssigned from API */
  const { data: coordinatorCountsPayload } = useGetRecruiterMyCandidatesQuery(
    { page: 1, limit: 1, source: "agent" },
    { skip: !isClientCoordinator },
  );

  const { data: coordinatorCandidatesPayload, isLoading: coordinatorCandidatesLoading } =
    useGetRecruiterMyCandidatesQuery(
      {
        page: candidateListPage,
        limit: candidatePageSize,
        source: "agent",
        search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
      },
      { skip: !isClientCoordinator || activeFilter !== "with-candidates" },
    );
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobileNumber: "",
    companyName: "",
    agentType: "",
  });

  /** When the main agent table is skipped (CC on Total Candidates view), still need page-1 totals for tiles — limit 10 only (matches list page size). */
  const agentsListSkipped =
    isClientCoordinator && activeFilter === "with-candidates";
  const { data: agentsForTilesWhenSkipped } = useGetAgentsQuery(
    { page: 1, limit: agentPageSize },
    { skip: !agentsListSkipped },
  );

  /** Non-CC: sum candidate counts across many agents */
  const { data: agentsForStatSum } = useGetAgentsQuery(
    { page: 1, limit: 500 },
    { skip: isClientCoordinator },
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

  const [createAgent] = useCreateAgentMutation();

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

  const totalCandidates = isClientCoordinator
    ? (coordinatorCountsPayload?.counts?.totalAssigned ?? 0)
    : totalCandidatesFromAgentRows;

  const totalAgentsCount =
    agentsPaged?.meta?.total ??
    agentsForTilesWhenSkipped?.meta?.total ??
    0;

  /** No separate GET /agents?isActive=true on load — use table meta when Active filter is on; else derive from stat batch (non-CC) or current page rows (CC). */
  const activeAgentsCount = useMemo(() => {
    if (activeFilter === "active") {
      return agentsPaged?.meta?.total ?? 0;
    }
    if (!isClientCoordinator) {
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
    isClientCoordinator,
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

  const statTiles = [
    { 
      label: "Total Agents", 
      value: totalAgentsCount, 
      icon: Handshake, 
      statusFilter: "all", 
      color: "from-blue-500 to-cyan-500",
      subtitle: "Registered partners" 
    },
    { 
      label: "Total Candidates", 
      value: totalCandidates, 
      icon: Users, 
      statusFilter: "with-candidates", 
      color: "from-indigo-500 to-violet-500",
      subtitle: isClientCoordinator
        ? "Total assigned (agent-sourced my-candidates)"
        : "Referral volume",
    },
    { 
      label: "Active Agents", 
      value: activeAgentsCount, 
      icon: LayoutGrid, 
      statusFilter: "active", 
      color: "from-purple-500 to-pink-500",
      subtitle: "Currently sourcing" 
    },
  ];

  const handleOpenModal = () => {
    setFormData({
      name: "",
      email: "",
      mobileNumber: "",
      companyName: "",
      agentType: "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAgent(formData).unwrap();
      toast.success("Agent created successfully");
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Failed to save agent");
    }
  };

  const coordinatorCandidates =
    coordinatorCandidatesPayload?.data ?? [];
  const coordinatorPagination = coordinatorCandidatesPayload?.pagination;
  const showCcCandidateTable =
    isClientCoordinator && isCandidatePipelineFilter;

  return (
    <div className="py-2 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Agents</h1>
          <p className="text-slate-500 mt-1">Manage external partner agents and agencies.</p>
        </div>
       
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statTiles.map((stat, i) => {
          const colors = {
            "from-blue-500 to-cyan-500": { bg: "from-blue-50 to-blue-100/50", iconBg: "bg-blue-200/40", text: "text-blue-600" },
            "from-indigo-500 to-violet-500": { bg: "from-indigo-50 to-violet-100/50", iconBg: "bg-indigo-200/40", text: "text-indigo-700" },
            "from-purple-500 to-pink-500": { bg: "from-purple-50 to-purple-100/50", iconBg: "bg-purple-200/40", text: "text-purple-600" },
          }[stat.color] || { bg: "from-slate-50 to-slate-100/50", iconBg: "bg-slate-200/40", text: "text-slate-600" };

          const isActive = activeFilter === stat.statusFilter;

          return (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <StatusTile
                label={stat.label}
                value={stat.value}
                subtitle={stat.subtitle}
                icon={stat.icon}
                bgGradient={colors.bg}
                iconBg={colors.iconBg}
                textColor={colors.text}
                active={isActive}
                onClick={() => setActiveFilter(stat.statusFilter as any)}
                scrollTargetRef={tableRef}
                scrollOnClick={true}
                className="h-full"
              />
            </motion.div>
          );
        })}
      </div>

      <Card className="border-0 shadow-lg bg-white/90">
        <CardContent className="pt-0 pb-0">
          <div ref={tableRef} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50/70 px-6 py-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-3 shadow-lg shadow-purple-500/20">
                    {isCandidatePipelineFilter && isClientCoordinator ? (
                      <Users className="h-6 w-6 text-white" aria-hidden />
                    ) : (
                      <Handshake className="h-6 w-6 text-white" aria-hidden />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {activeFilter === "all"
                        ? "All Agents"
                        : activeFilter === "active"
                          ? "Active Agents"
                          : isClientCoordinator
                            ? "Your candidates"
                            : "Agents with candidates"}
                    </h4>
                    <p className="text-sm text-gray-600 font-medium">
                      {showCcCandidateTable
                        ? `${coordinatorPagination?.totalCount ?? 0} candidate${
                            (coordinatorPagination?.totalCount ?? 0) !== 1
                              ? "s"
                              : ""
                          } (assigned total: ${totalCandidates})`
                        : `${filteredAgents.length} agent${
                            filteredAgents.length !== 1 ? "s" : ""
                          } on this page`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {activeFilter === "with-candidates" && canCreateCandidate ? (
                      <Button
                        type="button"
                        onClick={() => navigate("/candidates/create")}
                        className="h-9 px-4 bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-md rounded-lg gap-2 text-sm"
                      >
                        <UserPlus className="h-4 w-4" /> Add Candidate
                      </Button>
                    ) : null}
                    {canWrite &&
                    !(
                      activeFilter === "with-candidates" && canCreateCandidate
                    ) ? (
                      <Button
                        type="button"
                        onClick={handleOpenModal}
                        className="h-9 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md rounded-lg gap-2 text-sm"
                      >
                        <Plus className="h-4 w-4" /> Add Agent
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      placeholder={
                        showCcCandidateTable
                          ? "Search candidates..."
                          : "Search agents..."
                      }
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-9 text-sm border-gray-200 bg-white focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            {showCcCandidateTable ? (
              <>
                <Table>
                  <TableHeader className="sticky">
                    <TableRow className="border-b border-gray-200 bg-gray-50/50">
                      <TableHead className="h-9 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">
                        Candidate
                      </TableHead>
                      <TableHead className="h-9 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">
                        Created By
                      </TableHead>
                      <TableHead className="h-9 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">
                        Agent
                      </TableHead>
                      <TableHead className="h-9 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">
                        Created
                      </TableHead>
                      <TableHead className="h-9 px-4 text-center text-[10px] font-bold uppercase tracking-wider text-gray-600">
                        Contact
                      </TableHead>
                      <TableHead className="h-9 px-4 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <ClientCoordinatorCandidateTableRows
                      candidates={coordinatorCandidates}
                      isLoading={coordinatorCandidatesLoading}
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
                {coordinatorPagination &&
                  coordinatorPagination.totalCount > 0 && (
                    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-slate-500">
                        Showing{" "}
                        <span className="font-semibold">
                          {(candidateListPage - 1) * candidatePageSize + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-semibold">
                          {Math.min(
                            candidateListPage * candidatePageSize,
                            coordinatorPagination.totalCount,
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold">
                          {coordinatorPagination.totalCount}
                        </span>
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 px-3"
                          disabled={
                            coordinatorCandidatesLoading ||
                            candidateListPage <= 1
                          }
                          onClick={() =>
                            setCandidateListPage((p) => Math.max(1, p - 1))
                          }
                        >
                          Previous
                        </Button>
                        <span className="text-xs tabular-nums text-slate-600">
                          Page {candidateListPage} of{" "}
                          {coordinatorPagination.totalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 px-3"
                          disabled={
                            coordinatorCandidatesLoading ||
                            candidateListPage >=
                              coordinatorPagination.totalPages
                          }
                          onClick={() =>
                            setCandidateListPage((p) =>
                              Math.min(
                                coordinatorPagination.totalPages,
                                p + 1,
                              ),
                            )
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
              </>
            ) : (
              <>
                <Table>
                  <TableHeader className="sticky">
                    <TableRow className="bg-gray-50/50 border-b border-gray-200">
                      <TableHead className="h-9 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600 font-semibold">Agent Details</TableHead>
                      <TableHead className="h-9 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600 font-semibold">Company</TableHead>
                      <TableHead className="h-9 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600 font-semibold text-center">Contact</TableHead>
                      <TableHead className="h-9 px-4 text-center text-[10px] font-bold uppercase tracking-wider text-gray-600 font-semibold text-center">Candidates</TableHead>
                      <TableHead className="h-9 px-4 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600 font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="bg-slate-50 p-4 rounded-full border border-slate-100 shadow-inner">
                              <Search className="h-8 w-8 text-slate-300" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-slate-900 font-semibold">
                                {agentsLoading
                                  ? "Loading..."
                                  : isCandidatePipelineFilter
                                    ? "No candidates found"
                                    : "No agents found"}
                              </p>
                              <p className="text-slate-500 text-sm">
                                {isCandidatePipelineFilter
                                  ? isClientCoordinator
                                    ? "You have no agent-sourced assignments yet, or none match your search."
                                    : "No agents currently have linked candidates, or none match your search."
                                  : "Try adjusting your search or filters."}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAgents.map((agent) => (
                        <TableRow key={agent.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors last:border-b-0 group">
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                                {agent.name.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{agent.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                    Added {new Date(agent.createdAt).toLocaleDateString()}
                                  </span>
                                  {agent.agentType && (
                                    <Badge variant="outline" className="text-[9px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-100">
                                      {agent.agentType}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="bg-slate-100 p-1.5 rounded-md">
                                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                              </div>
                              <span className="font-medium text-sm text-gray-700">{agent.companyName || "Personal"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex flex-col items-center gap-1">
                              {agent.email && (
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <Mail className="h-3 w-3 text-slate-400" />
                                  {agent.email}
                                </div>
                              )}
                              {agent.mobileNumber && (
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  <span className="font-medium">{agent.mobileNumber}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold rounded-full gap-2 border border-transparent hover:border-blue-100"
                              onClick={() => navigate(`/agents/${agent.id}`)}
                            >
                              <Users className="h-4 w-4" />
                              {agent._count?.candidates || 0}
                            </Button>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => navigate(`/agents/${agent.id}`)}
                              title="View agent details"
                              aria-label={`View details for ${agent.name}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {agentsPaged?.meta &&
                  agentsPaged.meta.total > 0 &&
                  (agentsPaged.meta.totalPages ?? 0) > 1 && (
                    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-slate-500">
                        Showing{" "}
                        <span className="font-semibold">
                          {(agentListPage - 1) * agentPageSize + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-semibold">
                          {Math.min(
                            agentListPage * agentPageSize,
                            agentsPaged.meta.total,
                          )}
                        </span>{" "}
                        of <span className="font-semibold">{agentsPaged.meta.total}</span>{" "}
                        agents
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 px-3"
                          disabled={agentsLoading || agentListPage <= 1}
                          onClick={() =>
                            setAgentListPage((p) => Math.max(1, p - 1))
                          }
                        >
                          Previous
                        </Button>
                        <span className="text-xs tabular-nums text-slate-600">
                          Page {agentListPage} of {agentsPaged.meta.totalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 px-3"
                          disabled={
                            agentsLoading ||
                            agentListPage >= agentsPaged.meta.totalPages
                          }
                          onClick={() =>
                            setAgentListPage((p) =>
                              Math.min(agentsPaged.meta.totalPages, p + 1),
                            )
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Agent</DialogTitle>
            <DialogDescription>
              Create a new agent profile for candidate sourcing.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name of agent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Agency/Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="e.g. Ace Recruitment Ltd"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agentType">Agent Type</Label>
              <Select 
                value={formData.agentType} 
                onValueChange={(value) => setFormData({ ...formData, agentType: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="agent@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobileNumber">Mobile Number</Label>
              <Input
                id="mobileNumber"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                placeholder="+91 9876543210"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Create Agent
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {transferDialog.isOpen ? (
        <TransferCandidateDialog
          open={transferDialog.isOpen}
          onOpenChange={(open) =>
            setTransferDialog((prev) => ({ ...prev, isOpen: open }))
          }
          candidateName={transferDialog.candidateName || "Candidate"}
          currentRecruiter={transferDialog.currentRecruiter}
          onConfirm={handleTransferConfirm}
          isLoading={isTransferring}
        />
      ) : null}
    </div>
  );
}
