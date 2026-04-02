import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InterviewEntry, InterviewStatus } from "../data/mockData";

const statusStyles: Record<InterviewStatus, string> = {
  Scheduled: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  Completed: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  Pending: "bg-slate-100 text-slate-600 hover:bg-slate-100",
  Missed: "bg-red-100 text-red-700 hover:bg-red-100",
};

type InterviewTableProps = {
  interviews: InterviewEntry[];
};

export default function InterviewTable({ interviews }: InterviewTableProps) {
  return (
    <div className="overflow-auto max-h-[320px]">
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="whitespace-nowrap">Candidate</TableHead>
            <TableHead className="whitespace-nowrap">Project</TableHead>
            <TableHead className="whitespace-nowrap">Role</TableHead>
            <TableHead className="whitespace-nowrap">Recruiter</TableHead>
            <TableHead className="whitespace-nowrap">Time</TableHead>
            <TableHead className="whitespace-nowrap">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {interviews.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                No interviews for this day
              </TableCell>
            </TableRow>
          ) : (
            interviews.map((iv, idx) => (
              <TableRow key={idx} className="text-sm">
                <TableCell className="font-medium whitespace-nowrap">
                  {iv.candidate}
                </TableCell>
                <TableCell className="whitespace-nowrap">{iv.project}</TableCell>
                <TableCell className="whitespace-nowrap">{iv.role}</TableCell>
                <TableCell className="whitespace-nowrap">{iv.recruiter}</TableCell>
                <TableCell className="whitespace-nowrap">{iv.time}</TableCell>
                <TableCell>
                  <Badge className={`text-xs ${statusStyles[iv.status]}`}>
                    {iv.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
