import { FileText, Edit, Trash2, MoreVertical, ListChecks } from "lucide-react";
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
import { MockInterviewTemplate } from "../../types";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface TemplateCardProps {
  template: MockInterviewTemplate;
  onEdit?: (template: MockInterviewTemplate) => void;
  onDelete?: (id: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function TemplateCard({
  template,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: TemplateCardProps) {
  const navigate = useNavigate();
  const itemCount = template._count?.items || template.items?.length || 0;

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/mock-interviews/templates/${template.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="line-clamp-2">{template.name}</span>
            </CardTitle>
            {template.description && (
              <CardDescription className="text-sm mt-1 line-clamp-2">
                {template.description}
              </CardDescription>
            )}
            {template.role && (
              <CardDescription className="text-xs mt-1">
                {template.role.name}
              </CardDescription>
            )}
          </div>
          {(canEdit || canDelete) && (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(template);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
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
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            <ListChecks className="h-3 w-3 mr-1" />
            {itemCount} {itemCount === 1 ? "Question" : "Questions"}
          </Badge>
          {!template.isActive && (
            <Badge variant="outline" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
