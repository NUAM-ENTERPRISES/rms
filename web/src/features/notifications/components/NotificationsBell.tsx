import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  useNotificationsBadge,
  useNotificationsList,
} from "@/features/notifications/hooks";
import NotificationsList from "./NotificationsList";

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);

  // Fetch badge count
  const { data: badgeData, isLoading: badgeLoading } = useNotificationsBadge();

  // Fetch notifications when popover is open
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useNotificationsList({ limit: 10 });

  const unreadCount = badgeData?.data?.unread || 0;
  const notifications = notificationsData?.data?.notifications || [];

  const handleRefresh = () => {
    refetchNotifications();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <Popover open={open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
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
            </PopoverTrigger>
          </TooltipTrigger>

          <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
            <div className="p-3 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} unread
                  </Badge>
                )}
              </div>
            </div>

            <NotificationsList
              notifications={notifications}
              isLoading={notificationsLoading}
              error={notificationsError}
              onRefresh={handleRefresh}
              className="min-h-32"
            />
          </PopoverContent>

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
        </Popover>
      </Tooltip>
    </TooltipProvider>
  );
}
