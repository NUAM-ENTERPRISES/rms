import { MessageSquare, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

type DocumentIntakeNoteProps = {
  text: string;
  className?: string;
  /** compact: inline under doc row; default: callout box */
  variant?: "callout" | "compact" | "tooltip";
};

export function DocumentIntakeNote({
  text,
  className,
  variant = "callout",
}: DocumentIntakeNoteProps) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (variant === "tooltip") {
    return (
      <div
        className={cn(
          "mt-1 rounded-md border border-amber-500/40 bg-amber-950/50 px-2 py-1.5",
          className,
        )}
      >
        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
          <StickyNote className="h-3 w-3 shrink-0" aria-hidden />
          Note
        </p>
        <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-amber-50">
          {trimmed}
        </p>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "mt-1.5 flex gap-2 rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-1.5",
          className,
        )}
      >
        <StickyNote
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
            Document note
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-amber-950">
            {trimmed}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mt-2 flex gap-2.5 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 via-amber-50/80 to-orange-50/60 px-2.5 py-2 shadow-sm ring-1 ring-amber-100/80",
        className,
      )}
      role="note"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-800">
        <StickyNote className="h-3.5 w-3.5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
          Document note
        </p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-amber-950">
          {trimmed}
        </p>
      </div>
    </div>
  );
}

type VisitIntakeNoteProps = {
  text: string;
  className?: string;
};

export function VisitIntakeNote({ text, className }: VisitIntakeNoteProps) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  return (
    <div
      className={cn(
        "mt-3 flex gap-2.5 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-white px-3 py-2.5 shadow-sm ring-1 ring-blue-100/80 sm:ml-12",
        className,
      )}
      role="note"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
        <MessageSquare className="h-3.5 w-3.5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
          Visit notes
        </p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-blue-950">
          {trimmed}
        </p>
      </div>
    </div>
  );
}
