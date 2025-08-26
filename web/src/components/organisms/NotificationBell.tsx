import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  unreadCount?: number;
  onClick?: () => void;
}

export default function NotificationBell({
  unreadCount = 0,
  onClick,
}: NotificationBellProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "relative h-9 w-9 rounded-md transition-all duration-200",
              "text-white hover:text-white",
              "hover:bg-white/10 focus:bg-white/15",
              "focus:outline-none focus:ring-2 focus:ring-white/20",
              "active:bg-white/20"
            )}
            onClick={onClick}
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className={cn(
                  "absolute -top-1 -right-1 h-5 w-5 rounded-full p-0",
                  "text-xs font-medium bg-red-500 text-white",
                  "border-2 border-white shadow-sm"
                )}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent 
          className={cn(
            "bg-gray-900 text-white border-gray-700",
            "px-2 py-1 text-xs"
          )}
        >
          <p>
            Notifications {unreadCount > 0 ? `(${unreadCount} unread)` : ""}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
