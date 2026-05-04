import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Building2,
  CheckCircle2,
  X,
  Link2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { AgentCandidate } from "../../api";
import {
  agentsApi,
  useGetAgentProjectsQuery,
} from "@/features/agents/api";
import { useUpdateCandidateMutation } from "@/features/candidates/api";
import { useAppDispatch } from "@/app/hooks";
import { useDebounce } from "@/hooks";

const PAGE_SIZE = 8;

type EditDeclaredProjectsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  candidate: AgentCandidate | null;
};

export function EditDeclaredProjectsModal({
  open,
  onOpenChange,
  agentId,
  candidate,
}: EditDeclaredProjectsModalProps) {
  const dispatch = useAppDispatch();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const searchDebounced = useDebounce(searchInput, 300);
  const [page, setPage] = useState(1);

  const [updateCandidate, { isLoading: isSaving }] =
    useUpdateCandidateMutation();

  useEffect(() => {
    if (open && candidate) {
      const ids =
        candidate.declaredProjects?.map((p) => p.projectId) ?? [];
      setSelectedIds(ids);
      setSearchInput("");
      setPage(1);
    }
  }, [open, candidate?.id]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, agentId]);

  const { data, isFetching } = useGetAgentProjectsQuery(
    {
      id: agentId,
      page,
      limit: PAGE_SIZE,
      search: searchDebounced.trim() || undefined,
    },
    { skip: !open || !agentId },
  );

  const rows =
    data?.data?.filter((row) => row.isActive !== false) ?? [];
  const meta = data?.meta;
  const totalLinked = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 1;
  const currentPage = meta?.page ?? page;

  const toggle = useCallback((pid: string) => {
    setSelectedIds((prev) =>
      prev.includes(pid)
        ? prev.filter((id) => id !== pid)
        : [...prev, pid],
    );
  }, []);

  const from =
    totalLinked === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, totalLinked);

  const candidateName =
    candidate != null
      ? `${candidate.firstName} ${candidate.lastName}`
      : "";

  const handleSave = async () => {
    if (!candidate?.id) return;
    try {
      await updateCandidate({
        id: candidate.id,
        declaredProjectIds: selectedIds,
      }).unwrap();
      dispatch(
        agentsApi.util.invalidateTags([{ type: "Agent", id: agentId }]),
      );
      toast.success("Linked projects saved");
      onOpenChange(false);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message)
          : "Could not update linked projects";
      toast.error(msg);
    }
  };

  const hasNoAgentLinks =
    open && !isFetching && totalLinked === 0 && !searchDebounced.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-gradient-to-br from-emerald-50/80 to-teal-50/80">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <Link2 className="h-5 w-5 text-white" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold text-slate-900">
                Edit Linked Projects
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 mt-1 leading-relaxed">
                Choose which projects apply to{" "}
                <span className="font-semibold text-slate-800">{candidateName}</span>.
                <span className="block text-xs text-slate-500 mt-1">
                  This records intent only — it does not nominate the candidate.
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none"
              aria-hidden
            />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search projects or clients…"
              className="h-10 pl-10 pr-10 bg-white border-slate-200 focus:border-emerald-300 focus:ring-emerald-200 rounded-lg"
              aria-label="Search agent linked projects"
              autoComplete="off"
              disabled={!agentId}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <Badge
                variant="secondary"
                className="gap-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-medium"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {selectedIds.length} selected
              </Badge>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="min-h-[300px] max-h-[300px] overflow-hidden">
          {isFetching ? (
            <div className="flex flex-col items-center justify-center gap-3 h-[300px] text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" aria-hidden />
              <p className="text-sm font-medium">Loading projects...</p>
            </div>
          ) : hasNoAgentLinks ? (
            <div className="flex flex-col items-center justify-center gap-3 h-[300px] px-6">
              <div className="rounded-full bg-amber-100 p-4">
                <AlertCircle className="h-8 w-8 text-amber-600" aria-hidden />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium text-slate-700">No projects linked to this agent</p>
                <p className="text-sm text-slate-500 max-w-xs">
                  Link projects to this agent first under the &quot;Linked Projects&quot; section.
                </p>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 h-[300px]">
              <div className="rounded-full bg-slate-100 p-4">
                <FolderKanban className="h-8 w-8 text-slate-300" aria-hidden />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium text-slate-700">No projects found</p>
                <p className="text-sm text-slate-500">
                  {searchInput.trim()
                    ? "Try a different search term"
                    : "Nothing on this page"}
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="p-4 space-y-2">
                {rows.map((row) => {
                  const pid = row.projectId;
                  const title = row.project?.title ?? pid;
                  const clientName = row.project?.client?.name;
                  const checked = selectedIds.includes(pid);
                  const inputId = `edit-declared-${pid.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

                  return (
                    <div
                      key={pid}
                      className={`relative rounded-lg border transition-all duration-150 ${
                        checked
                          ? "border-emerald-300 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-200/50"
                          : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30"
                      }`}
                    >
                      <Label
                        htmlFor={inputId}
                        className="flex cursor-pointer items-start gap-3 p-3.5"
                      >
                        <Checkbox
                          id={inputId}
                          checked={checked}
                          onCheckedChange={() => toggle(pid)}
                          className={`mt-0.5 shrink-0 ${
                            checked
                              ? "border-emerald-500 data-[state=checked]:bg-emerald-500"
                              : ""
                          }`}
                          aria-label={title}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-sm text-slate-900 leading-snug">
                              {title}
                            </span>
                            {checked && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            )}
                          </div>
                          {clientName ? (
                            <span className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                              <Building2 className="h-3 w-3" aria-hidden />
                              {clientName}
                            </span>
                          ) : null}
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        {totalPages > 1 && !isFetching && !hasNoAgentLinks ? (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                {totalLinked > 0 ? (
                  <>
                    <span className="font-medium text-slate-700">{from}–{to}</span> of{" "}
                    <span className="font-medium text-slate-700">{totalLinked}</span> projects
                  </>
                ) : (
                  "—"
                )}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm text-slate-600 min-w-[80px] text-center tabular-nums">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage >= totalPages || isFetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="px-6 py-4 border-t border-slate-200 bg-white gap-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-initial"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || !candidate?.id || hasNoAgentLinks}
            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
