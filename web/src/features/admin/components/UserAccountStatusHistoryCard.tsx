import { useState } from "react";
import { History } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useGetUserAccountStatusHistoryQuery } from "@/features/admin/api";
import { UserAccountStatusBadge } from "./UserAccountStatusBadge";
import type { UserAccountStatus } from "@/features/admin/api";

interface UserAccountStatusHistoryCardProps {
  userId: string;
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusTransition({
  from,
  to,
}: {
  from: UserAccountStatus | null;
  to: UserAccountStatus;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {from ? (
        <UserAccountStatusBadge status={from} />
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )}
      <span className="text-xs text-muted-foreground" aria-hidden>
        →
      </span>
      <UserAccountStatusBadge status={to} />
    </div>
  );
}

export function UserAccountStatusHistoryCard({
  userId,
}: UserAccountStatusHistoryCardProps) {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isFetching } = useGetUserAccountStatusHistoryQuery({
    userId,
    page,
    limit,
  });

  const history = data?.data;
  const items = history?.items ?? [];
  const totalPages = history?.totalPages ?? 0;

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <History className="h-4 w-4 text-blue-600" aria-hidden />
          Account status history
        </CardTitle>
        <CardDescription>
          All status changes with remarks and the admin who performed each action.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Loading history...
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No status changes recorded yet.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <Table aria-label="Account status change history">
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">
                      Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">
                      Changed by
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">
                      Transition
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider min-w-[200px]">
                      Remarks
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                        {formatDateTime(item.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium text-slate-800">
                          {item.changedBy?.name ?? "Unknown"}
                        </div>
                        {item.changedBy?.employeeCode ? (
                          <div className="text-xs text-muted-foreground">
                            {item.changedBy.employeeCode}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <StatusTransition
                          from={item.previousStatus}
                          to={item.newStatus}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 whitespace-pre-wrap">
                        {item.remarks}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                  {isFetching ? " · Updating..." : ""}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
