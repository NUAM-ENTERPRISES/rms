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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  Download,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  Calendar,
  Phone,
  Mail,
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { useGetCandidatesQuery, useGetRecruiterMyCandidatesQuery } from "@/features/candidates";
import { useAppSelector } from "@/app/hooks";

export default function CandidatesPage() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  
  // Check if user is a recruiter (non-manager)
  const isRecruiter = user?.roles?.includes("Recruiter");
  const isManager = user?.roles?.some(role => 
    ["CEO", "Director", "Manager", "Team Head", "Team Lead"].includes(role)
  );
  
  // All roles can read candidates
  const canReadCandidates = true;
  const canWriteCandidates = useCan("write:candidates");

  // State for filters and pagination
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    experience: "all",
    page: 1,
    limit: 20,
  });

  // Fetch candidates - use different API for Recruiter users
  const { data: allCandidatesData = [], isLoading: isLoadingAll, error: errorAll } = useGetCandidatesQuery(
    undefined,
    { skip: isRecruiter && !isManager } // Skip this query if user is recruiter without manager role
  );
  
  const { data: recruiterCandidatesData, isLoading: isLoadingRecruiter, error: errorRecruiter } = useGetRecruiterMyCandidatesQuery(
    {
      page: filters.page,
      limit: filters.limit,
      search: filters.search || undefined,
      status: filters.status !== 'all' ? filters.status : undefined,
    },
    { skip: !isRecruiter || isManager } // Skip this query if user is not recruiter or is manager
  );

  // Use the appropriate data source
  const candidates: any[] = isRecruiter && !isManager
    ? (recruiterCandidatesData?.data || [])
    : (Array.isArray(allCandidatesData) ? allCandidatesData : []);
  
  const isLoading = isLoadingRecruiter || isLoadingAll;
  const error = errorRecruiter || errorAll;

  // Handle search
  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value, page: 1 }));
  };

  // Filter and paginate candidates
  const { filteredCandidates, paginatedCandidates, totalCount } = useMemo(() => {
    // Ensure candidates is an array
    if (!Array.isArray(candidates)) {
      console.warn("Candidates data is not an array:", candidates);
      return { filteredCandidates: [], paginatedCandidates: [], totalCount: 0 };
    }

    let filtered = candidates;

    if (filters.search) {
      filtered = filtered.filter(
        (candidate) =>
          `${candidate.firstName} ${candidate.lastName}`
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          (candidate.email &&
            candidate.email
              .toLowerCase()
              .includes(filters.search.toLowerCase())) ||
          candidate?.skills?.some((skill: string) =>
            skill.toLowerCase().includes(filters.search.toLowerCase())
          )
      );
    }

    // if (filters.status !== "all") {
    //   filtered = filtered.filter(
    //     (candidate) => candidate.currentStatus === filters.status
    //   );
    // }

    if (filters.experience !== "all") {
      const experienceMap: { [key: string]: [number, number] } = {
        "0-2": [0, 2],
        "3-5": [3, 5],
        "6-8": [6, 8],
        "9+": [9, 999],
      };
      const [min, max] = experienceMap[filters.experience] || [0, 999];
      filtered = filtered.filter((candidate) => {
        const experience =
          candidate.totalExperience || candidate.experience || 0;
        return experience >= min && experience <= max;
      });
    }

    // Note: availability filter removed as it's not in the API interface
    // if (filters.availability !== "all") {
    //   filtered = filtered.filter(
    //     (candidate) => candidate.availability === filters.availability
    //   );
    // }

    // Calculate pagination
    const startIndex = (filters.page - 1) * filters.limit;
    const endIndex = startIndex + filters.limit;
    const paginated = filtered.slice(startIndex, endIndex);

    return {
      filteredCandidates: filtered,
      paginatedCandidates: paginated,
      totalCount: filtered.length,
    };
  }, [candidates, filters]);

  // Format date - following FE guidelines: DD MMM YYYY
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Get status badge variant and icon
  const getStatusInfo = (status: string) => {
    console.log("Determining status info for status:", status.toLowerCase());
    switch (status?.toLowerCase()) {
      case "untouched":
        return {
          variant: "outline" as const,
          icon: AlertCircle,
          color: "text-gray-600",
          bgColor: "bg-gray-100",
        };
      case "interested":
        return {
          variant: "default" as const,
          icon: UserCheck,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
        };
      case "not interested":
        return {
          variant: "secondary" as const,
          icon: XCircle,
          color: "text-slate-600",
          bgColor: "bg-slate-100",
        };
      case "not eligible":
        return {
          variant: "destructive" as const,
          icon: XCircle,
          color: "text-red-600",
          bgColor: "bg-red-100",
        };
      case "other enquiry":
        return {
          variant: "outline" as const,
          icon: Mail,
          color: "text-purple-600",
          bgColor: "bg-purple-100",
        };
      case "future":
        return {
          variant: "secondary" as const,
          icon: Calendar,
          color: "text-indigo-600",
          bgColor: "bg-indigo-100",
        };
      case "on hold":
        return {
          variant: "secondary" as const,
          icon: Clock,
          color: "text-orange-600",
          bgColor: "bg-orange-100",
        };
      case "rnr":
        return {
          variant: "outline" as const,
          icon: AlertCircle,
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
        };
      case "qualified":
        return {
          variant: "default" as const,
          icon: CheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-100",
        };
      case "working":
        return {
          variant: "default" as const,
          icon: Briefcase,
          color: "text-emerald-600",
          bgColor: "bg-emerald-100",
        };
      default:
        return {
          variant: "outline" as const,
          icon: AlertCircle,
          color: "text-gray-600",
          bgColor: "bg-gray-100",
        };
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Loading Candidates...
          </h3>
          <p className="text-muted-foreground">
            Please wait while we fetch the candidate data.
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Error Loading Candidates
          </h3>
          <p className="text-muted-foreground mb-6">
            There was an error loading the candidate data. Please try again.
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!canReadCandidates) {
    return (
      <div className="min-h-screen   p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Access Denied
              </CardTitle>
              <CardDescription className="text-slate-600">
                You don't have permission to view candidates.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="w-full mx-auto space-y-6 mt-2">
        {/* Search & Filters Section */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent>
            <div className="space-y-6">
              {/* Premium Search Bar with Enhanced Styling */}
              <div className="relative group">
                <div
                  className={`absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-all duration-300 ${
                    filters.search ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  <Search
                    className={`h-5 w-5 transition-transform duration-300 ${
                      filters.search ? "scale-110" : "scale-100"
                    }`}
                  />
                </div>
                <Input
                  placeholder="Search candidates by name, skills, or email..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-14 h-14 text-base border-0 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30 focus:shadow-lg transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md"
                />
                <div
                  className={`absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none ${
                    filters.search ? "ring-2 ring-blue-500/20" : ""
                  }`}
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Status Filter */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-gray-700 tracking-wide">
                      Status
                    </span>
                  </div>
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        status: value,
                        page: 1,
                      }))
                    }
                  >
                    <SelectTrigger className="h-11 px-4 border-0 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 focus:from-white focus:to-white focus:ring-2 focus:ring-emerald-500/30 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md min-w-[140px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
                      <SelectItem
                        value="all"
                        className="rounded-lg hover:bg-emerald-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          All Status
                        </div>
                      </SelectItem>
                      {[
                        { value: "active", label: "Active", color: "blue" },
                        {
                          value: "interviewing",
                          label: "Interviewing",
                          color: "orange",
                        },
                        { value: "placed", label: "Placed", color: "green" },
                        { value: "rejected", label: "Rejected", color: "red" },
                      ].map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="rounded-lg hover:bg-emerald-50"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 bg-${option.color}-500 rounded-full`}
                            ></div>
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Experience Filter */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-gray-700 tracking-wide">
                      Experience
                    </span>
                  </div>
                  <Select
                    value={filters.experience}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        experience: value,
                        page: 1,
                      }))
                    }
                  >
                    <SelectTrigger className="h-11 px-4 border-0 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md min-w-[140px]">
                      <SelectValue placeholder="All Experience" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
                      <SelectItem
                        value="all"
                        className="rounded-lg hover:bg-blue-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          All Experience
                        </div>
                      </SelectItem>
                      {[
                        { value: "0-2", label: "0-2 years", color: "blue" },
                        { value: "3-5", label: "3-5 years", color: "green" },
                        { value: "6-8", label: "6-8 years", color: "orange" },
                        { value: "9+", label: "9+ years", color: "purple" },
                      ].map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="rounded-lg hover:bg-blue-50"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 bg-${option.color}-500 rounded-full`}
                            ></div>
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Add New Candidate Button */}
                {canWriteCandidates && (
                  <Button
                    onClick={() => navigate("/candidates/create")}
                    className="h-10 px-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 gap-2 text-sm"
                  >
                    <Plus className="h-3 w-3" />
                    Add New Candidate
                  </Button>
                )}

                {/* Export Button */}
                <Button
                  variant="outline"
                  className="h-10 px-3 text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-300 rounded-lg shadow-sm hover:shadow-md gap-2 text-sm"
                >
                  <Download className="h-3 w-3" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Candidates Table */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">
                  {isRecruiter && !isManager ? "My Assigned Candidates" : "All Candidates"}
                </CardTitle>
                <CardDescription>
                  {Array.isArray(filteredCandidates)
                    ? filteredCandidates.length
                    : 0}{" "}
                  candidates found
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700">
                      Candidate
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Contact
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Skills
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Last Updated
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(paginatedCandidates) &&
                    paginatedCandidates.map((candidate) => {
                      const statusInfo = getStatusInfo(candidate.currentStatus.statusName);
                      const StatusIcon = statusInfo.icon;

                      return (
                        <TableRow
                          key={candidate.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold">
                                {candidate.firstName.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div
                                    className="font-medium text-slate-900 hover:text-blue-600 cursor-pointer transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/candidates/${candidate.id}`);
                                    }}
                                  >
                                    {candidate.firstName} {candidate.lastName}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`p-1 rounded-full ${statusInfo.bgColor}`}
                                    >
                                      <StatusIcon
                                        className={`h-3 w-3 ${statusInfo.color}`}
                                      />
                                    </div>

                                    <Badge
                                      variant={statusInfo.variant}
                                      className="text-xs"
                                    >
                                      {candidate.currentStatus.statusName}
                                    </Badge>

                                  </div>
                                </div>
                                <div className="text-sm text-slate-500">
                                  {candidate.currentRole || "No current role"}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {candidate.email && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-3 w-3 text-slate-400" />
                                  <span className="text-slate-700">
                                    {candidate.email}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3 text-slate-400" />
                                <span className="text-slate-700">
                                  {candidate.contact}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {candidate.skills
                                ?.slice(0, 3)
                                .map((skill: string, index: number) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                              {candidate.skills && candidate.skills.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{candidate.skills.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className={`p-1 rounded-full ${statusInfo.bgColor}`}
                              >
                                <StatusIcon
                                  className={`h-3 w-3 ${statusInfo.color}`}
                                />
                              </div>
                              <Badge
                                variant={statusInfo.variant}
                                className="text-xs"
                              >
                                {candidate.currentStatus.statusName}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              <span className="text-sm text-slate-600">
                                {formatDate(candidate.updatedAt)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(`/candidates/${candidate.id}`)
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                {canWriteCandidates && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        navigate(
                                          `/candidates/${candidate.id}/edit`
                                        )
                                      }
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>

            {/* Empty State */}
            {Array.isArray(filteredCandidates) &&
              filteredCandidates.length === 0 && (
                <div className="text-center py-12">
                  <UserCheck className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">
                    No candidates found
                  </h3>
                  <p className="text-slate-500 mb-6">
                    {filters.search ||
                    filters.status !== "all" ||
                    filters.experience !== "all"
                      ? "Try adjusting your search criteria or filters."
                      : "Get started by adding your first candidate."}
                  </p>
                  {!filters.search &&
                    filters.status === "all" &&
                    filters.experience === "all" &&
                    canWriteCandidates && (
                      <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Candidate
                      </Button>
                    )}
                </div>
              )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {Array.isArray(filteredCandidates) && filteredCandidates.length > 0 && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing {(filters.page - 1) * filters.limit + 1} to{" "}
                  {Math.min(filters.page * filters.limit, totalCount)} of{" "}
                  {totalCount} candidates
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={filters.page === 1}
                    className="h-9 px-3"
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(totalCount / filters.limit) }, (_, i) => i + 1)
                      .filter((pageNum) => {
                        // Show first page, last page, current page, and pages around current
                        const totalPages = Math.ceil(totalCount / filters.limit);
                        return (
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          (pageNum >= filters.page - 1 && pageNum <= filters.page + 1)
                        );
                      })
                      .map((pageNum, idx, arr) => {
                        // Add ellipsis if there's a gap
                        const prevPageNum = arr[idx - 1];
                        const showEllipsis = prevPageNum && pageNum - prevPageNum > 1;
                        
                        return (
                          <div key={pageNum} className="flex items-center">
                            {showEllipsis && (
                              <span className="px-2 text-slate-400">...</span>
                            )}
                            <Button
                              variant={filters.page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setFilters((prev) => ({ ...prev, page: pageNum }))}
                              className={`h-9 w-9 p-0 ${
                                filters.page === pageNum
                                  ? "bg-blue-600 hover:bg-blue-700"
                                  : ""
                              }`}
                            >
                              {pageNum}
                            </Button>
                          </div>
                        );
                      })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        page: Math.min(
                          Math.ceil(totalCount / filters.limit),
                          prev.page + 1
                        ),
                      }))
                    }
                    disabled={filters.page >= Math.ceil(totalCount / filters.limit)}
                    className="h-9 px-3"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
