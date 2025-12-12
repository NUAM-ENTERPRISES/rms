import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Calendar, Building2 } from "lucide-react";
import { useGetInterviewsQuery } from "../api";
import { ScrollArea } from "@/components/ui/scroll-area";

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
const formatTime = (dateString?: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function MyInterviewsListPage() {
  const navigate = useNavigate();
  const currentUser = useAppSelector((s) => s.auth.user);
  const [searchParams] = useSearchParams();

  const rawParams = {
    type: searchParams.get("type") || undefined,
    mode: searchParams.get("mode") || undefined,
    status: searchParams.get("status") || undefined,
    page: 1,
    limit: 50,
  } as any;

  const { data, isLoading, error } = useGetInterviewsQuery(
    Object.keys(rawParams).length ? rawParams : undefined
  );

  const interviews = (data?.data?.interviews ?? []) as any[];

  // Filter to "My" interviews: either current user is interviewer or candidate
  const myInterviews = useMemo(() => {
    if (!currentUser) return interviews;
    return interviews.filter((i) => {
      const interviewerEmail = i.interviewerEmail || i.interviewer?.email;
      const candidateId = i.candidateProjectMap?.candidate?.id || i.candidate?.id;
      if (!interviewerEmail && !candidateId) return false;
      const isInterviewer =
        currentUser.email && interviewerEmail === currentUser.email;
      const isCandidate = currentUser.id && candidateId === currentUser.id;
      return isInterviewer || isCandidate;
    });
  }, [interviews, currentUser]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-sm text-rose-600">Failed to load interviews.</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="w-full mx-auto pt-2 pb-4">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent>
            <div className="space-y-6">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400">
                  <Search className="h-5 w-5" />
                </div>
                <Input placeholder="Search interviews..." className="pl-14 h-14 text-base rounded-2xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <Card className="w-96 border-r border-0 shadow-lg bg-white/80 backdrop-blur-sm rounded-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">My Interviews</CardTitle>
                <p className="text-sm text-muted-foreground">{myInterviews.length} interview{myInterviews.length !== 1 ? "s" : ""} found</p>
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-primary">{myInterviews.length}</div>
                <div className="text-xs text-muted-foreground">Assigned</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-full">
              {myInterviews.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-medium mb-1">No interviews</p>
                  <p className="text-xs">No interviews were found for your account</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  <div className="p-2">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/80">
                            <TableHead className="h-12 text-xs uppercase tracking-wide text-slate-500">Project / Candidate</TableHead>
                            <TableHead className="h-12 text-xs uppercase tracking-wide text-slate-500">Date & Time</TableHead>
                            <TableHead className="h-12 text-xs uppercase tracking-wide text-slate-500">Mode</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {myInterviews.map((interview) => {
                            const projectTitle = interview.candidateProjectMap?.project?.title || interview.project?.title || "Untitled project";

                            const candidateName = interview.candidateProjectMap?.candidate
                              ? [
                                  interview.candidateProjectMap.candidate.firstName,
                                  interview.candidateProjectMap.candidate.lastName,
                                ]
                                  .filter(Boolean)
                                  .join(" ")
                                  .trim() ||
                                interview.candidateProjectMap.candidate.email ||
                                "Candidate"
                              : interview.candidate?.name || "Candidate";

                            return (
                              <TableRow key={interview.id} className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50/60" onClick={() => navigate(`/interviews/${interview.id}`)}>
                                <TableCell className="py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                                      <Building2 className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">{projectTitle}</p>
                                      <p className="text-xs text-slate-500">{candidateName}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-4">
                                  <div className="space-y-1 text-sm">
                                    <p className="font-medium text-slate-900">{formatDate(interview.scheduledTime)}</p>
                                    <p className="text-xs text-slate-500">{formatTime(interview.scheduledTime)}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="py-4">
                                  <div className="flex items-center gap-2 text-sm capitalize">{interview.mode || "—"}</div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Panel - Interview Details */}
        <div className="flex-1 overflow-hidden bg-muted/20">
          <ScrollArea className="h-full">
            <div className="p-4 max-w-4xl mx-auto space-y-4">
              <div className="text-center text-muted-foreground py-12">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select an interview to view details</p>
                <p className="text-sm">Click an interview from the list on the left</p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
