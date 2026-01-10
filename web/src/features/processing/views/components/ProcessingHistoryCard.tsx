import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Clock, Calendar, User } from "lucide-react";
import { format } from "date-fns";

interface HistoryItem {
  id: string;
  status: string;
  notes?: string;
  createdAt: string;
  changedBy?: {
    id?: string;
    name: string;
  };
  recruiter?: {
    id?: string;
    name: string;
  };
}

interface ProcessingHistoryCardProps {
  history: HistoryItem[];
}

export function ProcessingHistoryCard({ history }: ProcessingHistoryCardProps) {
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      in_progress: "bg-blue-100 text-blue-700 border-blue-200",
      assigned: "bg-indigo-100 text-indigo-700 border-indigo-200",
      completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
      cancelled: "bg-rose-100 text-rose-700 border-rose-200",
    };
    return styles[status] || "bg-slate-100 text-slate-700";
  };

  const displayStatus = (status: string) => {
    const labels: Record<string, string> = {
      assigned: "Ready for Processing",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  };

  return (
    <Card className="border-0 shadow-xl overflow-hidden bg-white">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-slate-100">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-100">
            <History className="h-5 w-5 text-amber-600" />
          </div>
          Processing History
          {history.length > 0 && (
            <Badge className="ml-auto bg-amber-100 text-amber-700 border-0 font-bold">
              {history.length} events
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        {history && history.length > 0 ? (
          <div className="relative space-y-6">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-200 via-slate-200 to-transparent" />

            {history.map((item, index) => {
              const isLatest = index === 0;
              const changedByName = item.changedBy?.name || item.recruiter?.name || "System";

              return (
                <div key={item.id} className="relative flex gap-6 pl-12">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white shadow-lg transition-transform hover:scale-110 ${
                      isLatest
                        ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isLatest ? (
                      <Clock className="h-5 w-5" />
                    ) : (
                      <div className="h-2.5 w-2.5 rounded-full bg-current" />
                    )}
                  </div>

                  {/* Content Card */}
                  <div
                    className={`flex-1 p-4 rounded-2xl border transition-all hover:shadow-md ${
                      isLatest
                        ? "bg-gradient-to-r from-violet-50 to-indigo-50 border-violet-200"
                        : "bg-slate-50/50 border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                      <Badge
                        className={`w-fit uppercase tracking-wider text-[10px] font-black border ${getStatusBadge(item.status)}`}
                      >
                        {displayStatus(item.status)}
                      </Badge>
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(item.createdAt), "MMM d, yyyy • h:mm a")}
                      </span>
                    </div>

                    <p
                      className={`text-sm font-semibold ${
                        isLatest ? "text-slate-800" : "text-slate-600"
                      }`}
                    >
                      {item.notes || "Status updated"}
                    </p>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200/50">
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isLatest
                            ? "bg-violet-200 text-violet-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {changedByName[0]}
                      </div>
                      <span className="text-xs text-slate-500">
                        Updated by{" "}
                        <span className="font-bold text-slate-700">{changedByName}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <History className="h-8 w-8 text-slate-300" />
            </div>
            <p className="font-bold text-lg text-slate-500">No History Yet</p>
            <p className="text-sm mt-1">Processing history will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
