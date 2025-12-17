import { useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  useNotificationsBadge,
  useNotificationsList,
  useMarkNotificationRead,
  useClearNotifications,
} from "@/features/notifications/hooks";
import NotificationsList from "./NotificationsList";

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { markAsRead } = useMarkNotificationRead();
  const { clearAll } = useClearNotifications();

  // Fetch badge count
  const { data: badgeData } = useNotificationsBadge();

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

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => n.status === "unread");
    for (const notification of unreadNotifications) {
      await markAsRead(notification.id);
    }
    refetchNotifications();
  };

  const handleClearAll = async () => {
    await clearAll();
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

          <PopoverContent className="w-[420px] p-0 shadow-2xl border-2" align="end" sideOffset={8}>
            <div className="px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-blue-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs px-2.5 py-0.5 shadow-sm">
                      {unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
              {notifications.length > 0 && (
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                      className="h-8 text-xs gap-1 hover:bg-blue-100 flex-1"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all read
                    </Button>
                  )}
                  {/* <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfirmDialog(true)}
                    className="h-8 text-xs gap-1 hover:bg-red-100 text-red-600 border-red-200 flex-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear all
                  </Button> */}
                </div>
              )}
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

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleClearAll}
        title="Clear All Notifications?"
        description="This will permanently delete all your notifications. This action cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        variant="destructive"
      />
    </TooltipProvider>
  );
}
