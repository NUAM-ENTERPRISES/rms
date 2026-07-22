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
  emptyMessage?: string;
}

function sectorLabel(sector?: "HEALTHCARE" | "NON_HEALTH_CARE" | null) {
  if (sector === "HEALTHCARE") return "Healthcare";
  if (sector === "NON_HEALTH_CARE") return "Non-healthcare";
  return null;
}

export function ProfessionCoverageBadges({
  scopes = [],
  emptyMessage = "No profession coverage assigned.",
}: ProfessionCoverageBadgesProps) {
  if (!scopes || scopes.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {scopes.map((scope) => {
        const sector = sectorLabel(scope.professionType.sector);
        return (
          <Badge
            key={scope.id}
            variant="secondary"
            className="border-blue-200 bg-blue-50 text-blue-700"
          >
            {scope.professionType.label}
            {sector ? (
              <span className="ml-1 font-normal text-blue-500/80">
                · {sector}
              </span>
            ) : null}
          </Badge>
        );
      })}
    </div>
  );
}
