import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useGetCandidateHistoryPaginatedQuery } from "@/features/processing/data/processing.endpoints";

interface HistoryItem {
  id: string;
  status: string;
  step?: string;
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
  assignedTo?: {
    id?: string;
    name: string;
  };
}

interface ProcessingHistoryModalProps {
  processingId: string;
}

export function ProcessingHistoryModal({ processingId }: ProcessingHistoryModalProps) {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error, refetch } = useGetCandidateHistoryPaginatedQuery(
    { processingId, page, limit },
    { skip: !processingId }
  );

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

  const formatStepLabel = (step?: string) => {
    if (!step) return "";
    const map: Record<string, string> = {
      verify_offer_letter: "Verify Offer Letter",
      offer_letter: "Offer Letter",
      hrd: "HRD",
    };
    if (map[step]) return map[step];
    return step.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const items = data?.data?.items || [];
  const pagination = data?.data?.pagination;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-11 rounded-xl font-bold gap-2 border-slate-200 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300 transition-all"
        >
          <History className="h-4 w-4" />
          View Processing History
          {pagination?.total ? (
            <Badge className="ml-auto bg-violet-100 text-violet-700 border-0 text-xs">
              {pagination.total}
            </Badge>
          ) : null}
        </Button>
      </DialogTrigger>

      <DialogContent className="!max-w-[95vw] !w-[95vw] !h-[70vh] !max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-3 text-xl font-black">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <History className="h-5 w-5 text-white" />
            </div>
            Processing History
            <Badge className="ml-2 bg-slate-100 text-slate-600 border-0 font-bold">
              {pagination?.total ? `${pagination.total} events` : "—"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
          ) : error ? (
            <div className="p-6"><div className="text-sm text-rose-600">Failed to load history.</div></div>
          ) : items && items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider w-[50px]">#</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider w-[180px]">Status</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider w-[220px]">Step</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider min-w-[300px]">Notes</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider w-[200px]">Changed By</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider w-[200px]">Recruiter</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider w-[200px]">Assigned To</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider w-[220px]">Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const changedByName = item.changedBy?.name || "System";
                  const recruiterName = item.recruiter?.name || "—";
                  const assignedToName = item.assignedTo?.name || "—";

                  return (
                    <TableRow key={item.id} className={`hover:bg-slate-50 ${index === 0 ? "bg-violet-50/50" : ""}`}>
                      <TableCell className="font-bold text-slate-400">{(page - 1) * limit + index + 1}</TableCell>
                      <TableCell>
                        <Badge className={`uppercase tracking-wider text-[10px] font-black border ${getStatusBadge(item.status)}`}>{displayStatus(item.status)}</Badge>
                      </TableCell>
                      <TableCell className="min-w-[300px]">
                        {item.step ? (
                          <Badge className="uppercase tracking-wider text-[10px] font-black border-0 bg-rose-50 text-rose-700">{formatStepLabel(item.step)}</Badge>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </TableCell>

                      <TableCell className="min-w-[300px]">
                        {item.notes ? (
                          <div title={item.notes} className="text-sm text-slate-700 break-words" style={{display: "-webkit-box", WebkitLineClamp: 10, WebkitBoxOrient: "vertical", overflow: "hidden"}}>{item.notes}</div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center text-xs font-bold text-amber-700 border border-amber-100">{changedByName[0]}</div>
                          <div>
                            <p className="text-sm font-bold text-slate-700">{changedByName}</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Executor</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {item.recruiter ? (
                          <div className="flex items-center gap-2">
                             <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-700 border border-indigo-100">{recruiterName[0]}</div>
                            <div>
                              <p className="text-sm font-bold text-indigo-900">{recruiterName}</p>
                              <p className="text-[10px] text-indigo-400 font-medium uppercase tracking-tighter">Recruiter</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {item.assignedTo ? (
                          <div className="flex items-center gap-2">
                             <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-xs font-bold text-emerald-700 border border-emerald-100">{assignedToName[0]}</div>
                            <div>
                              <p className="text-sm font-bold text-emerald-900">{assignedToName}</p>
                              <p className="text-[10px] text-emerald-400 font-medium uppercase tracking-tighter">Support</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(item.createdAt), "MMM d, yyyy")}
                          <span className="text-slate-300">•</span>
                          {format(new Date(item.createdAt), "h:mm a")}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <History className="h-8 w-8 text-slate-300" />
              </div>
              <p className="font-bold text-lg text-slate-500">No History Yet</p>
              <p className="text-sm mt-1">Processing history will appear here</p>
            </div>
          )}
        </div>

        {/* Pagination controls */}
        <div className="border-t p-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Showing {(page - 1) * limit + (items.length ? 1 : 0)} - {(page - 1) * limit + items.length} of {pagination?.total || 0}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => { setPage((p) => Math.max(1, p - 1)); refetch(); }}>
              Prev
            </Button>
            <div className="text-sm">{page} / {pagination?.pages || Math.ceil((pagination?.total || 0) / limit)}</div>
            <Button size="sm" variant="ghost" disabled={!pagination || (pagination && page >= (pagination.pages || Math.ceil((pagination.total || 0) / limit)))} onClick={() => { setPage((p) => p + 1); refetch(); }}>
              Next
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
