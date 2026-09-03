import { useState } from "react";
import { CircleCheck, TriangleAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { RecruiterOption, SheetOwnerSuggestion } from "../data/dto";

interface SheetRecruiterMapperProps {
  sheetOwners: SheetOwnerSuggestion[];
  recruiters: RecruiterOption[];
  onSave: (owners: Record<string, string>) => void;
  isSaving?: boolean;
}

/**
 * Lets a manager say who owns each worksheet tab.
 *
 * The backend has already fuzzy-matched tab names against real recruiters, so
 * this is usually a confirmation step; only ambiguous or unmatched tabs start
 * empty and genuinely need a decision.
 */
export function SheetRecruiterMapper({
  sheetOwners,
  recruiters,
  onSave,
  isSaving,
}: SheetRecruiterMapperProps) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      sheetOwners
        .filter((owner) => owner.recruiterId)
        .map((owner) => [owner.sheetName, owner.recruiterId as string]),
    ),
  );

  const unresolved = sheetOwners.filter((owner) => !draft[owner.sheetName]);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">
            Sheet owners
          </h2>
        </div>
        {unresolved.length > 0 ? (
          <Badge
            variant="secondary"
            className="border-0 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          >
            {unresolved.length} need a decision
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="border-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          >
            All assigned
          </Badge>
        )}
      </header>

      <p className="mb-3 text-xs text-muted-foreground">
        Tab names are matched against recruiter accounts. Anything ambiguous is
        left blank on purpose so it is assigned deliberately.
      </p>

      <ul className="space-y-2">
        {sheetOwners.map((owner) => {
          const selected = draft[owner.sheetName] ?? "";
          const selectId = `sheet-owner-${owner.sheetName}`;
          return (
            <li
              key={owner.sheetName}
              className="flex flex-wrap items-center gap-2"
            >
              <label
                htmlFor={selectId}
                className="flex min-w-[9rem] items-center gap-1.5 text-sm text-foreground"
              >
                {selected ? (
                  <CircleCheck
                    className="h-3.5 w-3.5 text-emerald-600"
                    aria-hidden="true"
                  />
                ) : (
                  <TriangleAlert
                    className="h-3.5 w-3.5 text-amber-600"
                    aria-hidden="true"
                  />
                )}
                <span className="truncate">{owner.sheetName}</span>
              </label>
              <Select
                value={selected}
                onValueChange={(value) =>
                  setDraft((previous) => ({
                    ...previous,
                    [owner.sheetName]: value,
                  }))
                }
              >
                <SelectTrigger
                  id={selectId}
                  className={cn(
                    "h-9 w-64",
                    !selected && "border-amber-500/60",
                  )}
                >
                  <SelectValue placeholder="Choose recruiter" />
                </SelectTrigger>
                <SelectContent>
                  {recruiters.map((recruiter) => (
                    <SelectItem key={recruiter.id} value={recruiter.id}>
                      {recruiter.name} ({recruiter.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {owner.match === "ambiguous" ? (
                <span className="text-xs text-muted-foreground">
                  Several recruiters matched this tab
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={() => onSave(draft)}
          disabled={isSaving || Object.keys(draft).length === 0}
        >
          {isSaving ? "Applying..." : "Apply owners"}
        </Button>
      </div>
    </section>
  );
}
