import { useState } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/features/candidates/components/StatusBadge";

type OperationsReassignedHandoffBadgeProps = {
  note?: string | null;
  operationsStatus?: string | null;
  candidateName?: string;
  className?: string;
};

/** Clickable Operations reassigned badge — opens handoff note dialog. */
export function OperationsReassignedHandoffBadge({
  note,
  operationsStatus,
  candidateName,
  className,
}: OperationsReassignedHandoffBadgeProps) {
  const [open, setOpen] = useState(false);
  const trimmedNote = note?.trim();
  const trimmedStatus = operationsStatus?.trim();

  const title = candidateName?.trim()
    ? `Operations note — ${candidateName.trim()}`
    : "Operations status note";

  const hasStatus = Boolean(trimmedStatus);
  const hasNote = Boolean(trimmedNote);

  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-[10px] font-semibold leading-tight text-green-700 transition-colors hover:bg-green-200/70 hover:text-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/40",
          className,
        )}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="View Operations reassigned note"
      >
        <span>Operations Reassigned</span>
        <span className="shrink-0 text-green-500/70" aria-hidden>
          ·
        </span>
        <FileText className="h-3 w-3 shrink-0" aria-hidden />
        <span className="shrink-0">Note</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="text-base">{title}</DialogTitle>
          </DialogHeader>

          {!hasStatus && !hasNote ? (
            <p className="text-sm text-slate-500">
              No Operations handoff details were recorded for this candidate.
            </p>
          ) : (
            <div className="space-y-3">
              {hasStatus ? (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Operations Status
                  </p>
                  <StatusBadge status={trimmedStatus} />
                </div>
              ) : null}

              {hasNote ? (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Operations Note
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm text-slate-700">
                    {trimmedNote}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
