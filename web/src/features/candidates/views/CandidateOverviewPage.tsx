import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MoreHorizontal,
  Eye,
  Plus,
  Users,
  UserCheck,
  Phone,
  Clock,
  CheckCircle,
  Briefcase,
  XCircle,
  Mail,
  Calendar,
  Filter,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Globe,
  Building2,
  Stethoscope,
  FilterX,
  User,
  AlertCircle,
  CalendarDays,
  X,
  Edit,
  Trash2,
  Filter as FilterIcon,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useGetCandidateOverviewQuery, useTransferCandidateMutation } from "@/features/candidates/api";
import { countriesApi } from "@/shared/hooks/useCountriesLookup";
import { usersApi } from "@/features/admin/api";
import { useAppSelector } from "@/app/hooks";
import { useCan } from "@/hooks/useCan";
import { motion } from "framer-motion";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { StatusBadge } from "../components/StatusBadge";
import { UserSelect } from "../components/UserSelect";
import { DatePicker, ImageViewer, MultiCountrySelect, MultiSelect } from "@/components/molecules";
import { TransferCandidateDialog } from "../components/TransferCandidateDialog";
import { SECTOR_TYPES } from "@/constants/candidate-constants";

export default function CandidateOverviewPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAppSelector((state) => state.auth);

  const isManagerOrAdmin = currentUser?.roles?.some((role) =>
    ["CEO", "Director", "Manager", "Team Head", "Team Lead", "System Admin"].includes(role)
  );

  const isRecruiter = currentUser?.roles?.includes("Recruiter");

  const canWriteCandidates = useCan("write:candidates");
  const canTransferCandidates = currentUser?.roles?.some((role) =>
    ["CEO", "Director", "Manager", "Team Head", "Team Lead", "System Admin"].includes(role)
  );

  // Transfer candidate state
  const [transferDialog, setTransferDialog] = useState<{
    isOpen: boolean;
    candidateId?: string;
    candidateName?: string;
    currentRecruiter?: { id: string; name?: string; email?: string } | null;
  }>({ isOpen: false });

  const [transferCandidate, { isLoading: isTransferring }] = useTransferCandidateMutation();

  // Filters state
  const [filters, setFilters] = useState({
    search: "",
    page: 1,
    limit: 10,
    recruiterId: isManagerOrAdmin ? "all" : currentUser?.id,
    dateFilter: "all",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
    countryPreferences: [] as string[],
    sectorTypes: [] as string[],
    facilityPreferences: [] as string[],
    gender: "all",
    sources: [] as string[],
    status: "all",
  });

  // Fetch reference data
  const { data: usersData } = usersApi.useGetUsersQuery(
    { roles: ["Recruiter", "Team Lead"], limit: 100 },
    { skip: isRecruiter }
  );

  // Main Query
  const { data, isLoading, refetch } = useGetCandidateOverviewQuery({
    ...filters,
    recruiterId: filters.recruiterId === "all" ? undefined : filters.recruiterId,
    gender: filters.gender === "all" ? undefined : filters.gender,
    dateFrom: filters.dateFrom ? format(filters.dateFrom, 'yyyy-MM-dd') : undefined,
    dateTo: filters.dateTo ? format(filters.dateTo, 'yyyy-MM-dd') : undefined,
    currentStatus: filters.status !== "all" ? filters.status : undefined,
  });

  const candidates = data?.data || [];
  const statsData = data?.stats || {
    total: 0,
    positive: 0,
    negative: 0,
    nominated: 0,
    interviewAssigned: 0,
    documentReceived: 0,
    medical: 0,
    visa: 0,
    deployed: 0,
  };
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const statTiles = [
    { label: "Total Candidates", value: statsData.total, icon: Users, color: "from-blue-500 to-cyan-500", subtitle: "Assigned candidates", statusFilter: "all" },
    { label: "Positive Candidates", value: statsData.positive, icon: UserCheck, color: "from-emerald-500 to-teal-500", subtitle: "Interested & Nominated", statusFilter: "interested" },
    { label: "Negative Candidates", value: statsData.negative, icon: XCircle, color: "from-orange-500 to-red-500", subtitle: "Untouched (Exc. Nominated)", statusFilter: "untouched" },
    { label: "Nominated Candidates", value: statsData.nominated, icon: Filter, color: "from-indigo-500 to-violet-500", subtitle: "Assigned to projects", statusFilter: "nominated" },
    { label: "Interview Assigned", value: statsData.interviewAssigned, icon: Phone, color: "from-lime-400 to-green-500", subtitle: "Assigned to interview", statusFilter: "interview_assigned" },
    { label: "Doc Received", value: statsData.documentReceived, icon: Mail, color: "from-purple-500 to-pink-500", subtitle: "Processing: Documents", statusFilter: "document_received" },
    { label: "Medical Completed", value: statsData.medical, icon: Briefcase, color: "from-fuchsia-500 to-pink-400", subtitle: "Processing: Medical", statusFilter: "medical" },
    { label: "Visa Stamped", value: statsData.visa, icon: CheckCircle, color: "from-emerald-600 to-teal-400", subtitle: "Processing: Visa", statusFilter: "visa" },
    { label: "Deployed", value: statsData.deployed, icon: Building2, color: "from-slate-500 to-stone-400", subtitle: "Placements", statusFilter: "deployed" },
  ];

  const handleTileClick = (status?: string) => {
    setFilters((prev) => ({ ...prev, status: status ?? "all", page: 1 }));
    setTimeout(() => refetch(), 50);
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      page: 1,
      limit: 10,
      recruiterId: isManagerOrAdmin ? "all" : currentUser?.id,
      dateFilter: "all",
      dateFrom: undefined,
      dateTo: undefined,
      countryPreferences: [],
      sectorTypes: [],
      facilityPreferences: [],
      gender: "all",
      sources: [],
      status: "all",
    });
  };

  const handleTransferCandidate = async (data: {
    targetRecruiterId: string;
    reason: string;
  }) => {
    if (!transferDialog.candidateId) return;

    try {
      await transferCandidate({
        candidateId: transferDialog.candidateId,
        targetRecruiterId: data.targetRecruiterId,
        reason: data.reason,
      }).unwrap();

      setTransferDialog({ isOpen: false });
      refetch();
    } catch (error: any) {
      console.error("Failed to transfer candidate:", error);
    }
  };

  const getTableTitle = () => {
      if (filters.status === "all") return "Candidate Overview";
      const tile = statTiles.find(t => t.statusFilter === filters.status);
      return tile ? tile.label : "Candidate List";
  };

  const getStatusInfo = (status: string) => {
    switch (status?.toLowerCase()) {
      case "untouched":
        return {
          variant: "outline" as const,
          icon: UserCheck,
          textColor: "text-emerald-700",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-200",
        };
      case "interested":
        return {
          variant: "outline" as const,
          icon: CheckCircle,
          textColor: "text-blue-700",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
        };
      case "not interested":
      case "not_interested":
        return {
          variant: "outline" as const,
          icon: XCircle,
          textColor: "text-red-700",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
        };
      case "not eligible":
      case "not_eligible":
        return {
          variant: "outline" as const,
          icon: AlertCircle,
          textColor: "text-orange-700",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
        };
      case "on hold":
      case "on_hold":
        return {
          variant: "outline" as const,
          icon: Clock,
          textColor: "text-purple-700",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
        };
      case "rnr":
        return {
          variant: "outline" as const,
          icon: Phone,
          textColor: "text-amber-700",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
        };
      case "qualified":
        return {
          variant: "outline" as const,
          icon: UserCheck,
          textColor: "text-teal-700",
          bgColor: "bg-teal-50",
          borderColor: "border-teal-200",
        };
      case "deployed":
      case "working":
        return {
          variant: "outline" as const,
          icon: Briefcase,
          textColor: "text-fuchsia-700",
          bgColor: "bg-fuchsia-50",
          borderColor: "border-fuchsia-200",
        };
      default:
        return {
          variant: "outline" as const,
          icon: AlertCircle,
          textColor: "text-gray-700",
          bgColor: "bg-gray-100",
          borderColor: "border-gray-300",
        };
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPhoneForLink = (c: any) => {
    const raw = String(c?.countryCode ?? "") + String(c?.mobileNumber ?? c?.mobile ?? c?.contact ?? "");
    const digits = raw.replace(/\D/g, "");
    return digits || null;
  };

  return (
    <div className="min-h-screen">
      <div className="w-full mx-auto space-y-6 mt-2 px-6">
        {/* Search & Filters Section */}
        <Card className="border-0 shadow-lg bg-white/90">
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Premium Search Bar */}
              <div className="relative group">
                <div className={`absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-all duration-300 ${filters.search ? "text-blue-600" : "text-gray-400"}`}>
                  <Search className={`h-5 w-5 transition-transform duration-300 ${filters.search ? "scale-110" : "scale-100"}`} />
                </div>
                <Input
                  placeholder="Search candidates by name, email, or phone..."
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
                  className="pl-14 h-14 text-base border-0 bg-gradient-to-r from-gray-50 to-gray-100 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 rounded-2xl shadow-sm"
                />
              </div>

              {/* Filters Row 1 */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-400" />
                  <div className="min-w-[200px]">
                    <MultiCountrySelect
                      placeholder="All Countries"
                      value={filters.countryPreferences}
                      onValueChange={(val) => setFilters(f => ({ ...f, countryPreferences: val, page: 1 }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <div className="min-w-[200px]">
                    <MultiSelect
                      placeholder="All Sectors"
                      options={Object.entries(SECTOR_TYPES).map(([key, value]) => ({
                        label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
                        value: value
                      }))}
                      value={filters.sectorTypes}
                      onValueChange={(val) => setFilters(f => ({ ...f, sectorTypes: val, page: 1 }))}
                    />
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={handleResetFilters} className="h-10 rounded-xl gap-2 border-slate-200">
                    <FilterX className="h-4 w-4" /> Reset
                </Button>

                <Button onClick={() => navigate("/candidates/create")} className="h-10 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg rounded-xl gap-2 ml-auto">
                    <Plus className="h-4 w-4" /> Add Candidate
                </Button>
              </div>

              {/* Date Filters Section */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 mr-1">
                    <CalendarDays className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-semibold text-gray-700">Date Range</span>
                  </div>
                  {[
                    { key: "all", label: "All Time" },
                    { key: "today", label: "Today" },
                    { key: "yesterday", label: "Yesterday" },
                    { key: "this_week", label: "This week" },
                    { key: "last_week", label: "Last week" },
                    { key: "this_month", label: "This month" },
                    { key: "this_year", label: "This year" },
                  ].map((preset) => {
                    const isActive = filters.dateFilter === preset.key;
                    return (
                      <button
                        key={preset.key}
                        onClick={() => {
                          const today = new Date();
                          let from: Date | undefined = undefined;
                          let to: Date | undefined = undefined;
                          switch (preset.key) {
                            case "all": from = undefined; to = undefined; break;
                            case "today": from = startOfDay(today); to = endOfDay(today); break;
                            case "yesterday": { const y = subDays(today, 1); from = startOfDay(y); to = endOfDay(y); break; }
                            case "this_week": from = startOfWeek(today); to = endOfWeek(today); break;
                            case "last_week": { const lw = subDays(today, 7); from = startOfWeek(lw); to = endOfWeek(lw); break; }
                            case "this_month": from = startOfMonth(today); to = endOfMonth(today); break;
                            case "this_year": from = startOfMonth(new Date(today.getFullYear(), 0, 1)); to = endOfMonth(today); break;
                          }
                          setFilters(f => ({ ...f, dateFilter: preset.key, dateFrom: from, dateTo: to, page: 1 }));
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${isActive ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50">
                    <span className="text-xs font-medium text-gray-500">From</span>
                    <div className="w-48">
                      <DatePicker value={filters.dateFrom} showTime={false} onChange={(d) => setFilters(f => ({ ...f, dateFrom: d, dateFilter: "custom", page: 1 }))} placeholder="Start Date" compact />
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-400 mx-1" />
                    <span className="text-xs font-medium text-gray-500">To</span>
                    <div className="w-48">
                      <DatePicker value={filters.dateTo} showTime={false} onChange={(d) => setFilters(f => ({ ...f, dateTo: d, dateFilter: "custom", page: 1 }))} placeholder="End Date" compact disabled={!filters.dateFrom} />
                    </div>
                  </div>

                  {(isManagerOrAdmin || !isRecruiter) && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-500" />
                      <UserSelect
                        value={filters.recruiterId === "all" ? "" : filters.recruiterId}
                        onChange={(val) => setFilters(f => ({ ...f, recruiterId: val || "all", page: 1 }))}
                        placeholder="All Recruiters"
                        role="Recruiter"
                        allowClear={true}
                        className="h-10 min-w-[220px] bg-white border-gray-200 rounded-xl shadow-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {statTiles.map((stat, i) => {
            const colors = {
              "from-blue-500 to-cyan-500": { bg: "from-blue-50 to-blue-100/50", iconBg: "bg-blue-200/40", text: "text-blue-600" },
              "from-emerald-500 to-teal-500": { bg: "from-emerald-50 to-emerald-100/50", iconBg: "bg-emerald-200/40", text: "text-emerald-600" },
              "from-orange-500 to-red-500": { bg: "from-orange-50 to-orange-100/50", iconBg: "bg-orange-200/40", text: "text-orange-600" },
              "from-indigo-500 to-violet-500": { bg: "from-indigo-50 to-violet-100/50", iconBg: "bg-indigo-200/40", text: "text-indigo-700" },
              "from-lime-400 to-green-500": { bg: "from-lime-50 to-green-100/50", iconBg: "bg-lime-200/40", text: "text-lime-700" },
              "from-purple-500 to-pink-500": { bg: "from-purple-50 to-purple-100/50", iconBg: "bg-purple-200/40", text: "text-purple-600" },
              "from-fuchsia-500 to-pink-400": { bg: "from-fuchsia-50 to-pink-100/50", iconBg: "bg-fuchsia-200/40", text: "text-fuchsia-700" },
              "from-emerald-600 to-teal-400": { bg: "from-emerald-50 to-teal-100/50", iconBg: "bg-emerald-200/40", text: "text-emerald-700" },
              "from-slate-500 to-stone-400": { bg: "from-slate-50 to-stone-100/50", iconBg: "bg-slate-200/40", text: "text-slate-700" },
            }[stat.color] || { bg: "from-slate-50 to-slate-100/50", iconBg: "bg-slate-200/40", text: "text-slate-600" };

            const isActive = filters.status === stat.statusFilter;

            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card
                  onClick={() => handleTileClick(stat.statusFilter)}
                  className={`border-0 shadow-sm bg-gradient-to-br ${colors.bg} cursor-pointer transition-all hover:shadow-md transform hover:-translate-y-0.5 ${isActive ? "ring-2 ring-blue-500/30" : ""}`}
                >
                  <CardContent className="pt-2 pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-medium text-slate-600 mb-0.5 leading-tight">{stat.label}</p>
                        <h3 className={`text-lg font-semibold ${colors.text}`}>{isLoading ? "..." : stat.value}</h3>
                        <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">{stat.subtitle}</p>
                      </div>
                      <div className={`p-1 ${colors.iconBg} rounded-full`}>
                        <stat.icon className={`h-4 w-4 ${colors.text}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Candidates Table */}
        <Card className="border-0 shadow-lg bg-white/90">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">{getTableTitle()}</CardTitle>
                <CardDescription>{pagination.total} candidates found</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Premium Table Container */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* Beautiful Header */}
              <div className="border-b border-gray-200 bg-gray-50/70 px-6 py-4">
                <div className="flex items-center gap-4">
                  {/* Colorful Gradient Icon Background */}
                  <div className="rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-3 shadow-lg shadow-purple-500/20">
                    <Users className="h-7 w-7 text-white" />
                  </div>

                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {getTableTitle()}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1 font-medium">
                      {pagination.total} candidate{pagination.total !== 1 ? "s" : ""} in total
                    </p>
                  </div>
                </div>
              </div>

               <Table>
                <TableHeader className="sticky">
                  <TableRow className="bg-gray-50/50 border-b border-gray-200">
                    <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Candidate</TableHead>
                    <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Recruiter</TableHead>
                    <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Status</TableHead>
                    <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Last Updated</TableHead>
                    <TableHead className="h-11 px-6 text-center text-xs font-medium uppercase tracking-wider text-gray-600">Contact</TableHead>
                    <TableHead className="h-11 px-6 text-right text-xs font-medium uppercase tracking-wider text-gray-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell colSpan={6} className="px-6 py-5"><div className="h-10 bg-slate-100 rounded" /></TableCell>
                      </TableRow>
                    ))
                  ) : candidates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <UserCheck className="h-12 w-12 text-slate-200 mb-4" />
                          <p className="text-slate-500 font-medium">No candidates found for the selected filters.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    candidates.map((candidate: any) => {
                      const statusName = candidate.currentStatus?.statusName ?? "";
                      const statusInfo = getStatusInfo(statusName);
                      const StatusIcon = statusInfo.icon;

                      // Determine active recruiter assignment
                      const activeAssignment = (candidate.recruiterAssignments || [])?.find((a: any) => a.isActive);
                      const recruiter = activeAssignment?.recruiter || (candidate as any).recruiter || null;

                      return (
                        <TableRow key={candidate.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors last:border-b-0 group">
                          {/* Candidate */}
                          <TableCell className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <ImageViewer
                                title={`${candidate.firstName} ${candidate.lastName}`}
                                src={candidate.profileImage || null}
                                fallbackSrc={
                                  "https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg"
                                }
                                className="h-11 w-11 rounded-full"
                                ariaLabel={`View full image for ${candidate.firstName} ${candidate.lastName}`}
                                enableHoverPreview={true}
                              />
                              <div className="flex-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/candidates/${candidate.id}`);
                                  }}
                                  className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-all duration-200"
                                >
                                  {candidate.firstName} {candidate.lastName}
                                </button>
                                <div className="text-sm text-slate-500 mt-1 font-medium">
                                  {candidate.currentRole || ""}
                                </div>
                                <div className="text-sm text-slate-500 mt-2 space-y-1">
                                  {candidate.email && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                                      <span className="text-gray-700">{candidate.email}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                                    <span className="text-gray-700">{candidate.countryCode} {candidate.mobileNumber}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Recruiter */}
                          <TableCell className="px-6 py-5">
                            <div className="text-sm">
                              {recruiter ? (
                                <div className="space-y-1">
                                  <div className="font-medium text-slate-900">{recruiter.name}</div>
                                  {recruiter.email && (
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                                      <span>{recruiter.email}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-500">Unassigned</span>
                              )}
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="px-6 py-5">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-full ${statusInfo.bgColor}`}>
                                <StatusIcon className={`h-4 w-4 ${statusInfo.textColor.replace("700", "600")}`} />
                              </div>
                              <Badge
                                variant="outline"
                                className={`${statusInfo.textColor} ${statusInfo.bgColor} ${statusInfo.borderColor} border font-medium text-xs px-2.5 py-1`}
                              >
                                {statusName || "Unknown"}
                              </Badge>
                            </div>
                          </TableCell>

                          {/* Last Updated */}
                          <TableCell className="px-6 py-5">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {formatDate(candidate.updatedAt)}
                            </div>
                          </TableCell>

                          {/* Contact */}
                          <TableCell className="px-6 py-5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {(() => {
                                const phoneDigits = formatPhoneForLink(candidate);
                                return (
                                  <>
                                    <Button
                                      variant="ghost"
                                      className="h-8 w-8 p-0 rounded-full text-green-600 flex items-center justify-center hover:bg-green-100 hover:text-green-700 shadow-sm transition-all"
                                      onClick={() => phoneDigits && window.open(`https://wa.me/${phoneDigits}`, "_blank")}
                                      disabled={!phoneDigits}
                                      title="WhatsApp"
                                    >
                                      <FaWhatsapp className="h-5 w-5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className="h-8 w-8 p-0 rounded-full text-blue-600 flex items-center justify-center hover:bg-blue-100 hover:text-blue-700 shadow-sm transition-all"
                                      onClick={() => phoneDigits && (window.location.href = `tel:${phoneDigits}`)}
                                      disabled={!phoneDigits}
                                      title="Call"
                                    >
                                      <Phone className="h-5 w-5" />
                                    </Button>
                                  </>
                                );
                              })()}
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="px-6 py-5 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 border-0 shadow-xl">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`/candidates/${candidate.id}`)}>
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                {canWriteCandidates && (
                                  <>
                                    <DropdownMenuItem onClick={() => navigate(`/candidates/${candidate.id}/edit`)}>
                                      <Edit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-500">
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {canTransferCandidates && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setTransferDialog({
                                          isOpen: true,
                                          candidateId: candidate.id,
                                          candidateName: `${candidate.firstName} ${candidate.lastName}`,
                                          currentRecruiter: recruiter,
                                        })
                                      }
                                      className="text-blue-600"
                                    >
                                      <UserCheck className="mr-2 h-4 w-4" /> Transfer Candidate
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.total > 0 && (
                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
                  <p className="text-xs text-slate-500">Showing <span className="font-semibold">{(filters.page - 1) * filters.limit + 1}</span> to <span className="font-semibold">{Math.min(filters.page * filters.limit, pagination.total)}</span> of {pagination.total}</p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={filters.page === 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} className="h-9 px-3">Previous</Button>
                    <div className="flex items-center gap-1">
                       {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === pagination.totalPages || (p >= filters.page - 1 && p <= filters.page + 1))
                        .map((p, i, arr) => (
                          <div key={p} className="flex items-center">
                            {i > 0 && arr[i-1] !== p - 1 && <span className="px-2 text-slate-400">...</span>}
                            <Button
                              variant={filters.page === p ? "default" : "outline"}
                              size="sm"
                              onClick={() => setFilters(f => ({ ...f, page: p }))}
                              className={`h-9 w-9 p-0 ${filters.page === p ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                            >
                              {p}
                            </Button>
                          </div>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" disabled={filters.page === pagination.totalPages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} className="h-9 px-3">Next</Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Candidate Dialog */}
      {transferDialog.isOpen && (
        <TransferCandidateDialog
          open={transferDialog.isOpen}
          onOpenChange={(open) => setTransferDialog(prev => ({ ...prev, isOpen: open }))}
          candidateName={transferDialog.candidateName || "Candidate"}
          currentRecruiter={transferDialog.currentRecruiter}
          onConfirm={handleTransferCandidate}
          isLoading={isTransferring}
        />
      )}
    </div>
  );
}
