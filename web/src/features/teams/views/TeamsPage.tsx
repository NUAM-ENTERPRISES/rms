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
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext"; // ← added this import

export default function TeamsPage() {
  const navigate = useNavigate();
  const { theme } = useTheme(); // ← added this line
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
        color: theme === "dark" ? "bg-amber-900/60 text-amber-300 border-amber-700/40" : "bg-amber-100 text-amber-800 border-amber-200",
      },
      "senior recruiter": {
        icon: <Star className="h-3 w-3" />,
        color: theme === "dark" ? "bg-purple-900/60 text-purple-300 border-purple-700/40" : "bg-purple-100 text-purple-800 border-purple-200",
      },
      recruiter: {
        icon: <UserCheck className="h-3 w-3" />,
        color: theme === "dark" ? "bg-blue-900/60 text-blue-300 border-blue-700/40" : "bg-blue-100 text-blue-800 border-blue-200",
      },
    };
    return (
      map[role.toLowerCase()] || {
        icon: <Users className="h-3 w-3" />,
        color: theme === "dark" ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-gray-100 text-gray-700 border-gray-200",
      }
    );
  };

  if (!canReadTeams) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center p-8",
        theme === "dark" ? "bg-black" : "bg-gray-50"
      )}>
        <Card className={cn(
          "max-w-md border-0 shadow-lg rounded-2xl text-center py-10",
          theme === "dark" ? "bg-slate-900" : "bg-white"
        )}>
          <CardContent className="space-y-4">
            <Shield className={cn(
              "h-12 w-12 mx-auto",
              theme === "dark" ? "text-slate-600" : "text-gray-400"
            )} />
            <h2 className={cn(
              "text-2xl font-semibold",
              theme === "dark" ? "text-slate-100" : "text-gray-900"
            )}>
              Access Restricted
            </h2>
            <p className={cn(
              theme === "dark" ? "text-slate-400" : "text-gray-600"
            )}>
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
    <div className={cn(
      "min-h-screen",
      theme === "dark" ? "bg-black" : ""
    )}>
      <div className="w-full mx-auto space-y-6 mt-2">
        {/* Search & Filters Section */}
        <Card className={cn(
          "border-0 shadow-lg backdrop-blur-sm",
          theme === "dark" ? "bg-slate-900/80" : "bg-white/80"
        )}>
          <CardContent>
            <div className="space-y-6">
              {/* Premium Search Bar with Enhanced Styling */}
              <div className="relative group">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-all duration-300",
                    filters.search
                      ? theme === "dark" ? "text-blue-400" : "text-blue-600"
                      : theme === "dark" ? "text-slate-500" : "text-gray-400"
                  )}
                >
                  <Search
                    className={cn(
                      "h-5 w-5 transition-transform duration-300",
                      filters.search ? "scale-110" : "scale-100"
                    )}
                  />
                </div>
                <Input
                  placeholder="Search teams by name or description..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className={cn(
                    "pl-14 h-14 text-base border-0 transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md",
                    theme === "dark"
                      ? "bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:ring-blue-500/40 focus:bg-slate-800/90"
                      : "bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30"
                  )}
                />
                <div
                  className={cn(
                    "absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none",
                    filters.search
                      ? theme === "dark" ? "ring-2 ring-blue-500/30" : "ring-2 ring-blue-500/20"
                      : ""
                  )}
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Add New Team Button */}
                {canWriteTeams && (
                  <Button
                    onClick={() => navigate("/teams/create")}
                    className={cn(
                      "h-10 px-3 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 gap-2 text-sm",
                      theme === "dark"
                        ? "bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900"
                        : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    )}
                  >
                    <Plus className="h-3 w-3" />
                    Add New Team
                  </Button>
                )}

                {/* Export Button */}
                <Button
                  variant="outline"
                  className={cn(
                    "h-10 px-3 transition-all duration-300 rounded-lg shadow-sm hover:shadow-md gap-2 text-sm",
                    theme === "dark"
                      ? "border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 border-slate-200"
                  )}
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
                className={cn(
                  "border-0 shadow-lg animate-pulse backdrop-blur-sm",
                  theme === "dark" ? "bg-slate-900/80" : "bg-white/80"
                )}
              >
                <CardHeader className="pb-3">
                  <div className={cn(
                    "h-4 rounded w-3/4",
                    theme === "dark" ? "bg-slate-700" : "bg-slate-200"
                  )}></div>
                  <div className={cn(
                    "h-3 rounded w-1/2 mt-2",
                    theme === "dark" ? "bg-slate-700" : "bg-slate-200"
                  )}></div>
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "h-3 rounded w-full mb-2",
                    theme === "dark" ? "bg-slate-700" : "bg-slate-200"
                  )}></div>
                  <div className={cn(
                    "h-3 rounded w-2/3",
                    theme === "dark" ? "bg-slate-700" : "bg-slate-200"
                  )}></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTeams.length === 0 ? (
          <Card className={cn(
            "border-0 shadow-lg backdrop-blur-sm",
            theme === "dark" ? "bg-slate-900/80" : "bg-white/80"
          )}>
            <CardContent className="pt-12 pb-12 text-center">
              <Users className={cn(
                "h-16 w-16 mx-auto mb-4",
                theme === "dark" ? "text-slate-600" : "text-slate-300"
              )} />
              <h3 className={cn(
                "text-lg font-semibold mb-2",
                theme === "dark" ? "text-slate-200" : "text-slate-600"
              )}>
                {filters.search ? "No teams match your search" : "No teams yet"}
              </h3>
              <p className={cn(
                "mb-6",
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              )}>
                {filters.search
                  ? "Try adjusting your search criteria."
                  : "Get started by creating your first team."}
              </p>
              {!filters.search && canWriteTeams && (
                <Button
                  onClick={() => navigate("/teams/create")}
                  className={cn(
                    "text-white",
                    theme === "dark"
                      ? "bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900"
                      : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  )}
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
            <Card className={cn(
              "border-0 shadow-lg backdrop-blur-sm",
              theme === "dark" ? "bg-slate-900/80" : "bg-white/80"
            )}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className={cn(
                      "text-lg font-semibold",
                      theme === "dark" ? "text-slate-100" : "text-slate-800"
                    )}>
                      All Teams
                    </CardTitle>
                    <CardDescription className={cn(
                      theme === "dark" ? "text-slate-400" : ""
                    )}>
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
                        className={cn(
                          "group border-0 shadow-lg transition-all duration-200 transform hover:-translate-y-1 cursor-pointer backdrop-blur-sm",
                          theme === "dark"
                            ? "bg-slate-900/80 hover:bg-slate-800/90 hover:shadow-2xl"
                            : "bg-white/80 hover:shadow-xl"
                        )}
                        onClick={() => navigate(`/teams/${team.id}`)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "p-2 rounded-lg",
                                theme === "dark" ? "bg-gradient-to-br from-blue-700 to-indigo-800" : "bg-gradient-to-br from-blue-500 to-indigo-600"
                              )}>
                                <Users className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className={cn(
                                  "text-lg font-semibold truncate",
                                  theme === "dark" ? "text-slate-100" : "text-slate-800"
                                )}>
                                  {team.name}
                                </CardTitle>
                                {team.description && (
                                  <CardDescription className={cn(
                                    "mt-1 line-clamp-1 text-xs",
                                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                                  )}>
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
                            <div className={cn(
                              "text-center p-3 rounded-lg border",
                              theme === "dark"
                                ? "bg-blue-950/40 border-blue-900/40"
                                : "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200/30"
                            )}>
                              <Users className={cn(
                                "h-5 w-5 mx-auto mb-1",
                                theme === "dark" ? "text-blue-400" : "text-blue-600"
                              )} />
                              <div className={cn(
                                "text-xl font-bold",
                                theme === "dark" ? "text-slate-100" : "text-gray-900"
                              )}>
                                {team.memberCount}
                              </div>
                              <div className={cn(
                                "text-xs",
                                theme === "dark" ? "text-slate-400" : "text-gray-600"
                              )}>
                                Members
                              </div>
                            </div>
                            <div className={cn(
                              "text-center p-3 rounded-lg border",
                              theme === "dark"
                                ? "bg-emerald-950/40 border-emerald-900/40"
                                : "bg-gradient-to-br from-emerald-50 to-teal-100 border-emerald-200/30"
                            )}>
                              <Briefcase className={cn(
                                "h-5 w-5 mx-auto mb-1",
                                theme === "dark" ? "text-emerald-400" : "text-emerald-600"
                              )} />
                              <div className={cn(
                                "text-xl font-bold",
                                theme === "dark" ? "text-slate-100" : "text-gray-900"
                              )}>
                                {team.activeProjects}
                              </div>
                              <div className={cn(
                                "text-xs",
                                theme === "dark" ? "text-slate-400" : "text-gray-600"
                              )}>
                                Projects
                              </div>
                            </div>
                          </div>

                          {/* Top Member Preview - Compact */}
                          {firstMember && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className={cn(
                                  "text-xs font-medium flex items-center gap-1.5",
                                  theme === "dark" ? "text-slate-400" : "text-gray-700"
                                )}>
                                  <Sparkles className={cn(
                                    "h-3.5 w-3.5",
                                    theme === "dark" ? "text-amber-400" : "text-amber-500"
                                  )} />
                                  Key Member
                                </span>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-xs px-2 py-0.5",
                                    theme === "dark" ? "bg-slate-800 text-slate-300 border-slate-700" : ""
                                  )}
                                >
                                  {team.members!.length} total
                                </Badge>
                              </div>
                              <div className={cn(
                                "flex items-center gap-2.5 p-2.5 rounded-lg border",
                                theme === "dark"
                                  ? "bg-slate-800/60 border-slate-700"
                                  : "bg-gray-50 border-gray-200"
                              )}>
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-xs flex-shrink-0",
                                  theme === "dark" ? "bg-gradient-to-br from-indigo-600 to-purple-700" : "bg-gradient-to-br from-indigo-500 to-purple-600"
                                )}>
                                  {firstMember.name
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .slice(0, 2)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "font-medium text-sm truncate",
                                    theme === "dark" ? "text-slate-200" : "text-gray-900"
                                  )}>
                                    {firstMember.name}
                                  </p>
                                  <p className={cn(
                                    "text-xs truncate",
                                    theme === "dark" ? "text-slate-500" : "text-gray-500"
                                  )}>
                                    {firstMember.email}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs font-medium border px-2 py-0.5",
                                    roleInfo?.color
                                  )}
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
                          <div className={cn(
                            "flex items-center justify-between pt-3 border-t text-xs",
                            theme === "dark" ? "border-slate-800 text-slate-500" : "border-gray-100 text-gray-500"
                          )}>
                            <div className="flex items-center gap-2">
                              <Calendar className={cn(
                                "h-3.5 w-3.5",
                                theme === "dark" ? "text-slate-500" : "text-slate-400"
                              )} />
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