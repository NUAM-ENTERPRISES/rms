import React from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGetCandidateHistoryQuery } from "@/features/processing/data/processing.endpoints";
import { History, Loader2, AlertCircle, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProcessingHistoryProps {
  candidateId: string;
  projectId: string;
  roleCatalogId: string;
}

export const ProcessingHistory: React.FC<ProcessingHistoryProps> = ({
  candidateId,
  projectId,
  roleCatalogId,
}) => {
  const { data, isLoading, error } = useGetCandidateHistoryQuery({
    candidateId,
    projectId,
    roleCatalogId,
  });

  if (isLoading) {
    return (
      <Card className="border-emerald-100 dark:border-emerald-900/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-600" />
            Processing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-emerald-100 dark:border-emerald-900/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-600" />
            Processing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load processing history.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const historyData = data?.data;
  const history = historyData?.history || [];

  if (history.length === 0) {
    return (
      <Card className="border-emerald-100 dark:border-emerald-900/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-600" />
            Processing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No processing history available yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("assigned")) return "bg-blue-100 text-blue-700 border-blue-200";
    if (statusLower.includes("progress")) return "bg-amber-100 text-amber-700 border-amber-200";
    if (statusLower.includes("completed") || statusLower.includes("done")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (statusLower.includes("rejected") || statusLower.includes("failed")) return "bg-red-100 text-red-700 border-red-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <Card className="border-emerald-100 dark:border-emerald-900/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-emerald-600" />
          Processing History
        </CardTitle>
        <div className="flex flex-wrap items-center gap-4 mt-3">
          {historyData?.processingStatus && (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Status</span>
              <Badge className={getStatusColor(historyData.processingStatus)}>
                {historyData.processingStatus}
              </Badge>
            </div>
          )}
          {historyData?.assignedTo && (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Assigned Support</span>
              <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-indigo-100 bg-indigo-50/50 dark:bg-indigo-900/20 dark:border-indigo-900/40">
                <User className="h-3 w-3 text-indigo-500" />
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">{historyData.assignedTo.name}</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[350px] w-full overflow-auto">
          <div className="px-6 pb-6">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                    <TableHead className="w-[140px] font-semibold">Date & Time</TableHead>
                    <TableHead className="w-[150px] font-semibold">Status</TableHead>
                    <TableHead className="w-[180px] font-semibold">Changed By</TableHead>
                    <TableHead className="w-[180px] font-semibold">Recruiter</TableHead>
                    <TableHead className="font-semibold">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(entry.createdAt), "MMM dd, yyyy")}
                        <br />
                        <span className="text-[10px]">{format(new Date(entry.createdAt), "HH:mm:ss")}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(entry.status)} variant="outline">
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.changedBy?.name || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.recruiter?.name || "—"}
                      </TableCell>
                      <TableCell className="text-sm max-w-md">
                        {entry.notes ? (
                          <p className="text-slate-600 dark:text-slate-400 line-clamp-2" title={entry.notes}>
                            {entry.notes}
                          </p>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
