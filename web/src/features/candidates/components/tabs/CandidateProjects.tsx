import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Briefcase,
  User,
  Eye,
  UserCheck,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGetCandidateProjectsQuery } from "../../api";
import { formatDate } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { StatusBadge } from "../StatusBadge";

interface CandidateProjectsProps {
  candidateId: string;
}

export const CandidateProjects: React.FC<CandidateProjectsProps> = ({
  candidateId,
}) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  const { data, isLoading } = useGetCandidateProjectsQuery(
    {
      candidateId,
      page,
      limit,
      search: debouncedSearch,
    },
    {
      skip: !candidateId,
    }
  );

  const projects = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-md overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-purple-50/50 to-violet-50/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
                <div className="p-2 bg-purple-100 rounded-xl">
                  <Briefcase className="h-6 w-6 text-purple-600" />
                </div>
                Assigned Projects
              </CardTitle>
              <CardDescription className="mt-1 text-slate-600">
                Projects where this candidate is currently assigned or nominated
              </CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/50 border-slate-200 focus:bg-white transition-all"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-slate-600 font-medium">Loading projects...</p>
            </div>
          ) : projects.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-100 transition-colors">
                    <TableHead className="font-semibold text-slate-700">Project</TableHead>
                    <TableHead className="font-semibold text-slate-700">Role</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700">Recruiter</TableHead>
                    <TableHead className="font-semibold text-slate-700">Assigned Date</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((projectItem) => (
                    <TableRow
                      key={projectItem.id}
                      className="hover:bg-purple-50/50 transition-all duration-200"
                    >
                      <TableCell className="font-medium text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Briefcase className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="flex flex-col">
                             <span className="font-bold text-slate-900">
                              {projectItem.project?.title || "Untitled Project"}
                            </span>
                            <span className="text-xs text-slate-500">
                              Status: {projectItem.project?.status || "N/A"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">
                            {projectItem.roleNeeded?.designation || "Not specified"}
                          </span>
                          {projectItem.roleNeeded && (
                            <span className="text-xs text-slate-500">
                              Exp: {projectItem.roleNeeded.minExperience}-{projectItem.roleNeeded.maxExperience} yrs
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <StatusBadge 
                          status={projectItem.currentProjectStatus?.statusName} 
                          label={projectItem.currentProjectStatus?.label}
                        />
                      </TableCell>

                      <TableCell>
                        {projectItem.recruiter ? (
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {projectItem.recruiter.name}
                              </p>
                              <p className="text-xs text-slate-500 truncate max-w-32">
                                {projectItem.recruiter.email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-orange-600 border-orange-300 bg-orange-50"
                          >
                            Unassigned
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-slate-700">
                        {formatDate(projectItem.assignedAt)}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/candidate-project/${candidateId}/projects/${projectItem.project.id}`
                              )
                            }
                            className="hover:bg-purple-100"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {meta && meta.total > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-sm text-slate-500 font-medium">
                    Showing <span className="text-slate-900">{(page - 1) * limit + 1}</span> to{" "}
                    <span className="text-slate-900">
                      {Math.min(page * limit, meta.total)}
                    </span>{" "}
                    of <span className="text-slate-900">{meta.total}</span> results
                  </p>
                  {meta.totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                          <Button
                            key={p}
                            variant={p === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(p)}
                            className={`h-8 w-8 p-0 ${p === page ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                          >
                            {p}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                        disabled={page === meta.totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center">
              <div className="max-w-md mx-auto space-y-6">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-100 to-violet-100 rounded-full flex items-center justify-center">
                  <Briefcase className="h-12 w-12 text-purple-600" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-slate-800">
                    {search ? "No matching projects" : "No Projects Assigned"}
                  </h3>
                  <p className="text-slate-600">
                    {search 
                      ? `We couldn't find any projects matching "${search}"` 
                      : "This candidate is not currently part of any active or nominated projects."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
