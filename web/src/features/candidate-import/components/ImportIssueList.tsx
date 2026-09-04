import { TriangleAlert, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImportIssue } from "../data/dto";

interface ImportIssueListProps {
  issues: ImportIssue[];
  className?: string;
}

/** Renders row findings, errors first, since those are what block an import. */
export function ImportIssueList({ issues, className }: ImportIssueListProps) {
  if (issues.length === 0) return null;

  const ordered = [...issues].sort((left, right) =>
    left.severity === right.severity ? 0 : left.severity === "error" ? -1 : 1,
  );

  return (
    <ul className={cn("space-y-1", className)}>
      {ordered.map((issue, index) => {
        const isError = issue.severity === "error";
        const Icon = isError ? CircleAlert : TriangleAlert;
        return (
          <li
            key={`${issue.type}-${index}`}
            className={cn(
              "flex items-start gap-2 rounded-md px-2 py-1.5 text-xs",
              isError
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
            )}
          >
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{issue.message}</span>
          </li>
        );
      })}
    </ul>
  );
}
