import React, { useState, useMemo } from "react";
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
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { toast } from "sonner";

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  experience: number;
  skills: string[];
  status: "active" | "interviewing" | "placed" | "rejected";
  currentRole?: string;
  targetRole?: string;
  expectedSalary?: number;
  availability: "immediate" | "2_weeks" | "1_month" | "3_months";
  lastContact?: string;
  assignedRecruiter?: string;
  projects?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function CandidatesPage() {
  const navigate = useNavigate();
  const canReadCandidates = useCan("read:candidates");
  const canWriteCandidates = useCan("write:candidates");
  const canManageCandidates = useCan("manage:candidates");

  // State for filters and pagination
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    experience: "all",
    availability: "all",
    page: 1,
    limit: 20,
  });

  // Mock data for demonstration
  const candidates: Candidate[] = [
    {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      phone: "+1 (555) 123-4567",
      location: "New York, NY",
      experience: 5,
      skills: ["React", "TypeScript", "Node.js", "PostgreSQL"],
      status: "interviewing",
      currentRole: "Senior Frontend Developer",
      targetRole: "Full Stack Developer",
      expectedSalary: 120000,
      availability: "2_weeks",
      lastContact: "2024-08-20",
      assignedRecruiter: "Mike Chen",
      projects: ["Healthcare Portal", "E-commerce Platform"],
      createdAt: "2024-07-15",
      updatedAt: "2024-08-20",
    },
    {
      id: "2",
      name: "Alex Rodriguez",
      email: "alex.rodriguez@email.com",
      phone: "+1 (555) 234-5678",
      location: "San Francisco, CA",
      experience: 8,
      skills: ["Python", "Django", "AWS", "Docker", "Kubernetes"],
      status: "active",
      currentRole: "Backend Engineer",
      targetRole: "Senior Backend Engineer",
      expectedSalary: 150000,
      availability: "immediate",
      lastContact: "2024-08-18",
      assignedRecruiter: "Emma Davis",
      projects: ["Microservices Platform", "Data Pipeline"],
      createdAt: "2024-07-10",
      updatedAt: "2024-08-18",
    },
    {
      id: "3",
      name: "Lisa Wang",
      email: "lisa.wang@email.com",
      phone: "+1 (555) 345-6789",
      location: "Austin, TX",
      experience: 3,
      skills: ["JavaScript", "Vue.js", "CSS", "UI/UX Design"],
      status: "placed",
      currentRole: "Frontend Developer",
      targetRole: "UI Developer",
      expectedSalary: 95000,
      availability: "1_month",
      lastContact: "2024-08-15",
      assignedRecruiter: "David Kim",
      projects: ["Design System", "Mobile App"],
      createdAt: "2024-06-20",
      updatedAt: "2024-08-15",
    },
    {
      id: "4",
      name: "David Kim",
      email: "david.kim@email.com",
      phone: "+1 (555) 456-7890",
      location: "Seattle, WA",
      experience: 6,
      skills: ["Java", "Spring Boot", "Microservices", "Kafka"],
      status: "rejected",
      currentRole: "Software Engineer",
      targetRole: "Senior Software Engineer",
      expectedSalary: 130000,
      availability: "immediate",
      lastContact: "2024-08-10",
      assignedRecruiter: "Rachel Green",
      projects: ["Payment Gateway", "API Gateway"],
      createdAt: "2024-06-15",
      updatedAt: "2024-08-10",
    },
  ];

  // Handle search
  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value, page: 1 }));
  };

  // Filter candidates based on search and filters
  const filteredCandidates = useMemo(() => {
    let filtered = candidates;

    if (filters.search) {
      filtered = filtered.filter(
        (candidate) =>
          candidate.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          candidate.email
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          candidate.skills.some((skill) =>
            skill.toLowerCase().includes(filters.search.toLowerCase())
          )
      );
    }

    if (filters.status !== "all") {
      filtered = filtered.filter(
        (candidate) => candidate.status === filters.status
      );
    }

    if (filters.experience !== "all") {
      const experienceMap: { [key: string]: [number, number] } = {
        "0-2": [0, 2],
        "3-5": [3, 5],
        "6-8": [6, 8],
        "9+": [9, 999],
      };
      const [min, max] = experienceMap[filters.experience] || [0, 999];
      filtered = filtered.filter(
        (candidate) =>
          candidate.experience >= min && candidate.experience <= max
      );
    }

    if (filters.availability !== "all") {
      filtered = filtered.filter(
        (candidate) => candidate.availability === filters.availability
      );
    }

    return filtered;
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
    switch (status) {
      case "active":
        return {
          variant: "default" as const,
          icon: UserCheck,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
        };
      case "interviewing":
        return {
          variant: "secondary" as const,
          icon: Clock,
          color: "text-orange-600",
          bgColor: "bg-orange-100",
        };
      case "placed":
        return {
          variant: "default" as const,
          icon: CheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-100",
        };
      case "rejected":
        return {
          variant: "destructive" as const,
          icon: XCircle,
          color: "text-red-600",
          bgColor: "bg-red-100",
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

  // Get availability badge variant
  const getAvailabilityBadge = (availability: string) => {
    switch (availability) {
      case "immediate":
        return { variant: "default" as const, text: "Immediate" };
      case "2_weeks":
        return { variant: "secondary" as const, text: "2 Weeks" };
      case "1_month":
        return { variant: "outline" as const, text: "1 Month" };
      case "3_months":
        return { variant: "outline" as const, text: "3 Months" };
      default:
        return { variant: "outline" as const, text: "Unknown" };
    }
  };

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

                {/* Availability Filter */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-gray-700 tracking-wide">
                      Availability
                    </span>
                  </div>
                  <Select
                    value={filters.availability}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        availability: value,
                        page: 1,
                      }))
                    }
                  >
                    <SelectTrigger className="h-11 px-4 border-0 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 focus:from-white focus:to-white focus:ring-2 focus:ring-purple-500/30 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md min-w-[140px]">
                      <SelectValue placeholder="All Availability" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
                      <SelectItem
                        value="all"
                        className="rounded-lg hover:bg-purple-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          All Availability
                        </div>
                      </SelectItem>
                      {[
                        {
                          value: "immediate",
                          label: "Immediate",
                          color: "green",
                        },
                        { value: "2_weeks", label: "2 Weeks", color: "blue" },
                        { value: "1_month", label: "1 Month", color: "orange" },
                        {
                          value: "3_months",
                          label: "3 Months",
                          color: "purple",
                        },
                      ].map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="rounded-lg hover:bg-purple-50"
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
                  <Button className="h-10 px-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 gap-2 text-sm">
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
                  All Candidates
                </CardTitle>
                <CardDescription>
                  {filteredCandidates.length} candidates found
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
                      Experience
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Availability
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Last Contact
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((candidate) => {
                    const statusInfo = getStatusInfo(candidate.status);
                    const availabilityBadge = getAvailabilityBadge(
                      candidate.availability
                    );
                    const StatusIcon = statusInfo.icon;

                    return (
                      <TableRow
                        key={candidate.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold">
                              {candidate.name.charAt(0)}
                            </div>
                            <div>
                              <div
                                className="font-medium text-slate-900 hover:text-blue-600 cursor-pointer transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/candidates/${candidate.id}`);
                                }}
                              >
                                {candidate.name}
                              </div>
                              <div className="text-sm text-slate-500">
                                {candidate.currentRole}
                              </div>
                              {candidate.targetRole && (
                                <div className="text-xs text-blue-600">
                                  Target: {candidate.targetRole}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span className="text-slate-700">
                                {candidate.email}
                              </span>
                            </div>
                            {candidate.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3 text-slate-400" />
                                <span className="text-slate-700">
                                  {candidate.phone}
                                </span>
                              </div>
                            )}
                            {candidate.location && (
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                <span className="text-slate-700">
                                  {candidate.location}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {candidate.skills
                              .slice(0, 3)
                              .map((skill, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {skill}
                                </Badge>
                              ))}
                            {candidate.skills.length > 3 && (
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
                              {candidate.status.charAt(0).toUpperCase() +
                                candidate.status.slice(1)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">
                              {candidate.experience} years
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={availabilityBadge.variant}
                            className="text-xs"
                          >
                            {availabilityBadge.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-600">
                              {formatDate(candidate.lastContact)}
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
                                  <DropdownMenuItem>
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
            {filteredCandidates.length === 0 && (
              <div className="text-center py-12">
                <UserCheck className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">
                  No candidates found
                </h3>
                <p className="text-slate-500 mb-6">
                  {filters.search ||
                  filters.status !== "all" ||
                  filters.experience !== "all" ||
                  filters.availability !== "all"
                    ? "Try adjusting your search criteria or filters."
                    : "Get started by adding your first candidate."}
                </p>
                {!filters.search &&
                  filters.status === "all" &&
                  filters.experience === "all" &&
                  filters.availability === "all" &&
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

        {/* Results Count - Bottom */}
        {filteredCandidates.length > 0 && (
          <div className="flex items-center justify-center pt-6 border-t border-slate-200">
            <p className="text-slate-600">
              Showing {filteredCandidates.length} of {candidates.length}{" "}
              candidates
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
