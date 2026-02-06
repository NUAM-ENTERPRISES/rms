import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  User,
  CheckCircle,
  XCircle,
  Clock,
  CheckCircle2,
  UserCheck,
  Star,
} from "lucide-react";
import { useStatusConfig } from "../hooks/useStatusConfig";

interface StatusBadgeProps {
  status?: string;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const { statusConfig } = useStatusConfig();
  const safeStatus = status || "unknown";
  const config = statusConfig[safeStatus];

  if (!config) {
    return (
      <Badge className="bg-gray-100 text-gray-800 border-gray-200 border gap-1 px-2 py-1">
        <AlertTriangle className="h-3 w-3" />
        {label || safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
      </Badge>
    );
  }

  // Map icon names to actual components
  const iconMap: Record<string, any> = {
    User: User,
    ThumbsUp: CheckCircle,
    XCircle: XCircle,
    MessageCircle: Clock,
    Clock: Clock,
    Pause: Clock,
    PhoneOff: XCircle,
    CheckCircle: CheckCircle2,
    UserPlus: UserCheck,
    UserCheck: UserCheck,
    Users: UserCheck,
    Star: Star,
    Cog: Clock,
    BadgeCheck: CheckCircle2,
  };

  const Icon = iconMap[config.icon] || AlertTriangle;

  return (
    <Badge className={`${config.badgeClass} border gap-1 px-2 py-1`}>
      <Icon className="h-3 w-3" />
      {label || config.label}
    </Badge>
  );
};
