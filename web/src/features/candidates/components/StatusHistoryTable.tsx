import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Clock, History, User } from "lucide-react";
import { useGetCandidateStatusHistoryQuery } from "@/services/candidatesApi";

// Helper function to format date and time - following FE guidelines: DD MMM YYYY, HH:MM
const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const dateFormatted = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeFormatted = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${dateFormatted}, ${timeFormatted}`;
};

interface StatusHistoryTableProps {
  candidateId: string;
}

export function StatusHistoryTable({ candidateId }: StatusHistoryTableProps) {
  const {
    data: historyData,
    isLoading,
    error,
  } = useGetCandidateStatusHistoryQuery(candidateId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Failed to load status history</p>
      </div>
    );
  }

  const history = historyData?.data?.history || [];

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Status History
        </h3>
        <p className="text-muted-foreground">
          No status changes have been recorded for this candidate yet.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Changed By</TableHead>
          <TableHead>Last Updated</TableHead>
          <TableHead>Remarks / Reason</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {history.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>
              <Badge variant="outline" className="font-medium">
                {entry.statusNameSnapshot}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-medium">{entry.changedByName}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {formatDate(entry.statusUpdatedAt)}
              </div>
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground italic">
                {entry.reason || "No reason"}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
