"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  User2, 
  Layers 
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type RecruiterStats = {
  id: string;
  name: string;
  assigned: number;
};

type WorkloadDistributionChartProps = {
  recruiters: RecruiterStats[];
};

export const WorkloadDistributionChart: React.FC<WorkloadDistributionChartProps> = ({ recruiters }) => {
  const averageWorkload = useMemo(() => {
    return recruiters.length > 0
      ? recruiters.reduce((sum, r) => sum + r.assigned, 0) / recruiters.length
      : 0;
  }, [recruiters]);

  const maxWorkload = useMemo(() => {
    return Math.max(...recruiters.map(r => r.assigned), 1);
  }, [recruiters]);

  const sortedRecruiters = useMemo(() => {
    return [...recruiters].sort((a, b) => b.assigned - a.assigned);
  }, [recruiters]);

  const overloadedCount = recruiters.filter((r) => r.assigned > averageWorkload * 1.3).length;
  const underutilizedCount = recruiters.filter((r) => r.assigned < averageWorkload * 0.7).length;

  const top10 = sortedRecruiters.slice(0, 10);
  const bottom10 = sortedRecruiters.slice(-10).reverse();

  if (recruiters.length === 0) {
    return (
      <Card className="overflow-hidden border-slate-200 shadow-xl rounded-[2rem]">
        <CardHeader className="p-8 border-b border-slate-100">
          <CardTitle className="text-xl font-bold">Workload Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-20 text-slate-400">
          <BarChart3 className="h-12 w-12 mb-4 opacity-20" />
          <p className="font-medium">No recruiter data available for analysis</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200/60 bg-white/80 backdrop-blur-md shadow-2xl shadow-slate-200/50 rounded-[2rem]">
      {/* Premium Header */}
      <CardHeader className="border-b border-slate-100 bg-slate-50/30 p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200">
              <Layers className="h-7 w-7 text-white" />
              <div className="absolute -inset-1 rounded-2xl bg-indigo-600 opacity-20 blur-sm" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">
                Workload Distribution
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm font-medium text-slate-500">
                  Global Average: <span className="text-slate-900 font-bold">{Math.round(averageWorkload)}</span> candidates
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-8">
        {/* Modern Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="group relative p-5 rounded-3xl border border-rose-100 bg-rose-50/40 transition-all hover:bg-rose-50 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-rose-400">Overloaded</span>
            </div>
            <div className="text-3xl font-black text-rose-600">{overloadedCount}</div>
            <p className="text-xs font-semibold text-rose-700/70 mt-1">
              {overloadedCount > 0 ? "Exceeding capacity by >30%" : "All clear"}
            </p>
          </div>

          <div className="group relative p-5 rounded-3xl border border-emerald-100 bg-emerald-50/40 transition-all hover:bg-emerald-50 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <CheckCircle className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Balanced</span>
            </div>
            <div className="text-3xl font-black text-emerald-600">
              {recruiters.length - overloadedCount - underutilizedCount}
            </div>
            <p className="text-xs font-semibold text-emerald-700/70 mt-1">Operating at optimal range</p>
          </div>

          <div className="group relative p-5 rounded-3xl border border-sky-100 bg-sky-50/40 transition-all hover:bg-sky-50 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                <TrendingDown className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-400">Underutilized</span>
            </div>
            <div className="text-3xl font-black text-sky-600">{underutilizedCount}</div>
            <p className="text-xs font-semibold text-sky-700/70 mt-1">Available for more assignments</p>
          </div>
        </div>

        {/* Top and Bottom Comparison Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Performers Table */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 px-2 text-sm font-black uppercase tracking-tighter text-slate-400">
              <TrendingUp className="h-4 w-4 text-rose-500" />
              High Capacity Queue
            </h3>
            <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Recruiter</TableHead>
                    <TableHead className="text-right">Relative Load</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top10.map((recruiter, index) => (
                    <TableRow key={recruiter.id} className="group hover:bg-rose-50/30 transition-colors">
                      <TableCell className="text-center font-bold text-slate-300">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors">
                            <User2 className="h-4 w-4" />
                          </div>
                          <span className="font-bold text-slate-700">{recruiter.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-black text-rose-600">{recruiter.assigned}</span>
                          <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
                            <div 
                              className="h-full bg-rose-500 rounded-full" 
                              style={{ width: `${(recruiter.assigned / maxWorkload) * 100}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Bottom Performers Table */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 px-2 text-sm font-black uppercase tracking-tighter text-slate-400">
              <TrendingDown className="h-4 w-4 text-sky-500" />
              Low Capacity Queue
            </h3>
            <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Recruiter</TableHead>
                    <TableHead className="text-right">Relative Load</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bottom10.map((recruiter, index) => {
                    const rank = recruiters.length - (bottom10.length - 1 - index);
                    return (
                      <TableRow key={recruiter.id} className="group hover:bg-sky-50/30 transition-colors">
                        <TableCell className="text-center font-bold text-slate-300">
                          {rank}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
                              <User2 className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-slate-700">{recruiter.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-sm font-black text-sky-600">{recruiter.assigned}</span>
                            <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
                              <div 
                                className="h-full bg-sky-500 rounded-full" 
                                style={{ width: `${(recruiter.assigned / maxWorkload) * 100}%` }}
                              />
                            </div>
                          </div>
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