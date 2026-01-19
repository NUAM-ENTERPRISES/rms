"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type RecruiterStats = {
  id: string;
  name: string;
  assigned: number;
};

type WorkloadDistributionChartProps = {
  recruiters: RecruiterStats[];
};

export const WorkloadDistributionChart: React.FC<
  WorkloadDistributionChartProps
> = ({ recruiters }) => {
  const averageWorkload = useMemo(() => {
    return recruiters.length > 0
      ? recruiters.reduce((sum, r) => sum + r.assigned, 0) / recruiters.length
      : 0;
  }, [recruiters]);

  const sortedRecruiters = useMemo(() => {
    return [...recruiters].sort((a, b) => b.assigned - a.assigned);
  }, [recruiters]);

  const overloadedCount = recruiters.filter(
    (r) => r.assigned > averageWorkload * 1.3
  ).length;
  const underutilizedCount = recruiters.filter(
    (r) => r.assigned < averageWorkload * 0.7
  ).length;

  // Top 10 and Bottom 10
  const top10 = sortedRecruiters.slice(0, 10);
  const bottom10 = sortedRecruiters.slice(-10).reverse();

  if (recruiters.length === 0) {
    return (
      <Card className="shadow-xl border-0">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">
            Workload Distribution
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
          Workload Distribution
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Candidates assigned per recruiter (Average: {Math.round(averageWorkload)})
        </p>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-3 rounded-lg border border-red-200 bg-red-50">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-red-900">
                Overloaded
              </span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {overloadedCount}
            </div>
            <div className="text-xs text-red-700">
              {overloadedCount > 0
                ? "May need support"
                : "No overloaded recruiters"}
            </div>
          </div>

          <div className="p-3 rounded-lg border border-green-200 bg-green-50">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-900">
                Optimal
              </span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {recruiters.length - overloadedCount - underutilizedCount}
            </div>
            <div className="text-xs text-green-700">Well balanced</div>
          </div>

          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-900">
                Underutilized
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {underutilizedCount}
            </div>
            <div className="text-xs text-blue-700">
              {underutilizedCount > 0
                ? "Can take more"
                : "No underutilized recruiters"}
            </div>
          </div>
        </div>


        {/* Top and Bottom Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 10 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-600" />
              Top 10 - Highest Workload
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Recruiter</TableHead>
                    <TableHead className="text-right">Assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top10.map((recruiter, index) => (
                    <TableRow key={recruiter.id}>
                      <TableCell className="font-medium">#{index + 1}</TableCell>
                      <TableCell className="font-medium">{recruiter.name}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {recruiter.assigned}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Bottom 10 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-blue-600" />
              Bottom 10 - Lowest Workload
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Recruiter</TableHead>
                    <TableHead className="text-right">Assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bottom10.map((recruiter, index) => {
                    const rank = recruiters.length - (bottom10.length - 1 - index);
                    return (
                      <TableRow key={recruiter.id}>
                        <TableCell className="font-medium">#{rank}</TableCell>
                        <TableCell className="font-medium">{recruiter.name}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {recruiter.assigned}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

