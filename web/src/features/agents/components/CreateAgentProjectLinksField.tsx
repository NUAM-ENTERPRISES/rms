import { useEffect, useState } from "react";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Building2,
  Calendar,
  Loader2,
  FolderKanban,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetProjectsPickerQuery } from "@/features/projects/api";
import { useDebounce } from "@/hooks";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 5;

export type CreateAgentProjectLinksFieldProps = {
  enabled: boolean;
  selectedIds: Set<string>;
  onToggleProject: (projectId: string, selected: boolean) => void;
  notesByProjectId: Record<string, string>;
  onNotesChange: (projectId: string, notes: string) => void;
};

export function CreateAgentProjectLinksField({
  enabled,
  selectedIds,
  onToggleProject,
  notesByProjectId,
  onNotesChange,
}: CreateAgentProjectLinksFieldProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isFetching } = useGetProjectsPickerQuery(
    {
      status: "active",
      search: debouncedSearch || undefined,
      page,
      limit: PAGE_SIZE,
    },
    { skip: !enabled },
  );

  const projects = data?.data.projects ?? [];
  const pagination = data?.data.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const total = pagination?.total ?? 0;
  const loading = isLoading || isFetching;

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div>
        <Label className="text-sm font-medium text-slate-900">Link projects (optional)</Label>
        <p className="text-xs text-slate-500 mt-0.5">
          Pick active client projects now, or add them later from the agent profile.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by project title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pl-9 pr-8 text-sm bg-white"
          aria-label="Search projects to link"
          disabled={!enabled}
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="rounded-md border border-slate-200 bg-white min-h-[200px] max-h-[220px] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 h-[200px] text-sm text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" aria-hidden />
            Loading projects…
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 h-[200px] px-4 text-center">
            <FolderKanban className="h-8 w-8 text-slate-300" aria-hidden />
            <p className="text-sm text-slate-600">No projects match your search.</p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <ul className="p-2 space-y-1.5">
              {projects.map((p) => {
                const id = `create-agent-proj-${p.id}`;
                const isSelected = selectedIds.has(p.id);
                return (
                  <li
                    key={p.id}
                    className={`rounded-md border transition-colors ${
                      isSelected
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-slate-100 bg-slate-50/30 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-start gap-2 p-2">
                      <Checkbox
                        id={id}
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          onToggleProject(p.id, checked === true)
                        }
                        className="mt-0.5"
                        aria-label={`Select ${p.title}`}
                      />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={id} className="font-medium text-sm text-slate-900 cursor-pointer">
                          {p.title}
                        </Label>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3 shrink-0" aria-hidden />
                            {p.client?.name ?? "No client"}
                          </span>
                          {p.deadline ? (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                              {formatDate(p.deadline)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {isSelected ? (
                      <div className="px-2 pb-2 pl-9">
                        <Label htmlFor={`${id}-notes`} className="text-[11px] text-slate-600">
                          Notes (optional)
                        </Label>
                        <Textarea
                          id={`${id}-notes`}
                          value={notesByProjectId[p.id] ?? ""}
                          onChange={(e) => onNotesChange(p.id, e.target.value)}
                          rows={2}
                          placeholder="Engagement scope, client contact…"
                          className="mt-1 text-xs min-h-[3rem] resize-y"
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </div>

      {total > 0 && !loading ? (
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          {totalPages > 1 ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPage((x) => Math.max(1, x - 1))}
                disabled={page <= 1 || loading}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="tabular-nums px-1">
                {page}/{totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPage((x) => Math.min(totalPages, x + 1))}
                disabled={page >= totalPages || loading}
                aria-label="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
