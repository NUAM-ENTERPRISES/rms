import { Edit, Trash2, MoreVertical, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MockInterviewTemplate } from "../../types";
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
  template: MockInterviewTemplate;
  onEdit?: (template: MockInterviewTemplate) => void;
  onDelete?: (id: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  colorScheme?: ColorScheme;
}

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

  // Default color scheme if not provided (inactive/muted)
  const defaultColorScheme: ColorScheme = {
    accent: "from-slate-200 to-slate-300",
    icon: "text-slate-400 dark:text-slate-500",
    iconBg: "bg-slate-50 dark:bg-slate-900/50",
    border: "border-slate-200 dark:border-slate-800",
    questionBadge:
      "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
    roleBadge:
      "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
  };

  const colors = colorScheme || defaultColorScheme;
  const isActive = template.isActive;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border transition-all duration-200 cursor-pointer",
        "bg-white dark:bg-slate-900",
        "hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700",
        isActive
          ? "border-slate-200 dark:border-slate-800"
          : "border-slate-200/50 dark:border-slate-800/50 opacity-70"
      )}
      onClick={() => navigate(`/mock-interviews/templates/${template.id}`)}
    >
      {/* Compact accent line */}
      <div
        className={cn(
          "absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r",
          colors.accent
        )}
      />

      {/* Single compact content block - no header/content separation */}
      <div className="p-2.5">
        {/* Top row: Title and actions */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 leading-snug">
              {template.name}
            </CardTitle>
            {template.description && (
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 leading-tight">
                {template.description}
              </CardDescription>
            )}
          </div>

          {/* Actions menu */}
          {(canEdit || canDelete) && (
            <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 rounded hover:bg-slate-100 dark:hover:bg-slate-800 -mt-0.5"
                  >
                    <MoreVertical className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  {canEdit && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(template);
                      }}
                    >
                      <Edit className="h-3.5 w-3.5 mr-2" />
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
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Bottom row: Badges aligned like the screenshot */}
        <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 flex-wrap">
            {template.role && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-medium border rounded-full px-2 py-0.5 h-5",
                  colors.roleBadge
                )}
              >
                {template.role.name}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-medium border rounded-full px-2 py-0.5 h-5",
                colors.questionBadge
              )}
            >
              <ListChecks className="h-2.5 w-2.5 mr-1" />
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </Badge>
          </div>

          {/* Status indicator - compact dot */}
          <div className="flex-shrink-0">
            {isActive ? (
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
