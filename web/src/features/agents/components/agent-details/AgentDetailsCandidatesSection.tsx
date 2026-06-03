import { useState } from "react";
import { Search, Users, X, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AgentCandidate } from "../../api";
import { AgentDetailsCandidateTableRow } from "./AgentDetailsCandidateTableRow";
import { EditDeclaredProjectsModal } from "./EditDeclaredProjectsModal";
import { CandidatesTableSkeleton } from "./AgentDetailsSkeletons";
import type { CandidateListFilter } from "./AgentDetailsStats";

const TABLE_COL_COUNT = 7;

type AgentDetailsCandidatesSectionProps = {
  candidateFilter: CandidateListFilter;
  search: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  hasActiveSearch: boolean;
  totalCount: number;
  candidates: AgentCandidate[];
  isLoading: boolean;
  isFetching: boolean;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onViewCandidate: (candidateId: string) => void;
  canAddCandidate?: boolean;
  onAddCandidate?: () => void;
  /** Agent id for loading linked projects in the edit modal */
  agentId: string;
  canEditDeclaredProjects?: boolean;
};

export function AgentDetailsCandidatesSection({
  candidateFilter,
  search,
  onSearchChange,
  onClearSearch,
  hasActiveSearch,
  totalCount,
  candidates,
  isLoading,
  isFetching,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onViewCandidate,
  canAddCandidate,
  onAddCandidate,
  agentId,
  canEditDeclaredProjects,
}: AgentDetailsCandidatesSectionProps) {
  const [candidateForDeclaredEdit, setCandidateForDeclaredEdit] =
    useState<AgentCandidate | null>(null);

  const isInterviewPassedFilter = candidateFilter === "interview_passed";
  const sectionTitle = isInterviewPassedFilter ? "Interview Passed" : "Referred Candidates";
  const sectionSubtitle = isInterviewPassedFilter
    ? `${totalCount} candidate${totalCount !== 1 ? "s" : ""} with interview passed status`
    : `${totalCount} candidate${totalCount !== 1 ? "s" : ""} from this agent`;
  const projectsColumnLabel = isInterviewPassedFilter ? "Project status" : "Projects linked";

  return (
    <div>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-md">
                  <Users className="h-5 w-5 text-white" aria-hidden />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{sectionTitle}</h2>
                  <p className="text-xs text-slate-500">{sectionSubtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search by name, email, passport..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="h-10 pl-10 pr-8 w-full bg-slate-50 border-slate-200 focus:bg-white rounded-xl"
                    aria-label="Search candidates"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={onClearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {canAddCandidate && onAddCandidate ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={onAddCandidate}
                    className="gap-2 shrink-0"
                  >
                    <UserPlus className="h-4 w-4" aria-hidden />
                    <span className="hidden sm:inline">Add Candidate</span>
                  </Button>
                ) : null}
              </div>
            </div>

            {hasActiveSearch && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-slate-500">Search:</span>
                  <Badge variant="secondary" className="gap-1 pr-1">
                    {search}
                    <button
                      type="button"
                      onClick={onClearSearch}
                      className="ml-1 hover:bg-slate-200 rounded p-0.5"
                      aria-label="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                  <button
                    type="button"
                    onClick={onClearSearch}
                    className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-gray-200 hover:bg-slate-50/80">
                    <TableHead className="w-[280px] h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Candidate
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Contact
                    </TableHead>
                    <TableHead className="h-10 px-4 min-w-[7.5rem] text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Passport
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Assigned To
                    </TableHead>
                    <TableHead className="min-w-[240px] h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {projectsColumnLabel}
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Added
                    </TableHead>
                    <TableHead className="h-10 px-4 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading || isFetching ? (
                    <CandidatesTableSkeleton />
                  ) : candidates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={TABLE_COL_COUNT} className="h-64">
                        <div className="flex flex-col items-center justify-center gap-4 py-8">
                          <div className="rounded-full bg-slate-100 p-4">
                            <Users className="h-10 w-10 text-slate-300" />
                          </div>
                          <div className="text-center space-y-1">
                            <p className="font-medium text-slate-700">
                              {hasActiveSearch
                                ? "No matching candidates"
                                : isInterviewPassedFilter
                                  ? "No interview passed candidates"
                                  : "No candidates yet"}
                            </p>
                            <p className="text-sm text-slate-500 max-w-sm">
                              {hasActiveSearch
                                ? "Try a different search term."
                                : isInterviewPassedFilter
                                  ? "Candidates with interview passed project status will appear here."
                                  : "Candidates referred by this agent will appear here."}
                            </p>
                          </div>
                          {hasActiveSearch && (
                            <Button variant="outline" size="sm" onClick={onClearSearch} className="gap-2">
                              <X className="h-4 w-4" />
                              Clear search
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    candidates.map((candidate, index) => (
                      <AgentDetailsCandidateTableRow
                        key={candidate.id}
                        candidate={candidate}
                        index={index}
                        showProjectStatus={isInterviewPassedFilter}
                        onView={() => onViewCandidate(candidate.id)}
                        canEditDeclaredProjects={Boolean(canEditDeclaredProjects)}
                        onEditDeclaredProjects={
                          canEditDeclaredProjects
                            ? () => setCandidateForDeclaredEdit(candidate)
                            : undefined
                        }
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50 gap-3">
                <p className="text-sm text-slate-500">
                  Showing <span className="font-medium text-slate-700">{(page - 1) * pageSize + 1}</span> to{" "}
                  <span className="font-medium text-slate-700">{Math.min(page * pageSize, totalCount)}</span> of{" "}
                  <span className="font-medium text-slate-700">{totalCount}</span> candidates
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page <= 1 || isFetching}
                    aria-label="Previous page"
                    className="h-9 px-3 gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "ghost"}
                          size="sm"
                          onClick={() => onPageChange(pageNum)}
                          disabled={isFetching}
                          className="h-9 w-9 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages || isFetching}
                    aria-label="Next page"
                    className="h-9 px-3 gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

      <EditDeclaredProjectsModal
        open={candidateForDeclaredEdit != null}
        onOpenChange={(open) => {
          if (!open) setCandidateForDeclaredEdit(null);
        }}
        agentId={agentId}
        candidate={candidateForDeclaredEdit}
      />
    </div>
  );
}
