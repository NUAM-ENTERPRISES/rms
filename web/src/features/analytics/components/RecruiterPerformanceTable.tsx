"use client";

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  TrendingUp, 
  Clock, 
  AlertCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

type RecruiterStats = {
  id: string;
  name: string;
  email: string;
  assigned: number;
  screening: number;
  interview: number;
  selected: number;
  joined: number;
  untouched: number;
  avgTimeToFirstTouch: number;
};

type RecruiterPerformanceTableProps = {
  recruiters: RecruiterStats[];
};

type SortField =
  | "name"
  | "assigned"
  | "joined"
  | "conversion"
  | "pipelineHealth"
  | "untouched"
  | "timeToFirstTouch";

type SortConfig = {
  field: SortField;
  direction: "asc" | "desc";
};

export const RecruiterPerformanceTable: React.FC<RecruiterPerformanceTableProps> = ({ recruiters }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "joined",
    direction: "desc",
  });

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedRecruiters = useMemo(() => {
    const sorted = [...recruiters].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortConfig.field) {
        case "name":
          return sortConfig.direction === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        case "assigned":
          aValue = a.assigned; bValue = b.assigned; break;
        case "joined":
          aValue = a.joined; bValue = b.joined; break;
        case "conversion":
          aValue = a.assigned > 0 ? (a.joined / a.assigned) * 100 : 0;
          bValue = b.assigned > 0 ? (b.joined / b.assigned) * 100 : 0;
          break;
        case "pipelineHealth":
          aValue = a.assigned > 0 ? ((a.screening + a.interview + a.selected) / a.assigned) * 100 : 0;
          bValue = b.assigned > 0 ? ((b.screening + b.interview + b.selected) / b.assigned) * 100 : 0;
          break;
        case "untouched":
          aValue = a.untouched; bValue = b.untouched; break;
        case "timeToFirstTouch":
          aValue = a.avgTimeToFirstTouch; bValue = b.avgTimeToFirstTouch; break;
        default: return 0;
      }

      return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [recruiters, sortConfig]);

  // Pagination Logic
  const totalPages = Math.ceil(sortedRecruiters.length / itemsPerPage);
  const paginatedData = sortedRecruiters.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPerformanceRating = (recruiter: RecruiterStats) => {
    if (recruiter.assigned === 0) return { score: 0, color: "bg-slate-100 text-slate-500", label: "No Data" };

    const conversionRate = (recruiter.joined / recruiter.assigned) * 100;
    const pipelineHealth = ((recruiter.screening + recruiter.interview + recruiter.selected) / recruiter.assigned) * 100;
    const untouchedRate = (recruiter.untouched / recruiter.assigned) * 100;

    const score = Math.round(conversionRate * 0.4 + pipelineHealth * 0.3 + (100 - untouchedRate) * 0.3);

    if (score >= 75) return { score, color: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Elite" };
    if (score >= 50) return { score, color: "bg-blue-50 text-blue-700 border-blue-200", label: "Good" };
    return { score, color: "bg-rose-50 text-rose-700 border-rose-200", label: "At Risk" };
  };

  const SortButton: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 -ml-3 font-bold text-xs uppercase tracking-wider text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortConfig.field === field ? (
        sortConfig.direction === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
      ) : (
        <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />
      )}
    </Button>
  );

  return (
    <Card className="overflow-hidden border-slate-200/60 bg-white/80 backdrop-blur-md shadow-2xl shadow-slate-200/50 rounded-[2rem]">
  <CardHeader className="border-b border-slate-100 bg-slate-50/30 p-4">
  <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
    
    <div className="flex items-center gap-2.5">
      {/* Dynamic Icon Container */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 shadow-sm shadow-indigo-200">
        <TrendingUp className="h-4.5 w-4.5 text-white" />
        {/* Decorative glow */}
        <div className="absolute -inset-0.5 rounded-lg bg-indigo-600 opacity-15 blur-sm" />
      </div>

      <div>
        <CardTitle className="flex items-center gap-1.5 text-[16px] font-bold tracking-tight text-slate-900">
          Recruiter Performance
        </CardTitle>
        <p className="mt-0 text-[11px] font-medium text-slate-500">
          Efficiency & conversion insights
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2 self-start md:self-center">
      <div className="flex h-6 items-center rounded-md bg-indigo-50 px-2 text-[10px] font-bold text-indigo-600 border border-indigo-100">
        {recruiters.length} Active Recruiters
      </div>
    </div>

  </div>
</CardHeader>


      
    <CardContent className="p-0">
  <div className="overflow-x-auto">
    <Table>
      <TableHeader className="bg-slate-50/40">
        <TableRow className="border-b border-slate-100 hover:bg-transparent">
          <TableHead className="pl-5 w-14 font-bold text-slate-400">#</TableHead>
          <TableHead className="py-2">
            <SortButton field="name">Recruiter</SortButton>
          </TableHead>
          <TableHead className="py-2 text-right">
            <SortButton field="assigned">Assigned</SortButton>
          </TableHead>
          <TableHead className="py-2 text-right">
            <SortButton field="joined">Joined</SortButton>
          </TableHead>
          <TableHead className="py-2 text-right min-w-[120px]">
            <SortButton field="pipelineHealth">Pipeline</SortButton>
          </TableHead>
          <TableHead className="py-2 text-right">
            <SortButton field="untouched">Untouched</SortButton>
          </TableHead>
          <TableHead className="py-2 text-right">
            <SortButton field="timeToFirstTouch">Response</SortButton>
          </TableHead>
          <TableHead className="py-2 text-center pr-5">
            Rating
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {paginatedData.map((recruiter, index) => {
          const performance = getPerformanceRating(recruiter);
          const pipelineHealth =
            recruiter.assigned > 0
              ? Math.round(
                  ((recruiter.screening +
                    recruiter.interview +
                    recruiter.selected) /
                    recruiter.assigned) *
                    100
                )
              : 0;

          return (
            <TableRow
              key={recruiter.id}
              onClick={() => navigate(`/admin/users/${recruiter.id}`)}
              className="group cursor-pointer border-b border-slate-50 transition hover:bg-indigo-50/20"
            >
              <TableCell className="pl-5 py-2 font-semibold text-slate-400">
                {(currentPage - 1) * itemsPerPage + index + 1}
              </TableCell>

              <TableCell className="py-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 shadow-inner transition group-hover:from-indigo-500 group-hover:to-blue-600 group-hover:text-white">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <div className="leading-tight">
                    <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                      {recruiter.name}
                    </div>
                    <div className="text-[10px] font-medium uppercase tracking-tight text-slate-400">
                      {recruiter.email.split("@")[0]}
                    </div>
                  </div>
                </div>
              </TableCell>

              <TableCell className="py-2 text-right font-bold text-slate-700">
                {recruiter.assigned}
              </TableCell>

              <TableCell className="py-2 text-right">
                <div className="inline-flex items-center gap-1 rounded-md bg-indigo-50/60 px-2 py-0.5 text-xs font-black text-indigo-600">
                  <TrendingUp className="h-3 w-3" />
                  {recruiter.joined}
                </div>
              </TableCell>

              <TableCell className="py-2 text-right">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[11px] font-bold text-slate-600">
                    {pipelineHealth}%
                  </span>
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 border border-slate-200/50">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        pipelineHealth > 60
                          ? "bg-emerald-500"
                          : pipelineHealth > 30
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      )}
                      style={{ width: `${pipelineHealth}%` }}
                    />
                  </div>
                </div>
              </TableCell>

              <TableCell className="py-2 text-right">
                <div
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold",
                    recruiter.untouched > 5
                      ? "bg-rose-50 text-rose-600"
                      : "bg-slate-100 text-slate-500"
                  )}
                >
                  {recruiter.untouched > 5 && (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  {recruiter.untouched}
                </div>
              </TableCell>

              <TableCell className="py-2 text-right">
                <div className="flex items-center justify-end gap-1 text-slate-500">
                  <Clock className="h-3 w-3 opacity-40" />
                  <span className="text-xs font-medium">
                    {recruiter.avgTimeToFirstTouch > 0
                      ? `${Math.round(recruiter.avgTimeToFirstTouch)}d`
                      : "--"}
                  </span>
                </div>
              </TableCell>

              <TableCell className="py-2 text-center pr-5">
                <div
                  className={cn(
                    "inline-flex min-w-[64px] flex-col items-center rounded-xl border py-1 shadow-sm transition group-hover:scale-105",
                    performance.color
                  )}
                >
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    {performance.label}
                  </span>
                  <span className="text-xs font-bold">
                    {performance.score}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>

  {/* Compact Pagination */}
  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-5 py-3">
    <div className="text-xs font-semibold text-slate-400">
      Showing{" "}
      <span className="text-slate-900">
        {Math.min(itemsPerPage, paginatedData.length)}
      </span>{" "}
      of{" "}
      <span className="text-slate-900">{recruiters.length}</span>
    </div>

    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 rounded-lg p-0"
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {[...Array(totalPages)].map((_, i) => (
        <button
          key={i}
          onClick={() => setCurrentPage(i + 1)}
          className={cn(
            "h-7 w-7 rounded-md text-[11px] font-bold transition",
            currentPage === i + 1
              ? "bg-indigo-600 text-white shadow shadow-indigo-200 scale-105"
              : "text-slate-400 hover:bg-slate-200"
          )}
        >
          {i + 1}
        </button>
      ))}

      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 rounded-lg p-0"
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  </div>
</CardContent>

    </Card>
  );
};