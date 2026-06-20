import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Eye,
  FolderKanban,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FlagIcon } from "@/shared/components/FlagIcon";
import { cn } from "@/lib/utils";
import {
  useGetCandidateProcessingProjectsQuery,
  type CandidateProcessingProjectItem,
} from "@/features/processing/data/processing.endpoints";

export interface PreviousProcessingProjectsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  currentProcessingId: string;
  candidateName?: string;
}

function getProcessingStatusBadgeClass(status: string) {
  const styles: Record<string, string> = {
    in_progress: "bg-blue-100 text-blue-700 border-blue-200",
    assigned: "bg-indigo-100 text-indigo-700 border-indigo-200",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cancelled: "bg-rose-100 text-rose-700 border-rose-200",
    on_hold: "bg-amber-100 text-amber-700 border-amber-200",
  };
  return styles[status] || "bg-slate-100 text-slate-700 border-slate-200";
}

function getProcessingStatusLabel(status: string) {
  const labels: Record<string, string> = {
    assigned: "Ready for Processing",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    on_hold: "On Hold",
  };
  return labels[status] || status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function ProjectCell({ item }: { item: CandidateProcessingProjectItem }) {
  const country = item.project.country;
  const countryCode = country?.code ?? item.project.countryCode ?? null;
  const countryName = country?.name ?? countryCode ?? null;

  return (
    <div className="flex items-center gap-2 min-w-0">
      {country?.flag ? (
        <span className="text-lg leading-none shrink-0" aria-hidden="true">
          {country.flag}
        </span>
      ) : countryCode ? (
        <FlagIcon
          countryCode={countryCode}
          size="md"
          showFallback={false}
          aria-label={countryName || "Project country flag"}
          className="shrink-0"
        />
      ) : null}
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">{item.project.title}</p>
        {countryName ? (
          <p className="text-[11px] text-slate-500 truncate">{countryName}</p>
        ) : null}
      </div>
    </div>
  );
}

function ProcessingProjectRow({
  item,
  onView,
  showCurrentBadge = false,
}: {
  item: CandidateProcessingProjectItem;
  onView: (processingId: string) => void;
  showCurrentBadge?: boolean;
}) {
  const roleLabel =
    item.role.designation || item.role.roleCatalog?.name || "—";

  return (
    <TableRow className={cn(item.isCurrent && "bg-violet-50/60")}>
      <TableCell>
        <div className="flex items-center gap-2 min-w-0">
          <ProjectCell item={item} />
          {showCurrentBadge ? (
            <Badge className="shrink-0 border-0 bg-violet-100 text-[10px] font-black uppercase tracking-wider text-violet-700">
              Viewing now
            </Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-sm font-semibold text-slate-700">{roleLabel}</TableCell>
      <TableCell>
        <Badge
          className={cn(
            "border text-[10px] font-black uppercase tracking-wider",
            getProcessingStatusBadgeClass(item.processingStatus),
          )}
        >
          {getProcessingStatusLabel(item.processingStatus)}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-slate-600 whitespace-nowrap">
        {format(new Date(item.joinedAt), "MMM d, yyyy")}
      </TableCell>
      <TableCell className="text-center">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 w-9 p-0 hover:bg-violet-100 hover:text-violet-700 rounded-full"
          aria-label={`View processing details for ${item.project.title}`}
          onClick={() => onView(item.id)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ProjectsTable({
  items,
  onView,
  showCurrentBadge = false,
  emptyMessage,
}: {
  items: CandidateProcessingProjectItem[];
  onView: (processingId: string) => void;
  showCurrentBadge?: boolean;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
        <p className="text-sm font-medium text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50 hover:bg-slate-50">
          <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Project
          </TableHead>
          <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Nominated Role
          </TableHead>
          <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Processing Status
          </TableHead>
          <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Joined Date
          </TableHead>
          <TableHead className="w-[72px] text-center text-xs font-bold uppercase tracking-wider text-slate-700">
            View
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <ProcessingProjectRow
            key={item.id}
            item={item}
            onView={onView}
            showCurrentBadge={showCurrentBadge}
          />
        ))}
      </TableBody>
    </Table>
  );
}

export function PreviousProcessingProjectsModal({
  open,
  onOpenChange,
  candidateId,
  currentProcessingId,
  candidateName,
}: PreviousProcessingProjectsModalProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isFetching, error } =
    useGetCandidateProcessingProjectsQuery(
      {
        candidateId,
        currentProcessingId,
        page,
        limit,
      },
      { skip: !candidateId || !open },
    );

  useEffect(() => {
    if (open) {
      setPage(1);
    }
  }, [open, candidateId, currentProcessingId]);

  const response = data?.data;
  const items = response?.items ?? [];
  const pagination = response?.pagination;
  const total = pagination?.total ?? 0;
  const totalPages =
    pagination?.totalPages ?? pagination?.pages ?? Math.max(1, Math.ceil(total / limit));

  const currentProjects = useMemo(
    () => items.filter((item) => item.isCurrent),
    [items],
  );
  const previousProjects = useMemo(
    () => items.filter((item) => !item.isCurrent),
    [items],
  );

  const handleView = (processingId: string) => {
    onOpenChange(false);
    if (processingId !== currentProcessingId) {
      navigate(`/processingCandidateDetails/${processingId}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex !max-h-[88vh] !w-[95vw] !max-w-5xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-black">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <FolderKanban className="h-5 w-5 text-white" />
            </div>
            Previous Projects Processing
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {candidateName
              ? `Processing nominations for ${candidateName}`
              : "Review current and past processing project nominations"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">
              Failed to load processing projects.
            </div>
          ) : (
            <>
              {currentProjects.length > 0 ? (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-violet-600" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">
                      Current Project
                    </h3>
                  </div>
                  <ProjectsTable
                    items={currentProjects}
                    onView={handleView}
                    showCurrentBadge
                  />
                </section>
              ) : null}

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">
                    Previous Projects
                  </h3>
                  {response?.summary?.previousProjectsCount ? (
                    <Badge className="border-0 bg-slate-100 text-xs font-bold text-slate-600">
                      {response.summary.previousProjectsCount}
                    </Badge>
                  ) : null}
                </div>
                <ProjectsTable
                  items={previousProjects}
                  onView={handleView}
                  emptyMessage="No previous processing projects for this candidate."
                />
              </section>
            </>
          )}
        </div>

        {!isLoading && !error && total > 0 ? (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <p className="text-xs text-slate-500">
              Showing {(page - 1) * limit + (items.length ? 1 : 0)} -{" "}
              {(page - 1) * limit + items.length} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <span className="text-sm text-slate-600">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
