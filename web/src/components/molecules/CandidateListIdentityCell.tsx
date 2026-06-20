import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OperationsReassignedHandoffBadge } from "./OperationsReassignedHandoffBadge";

export type CandidateListIdentityCellProps = {
  firstName: string;
  lastName: string;
  candidateCode?: string | null;
  currentRole?: string | null;
  isHandledByOperations?: boolean;
  isOperationsReassigned?: boolean;
  operationsStatusNote?: string | null;
  operationsStatusName?: string | null;
  onNameClick?: () => void;
  nameClassName?: string;
  codeClassName?: string;
};

/** Table/list candidate identity: name → code → Operations badges → role. */
export function CandidateListIdentityCell({
  firstName,
  lastName,
  candidateCode,
  currentRole,
  isHandledByOperations = false,
  isOperationsReassigned = false,
  operationsStatusNote,
  operationsStatusName,
  onNameClick,
  nameClassName = "text-sm font-semibold text-gray-900",
  codeClassName = "text-xs text-muted-foreground font-mono",
}: CandidateListIdentityCellProps) {
  const fullName = `${firstName} ${lastName}`.trim();
  const showOperationsAssigned =
    isHandledByOperations && !isOperationsReassigned;
  const showOperationsReassigned = isOperationsReassigned;

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

      {showOperationsAssigned || showOperationsReassigned ? (
        <div className="mt-0.5 flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
          {showOperationsAssigned ? (
            <Badge className="max-w-full whitespace-normal text-center text-[10px] font-semibold leading-tight px-2 py-0.5 bg-red-100 text-red-700 border border-red-200">
              Operations Assigned
            </Badge>
          ) : null}
          {showOperationsReassigned ? (
            <OperationsReassignedHandoffBadge
              note={operationsStatusNote}
              operationsStatus={operationsStatusName}
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
