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
import { useState, useEffect } from "react";
import { useGetCandidateHistoryPaginatedQuery } from "@/features/processing/data/processing.endpoints";
import { cn } from "@/lib/utils";
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
  refreshKey?: number;
}

export function ProcessingHistoryModal({ processingId, refreshKey }: ProcessingHistoryModalProps) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const limit = 10;

  const { data, isLoading, error, refetch } = useGetCandidateHistoryPaginatedQuery(
    { processingId, page, limit },
    { skip: !processingId || !open }
  );

  useEffect(() => {
    if (open) {
      refetch?.();
    }
  }, [refreshKey, open, refetch]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      in_progress: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50",
      assigned: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50",
      completed: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50",
      cancelled: "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50",
    };
    return styles[status] || "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
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
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (val) { setPage(1); } }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-11 rounded-xl font-bold gap-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:text-violet-700 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-violet-700 transition-all"
        >
          <History className="h-4 w-4" />
          View Processing History
          {pagination?.total ? (
            <Badge className="ml-auto bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-0 text-xs">
              {pagination.total}
            </Badge>
          ) : null}
        </Button>
      </DialogTrigger>

      <DialogContent className="!max-w-[95vw] !w-[95vw] !h-[88vh] !max-h-[88vh] overflow-hidden flex flex-col bg-white dark:bg-black border-slate-200 dark:border-slate-800">
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-3 text-xl font-black text-slate-900 dark:text-slate-100">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 dark:from-violet-600 dark:to-indigo-700 flex items-center justify-center">
              <History className="h-5 w-5 text-white" />
            </div>
            Processing History
            <Badge className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-0 font-bold">
              {pagination?.total ? `${pagination.total} events` : "—"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="text-sm text-rose-600 dark:text-rose-400">Failed to load history.</div>
            </div>
          ) : items && items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/70">
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider w-[50px]">#</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider w-[180px]">Status</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider w-[220px]">Step</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider min-w-[300px]">Notes</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider w-[200px]">Changed By</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider w-[200px]">Recruiter</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider w-[200px]">Assigned To</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider w-[220px]">Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const changedByName = item.changedBy?.name || "System";
                  const recruiterName = item.recruiter?.name || "—";
                  const assignedToName = item.assignedTo?.name || "—";

                  return (
                    <TableRow 
                      key={item.id} 
                      className={cn(
                        "hover:bg-slate-50 dark:hover:bg-slate-900/70",
                        index === 0 ? "bg-violet-50/50 dark:bg-violet-950/30" : ""
                      )}
                    >
                      <TableCell className="font-bold text-slate-400 dark:text-slate-500">
                        {(page - 1) * limit + index + 1}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "uppercase tracking-wider text-[10px] font-black border",
                          getStatusBadge(item.status)
                        )}>
                          {displayStatus(item.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[300px]">
                        {item.step ? (
                          <Badge className="uppercase tracking-wider text-[10px] font-black border-0 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
                            {formatStepLabel(item.step)}
                          </Badge>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </TableCell>

                      <TableCell className="min-w-[300px]">
                        {item.notes ? (
                          <div 
                            title={item.notes} 
                            className="text-sm text-slate-700 dark:text-slate-300 break-words line-clamp-3"
                          >
                            {item.notes}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800/50">
                            {changedByName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{changedByName}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-tighter">Executor</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {item.recruiter ? (
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
                              {recruiterName[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300">{recruiterName}</p>
                              <p className="text-[10px] text-indigo-400 dark:text-indigo-500 font-medium uppercase tracking-tighter">Recruiter</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {item.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/50">
                              {assignedToName[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">{assignedToName}</p>
                              <p className="text-[10px] text-emerald-400 dark:text-emerald-500 font-medium uppercase tracking-tighter">Support</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(item.createdAt), "MMM d, yyyy")}
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          {format(new Date(item.createdAt), "h:mm a")}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <History className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="font-bold text-lg text-slate-500 dark:text-slate-400">No History Yet</p>
              <p className="text-sm mt-1">Processing history will appear here</p>
            </div>
          )}
        </div>

        {/* Pagination controls */}
        <div className="border-t border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between bg-white dark:bg-black">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing {(page - 1) * limit + (items.length ? 1 : 0)} - {(page - 1) * limit + items.length} of {pagination?.total || 0}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              disabled={page <= 1} 
              onClick={() => { setPage((p) => Math.max(1, p - 1)); refetch(); }}
              className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Prev
            </Button>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {page} / {pagination?.pages || Math.ceil((pagination?.total || 0) / limit)}
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              disabled={!pagination || (pagination && page >= (pagination.pages || Math.ceil((pagination.total || 0) / limit)))}
              onClick={() => { setPage((p) => p + 1); refetch(); }}
              className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Next
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}