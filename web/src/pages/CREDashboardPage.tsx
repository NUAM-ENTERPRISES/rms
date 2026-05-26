import { useNavigate } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, AlertCircle, Eye, Search, ChevronLeft, ChevronRight, CalendarDays, Phone, RefreshCw, ArrowUpRight, PlusCircle } from "lucide-react";
import { ImageViewer } from "@/components/molecules";
import TypedHeader from "@/components/molecules/TypedHeader";
import { ConvertCandidateModal } from "@/components/molecules/ConvertCandidateModal";
import {
  TransferCandidateModal,
  type TransferToRecruiterPayload,
} from "@/components/molecules/TransferCandidateModal";
import { useGetMyAssignedCandidatesQuery, useGetCREAssignedSummaryQuery, useGetCREReassignedCandidatesQuery, useGetUserCandidatesQuery, useMarkCandidateConvertedMutation, useTransferCandidateToRecruiterMutation } from "@/services/candidatesApi";
import { useAppSelector } from "@/app/hooks";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function CREDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const limitCount = 10;
  
  // Fetch only candidates assigned to this CRE with optional status filter
  const assignedCandidatesQuery = useGetMyAssignedCandidatesQuery({
    currentStatus: (statusFilter === 'reassigned' || statusFilter === 'created') ? undefined : statusFilter,
    page: page,
    limit: limitCount,
    search: debouncedSearch,
  });

  const reassignedCandidatesQuery = useGetCREReassignedCandidatesQuery({
    page: page,
    limit: limitCount,
    search: debouncedSearch,
  });

  const createdCandidatesQuery = useGetUserCandidatesQuery({
    page: page,
    limit: limitCount,
    search: debouncedSearch,
  });

  const isLoading =
    statusFilter === 'reassigned' ? reassignedCandidatesQuery.isLoading
    : statusFilter === 'created' ? createdCandidatesQuery.isLoading
    : assignedCandidatesQuery.isLoading;
  const assignedCandidatesData =
    statusFilter === 'reassigned' ? reassignedCandidatesQuery.data
    : statusFilter === 'created' ? createdCandidatesQuery.data
    : assignedCandidatesQuery.data;
  const refetch =
    statusFilter === 'reassigned' ? reassignedCandidatesQuery.refetch
    : statusFilter === 'created' ? createdCandidatesQuery.refetch
    : assignedCandidatesQuery.refetch;

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const candidates = assignedCandidatesData?.data || [];
  const totalCount = assignedCandidatesData?.total || 0;
  const totalPages = assignedCandidatesData?.totalPages || 0;

  const { data: summaryData } = useGetCREAssignedSummaryQuery();
  const [markCandidateConverted, { isLoading: isConverting }] = useMarkCandidateConvertedMutation();
  const [transferCandidateToRecruiter, { isLoading: isTransferring }] = useTransferCandidateToRecruiterMutation();

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [candidateToConvert, setCandidateToConvert] = useState<any>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [candidateToTransfer, setCandidateToTransfer] = useState<any>(null);
  const [currentRecruiterForTransfer, setCurrentRecruiterForTransfer] = useState<string>('');

  const assignedCount = summaryData?.total ?? totalCount;
  const reassignedCount = summaryData?.roleCounters?.reassigned ?? 0;
  const junkCount = summaryData?.roleCounters?.junk ?? 0;
  const createdCount = summaryData?.roleCounters?.created ?? createdCandidatesQuery.data?.total ?? 0;
 

  const statusLabel =
    statusFilter === undefined
      ? 'Assigned'
      : statusFilter === 'interested'
      ? 'Converted Responses'
      : statusFilter === 'reassigned'
      ? 'Reassigned'
      : statusFilter === 'junk'
      ? 'Junk'
      : statusFilter === 'on_hold'
      ? 'On Hold'
      : statusFilter === 'untouched'
      ? 'Untouched'
      : 'Selected';

  const noCandidatesTitle = `No ${statusLabel} candidates found`;
  const noCandidatesSubtitle = search
    ? 'Try adjusting your search query.'
    : `You'll see ${statusLabel.toLowerCase()} candidates here once they're escalated to you.`;

  const getTableTitle = () => {
    if (statusFilter === 'rnr') return 'Ring No Response (RNR) Candidates';
    if (statusFilter === 'reassigned') return 'Reassigned Candidates';
    if (statusFilter === 'junk') return 'Junk Candidates';
    if (statusFilter === 'on_hold') return 'On Hold Candidates';
    if (statusFilter === 'untouched') return 'Untouched Candidates';
    if (statusFilter === 'interested') return 'Converted Responses';
    if (statusFilter === 'created') return 'Created Candidates';
    return 'Assigned Candidates';
  };

  const getTableSubtitle = () => {
    if (statusFilter === 'rnr') return 'Candidates marked as RNR';
    if (statusFilter === 'reassigned') return 'Candidates transferred by CRE to recruiter with CRE status';
    if (statusFilter === 'junk') return 'Candidates assigned for more than 5 days';
    if (statusFilter === 'on_hold') return 'Candidates currently on hold';
    if (statusFilter === 'untouched') return 'New untouched candidates';
    if (statusFilter === 'interested') return 'Candidates converted from CRE call';
    if (statusFilter === 'created') return 'Candidates you personally added to the system';
    return 'Candidates assigned to you';
  };

  const formatPhoneForLink = (candidate: any) => {
    const raw = `${candidate.countryCode || ''}${candidate.mobileNumber || ''}`;
    const digits = raw.replace(/\D/g, '');
    return digits || null;
  };

  const handleConfirmConvert = async () => {
    if (!candidateToConvert) return;
    try {
      await markCandidateConverted(candidateToConvert.id).unwrap();
      setIsConvertModalOpen(false);
      setCandidateToConvert(null);
      setPage(1);
      refetch();
    } catch (error) {
      console.error('Convert modal confirm failed', error);
    }
  };

  const handleConfirmTransfer = async (payload: TransferToRecruiterPayload) => {
    if (!candidateToTransfer) return;
    try {
      await transferCandidateToRecruiter({
        id: candidateToTransfer.id,
        ...payload,
      }).unwrap();
      toast.success("Candidate reassigned to recruiter");
      setIsTransferModalOpen(false);
      setCandidateToTransfer(null);
      setCurrentRecruiterForTransfer('');
      setPage(1);
      refetch();
    } catch (error: unknown) {
      console.error('Transfer modal confirm failed', error);
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to reassign candidate";
      toast.error(message);
    }
  };

  // Tile config — Junk is last
  const statCards = [
    {
      label: 'Untouched Candidates',
      value: assignedCount,
      subtitle: 'Auto-assigned to you',
      icon: Users,
      accent: 'blue',
      statusId: undefined as string | undefined,
    },
    {
      label: 'Reassigned Candidates',
      value: reassignedCount,
      subtitle: 'Transferred to recruiters',
      icon: UserCheck,
      accent: 'indigo',
      statusId: 'reassigned',
    },
    {
      label: 'Created Candidates',
      value: createdCount,
      subtitle: 'Candidates you added',
      icon: PlusCircle,
      accent: 'green',
      statusId: 'created',
    },
    {
      label: 'Junk Candidates',
      value: junkCount,
      subtitle: 'Assigned for > 5 days',
      icon: AlertCircle,
      accent: 'orange',
      statusId: 'junk',
    },
  ] as const;

  const accentStyles: Record<string, { card: string; icon: string; iconBg: string; value: string; ring: string; dot: string }> = {
    blue:   { card: 'from-blue-50 via-white to-blue-50/30 border-blue-100',   icon: 'text-blue-600',   iconBg: 'bg-blue-100',   value: 'text-blue-700',   ring: 'ring-blue-400/50',   dot: 'bg-blue-500' },
    indigo: { card: 'from-indigo-50 via-white to-indigo-50/30 border-indigo-100', icon: 'text-indigo-600', iconBg: 'bg-indigo-100', value: 'text-indigo-700', ring: 'ring-indigo-400/50', dot: 'bg-indigo-500' },
    green:  { card: 'from-green-50 via-white to-green-50/30 border-green-100',  icon: 'text-green-600',  iconBg: 'bg-green-100',  value: 'text-green-700',  ring: 'ring-green-400/50',  dot: 'bg-green-500' },
    orange: { card: 'from-orange-50 via-white to-orange-50/30 border-orange-100', icon: 'text-orange-600', iconBg: 'bg-orange-100', value: 'text-orange-700', ring: 'ring-orange-400/50', dot: 'bg-orange-500' },
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40">
        <div className="max-w-screen-2xl mx-auto space-y-6 p-4 md:p-6">

          {/* Header */}
          <TypedHeader
            userName={user?.name || "CRE"}
            subtitle={`Roles: ${Array.isArray(user?.roles) ? user.roles.join(", ") : "N/A"}`}
          />

          {/* Stat Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              const s = accentStyles[stat.accent];
              const isActive = statusFilter === stat.statusId;
              return (
                <button
                  key={stat.label}
                  type="button"
                  onClick={() => { setStatusFilter(stat.statusId); setPage(1); }}
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
                    <span>{isActive ? 'Viewing now' : 'Click to view'}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Candidates Table Card */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

            {/* Table Header Bar */}
            <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-md">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-gray-900 truncate">{getTableTitle()}</h2>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{getTableSubtitle()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search name, email or phone…"
                      className="pl-9 h-9 text-sm border-slate-200 bg-white focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 border-slate-200" onClick={() => refetch()}>
                        <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p className="text-xs">Refresh</p></TooltipContent>
                  </Tooltip>
                  {statusFilter === 'created' && (
                    <Button
                      size="sm"
                      className="h-9 px-3 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm gap-1.5 shrink-0"
                      onClick={() => navigate('/candidates/create')}
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Create Candidate
                    </Button>
                  )}
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 shrink-0">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium whitespace-nowrap">
                      {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-600" />
                <p className="text-sm font-medium">Loading candidates…</p>
              </div>
            ) : candidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-slate-300" />
                </div>
                <p className="font-semibold text-slate-600">{noCandidatesTitle}</p>
                <p className="text-sm text-slate-400 text-center max-w-xs">{noCandidatesSubtitle}</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 border-b border-gray-200 hover:bg-slate-50/80">
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 w-64">Candidate</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Recruiter</TableHead>
                      {statusFilter === 'reassigned' && (
                        <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Assigned By</TableHead>
                      )}
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Reason</TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {statusFilter === 'reassigned' ? 'CRE Status' : 'Status'}
                      </TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Assigned At</TableHead>
                      {statusFilter !== 'created' && (
                        <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {candidates.map((candidate: any) => {
                      const activeAssignment = candidate.recruiterAssignments?.find((a: any) => a.isActive);
                      const nonCreAssignment = candidate.recruiterAssignments?.find(
                        (a: any) => a.recruiter?.id && a.recruiter?.id !== user?.id
                      );
                      const recruiterName =
                        nonCreAssignment?.recruiter?.name ||
                        activeAssignment?.recruiter?.name ||
                        'Unassigned';
                      const assignedByName =
                        activeAssignment?.assignedByUser?.name ||
                        nonCreAssignment?.assignedByUser?.name ||
                        'System / Admin';
                      const statusName =
                        candidate.creStatus?.statusName ||
                        candidate.recruiterAssignments?.find(
                          (a: { assignmentType?: string }) =>
                            a.assignmentType === 'cre_reassigned',
                        )?.creStatus?.statusName ||
                        candidate.currentStatus?.statusName ||
                        'Unknown';
                      const assignedDate = activeAssignment?.assignedAt || candidate.createdAt;
                      const assignmentReason = activeAssignment?.reason || '';
                      const phoneDigits = formatPhoneForLink(candidate);

                      const statusBadgeClass =
                        statusName.toLowerCase() === 'rnr'
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : statusName.toLowerCase() === 'on hold' || statusName.toLowerCase() === 'on_hold'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : statusName.toLowerCase() === 'untouched'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : statusName.toLowerCase() === 'interested'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200';

                      return (
                        <TableRow
                          key={candidate.id}
                          className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors last:border-b-0 group"
                        >
                          {/* Candidate */}
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <ImageViewer
                                title={`${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Candidate'}
                                src={candidate.profileImage || null}
                                fallbackSrc="https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg"
                                className="h-9 w-9 rounded-full ring-2 ring-white shadow-sm shrink-0"
                                ariaLabel={`View full image for ${candidate.firstName || ''} ${candidate.lastName || ''}`}
                                enableHoverPreview
                              />
                              <div className="min-w-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigate(`/candidates/${candidate.id}`); }}
                                  className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors truncate block max-w-[160px]"
                                >
                                  {candidate.firstName || ''} {candidate.lastName || ''}
                                </button>
                                <div className="text-xs text-slate-400 mt-0.5 truncate">
                                  {candidate.countryCode || ''} {candidate.mobileNumber || ''}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Recruiter */}
                          <TableCell className="px-4 py-3">
                            <span className="text-xs font-medium text-slate-700 truncate max-w-[120px] block">{recruiterName}</span>
                          </TableCell>

                          {/* Assigned By (reassigned only) */}
                          {statusFilter === 'reassigned' && (
                            <TableCell className="px-4 py-3">
                              <span className="text-xs text-slate-600 truncate block max-w-[120px]">{assignedByName}</span>
                            </TableCell>
                          )}

                          {/* Reason */}
                          <TableCell className="px-4 py-3 max-w-[160px]">
                            {assignmentReason ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-xs text-slate-600 truncate block max-w-[140px] cursor-help">{assignmentReason}</span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs"><p className="text-xs">{assignmentReason}</p></TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </TableCell>

                          {/* Status / CRE status */}
                          <TableCell className="px-4 py-3">
                            <Badge className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize", statusBadgeClass)}>
                              {statusName}
                            </Badge>
                            {statusFilter === 'reassigned' && (
                              <p className="text-[10px] text-slate-400 mt-1">Set by CRE on reassign</p>
                            )}
                          </TableCell>

                          {/* Assigned At */}
                          <TableCell className="px-4 py-3">
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              {new Date(assignedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </TableCell>

                          {/* Actions */}
                          {statusFilter !== 'created' && (
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (phoneDigits) window.location.href = `tel:${phoneDigits}`;
                                    }}
                                    disabled={!phoneDigits}
                                    aria-label={`Call ${candidate.firstName || "candidate"}`}
                                  >
                                    <Phone className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p className="text-xs">Call</p></TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); if (phoneDigits) window.open(`https://wa.me/${phoneDigits}`, '_blank'); }}
                                    disabled={!phoneDigits}
                                    aria-label={`WhatsApp ${candidate.firstName || "candidate"}`}
                                  >
                                    <FaWhatsapp className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p className="text-xs">WhatsApp</p></TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); navigate(`/candidates/${candidate.id}`); }}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p className="text-xs">View Profile</p></TooltipContent>
                              </Tooltip>

                              {statusFilter !== 'reassigned' && (
                                <Button
                                  size="sm"
                                  className="h-8 px-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
                                  disabled={isTransferring}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCandidateToTransfer(candidate);
                                    setCurrentRecruiterForTransfer(recruiterName);
                                    setIsTransferModalOpen(true);
                                  }}
                                >
                                  Reassign
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 px-6 py-4 gap-3 bg-slate-50/50">
                    <p className="text-xs text-slate-500">
                      Showing <span className="font-semibold text-slate-700">{candidates.length}</span> of{' '}
                      <span className="font-semibold text-slate-700">{totalCount}</span> candidates
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-8 gap-1 border-slate-200 hover:bg-slate-100 text-slate-600 text-xs"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" /> Prev
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                          if (totalPages <= 7 || p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                            return (
                              <Button
                                key={p}
                                variant={page === p ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setPage(p)}
                                className={cn("h-8 w-8 p-0 text-xs", page === p ? 'bg-blue-600 hover:bg-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100')}
                              >
                                {p}
                              </Button>
                            );
                          } else if (p === page - 2 || p === page + 2) {
                            return <span key={p} className="text-slate-300 text-xs px-0.5">…</span>;
                          }
                          return null;
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="h-8 gap-1 border-slate-200 hover:bg-slate-100 text-slate-600 text-xs"
                      >
                        Next <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <ConvertCandidateModal
          isOpen={isConvertModalOpen}
          onClose={() => {
            setIsConvertModalOpen(false);
            setCandidateToConvert(null);
          }}
          onConfirm={handleConfirmConvert}
          candidateName={`${candidateToConvert?.firstName || ''} ${candidateToConvert?.lastName || ''}`.trim() || 'Selected candidate'}
          isSubmitting={isConverting}
        />

          <TransferCandidateModal
          isOpen={isTransferModalOpen}
          onClose={() => {
            setIsTransferModalOpen(false);
            setCandidateToTransfer(null);
            setCurrentRecruiterForTransfer('');
          }}
          onConfirm={handleConfirmTransfer}
          candidateName={`${candidateToTransfer?.firstName || ''} ${candidateToTransfer?.lastName || ''}`.trim() || 'Selected candidate'}
          currentRecruiterName={currentRecruiterForTransfer}
          currentStatus={candidateToTransfer?.currentStatus?.statusName || 'Unknown'}
          isSubmitting={isTransferring}
        />
        </div>
      </div>
    </TooltipProvider>
  );
}
