import React from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Calendar,
  Users,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Project } from "@/services/projectsApi";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/useCan";

interface ProjectCardProps {
  project: Project;
  onView?: (project: Project) => void;
  className?: string;
}

export default function ProjectCard({
  project,
  onView,
  className,
}: ProjectCardProps) {
  const canReadProjects = useCan("read:projects");

  // Calculate deadline status
  const deadline = new Date(project.deadline);
  const now = new Date();
  const daysUntilDeadline = Math.ceil(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  const isOverdue = daysUntilDeadline < 0;
  const isUrgent = daysUntilDeadline <= 7 && daysUntilDeadline >= 0;
  const isWarning = daysUntilDeadline <= 14 && daysUntilDeadline > 7;

  // Calculate total positions needed
  const totalPositions = project.rolesNeeded.reduce(
    (sum, role) => sum + role.quantity,
    0
  );
  const filledPositions = project.candidateProjects.length;
  const openPositions = totalPositions - filledPositions;

  // Get status color and icon
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: CheckCircle,
        };
      case "completed":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: CheckCircle,
        };
      case "cancelled":
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          icon: XCircle,
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: Clock,
        };
    }
  };

  const statusConfig = getStatusConfig(project.status);
  const StatusIcon = statusConfig.icon;

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Card
      className={cn(
        "group hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-l-4 cursor-pointer",
        isOverdue && "border-l-red-500",
        isUrgent && "border-l-orange-500",
        isWarning && "border-l-yellow-500",
        !isOverdue && !isUrgent && !isWarning && "border-l-gray-300",
        className
      )}
    >
      <div onClick={() => onView?.(project)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {project.title}
                </h3>
                <Badge
                  variant="outline"
                  className={cn("text-xs font-medium", statusConfig.color)}
                >
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {project.status}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 truncate">
                  {project.client.name}
                </span>
                {project.team && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-600 truncate">
                      {project.team.name}
                    </span>
                  </>
                )}
              </div>

              {project.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Priority and Deadline */}
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium",
                  getPriorityColor(project.priority)
                )}
              >
                {project.priority} Priority
              </Badge>

              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span
                  className={cn(
                    "text-sm font-medium",
                    isOverdue && "text-red-600",
                    isUrgent && "text-orange-600",
                    isWarning && "text-yellow-600",
                    !isOverdue && !isUrgent && !isWarning && "text-gray-600"
                  )}
                >
                  {isOverdue ? (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Overdue {Math.abs(daysUntilDeadline)} days
                    </span>
                  ) : (
                    formatDistanceToNow(deadline, { addSuffix: true })
                  )}
                </span>
              </div>
            </div>

            {/* Positions and Roles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Positions
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {filledPositions}/{totalPositions} filled
                  </span>
                  {openPositions > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {openPositions} open
                    </Badge>
                  )}
                </div>
              </div>

              {/* Role Requirements */}
              <div className="space-y-1">
                {project.rolesNeeded.slice(0, 3).map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-gray-600 truncate flex-1">
                      {role.designation}
                    </span>
                    <span className="text-gray-800 font-medium">
                      {role.quantity}
                    </span>
                  </div>
                ))}
                {project.rolesNeeded.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{project.rolesNeeded.length - 3} more roles
                  </div>
                )}
              </div>
            </div>

            {/* Created Info */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  Created{" "}
                  {formatDistanceToNow(new Date(project.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <div className="text-xs text-gray-500">
                by {project.creator.name}
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
