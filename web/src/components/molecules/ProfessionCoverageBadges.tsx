import { Badge } from "@/components/ui/badge";

export interface ProfessionCoverageBadgesProps {
  scopes?: Array<{
    id: string;
    professionTypeId: string;
    professionType: {
      id: string;
      name: string;
      label: string;
    };
  }>;
  emptyMessage?: string;
}

export function ProfessionCoverageBadges({
  scopes = [],
  emptyMessage = "No profession coverage assigned.",
}: ProfessionCoverageBadgesProps) {
  if (!scopes || scopes.length === 0) {
    return (
      <p className="text-sm text-slate-500">{emptyMessage}</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {scopes.map((scope) => (
        <Badge
          key={scope.id}
          variant="secondary"
          className="bg-blue-50 text-blue-700 border-blue-200"
        >
          {scope.professionType.label}
        </Badge>
      ))}
    </div>
  );
}
