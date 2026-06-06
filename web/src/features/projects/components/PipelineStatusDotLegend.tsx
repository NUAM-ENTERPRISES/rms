import { cn } from "@/lib/utils";

const PIPELINE_STATUS_LEGEND = [
  { label: "Nominated", dotClass: "bg-purple-400" },
  { label: "Documents", dotClass: "bg-red-400" },
  { label: "Submitted to Client", dotClass: "bg-indigo-400" },
  { label: "Interview", dotClass: "bg-violet-400" },
  { label: "Processing", dotClass: "bg-orange-400" },
  { label: "Training", dotClass: "bg-stone-400" },
  { label: "Deployed", dotClass: "bg-green-400" },
  { label: "Eligible", dotClass: "bg-blue-400" },
] as const;

export function PipelineStatusDotLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1.5 rounded-lg border border-slate-100 bg-white/70 px-3 py-1.5 shadow-sm",
        className,
      )}
      role="list"
      aria-label="Candidate card status colors"
    >
      {PIPELINE_STATUS_LEGEND.map((item) => (
        <span
          key={item.label}
          className="inline-flex shrink-0 items-center gap-1.5"
          role="listitem"
        >
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full ring-1 ring-black/5",
              item.dotClass,
            )}
            aria-hidden
          />
          <span className="text-[10px] font-medium text-slate-500">
            {item.label}
          </span>
        </span>
      ))}
    </div>
  );
}
