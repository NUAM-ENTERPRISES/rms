import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, AlertCircle, Clock, TrendingUp, MoreHorizontal, Eye, Search, ChevronLeft, ChevronRight, Calendar, CalendarDays, Phone, Mail, ArrowRight } from "lucide-react";
import { ImageViewer } from "@/components/molecules";
import { ConvertCandidateModal } from "@/components/molecules/ConvertCandidateModal";
import { TransferCandidateModal } from "@/components/molecules/TransferCandidateModal";
import { useGetMyAssignedCandidatesQuery, useGetCREAssignedSummaryQuery, useGetCREReassignedCandidatesQuery, useMarkCandidateConvertedMutation, useTransferCandidateToRecruiterMutation } from "@/services/candidatesApi";
import { useAppSelector } from "@/app/hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";

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
    currentStatus: statusFilter === 'reassigned' ? undefined : statusFilter,
    page: page,
    limit: limitCount,
    search: debouncedSearch,
  });

  const reassignedCandidatesQuery = useGetCREReassignedCandidatesQuery({
    page: page,
    limit: limitCount,
    search: debouncedSearch,
  });

  const isLoading = statusFilter === 'reassigned' ? reassignedCandidatesQuery.isLoading : assignedCandidatesQuery.isLoading;
  const assignedCandidatesData = statusFilter === 'reassigned' ? reassignedCandidatesQuery.data : assignedCandidatesQuery.data;
  const refetch = statusFilter === 'reassigned' ? reassignedCandidatesQuery.refetch : assignedCandidatesQuery.refetch;

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
  const convertedCount = summaryData?.roleCounters?.converted ?? 0;
  const reassignedCount = summaryData?.roleCounters?.reassigned ?? 0;
  const onHoldCount = summaryData?.roleCounters?.onHold ?? 0;
  const untouchedCount = summaryData?.roleCounters?.untouched ?? 0;

  const statusLabel =
    statusFilter === undefined
      ? 'Assigned'
      : statusFilter === 'interested'
      ? 'Converted Responses'
      : statusFilter === 'reassigned'
      ? 'Reassigned'
      : statusFilter === 'on_hold'
      ? 'On Hold'
      : statusFilter === 'untouched'
      ? 'Untouched'
      : 'Selected';

  const noCandidatesTitle = `No ${statusLabel} candidates found`;
  const noCandidatesSubtitle = search
    ? 'Try adjusting your search query.'
    : `You'll see ${statusLabel.toLowerCase()} candidates here once they're escalated to you.`;

  // Calculate stats based on current view/total
  const totalAssigned = totalCount;
  const todayAssigned = candidates.filter((candidate: any) => {
    const assignedDate = new Date(candidate.updatedAt || new Date());
    const today = new Date();
    return assignedDate.toDateString() === today.toDateString();
  }).length;

  const getTableTitle = () => {
    if (statusFilter === 'rnr') return 'Ring No Response (RNR) Candidates';
    if (statusFilter === 'reassigned') return 'Reassigned Candidates';
    if (statusFilter === 'on_hold') return 'On Hold Candidates';
    if (statusFilter === 'untouched') return 'Untouched Candidates';
    if (statusFilter === 'interested') return 'Converted Responses';
    return 'Assigned Candidates';
  };

  const getTableSubtitle = () => {
    if (statusFilter === 'rnr') return 'Candidates marked as RNR';
    if (statusFilter === 'reassigned') return 'Candidates transferred by CRE to recruiter';
    if (statusFilter === 'on_hold') return 'Candidates currently on hold';
    if (statusFilter === 'untouched') return 'New untouched candidates';
    if (statusFilter === 'interested') return 'Candidates converted from CRE call';
    return 'Candidates assigned to you';
  };

  const formatDateTime = (value?: string) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const handleConfirmTransfer = async () => {
    if (!candidateToTransfer) return;
    try {
      await transferCandidateToRecruiter(candidateToTransfer.id).unwrap();
      setIsTransferModalOpen(false);
      setCandidateToTransfer(null);
      setCurrentRecruiterForTransfer('');
      setPage(1);
      refetch();
    } catch (error) {
      console.error('Transfer modal confirm failed', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Welcome back, {user?.name || "CRE"}! 👋
          </h1>
          <p className="text-lg text-slate-600">
            {statusFilter === undefined
              ? "Showing all assigned candidates"
              : statusFilter === 'interested'
              ? "Showing Converted Responses candidates"
              : statusFilter === 'reassigned'
              ? "Showing Reassigned candidates"
              : statusFilter === 'on_hold'
              ? "Showing On Hold candidates"
              : statusFilter === 'untouched'
              ? "Showing Untouched candidates"
              : "Showing selected filter candidates"}
          </p>
        </div>

        {/* Replaced stat cards with an updated CandidatePage-style card row */}
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {[
            {
              label: 'Total Assigned Candidates',
              value: assignedCount,
              subtitle: 'All assigned excluding converted',
              icon: Users,
              color: 'from-blue-500 to-blue-600',
              statusId: undefined,
            },
            {
              label: 'Converted Responses',
              value: summaryData?.roleCounters?.converted ?? 0,
              subtitle: 'Recently converted by CRE',
              icon: TrendingUp,
              color: 'from-green-500 to-green-600',
              statusId: 'interested',
            },
            {
              label: 'Reassigned Candidates',
              value: reassignedCount,
              subtitle: 'CRE transferred to recruiters',
              icon: UserCheck,
              color: 'from-indigo-500 to-indigo-600',
              statusId: 'reassigned',
            },
          ].map((stat) => {
            const Icon = stat.icon;
            const gradientMap: Record<string, { bg: string; iconBg: string; text: string }> = {
              'from-blue-500 to-blue-600': {
                bg: 'from-blue-50 to-blue-100/50',
                iconBg: 'bg-blue-200/40',
                text: 'text-blue-600',
              },
              'from-green-500 to-green-600': {
                bg: 'from-green-50 to-green-100/50',
                iconBg: 'bg-green-200/40',
                text: 'text-green-600',
              },
              'from-emerald-500 to-emerald-600': {
                bg: 'from-emerald-50 to-emerald-100/50',
                iconBg: 'bg-emerald-200/40',
                text: 'text-emerald-600',
              },
              'from-orange-500 to-orange-600': {
                bg: 'from-orange-50 to-orange-100/50',
                iconBg: 'bg-orange-200/40',
                text: 'text-orange-600',
              },
              'from-purple-500 to-purple-600': {
                bg: 'from-purple-50 to-purple-100/50',
                iconBg: 'bg-purple-200/40',
                text: 'text-purple-600',
              },
              'from-indigo-500 to-indigo-600': {
                bg: 'from-indigo-50 to-indigo-100/50',
                iconBg: 'bg-indigo-200/40',
                text: 'text-indigo-600',
              },
            };
            const defaultColors = {
              bg: 'from-slate-50 to-slate-100/50',
              iconBg: 'bg-slate-200/40',
              text: 'text-slate-600',
            };
            const colors = gradientMap[stat.color] || defaultColors;
            const isActive = statusFilter === stat.statusId;

            return (
              <Card
                key={stat.label}
                onClick={() => {
                  setStatusFilter(stat.statusId);
                  setPage(1);
                }}
                className={`border-0 shadow-sm bg-gradient-to-br ${colors.bg} backdrop-blur-sm transition-all duration-200 cursor-pointer ${isActive ? 'ring-2 ring-blue-400/60' : 'hover:-translate-y-[1px] hover:shadow-md'}`}
              >
                <CardContent className="pt-1 pb-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-0.5">{stat.label}</p>
                      <h3 className={`text-xl font-semibold ${colors.text}`}>{stat.value}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{stat.subtitle}</p>
                    </div>
                    <div className={`p-1 ${colors.iconBg} rounded-full`}>
                      <Icon className={`h-4 w-4 ${colors.text}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Assigned Candidates */}
        <Card className="border-0 shadow-xl bg-white/90">
        
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Loading candidates...</p>
              </div>
            ) : candidates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-10 w-10 text-slate-400" />
                </div>
                <p className="font-semibold text-lg text-slate-700">{noCandidatesTitle}</p>
                <p className="text-sm mt-2">{noCandidatesSubtitle}</p>
              </div>
            ) : (
              <>
                {/* <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"> */}
                  {/* <h3 className="text-xl font-semibold text-slate-800">{statusLabel} Candidate List</h3> */}
                  {/* <p className="text-sm text-slate-500">
                    {candidates.length} of {totalCount} candidate{totalCount !== 1 && 's'} displayed
                  </p> */}
                {/* </div> */}

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-gray-200 bg-gray-50/70 px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-3 shadow-lg shadow-purple-500/20">
                        <Users className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">{getTableTitle()}</h4>
                        <p className="text-sm text-gray-600 mt-1 font-medium">
                          {getTableSubtitle()} — {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} in total
                        </p>
                        <div className="mt-3 relative w-full md:w-96">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by candidate name, email or phone..."
                            className="pl-10 h-10 w-full border-slate-200"
                          />
                        </div>
                      </div>
                      {candidates.length > 0 && (
                        <div className="ml-auto hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">
                            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Table>
                    <TableHeader className="sticky">
                      <TableRow className="bg-gray-50/50 border-b border-gray-200">
                        <TableHead className="h-9 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Candidate</TableHead>
                        <TableHead className="h-9 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Recruiter</TableHead>
                        <TableHead className="h-9 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Assigned By</TableHead>
                        <TableHead className="h-9 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Status</TableHead>
                        <TableHead className="h-9 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Assigned At</TableHead>
                        <TableHead className="h-9 px-4 text-center text-[10px] font-bold uppercase tracking-wider text-gray-600">Contact</TableHead>
                        <TableHead className="h-9 px-4 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600">Actions</TableHead>
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
                        const statusName = candidate.currentStatus?.statusName || 'Unknown';
                        const assignedDate = activeAssignment?.assignedAt || candidate.createdAt;
                        const phoneDigits = formatPhoneForLink(candidate);
                        const isCREAssigned = candidate.recruiterAssignments?.some((a: any) => a.assignmentType === 'cre_assigned');

                        return (
                          <TableRow
                            key={candidate.id}
                            className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors last:border-b-0"
                          >
                            <TableCell className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <ImageViewer
                                  title={`${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Candidate'}
                                  src={candidate.profileImage || null}
                                  fallbackSrc="https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg"
                                  className="h-10 w-10 rounded-full"
                                  ariaLabel={`View full image for ${candidate.firstName || ''} ${candidate.lastName || ''}`}
                                  enableHoverPreview
                                />
                                <div className="flex-1 min-w-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/candidates/${candidate.id}`);
                                    }}
                                    className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-all duration-200 truncate block text-sm"
                                  >
                                    {candidate.firstName || ''} {candidate.lastName || ''}
                                  </button>
                                  <div className="text-xs text-slate-500 mt-0.5 font-medium truncate">
                                    {candidate.countryCode || ''} {candidate.mobileNumber || ''}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="text-xs font-medium text-slate-900 truncate">{recruiterName}</div>
                                {isCREAssigned && (
                                  <Badge className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200">
                                    CRE Assigned
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="px-4 py-3">
                              <div className="text-xs truncate">{assignedByName}</div>
                            </TableCell>

                            <TableCell className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={`text-xs font-semibold px-2 py-0.5 ${
                                    statusName.toLowerCase() === 'rnr'
                                      ? 'bg-orange-100 text-orange-700'
                                      : statusName.toLowerCase() === 'on hold'
                                      ? 'bg-purple-100 text-purple-700'
                                      : statusName.toLowerCase() === 'untouched'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : statusName.toLowerCase() === 'interested'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {statusName}
                                </Badge>
                                {isCREAssigned && (
                                  <Badge className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                                    CRE Assigned
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="px-4 py-3">
                              <div className="text-xs text-gray-600">
                                {new Date(assignedDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            </TableCell>

                            <TableCell className="px-4 py-3 text-center">
                              <div className="text-xs text-gray-600">{candidate.countryCode || ''} {candidate.mobileNumber || ''}</div>
                            </TableCell>

                            <TableCell className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (phoneDigits) window.open(`https://wa.me/${phoneDigits}`, '_blank');
                                  }}
                                  disabled={!phoneDigits}
                                >
                                  <Phone className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/candidates/${candidate.id}`);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>

                                {statusName.toLowerCase() === 'interested' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isTransferring}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCandidateToTransfer(candidate);
                                      setCurrentRecruiterForTransfer(recruiterName);
                                      setIsTransferModalOpen(true);
                                    }}
                                  >
                                    Transfer
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isConverting}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCandidateToConvert(candidate);
                                      setIsConvertModalOpen(true);
                                    }}
                                  >
                                    Convert
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-4 flex flex-col md:flex-row items-center justify-between border-t border-slate-100 pt-6 gap-3">
                    <p className="text-sm text-slate-500">
                      Showing <span className="font-semibold">{candidates.length}</span> of{' '}
                      <span className="font-semibold">{totalCount}</span> candidates
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="gap-1 border-slate-200 hover:bg-slate-50 text-slate-600"
                      >
                        <ChevronLeft className="h-4 w-4" /> Previous
                      </Button>
                      <div className="flex items-center gap-1.5 mx-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                          if (
                            totalPages <= 7 ||
                            p === 1 ||
                            p === totalPages ||
                            (p >= page - 1 && p <= page + 1)
                          ) {
                            return (
                              <Button
                                key={p}
                                variant={page === p ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setPage(p)}
                                className={`h-8 w-8 p-0 ${
                                  page === p
                                    ? 'bg-blue-600 hover:bg-blue-700 shadow-md'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {p}
                              </Button>
                            );
                          } else if (p === page - 2 || p === page + 2) {
                            return (
                              <span key={p} className="text-slate-400">
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="gap-1 border-slate-200 hover:bg-slate-50 text-slate-600"
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
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
          isSubmitting={isTransferring}
        />
      </div>
    </div>
  );
}
