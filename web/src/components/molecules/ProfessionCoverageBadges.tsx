import { Badge } from "@/components/ui/badge";

export interface ProfessionCoverageBadgesProps {
  scopes?: Array<{
    id: string;
    professionTypeId: string;
    professionType: {
      id: string;
      name: string;
      label: string;
      sector?: "HEALTHCARE" | "NON_HEALTH_CARE" | null;
    };
  }>;
  handlesAllProfessions?: boolean;
  recruiterSectorScope?: "HEALTHCARE" | "NON_HEALTH_CARE" | "BOTH" | null;
  emptyMessage?: string;
}

function sectorLabel(sector?: "HEALTHCARE" | "NON_HEALTH_CARE" | "BOTH" | null) {
  if (sector === "HEALTHCARE") return "Healthcare";
  if (sector === "NON_HEALTH_CARE") return "Non-healthcare";
  if (sector === "BOTH") return "All professions";
  return null;
}

export function ProfessionCoverageBadges({
  scopes = [],
  handlesAllProfessions = false,
  recruiterSectorScope,
  emptyMessage = "No profession coverage assigned.",
}: ProfessionCoverageBadgesProps) {
  if (handlesAllProfessions) {
    const scopeLabel = sectorLabel(recruiterSectorScope) ?? "All professions";
    return (
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">Any · {scopeLabel}</Badge>
      </div>
    );
  }

  if (!scopes || scopes.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {scopes.map((scope) => {
        const sector = sectorLabel(scope.professionType.sector);
        return (
          <Badge key={scope.id} variant="secondary">
            {scope.professionType.label}
            {sector ? (
              <span className="ml-1 font-normal text-muted-foreground">
                · {sector}
              </span>
            ) : null}
          </Badge>
        );
      })}
    </div>
  );
}
