import {
  Edit,
  Trash2,
  MoreVertical,
  ListChecks,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScreeningTemplate } from "../../types";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export interface ColorScheme {
  accent: string;
  icon: string;
  iconBg: string;
  border: string;
  questionBadge: string;
  roleBadge: string;
}

interface TemplateCardProps {
  template: ScreeningTemplate;
  onEdit?: (template: ScreeningTemplate) => void;
  onDelete?: (id: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  colorScheme?: ColorScheme;
}

const DEFAULT_COLORS: ColorScheme = {
  accent: "bg-muted-300",
  icon: "text-muted-foreground",
  iconBg: "bg-muted",
  border: "border-border",
  questionBadge: "border-border bg-muted/60 text-muted-foreground",
  roleBadge: "border-border bg-muted/60 text-muted-foreground",
};

export function TemplateCard({
  template,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  colorScheme,
}: TemplateCardProps) {
  const navigate = useNavigate();
  const itemCount = template._count?.items || template.items?.length || 0;
  const colors = colorScheme || DEFAULT_COLORS;
  const isActive = template.isActive;
  const roleLabel = template.role?.label || template.role?.name;
  const departmentLabel = template.role?.roleDepartment?.name;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/screenings/templates/${template.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/screenings/templates/${template.id}`);
        }
      }}
      className={cn(
        "group relative flex h-full cursor-pointer flex-col overflow-hidden border bg-card shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive ? colors.border : "border-border/60 opacity-75",
      )}
    >
      <div className={cn("h-1 w-full", colors.accent)} />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <span
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
                colors.iconBg,
                colors.icon,
              )}
            >
              <FileText className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                {template.name}
              </h3>
              {template.description ? (
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {template.description}
                </p>
              ) : null}
            </div>
          </div>

          {(canEdit || canDelete) && (
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="shrink-0"
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted"
                    aria-label={`Actions for ${template.name}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {canEdit && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(template);
                      }}
                    >
                      <Edit className="mr-2 h-3.5 w-3.5" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(template.id);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          {roleLabel ? (
            <Badge
              variant="outline"
              className={cn(
                "max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-medium",
                colors.roleBadge,
              )}
              title={roleLabel}
            >
              {roleLabel}
            </Badge>
          ) : null}
          {departmentLabel ? (
            <Badge
              variant="outline"
              className="max-w-full truncate rounded-full border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              title={departmentLabel}
            >
              {departmentLabel}
            </Badge>
          ) : null}
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              colors.questionBadge,
            )}
          >
            <ListChecks className="mr-1 h-2.5 w-2.5" aria-hidden />
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </Badge>

          <div className="ml-auto flex items-center gap-2">
            {isActive ? (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-medium text-success-700"
                title="Active"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Active
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"
                title="Inactive"
              >
                <span className="h-2 w-2 rounded-full bg-muted-300" />
                Inactive
              </span>
            )}
            <ArrowUpRight
              className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
