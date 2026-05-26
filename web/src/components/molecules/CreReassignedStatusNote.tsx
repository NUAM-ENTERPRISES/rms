import { useState } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type CreReassignedStatusNoteProps = {
  note?: string | null;
  candidateName?: string;
  className?: string;
};

export function CreReassignedStatusNote({
  note,
  candidateName,
  className,
}: CreReassignedStatusNoteProps) {
  const [open, setOpen] = useState(false);
  const trimmed = note?.trim();
  if (!trimmed) return null;

  const title = candidateName?.trim()
    ? `CRE note — ${candidateName.trim()}`
    : "CRE status note";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "h-5 gap-1 rounded-full border-emerald-200 bg-emerald-50 px-2 py-0 text-[10px] font-semibold text-emerald-800 shadow-none hover:bg-emerald-100 hover:text-emerald-900",
          className,
        )}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="View CRE status note"
      >
        <FileText className="h-3 w-3 shrink-0" aria-hidden />
        Note
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="text-base">{title}</DialogTitle>
            <DialogDescription className="sr-only">
              Status note from CRE when this candidate was reassigned to you.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-3">
            <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
              {trimmed}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
