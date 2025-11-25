import { FileText, Edit, Trash2, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MockInterviewChecklistTemplate } from "../../types";
import { cn } from "@/lib/utils";

interface TemplateCardProps {
  template: MockInterviewChecklistTemplate;
  onEdit?: (template: MockInterviewChecklistTemplate) => void;
  onDelete?: (id: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const categoryColors: Record<string, string> = {
  technical_skills: "bg-blue-100 text-blue-800",
  communication: "bg-green-100 text-green-800",
  professionalism: "bg-purple-100 text-purple-800",
  role_specific: "bg-orange-100 text-orange-800",
};

const categoryLabels: Record<string, string> = {
  technical_skills: "Technical Skills",
  communication: "Communication",
  professionalism: "Professionalism",
  role_specific: "Role Specific",
};

export function TemplateCard({
  template,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: TemplateCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="line-clamp-1">{template.criterion}</span>
            </CardTitle>
            {template.role && (
              <CardDescription className="text-xs mt-1">
                {template.role.designation}
              </CardDescription>
            )}
          </div>
          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit?.(template)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete?.(template.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn("text-xs", categoryColors[template.category])}
          >
            {categoryLabels[template.category] || template.category}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Order: {template.order}
          </span>
        </div>
        {!template.isActive && (
          <Badge variant="outline" className="text-xs bg-zinc-100">
            Inactive
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
