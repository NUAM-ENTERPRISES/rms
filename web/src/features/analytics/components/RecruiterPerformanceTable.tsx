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
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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

export const RecruiterPerformanceTable: React.FC<
  RecruiterPerformanceTableProps
> = ({ recruiters }) => {
  const navigate = useNavigate();
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "joined",
    direction: "desc",
  });

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc",
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
          aValue = a.assigned;
          bValue = b.assigned;
          break;
        case "joined":
          aValue = a.joined;
          bValue = b.joined;
          break;
        case "conversion":
          aValue = a.assigned > 0 ? (a.joined / a.assigned) * 100 : 0;
          bValue = b.assigned > 0 ? (b.joined / b.assigned) * 100 : 0;
          break;
        case "pipelineHealth":
          aValue =
            a.assigned > 0
              ? ((a.screening + a.interview + a.selected) / a.assigned) * 100
              : 0;
          bValue =
            b.assigned > 0
              ? ((b.screening + b.interview + b.selected) / b.assigned) * 100
              : 0;
          break;
        case "untouched":
          aValue = a.untouched;
          bValue = b.untouched;
          break;
        case "timeToFirstTouch":
          aValue = a.avgTimeToFirstTouch;
          bValue = b.avgTimeToFirstTouch;
          break;
        default:
          return 0;
      }

      return sortConfig.direction === "asc"
        ? aValue - bValue
        : bValue - aValue;
    });

    return sorted;
  }, [recruiters, sortConfig]);

  const getPerformanceRating = (recruiter: RecruiterStats): {
    score: number;
    color: string;
    label: string;
  } => {
    // If no assignments, return 0 score
    if (recruiter.assigned === 0) {
      return { score: 0, color: "text-gray-500", label: "No Data" };
    }

    const conversionRate =
      recruiter.assigned > 0 ? (recruiter.joined / recruiter.assigned) * 100 : 0;
    const pipelineHealth =
      recruiter.assigned > 0
        ? ((recruiter.screening + recruiter.interview + recruiter.selected) /
            recruiter.assigned) *
          100
        : 0;
    const untouchedRate =
      recruiter.assigned > 0 ? (recruiter.untouched / recruiter.assigned) * 100 : 0;

    // Calculate score (0-100)
    const score =
      conversionRate * 0.4 + pipelineHealth * 0.3 + (100 - untouchedRate) * 0.3;

    if (score >= 75) {
      return { score: Math.round(score), color: "text-green-600", label: "Top Performer" };
    } else if (score >= 50) {
      return { score: Math.round(score), color: "text-amber-600", label: "Average" };
    } else {
      return { score: Math.round(score), color: "text-red-600", label: "Needs Attention" };
    }
  };

  const getRank = (index: number): number => index + 1;

  const SortButton: React.FC<{ field: SortField; children: React.ReactNode }> = ({
    field,
    children,
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 -ml-3 hover:bg-transparent"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortConfig.field === field ? (
        sortConfig.direction === "asc" ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : (
          <ArrowDown className="ml-2 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  );

  if (recruiters.length === 0) {
    return (
      <Card className="shadow-xl border-0">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">
            Recruiter Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            No recruiter data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-0">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">
          Recruiter Performance Comparison
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Click on a row to view recruiter details
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>
                  <SortButton field="name">Recruiter</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="assigned">Assigned</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="joined">Joined</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="conversion">Conversion</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="pipelineHealth">Pipeline Health</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="untouched">Untouched</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="timeToFirstTouch">Avg First Touch</SortButton>
                </TableHead>
                <TableHead className="text-center">Performance</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRecruiters.map((recruiter, index) => {
                const conversionRate =
                  recruiter.assigned > 0
                    ? Math.round((recruiter.joined / recruiter.assigned) * 100)
                    : 0;
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
                const performance = getPerformanceRating(recruiter);

                return (
                  <TableRow
                    key={recruiter.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => navigate(`/admin/users/${recruiter.id}`)}
                  >
                    <TableCell className="font-medium">
                      #{getRank(index)}
                    </TableCell>
                    <TableCell className="font-medium">{recruiter.name}</TableCell>
                    <TableCell className="text-right">{recruiter.assigned}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {recruiter.joined}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "font-semibold",
                          conversionRate >= 30
                            ? "text-green-600"
                            : conversionRate >= 20
                            ? "text-amber-600"
                            : "text-red-600"
                        )}
                      >
                        {conversionRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "font-semibold",
                          pipelineHealth >= 50
                            ? "text-green-600"
                            : pipelineHealth >= 30
                            ? "text-amber-600"
                            : "text-red-600"
                        )}
                      >
                        {pipelineHealth}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          recruiter.untouched === 0
                            ? "text-green-600"
                            : recruiter.untouched <= 5
                            ? "text-amber-600"
                            : "text-red-600"
                        )}
                      >
                        {recruiter.untouched}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {recruiter.avgTimeToFirstTouch > 0
                        ? `${Math.round(recruiter.avgTimeToFirstTouch)}d`
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "text-xs font-semibold px-2 py-1 rounded",
                          performance.color,
                          performance.color.includes("green")
                            ? "bg-green-50"
                            : performance.color.includes("amber")
                            ? "bg-amber-50"
                            : performance.color.includes("gray")
                            ? "bg-gray-50"
                            : "bg-red-50"
                        )}
                      >
                        {performance.score === 0 && recruiter.assigned === 0
                          ? "No Data"
                          : `${performance.score}/100`}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      Click →
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

