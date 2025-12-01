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
import { useGetTeamsQuery, useDeleteTeamMutation } from "@/features/teams";

interface Team {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  activeProjects: number;
  createdAt: string;
  members?: { id: string; name: string; email: string; role: string }[];
}

export default function TeamsPage() {
  const navigate = useNavigate();
  const canWriteTeams = useCan("write:teams");
  const canReadTeams = useCan("read:teams");

  const [filters, setFilters] = useState({ search: "" });

  const { data: teamsData, isLoading } = useGetTeamsQuery({
    search: filters.search || undefined,
    limit: 50,
  });

  const [deleteTeam] = useDeleteTeamMutation();
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
      "team lead": { icon: <Crown className="h-3 w-3" />, color: "bg-amber-100 text-amber-800 border-amber-200" },
      "senior recruiter": { icon: <Star className="h-3 w-3" />, color: "bg-purple-100 text-purple-800 border-purple-200" },
      "recruiter": { icon: <UserCheck className="h-3 w-3" />, color: "bg-blue-100 text-blue-800 border-blue-200" },
    };
    return map[role.toLowerCase()] || { icon: <Users className="h-3 w-3" />, color: "bg-gray-100 text-gray-700 border-gray-200" };
  };

  if (!canReadTeams) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <Card className="max-w-md border-0 shadow-lg">
          <CardContent className="pt-10 text-center space-y-4">
            <Shield className="h-12 w-12 text-gray-400 mx-auto" />
            <h2 className="text-2xl font-semibold text-gray-900">Access Restricted</h2>
            <p className="text-gray-600">You don't have permission to view teams.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
              <p className="text-gray-600 mt-1">Organize and manage recruiter teams</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="lg">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {canWriteTeams && (
              <Button
                size="lg"
                onClick={() => navigate("/teams/create")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Team
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search teams by name or description..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                    <div className="space-y-2">
                      <div className="h-6 bg-gray-200 rounded w-48" />
                      <div className="h-4 bg-gray-200 rounded w-32" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-gray-100 rounded-lg" />
                    <div className="h-20 bg-gray-100 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredTeams.length === 0 && (
          <Card className="border-dashed border-2">
            <CardContent className="py-20 text-center space-y-6">
              <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto flex items-center justify-center">
                <Users className="h-10 w-10 text-gray-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {filters.search ? "No teams match your search" : "No teams yet"}
                </h3>
                <p className="text-gray-600 mt-2">
                  {filters.search ? "Try different keywords" : "Create your first team to get started"}
                </p>
              </div>
              {canWriteTeams && !filters.search && (
                <Button size="lg" onClick={() => navigate("/teams/create")}>
                  <Plus className="h-5 w-5 mr-2" />
                  Create Team
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Teams Grid */}
        {!isLoading && filteredTeams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTeams.map((team) => {
              // Safely get first member
              const firstMember = team.members?.[0];
              const roleInfo = firstMember ? getRoleBadge(firstMember.role) : null;

              return (
                <Card
                  key={team.id}
                  className="hover:shadow-xl transition-all duration-200 border-gray-200 hover:border-gray-300 cursor-pointer group"
                  onClick={() => navigate(`/teams/${team.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
                          <Users className="h-7 w-7 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-semibold text-gray-900">
                            {team.name}
                          </CardTitle>
                          {team.description && (
                            <CardDescription className="mt-1 line-clamp-2 text-gray-600">
                              {team.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>

                      {canWriteTeams && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200/30">
                        <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-gray-900">{team.memberCount}</div>
                        <div className="text-sm text-gray-600">Members</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-100 rounded-xl border border-emerald-200/30">
                        <Briefcase className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-gray-900">{team.activeProjects}</div>
                        <div className="text-sm text-gray-600">Projects</div>
                      </div>
                    </div>

                    {/* Top Member Preview - Now 100% Safe */}
                    {firstMember && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            Key Member
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {team.members!.length} total
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                            {firstMember.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{firstMember.name}</p>
                            <p className="text-xs text-gray-500 truncate">{firstMember.email}</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium border ${roleInfo?.color}`}
                          >
                            {roleInfo!.icon}
                            <span className="ml-1">{firstMember.role}</span>
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Calendar className="h-4 w-4" />
                        {formatDate(team.createdAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Results Count */}
        {!isLoading && filteredTeams.length > 0 && (
          <div className="text-center text-gray-600">
            Showing <span className="font-medium text-gray-900">{filteredTeams.length}</span> team{filteredTeams.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}