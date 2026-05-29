import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CreReassignedHandoffBadge } from "./CreReassignedHandoffBadge";

export type CandidateListIdentityCellProps = {
  firstName: string;
  lastName: string;
  candidateCode?: string | null;
  currentRole?: string | null;
  isHandledByCRE?: boolean;
  isCREReassigned?: boolean;
  creStatusNote?: string | null;
  creStatusName?: string | null;
  onNameClick?: () => void;
  nameClassName?: string;
  codeClassName?: string;
};

/** Table/list candidate identity: name → code → CRE badges → role. */
export function CandidateListIdentityCell({
  firstName,
  lastName,
  candidateCode,
  currentRole,
  isHandledByCRE = false,
  isCREReassigned = false,
  creStatusNote,
  creStatusName,
  onNameClick,
  nameClassName = "text-sm font-semibold text-gray-900",
  codeClassName = "text-xs text-muted-foreground font-mono",
}: CandidateListIdentityCellProps) {
  const fullName = `${firstName} ${lastName}`.trim();
  const showCreAssigned = isHandledByCRE && !isCREReassigned;
  const showCreReassigned = isCREReassigned;

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      {onNameClick ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNameClick();
          }}
          className={cn(
            "block w-full truncate text-left hover:text-blue-600 hover:underline transition-all duration-200",
            nameClassName,
          )}
        >
          {fullName}
        </button>
      ) : (
        <span className={cn("block truncate", nameClassName)}>{fullName}</span>
      )}

      {candidateCode ? (
        <span className={cn("truncate", codeClassName)}>{candidateCode}</span>
      ) : null}

      {showCreAssigned || showCreReassigned ? (
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {showCreAssigned ? (
            <Badge className="text-[10px] font-semibold px-2 py-0.5 bg-red-100 text-red-700 border border-red-200">
              CRE Assigned
            </Badge>
          ) : null}
          {showCreReassigned ? (
            <CreReassignedHandoffBadge
              note={creStatusNote}
              creStatus={creStatusName}
              candidateName={fullName}
            />
          ) : null}
        </div>
      ) : null}

      {currentRole ? (
        <span className="mt-0.5 truncate text-xs font-medium text-slate-500">
          {currentRole}
        </span>
      ) : null}
    </div>
  );
}
