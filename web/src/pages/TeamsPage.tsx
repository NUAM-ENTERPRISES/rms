import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Users,
  Building2,
  UserPlus,
  Settings,
  TrendingUp,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Crown,
  Shield,
  Star,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Download,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  description?: string;
  leadId?: string;
  headId?: string;
  managerId?: string;
  memberCount: number;
  activeProjects: number;
  createdAt: string;
  updatedAt: string;
  members?: TeamMember[];
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export default function TeamsPage() {
  const canManageTeams = useCan("manage:teams");
  const canWriteTeams = useCan("write:teams");
  const canReadTeams = useCan("read:teams");

  // State for filters and pagination
  const [filters, setFilters] = useState({
    search: "",
    page: 1,
    limit: 12,
  });

  // Mock data for demonstration
  const teams: Team[] = [
    {
      id: "1",
      name: "Healthcare Recruitment",
      description: "Specialized team for healthcare staffing and recruitment",
      memberCount: 8,
      activeProjects: 12,
      createdAt: "2024-01-15",
      updatedAt: "2024-08-20",
      members: [
        {
          id: "1",
          name: "Sarah Johnson",
          email: "sarah@affiniks.com",
          role: "Team Lead",
        },
        {
          id: "2",
          name: "Mike Chen",
          email: "mike@affiniks.com",
          role: "Senior Recruiter",
        },
        {
          id: "3",
          name: "Emma Davis",
          email: "emma@affiniks.com",
          role: "Recruiter",
        },
      ],
    },
    {
      id: "2",
      name: "IT & Technology",
      description: "Technology sector recruitment and talent acquisition",
      memberCount: 6,
      activeProjects: 8,
      createdAt: "2024-02-10",
      updatedAt: "2024-08-18",
      members: [
        {
          id: "4",
          name: "Alex Rodriguez",
          email: "alex@affiniks.com",
          role: "Team Lead",
        },
        {
          id: "5",
          name: "Lisa Wang",
          email: "lisa@affiniks.com",
          role: "Senior Recruiter",
        },
      ],
    },
    {
      id: "3",
      name: "Finance & Banking",
      description: "Financial services recruitment and compliance",
      memberCount: 5,
      activeProjects: 6,
      createdAt: "2024-03-05",
      updatedAt: "2024-08-15",
      members: [
        {
          id: "6",
          name: "David Kim",
          email: "david@affiniks.com",
          role: "Team Lead",
        },
        {
          id: "7",
          name: "Rachel Green",
          email: "rachel@affiniks.com",
          role: "Recruiter",
        },
      ],
    },
  ];

  // Handle search
  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value, page: 1 }));
  };

  // Filter teams based on search
  const filteredTeams = useMemo(() => {
    if (!filters.search) return teams;
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        team.description?.toLowerCase().includes(filters.search.toLowerCase())
    );
  }, [teams, filters.search]);

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

  // Get role badge variant
  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case "team lead":
        return "default";
      case "senior recruiter":
        return "secondary";
      case "recruiter":
        return "outline";
      default:
        return "outline";
    }
  };

  if (!canReadTeams) {
    return (
      <div className="min-h-screen   p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Access Denied
              </CardTitle>
              <CardDescription className="text-slate-600">
                You don't have permission to view teams.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  ">
      <div className="w-full mx-auto space-y-6">
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
                  placeholder="Search teams by name or description..."
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

              {/* Action Buttons Row */}
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Add New Team Button */}
                {canWriteTeams && (
                  <Button className="h-10 px-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 gap-2 text-sm">
                    <Plus className="h-3 w-3" />
                    Create New Team
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

        {/* Teams Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <Card
              key={team.id}
              className="group border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 cursor-pointer"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300/50">
                      <Users className="h-6 w-6 text-blue-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl font-bold text-slate-800 truncate">
                        {team.name}
                      </CardTitle>
                      <CardDescription className="text-slate-600 mt-1 line-clamp-2">
                        {team.description || "No description available"}
                      </CardDescription>
                    </div>
                  </div>

                  {canWriteTeams && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Team Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-2xl font-bold text-slate-800">
                      {team.memberCount}
                    </div>
                    <div className="text-xs text-slate-600">Members</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-2xl font-bold text-slate-800">
                      {team.activeProjects}
                    </div>
                    <div className="text-xs text-slate-600">
                      Active Projects
                    </div>
                  </div>
                </div>

                {/* Team Members Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-slate-700">
                      Team Members
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {team.members?.length || 0} members
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {team.members?.slice(0, 3).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-slate-50/50 border border-slate-200/50"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-sm font-semibold">
                          {member.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">
                            {member.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {member.email}
                          </div>
                        </div>
                        <Badge
                          variant={getRoleBadgeVariant(member.role)}
                          className="text-xs"
                        >
                          {member.role}
                        </Badge>
                      </div>
                    ))}

                    {team.members && team.members.length > 3 && (
                      <div className="text-center p-2 text-xs text-slate-500">
                        +{team.members.length - 3} more members
                      </div>
                    )}
                  </div>
                </div>

                {/* Created date */}
                <div className="flex items-center gap-2 text-sm text-slate-500 pt-2 border-t border-slate-200">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>Created {formatDate(team.createdAt)}</span>
                </div>
              </CardContent>

              {/* Action Buttons */}
              {canWriteTeams && (
                <div className="px-6 pb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-slate-200 hover:border-slate-300"
                    >
                      <Eye className="mr-2 h-3 w-3" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-slate-200 hover:border-slate-300"
                    >
                      <Edit className="mr-2 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 hover:border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredTeams.length === 0 && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-12 pb-12 text-center">
              <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                No teams found
              </h3>
              <p className="text-slate-500 mb-6">
                {filters.search
                  ? "Try adjusting your search criteria."
                  : "Get started by creating your first team."}
              </p>
              {!filters.search && canWriteTeams && (
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Team
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results Count - Bottom */}
        {filteredTeams.length > 0 && (
          <div className="flex items-center justify-center pt-6 border-t border-slate-200">
            <p className="text-slate-600">
              Showing {filteredTeams.length} of {teams.length} teams
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
