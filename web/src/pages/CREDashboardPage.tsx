import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { useGetMyAssignedCandidatesQuery } from "@/services/candidatesApi";
import { useAppSelector } from "@/app/hooks";

export default function CREDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  
  // Fetch only candidates assigned to this CRE with RNR status
  const { data: assignedCandidatesData, isLoading } = useGetMyAssignedCandidatesQuery({
    currentStatus: 8, // RNR status
    page: 1,
    limit: 100,
  });

  // Double-check: Filter to ensure only candidates assigned to this user are shown
  // This is a safety check in case backend doesn't filter properly
  const allCandidates = Array.isArray(assignedCandidatesData?.data) 
    ? assignedCandidatesData.data 
    : [];
  
  // Filter candidates that have active recruiter assignments to this user
  const candidates = allCandidates
    .filter((candidate: any) => {
      return candidate.recruiterAssignments?.some((assignment: any) => 
        assignment.recruiterId === user?.id && assignment.isActive
      );
    })
    .sort((a: any, b: any) => {
      // Sort by most recent assignment date
      const aDate = a.recruiterAssignments?.[0]?.assignedAt || a.createdAt;
      const bDate = b.recruiterAssignments?.[0]?.assignedAt || b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  
  const totalCount = candidates.length;
  const recentCandidates = candidates.slice(0, 5);
  
  // Calculate stats
  const totalAssigned = totalCount;
  const todayAssigned = candidates.filter((candidate: any) => {
    const assignedDate = new Date(candidate.updatedAt || new Date());
    const today = new Date();
    return assignedDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Welcome back, {user?.name || "CRE"}! 👋
          </h1>
          <p className="text-lg text-slate-600">
            Here's an overview of your assigned RNR candidates
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-50">Total Assigned</CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalAssigned}</div>
              <p className="text-xs text-blue-100 mt-1">
                RNR candidates under your care
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-50">New Today</CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{todayAssigned}</div>
              <p className="text-xs text-emerald-100 mt-1">
                Assigned in the last 24 hours
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-50">Pending Action</CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <AlertCircle className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalAssigned}</div>
              <p className="text-xs text-orange-100 mt-1">
                Require follow-up
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-50">Avg. Response Time</CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">2.4h</div>
              <p className="text-xs text-purple-100 mt-1">
                Your average handling time
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Assigned Candidates */}
        <Card className="border-0 shadow-xl bg-white/90">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-slate-800">Recently Assigned Candidates</CardTitle>
                <CardDescription className="text-slate-600 mt-1">
                  RNR candidates escalated to you
                </CardDescription>
              </div>
            </div>
          </CardHeader>
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
                <p className="font-semibold text-lg text-slate-700">No RNR candidates assigned yet</p>
                <p className="text-sm mt-2">
                  You'll see candidates here once they're escalated to you
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCandidates.map((candidate: any) => {
                  const assignment = candidate.recruiterAssignments?.find((a: any) => 
                    a.recruiterId === user?.id && a.isActive
                  );
                  const assignedDate = assignment?.assignedAt || candidate.createdAt;
                  const assignedByUser = assignment?.assignedByUser;
                  const assignmentReason = assignment?.reason;
                  
                  return (
                    <div
                      key={candidate.id}
                      className="group p-5 border-2 border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-lg cursor-pointer transition-all duration-200 bg-white"
                      onClick={() => navigate(`/candidates/${candidate.id}`)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                              {candidate.firstName?.[0]}{candidate.lastName?.[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">
                                  {candidate.firstName} {candidate.lastName}
                                </p>
                                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-sm">
                                  RNR
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2 ml-15">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <span className="text-lg">📞</span>
                              </div>
                              <span className="font-medium">{candidate.countryCode} {candidate.mobileNumber}</span>
                            </div>
                            
                            {assignedByUser && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                  <span className="text-lg">👤</span>
                                </div>
                                <span>Assigned by: <span className="font-semibold text-slate-800">{assignedByUser.name}</span></span>
                              </div>
                            )}
                            
                            {assignmentReason && (
                              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-lg border border-amber-200">
                                <p className="text-xs font-medium text-amber-900">
                                  <span className="font-bold">Reason:</span> {assignmentReason}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right flex-shrink-0 bg-slate-50 p-3 rounded-lg">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Assigned</p>
                          <p className="text-sm font-semibold text-slate-700 mt-1">
                            {new Date(assignedDate).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
