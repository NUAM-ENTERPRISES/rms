import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Users,
  MoreHorizontal,
  Download,
  Calendar,
  UserCheck,
  Briefcase,
  Shield,
  Sparkles,
  Crown,
  Star,
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
import { useCan } from "@/hooks/useCan";
import { useGetTeamsQuery } from "@/features/teams";

export default function TeamsPage() {
  const navigate = useNavigate();
  const canWriteTeams = useCan("write:teams");
  const canReadTeams = useCan("read:teams");

  const [filters, setFilters] = useState({ search: "" });

  const { data: teamsData, isLoading } = useGetTeamsQuery({
    search: filters.search || undefined,
    limit: 50,
  });

  const teams = teamsData?.data?.teams || [];

  const filteredTeams = useMemo(() => {
    if (!filters.search) return teams;
    const lower = filters.search.toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(lower) ||
        t.description?.toLowerCase().includes(lower)
    );
  }, [teams, filters.search]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const getRoleBadge = (role: string) => {
    const map: Record<string, { icon: React.ReactNode; color: string }> = {
      "team lead": {
        icon: <Crown className="h-3 w-3" />,
        color: "bg-amber-100 text-amber-800 border-amber-200",
      },
      "senior recruiter": {
        icon: <Star className="h-3 w-3" />,
        color: "bg-purple-100 text-purple-800 border-purple-200",
      },
      recruiter: {
        icon: <UserCheck className="h-3 w-3" />,
        color: "bg-blue-100 text-blue-800 border-blue-200",
      },
    };
    return (
      map[role.toLowerCase()] || {
        icon: <Users className="h-3 w-3" />,
        color: "bg-gray-100 text-gray-700 border-gray-200",
      }
    );
  };

  if (!canReadTeams) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <Card className="max-w-md border-0 shadow-lg">
          <CardContent className="pt-10 text-center space-y-4">
            <Shield className="h-12 w-12 text-gray-400 mx-auto" />
            <h2 className="text-2xl font-semibold text-gray-900">
              Access Restricted
            </h2>
            <p className="text-gray-600">
              You don't have permission to view teams.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSearch = (value: string) => {
    setFilters({ search: value });
  };

  return (
    <div className="min-h-screen">
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

              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Add New Team Button */}
                {canWriteTeams && (
                  <Button
                    onClick={() => navigate("/teams/create")}
                    className="h-10 px-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 gap-2 text-sm"
                  >
                    <Plus className="h-3 w-3" />
                    Add New Team
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
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card
                key={i}
                className="border-0 shadow-lg bg-white/80 backdrop-blur-sm animate-pulse"
              >
                <CardHeader className="pb-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTeams.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-12 pb-12 text-center">
              <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                {filters.search ? "No teams match your search" : "No teams yet"}
              </h3>
              <p className="text-slate-500 mb-6">
                {filters.search
                  ? "Try adjusting your search criteria."
                  : "Get started by creating your first team."}
              </p>
              {!filters.search && canWriteTeams && (
                <Button
                  onClick={() => navigate("/teams/create")}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Team
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Teams Grid */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-800">
                      All Teams
                    </CardTitle>
                    <CardDescription>
                      {filteredTeams.length} team
                      {filteredTeams.length !== 1 ? "s" : ""} found
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTeams.map((team: any) => {
                    // Safely get first member
                    const firstMember = team.members?.[0];
                    const roleInfo = firstMember
                      ? getRoleBadge(firstMember.role)
                      : null;

                    return (
                      <Card
                        key={team.id}
                        className="group border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 cursor-pointer"
                        onClick={() => navigate(`/teams/${team.id}`)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                                <Users className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg font-semibold text-slate-800 truncate">
                                  {team.name}
                                </CardTitle>
                                {team.description && (
                                  <CardDescription className="mt-1 line-clamp-1 text-slate-600 text-xs">
                                    {team.description}
                                  </CardDescription>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          {/* Stats - More Compact */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200/30">
                              <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                              <div className="text-xl font-bold text-gray-900">
                                {team.memberCount}
                              </div>
                              <div className="text-xs text-gray-600">
                                Members
                              </div>
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-teal-100 rounded-lg border border-emerald-200/30">
                              <Briefcase className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                              <div className="text-xl font-bold text-gray-900">
                                {team.activeProjects}
                              </div>
                              <div className="text-xs text-gray-600">
                                Projects
                              </div>
                            </div>
                          </div>

                          {/* Top Member Preview - Compact */}
                          {firstMember && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                  Key Member
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="text-xs px-2 py-0.5"
                                >
                                  {team.members!.length} total
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                                  {firstMember.name
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .slice(0, 2)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-gray-900 truncate">
                                    {firstMember.name}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {firstMember.email}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-medium border px-2 py-0.5 ${roleInfo?.color}`}
                                >
                                  {roleInfo!.icon}
                                  <span className="ml-1">
                                    {firstMember.role}
                                  </span>
                                </Badge>
                              </div>
                            </div>
                          )}

                          {/* Footer - Compact */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                            <div className="flex items-center gap-2 text-gray-500">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{formatDate(team.createdAt)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
