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
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGetCandidateProjectsQuery, type CandidateProjectItem } from "../../api";
import { formatDate } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import {
  getStatusConfig,
  resolveProjectCandidateStatusDisplay,
  type CandidateProjectStatus,
} from "@/constants/statuses";
import { SURFACE_ORANGE_SOFT } from "@/lib/page-shell-styles";

interface CandidateProjectsProps {
  candidateId: string;
}

function PipelineStatusCell({
  mainStatus,
  subStatus,
}: {
  mainStatus?: CandidateProjectItem["mainStatus"];
  subStatus?: CandidateProjectItem["subStatus"];
}) {
  const mainLabel = mainStatus?.label?.trim() || mainStatus?.name?.trim() || "";
  const subLabel = subStatus?.label?.trim() || subStatus?.name?.trim() || "";
  const subDisplay = resolveProjectCandidateStatusDisplay(
    subStatus?.name || subLabel || undefined,
  );
  const mainConfig = getStatusConfig(
    (mainStatus?.name || "nominated") as CandidateProjectStatus,
  );

  if (!mainLabel && !subLabel) {
    return (
      <Badge variant="outline" className="w-fit text-[11px] font-medium">
        Unknown
      </Badge>
    );
  }

  if (mainLabel && subLabel) {
    return (
      <div className="flex flex-col gap-1">
        <Badge
          variant="outline"
          className="w-fit border-border bg-card text-[11px] font-medium text-foreground"
        >
          {mainLabel}
        </Badge>
        <Badge className={`${subDisplay.badgeClass} w-fit border text-[11px] font-medium`}>
          {subLabel}
        </Badge>
      </div>
    );
  }

  if (subLabel) {
    return (
      <Badge className={`${subDisplay.badgeClass} w-fit border text-[11px] font-medium`}>
        {subLabel}
      </Badge>
    );
  }

  return (
    <Badge className={`${mainConfig.badgeClass} w-fit border text-[11px] font-medium`}>
      {mainLabel}
    </Badge>
  );
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
      <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm dark:bg-card dark:shadow-none">
        <CardHeader className="border-b border-border bg-gradient-to-r from-purple-50/50 to-violet-50/30 dark:from-card dark:via-card dark:!to-card dark:bg-muted/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-foreground">
                <div className="rounded-xl bg-purple-100 p-2 dark:!bg-muted/40">
                  <Briefcase className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                </div>
                Assigned Projects
              </CardTitle>
              <CardDescription className="mt-1 text-muted-foreground">
                Projects where this candidate is currently assigned or nominated
              </CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-border bg-card pl-9 transition-all focus:bg-card dark:!border-border dark:!bg-muted/15"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600 dark:border-primary-400" />
              <p className="mt-4 font-medium text-muted-foreground">Loading projects...</p>
            </div>
          ) : projects.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/80 transition-colors hover:bg-muted dark:bg-muted/30">
                    <TableHead className="font-semibold text-foreground">Project</TableHead>
                    <TableHead className="font-semibold text-foreground">Role</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-foreground">Recruiter</TableHead>
                    <TableHead className="font-semibold text-foreground">Assigned Date</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((projectItem) => (
                    <TableRow
                      key={projectItem.id}
                      className="transition-all duration-200 hover:bg-purple-50/50 dark:hover:!bg-muted/30"
                    >
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:!bg-muted/40">
                            <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                          </div>
                          <div className="flex flex-col">
                             <span className="font-bold text-foreground">
                              {projectItem.project?.title || "Untitled Project"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Status: {projectItem.project?.status || "N/A"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {projectItem.roleNeeded?.designation || "Not specified"}
                          </span>
                          {projectItem.roleNeeded && (
                            <span className="text-xs text-muted-foreground">
                              Exp: {projectItem.roleNeeded.minExperience}-{projectItem.roleNeeded.maxExperience} yrs
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <PipelineStatusCell
                          mainStatus={projectItem.mainStatus}
                          subStatus={projectItem.subStatus}
                        />
                      </TableCell>

                      <TableCell>
                        {projectItem.recruiter ? (
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:!bg-muted/40">
                              <User className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {projectItem.recruiter.name}
                              </p>
                              <p className="max-w-32 truncate text-xs text-muted-foreground">
                                {projectItem.recruiter.email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className={SURFACE_ORANGE_SOFT}
                          >
                            Unassigned
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-foreground">
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
                            className="hover:bg-purple-100 dark:hover:!bg-muted/40"
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
                <div className="flex items-center justify-between border-t border-border bg-muted/50 px-6 py-4 dark:bg-muted/20">
                  <p className="text-sm font-medium text-muted-foreground">
                    Showing <span className="text-foreground">{(page - 1) * limit + 1}</span> to{" "}
                    <span className="text-foreground">
                      {Math.min(page * limit, meta.total)}
                    </span>{" "}
                    of <span className="text-foreground">{meta.total}</span> results
                  </p>
                  {meta.totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-8 w-8 p-0 dark:border-border dark:hover:bg-muted/40"
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
                            className={`h-8 w-8 p-0 ${p === page ? "bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-500" : "dark:border-border dark:hover:bg-muted/40"}`}
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
                        className="h-8 w-8 p-0 dark:border-border dark:hover:bg-muted/40"
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
              <div className="mx-auto max-w-md space-y-6">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-violet-100 dark:from-muted/40 dark:to-muted/30">
                  <Briefcase className="h-12 w-12 text-purple-600 dark:text-purple-300" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-foreground">
                    {search ? "No matching projects" : "No Projects Assigned"}
                  </h3>
                  <p className="text-muted-foreground">
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
