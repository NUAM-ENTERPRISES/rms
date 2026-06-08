import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  FolderKanban,
  Loader2,
  Plus,
  Trash2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Building2,
  CheckCircle2,
  StickyNote,
} from "lucide-react";
import { ProjectStatus } from "@/entities/project/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useGetAgentProjectsQuery,
  useLinkAgentProjectsMutation,
  useUnlinkAgentProjectMutation,
} from "@/features/agents/api";
import { useGetProjectsPickerQuery } from "@/features/projects/api";
import { useCan } from "@/hooks/useCan";
import { useDebounce } from "@/hooks";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 6;
/** Page size for the agent-linked projects list GET /agents/:id/projects */
const LINKED_LIST_PAGE_SIZE = 10;

interface AgentLinkedProjectsSectionProps {
  agentId: string;
}

export function AgentLinkedProjectsSection({
  agentId,
}: AgentLinkedProjectsSectionProps) {
  const canEdit = useCan("edit:agents");

  const [linkedListSearch, setLinkedListSearch] = useState("");
  const linkedListSearchDebounced = useDebounce(linkedListSearch, 300);
  const [linkedListPage, setLinkedListPage] = useState(1);

  const { data, isLoading, isFetching } = useGetAgentProjectsQuery({
    id: agentId,
    page: linkedListPage,
    limit: LINKED_LIST_PAGE_SIZE,
    search: linkedListSearchDebounced.trim() || undefined,
  });
  const rows = data?.data ?? [];
  const linkedMeta = data?.meta;
  const linkedTotalDisplay = linkedMeta?.total ?? rows.length;
  const linkedTotalPages = linkedMeta?.totalPages ?? 1;
  const linkedPageCurrent = linkedMeta?.page ?? linkedListPage;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNewIds, setSelectedNewIds] = useState<Set<string>>(new Set());
  /** Optional engagement notes per project id when linking */
  const [linkNotesByProjectId, setLinkNotesByProjectId] = useState<
    Record<string, string>
  >({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  /** Project pending removal from linked list (confirmation modal) */
  const [unlinkTarget, setUnlinkTarget] = useState<{
    projectId: string;
    projectTitle: string;
  } | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setLinkedListSearch("");
    setLinkedListPage(1);
  }, [agentId]);

  useEffect(() => {
    setLinkedListPage(1);
  }, [linkedListSearchDebounced]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data: projectsResponse, isLoading: isProjectsLoading, isFetching: isProjectsFetching } =
    useGetProjectsPickerQuery(
      {
        status: "in_progress",
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
      },
      { skip: !dialogOpen },
    );

  const allActiveProjects = projectsResponse?.data.projects ?? [];
  const pagination = projectsResponse?.data.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const totalProjects = pagination?.total ?? 0;

  const linkedIds = useMemo(
    () => new Set(rows.filter((r) => r.isActive).map((r) => r.projectId)),
    [rows],
  );

  const [linkProjects, { isLoading: isLinking }] = useLinkAgentProjectsMutation();
  const [unlinkProject, { isLoading: isUnlinking }] =
    useUnlinkAgentProjectMutation();

  const resetDialog = () => {
    setSelectedNewIds(new Set());
    setLinkNotesByProjectId({});
    setSearch("");
    setPage(1);
  };

  const handleLink = async () => {
    if (selectedNewIds.size === 0) {
      toast.error("Select at least one project");
      return;
    }
    try {
      await linkProjects({
        agentId,
        body: {
          links: [...selectedNewIds].map((projectId) => {
            const raw = linkNotesByProjectId[projectId]?.trim();
            return {
              projectId,
              ...(raw ? { notes: raw } : {}),
            };
          }),
        },
      }).unwrap();
      toast.success("Projects linked to agent");
      setDialogOpen(false);
      resetDialog();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message)
          : "Failed to link projects";
      toast.error(msg);
    }
  };

  const handleUnlink = async (projectId: string) => {
    try {
      await unlinkProject({ agentId, projectId }).unwrap();
      toast.success("Project unlinked");
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message)
          : "Failed to remove project";
      toast.error(msg);
    }
  };

  const isLoadingProjects = isProjectsLoading || isProjectsFetching;

  return (
    <section
      className="rounded-2xl border-0 shadow-lg bg-white overflow-hidden h-full"
      aria-labelledby="agent-projects-heading"
    >
      <div className="bg-white border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
              <FolderKanban className="h-5 w-5 text-white" aria-hidden />
            </div>
            <div>
              <h2
                id="agent-projects-heading"
                className="text-lg font-bold text-slate-900"
              >
                Linked Projects
              </h2>
              <p className="text-xs text-slate-500">
                {linkedTotalDisplay} project{linkedTotalDisplay !== 1 ? "s" : ""} linked
                {linkedListSearchDebounced.trim() ? " (filtered)" : ""}
              </p>
            </div>
          </div>
          {canEdit ? (
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetDialog();
              }}
            >
              <DialogTrigger asChild>
                <Button type="button" size="sm" className="gap-2 shrink-0">
                  <Plus className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Link Project</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-gradient-to-br from-emerald-50/50 to-teal-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                      <FolderKanban className="h-5 w-5 text-white" aria-hidden />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-semibold text-slate-900">
                        Link Projects
                      </DialogTitle>
                      <DialogDescription className="text-sm text-slate-600 mt-0.5">
                        Select active projects to associate with this agent
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search projects by title..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-10 pl-10 pr-10 bg-white border-slate-200 focus:border-emerald-300 focus:ring-emerald-200 rounded-lg"
                      aria-label="Search projects"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {selectedNewIds.size > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {selectedNewIds.size} selected
                      </Badge>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedNewIds(new Set());
                          setLinkNotesByProjectId({});
                        }}
                        className="text-xs text-slate-500 hover:text-slate-700 underline"
                      >
                        Clear selection
                      </button>
                    </div>
                  )}
                </div>

                <div className="min-h-[320px] max-h-[320px] overflow-hidden">
                  {isLoadingProjects ? (
                    <div className="flex flex-col items-center justify-center gap-3 h-[320px] text-slate-500">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" aria-hidden />
                      <p className="text-sm">Loading projects...</p>
                    </div>
                  ) : allActiveProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 h-[320px]">
                      <div className="rounded-full bg-slate-100 p-4">
                        <FolderKanban className="h-8 w-8 text-slate-300" aria-hidden />
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-slate-700">No projects found</p>
                        <p className="text-sm text-slate-500 mt-1">
                          {search ? "Try a different search term" : "No active projects available"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="h-[320px]">
                      <div className="p-4 space-y-2">
                        {allActiveProjects.map((p) => {
                          const checkId = `link-project-${p.id}`;
                          const isAlreadyLinked = linkedIds.has(p.id);
                          const isSelected = selectedNewIds.has(p.id);

                          return (
                            <div
                              key={p.id}
                              className={`relative rounded-lg border transition-all duration-150 ${
                                isAlreadyLinked
                                  ? "border-slate-200 bg-slate-50 opacity-60"
                                  : isSelected
                                  ? "border-emerald-300 bg-emerald-50/50 shadow-sm"
                                  : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30"
                              }`}
                            >
                              <div
                                className={`flex items-start gap-3 p-3.5 ${
                                  isAlreadyLinked ? "" : "cursor-pointer"
                                }`}
                              >
                                <Checkbox
                                  id={checkId}
                                  checked={isSelected || isAlreadyLinked}
                                  disabled={isAlreadyLinked}
                                  onCheckedChange={(checked) => {
                                    if (isAlreadyLinked) return;
                                    setSelectedNewIds((prev) => {
                                      const next = new Set(prev);
                                      if (checked === true) {
                                        next.add(p.id);
                                      } else {
                                        next.delete(p.id);
                                        setLinkNotesByProjectId((notes) => {
                                          const { [p.id]: _, ...rest } = notes;
                                          return rest;
                                        });
                                      }
                                      return next;
                                    });
                                  }}
                                  className={`mt-0.5 ${
                                    isSelected
                                      ? "border-emerald-500 data-[state=checked]:bg-emerald-500"
                                      : ""
                                  }`}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <Label
                                      htmlFor={checkId}
                                      className="font-medium text-slate-900 leading-tight cursor-pointer"
                                    >
                                      {p.title}
                                    </Label>
                                    {isAlreadyLinked && (
                                      <Badge variant="outline" className="text-xs shrink-0 border-slate-300 text-slate-500">
                                        Already linked
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <Building2 className="h-3 w-3" aria-hidden />
                                      {p.client?.name ?? "No client"}
                                    </span>
                                    {p.deadline && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" aria-hidden />
                                        {formatDate(p.deadline)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {isSelected && !isAlreadyLinked ? (
                                <div
                                  className="px-3.5 pb-3.5 pl-[3.25rem] pr-3"
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  <Label
                                    htmlFor={`${checkId}-notes`}
                                    className="text-xs font-medium text-slate-600"
                                  >
                                    Engagement notes (optional)
                                  </Label>
                                  <Textarea
                                    id={`${checkId}-notes`}
                                    value={linkNotesByProjectId[p.id] ?? ""}
                                    onChange={(e) =>
                                      setLinkNotesByProjectId((prev) => ({
                                        ...prev,
                                        [p.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="e.g. brief scope, contact on client side..."
                                    rows={2}
                                    className="mt-1.5 min-h-[4rem] resize-y text-sm bg-white border-slate-200 focus-visible:ring-emerald-200"
                                    aria-label={`Notes for ${p.title}`}
                                  />
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                      {!isLoadingProjects && totalProjects > 0 && (
                        <span>
                          Showing {(page - 1) * PAGE_SIZE + 1}-
                          {Math.min(page * PAGE_SIZE, totalProjects)} of {totalProjects}
                        </span>
                      )}
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1 || isLoadingProjects}
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-3 text-sm text-slate-600 min-w-[80px] text-center">
                          Page {page} of {totalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page >= totalPages || isLoadingProjects}
                          aria-label="Next page"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleLink()}
                    disabled={isLinking || selectedNewIds.size === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    {isLinking ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Linking...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" aria-hidden />
                        Link {selectedNewIds.size > 0 ? `(${selectedNewIds.size})` : ""}
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input
            placeholder="Search by project or client..."
            value={linkedListSearch}
            onChange={(e) => setLinkedListSearch(e.target.value)}
            className="h-10 pl-10 pr-10 bg-white border-slate-200 rounded-lg"
            aria-label="Search linked projects"
          />
          {linkedListSearch ? (
            <button
              type="button"
              onClick={() => setLinkedListSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>

        {isLoading || isFetching ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading projects...
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <div className="rounded-full bg-slate-100 p-3">
              <FolderKanban className="h-8 w-8 text-slate-300" aria-hidden />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium text-slate-700">
                {linkedListSearchDebounced.trim()
                  ? "No matching linked projects"
                  : "No projects linked"}
              </p>
              <p className="text-sm text-slate-500 max-w-xs">
                {linkedListSearchDebounced.trim()
                  ? "Try another search term or clear filters."
                  : "Link projects to scope nominations when creating candidates."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="font-medium text-slate-900 truncate">
                      {row.project.title}
                    </p>
                    <p className="text-sm text-slate-500 truncate">
                      {row.project.client?.name ?? "No client"}
                      {!row.isActive ? (
                        <span className="ml-2 text-amber-600">({ProjectStatus.CANCELLED})</span>
                      ) : null}
                    </p>
                    {row.notes?.trim() ? (
                      <p className="flex gap-2 text-xs text-slate-600 leading-snug">
                        <StickyNote
                          className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5"
                          aria-hidden
                        />
                        <span className="line-clamp-3 whitespace-pre-wrap break-words">
                          {row.notes.trim()}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-slate-400 hover:text-destructive hover:bg-destructive/10"
                      disabled={isUnlinking}
                      onClick={() =>
                        setUnlinkTarget({
                          projectId: row.projectId,
                          projectTitle: row.project.title,
                        })
                      }
                      aria-label={`Remove ${row.project.title}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>

            {linkedTotalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-slate-600">
                <span className="tabular-nums">
                  Page {linkedPageCurrent} of {linkedTotalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={linkedPageCurrent <= 1 || isFetching}
                    onClick={() => setLinkedListPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous linked projects page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={
                      linkedPageCurrent >= linkedTotalPages || isFetching
                    }
                    onClick={() =>
                      setLinkedListPage((p) =>
                        Math.min(linkedTotalPages, p + 1),
                      )
                    }
                    aria-label="Next linked projects page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      <ConfirmDialog
        open={unlinkTarget !== null}
        onOpenChange={(open) => {
          if (!open) setUnlinkTarget(null);
        }}
        onConfirm={() => {
          if (unlinkTarget) {
            void handleUnlink(unlinkTarget.projectId);
          }
        }}
        title="Remove linked project?"
        description={
          unlinkTarget
            ? `This will unlink "${unlinkTarget.projectTitle}" from this agent. You can link it again later.`
            : ""
        }
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
      />
    </section>
  );
}
