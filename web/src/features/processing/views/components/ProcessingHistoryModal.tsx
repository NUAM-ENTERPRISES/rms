import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useGetCandidateHistoryPaginatedQuery } from "@/features/processing/data/processing.endpoints";
import { CandidateHistoryModalShell } from "./CandidateHistoryModalShell";

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
    { skip: !processingId || !open },
  );

  useEffect(() => {
    if (open) {
      refetch?.();
    }
  }, [refreshKey, open, refetch]);

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
  const total = pagination?.total ?? 0;
  const totalPages =
    pagination?.totalPages ??
    pagination?.pages ??
    Math.max(1, Math.ceil(total / limit));

  return (
    <CandidateHistoryModalShell
      triggerLabel="View Processing History"
      triggerIcon={History}
      title="Processing History"
      headerIcon={History}
      headerIconGradient="from-violet-500 to-indigo-600"
      total={total}
      page={page}
      limit={limit}
      itemCount={items.length}
      totalPages={totalPages}
      isLoading={isLoading}
      error={error}
      open={open}
      onOpenChange={setOpen}
      onPageChange={setPage}
      emptyIcon={History}
      emptyTitle="No History Yet"
      emptyDescription="Processing history will appear here"
      countBadge={total}
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="w-[50px] text-xs font-bold uppercase tracking-wider text-slate-700">
              #
            </TableHead>
            <TableHead className="w-[180px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Status
            </TableHead>
            <TableHead className="w-[220px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Step
            </TableHead>
            <TableHead className="min-w-[300px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Notes
            </TableHead>
            <TableHead className="w-[200px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Changed By
            </TableHead>
            <TableHead className="w-[200px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Recruiter
            </TableHead>
            <TableHead className="w-[200px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Assigned To
            </TableHead>
            <TableHead className="w-[220px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Date & Time
            </TableHead>
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
                className={`hover:bg-slate-50 ${index === 0 ? "bg-violet-50/50" : ""}`}
              >
                <TableCell className="font-bold text-slate-400">
                  {(page - 1) * limit + index + 1}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`border text-[10px] font-black uppercase tracking-wider ${getStatusBadge(item.status)}`}
                  >
                    {displayStatus(item.status)}
                  </Badge>
                </TableCell>
                <TableCell className="min-w-[300px]">
                  {item.step ? (
                    <Badge className="border-0 bg-rose-50 text-[10px] font-black uppercase tracking-wider text-rose-700">
                      {formatStepLabel(item.step)}
                    </Badge>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell className="min-w-[300px]">
                  {item.notes ? (
                    <div
                      title={item.notes}
                      className="break-words text-sm text-slate-700"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 10,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {item.notes}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-xs font-bold text-amber-700">
                      {changedByName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{changedByName}</p>
                      <p className="text-[10px] font-medium uppercase tracking-tighter text-slate-400">
                        Executor
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {item.recruiter ? (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-xs font-bold text-indigo-700">
                        {recruiterName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-indigo-900">{recruiterName}</p>
                        <p className="text-[10px] font-medium uppercase tracking-tighter text-indigo-400">
                          Recruiter
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.assignedTo ? (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-xs font-bold text-emerald-700">
                        {assignedToName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-900">{assignedToName}</p>
                        <p className="text-[10px] font-medium uppercase tracking-tighter text-emerald-400">
                          Support
                        </p>
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
    </CandidateHistoryModalShell>
  );
}
