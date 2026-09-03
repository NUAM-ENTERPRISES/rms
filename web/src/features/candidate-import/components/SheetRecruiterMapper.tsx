import { useState } from "react";
import { CircleCheck, TriangleAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecruiterCombobox } from "./RecruiterCombobox";
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
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-muted p-2">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Sheet owners
            </h2>
            <p className="text-xs text-muted-foreground">
              Assign a recruiter to each worksheet tab
            </p>
          </div>
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

      <ul className="space-y-3">
        {sheetOwners.map((owner) => {
          const selected = draft[owner.sheetName] ?? "";
          const selectId = `sheet-owner-${owner.sheetName}`;
          return (
            <li
              key={owner.sheetName}
              className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-[10rem_1fr] sm:items-start"
            >
              <div className="flex min-w-0 items-center gap-1.5 pt-2 text-sm text-foreground">
                {selected ? (
                  <CircleCheck
                    className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                ) : (
                  <TriangleAlert
                    className="h-3.5 w-3.5 shrink-0 text-amber-600"
                    aria-hidden="true"
                  />
                )}
                <span className="truncate font-medium">{owner.sheetName}</span>
              </div>
              <div className="min-w-0 space-y-1">
                <RecruiterCombobox
                  id={selectId}
                  label=""
                  recruiters={recruiters}
                  value={selected}
                  disabled={isSaving}
                  placeholder="Choose recruiter"
                  onValueChange={(value) =>
                    setDraft((previous) => ({
                      ...previous,
                      [owner.sheetName]: value,
                    }))
                  }
                  className={!selected ? "[&_button]:border-amber-500/60" : undefined}
                />
                {owner.match === "ambiguous" ? (
                  <p className="text-xs text-muted-foreground">
                    Several recruiters matched this tab
                  </p>
                ) : null}
              </div>
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
