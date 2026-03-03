import { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, Trash2, Loader2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
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
  useNotificationSettings,
} from "@/features/notifications/hooks";
import NotificationsList from "./NotificationsList";
import type { NotificationDto } from "@/features/notifications/data";

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [allNotifications, setAllNotifications] = useState<NotificationDto[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [isAnimating, setIsAnimating] = useState(false);

  const { markAsRead } = useMarkNotificationRead();
  const { clearAll } = useClearNotifications();
  const { muted, toggle } = useNotificationSettings();

  // Fetch badge count
  const { data: badgeData } = useNotificationsBadge();
  const unreadCount = badgeData?.data?.unread || 0;
  const prevUnreadCount = useRef(unreadCount);

  // Animation effect when unread count INCREASES; skip initial mount
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      prevUnreadCount.current = unreadCount;
      firstRun.current = false;
      return;
    }

    if (unreadCount > prevUnreadCount.current) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount]);

  // Fetch notifications when popover is open
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    isFetching: notificationsFetching,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useNotificationsList({ 
    limit: 10, 
    cursor: currentCursor 
  });

  const totalCount = notificationsData?.data?.total || 0;
  const hasMore = notificationsData?.data?.hasMore || false;
  const nextCursor = notificationsData?.data?.nextCursor;

  // Listen for open/refresh events from socket provider
  useEffect(() => {
    const handleForceRefresh = () => {
      handleRefresh();
    };
    const handleOpen = () => {
      setOpen(true);
      handleRefresh();
    };

    window.addEventListener("notifications:refresh", handleForceRefresh);
    window.addEventListener("notifications:open", handleOpen);
    return () => {
      window.removeEventListener("notifications:refresh", handleForceRefresh);
      window.removeEventListener("notifications:open", handleOpen);
    };
  }, []);

  useEffect(() => {
    if (notificationsData?.data?.notifications) {
      if (currentCursor === undefined) {
        setAllNotifications(notificationsData.data.notifications);
      } else {
        setAllNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newOnes = notificationsData.data.notifications.filter(n => !existingIds.has(n.id));
          return [...prev, ...newOnes];
        });
      }
    }
  }, [notificationsData, currentCursor]);

  const handleRefresh = async () => {
    setCurrentCursor(undefined);
    await refetchNotifications();
  };

  const handleLoadMore = () => {
    if (nextCursor && !notificationsFetching) {
      setCurrentCursor(nextCursor);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = allNotifications.filter((n) => n.status === "unread");
    for (const notification of unreadNotifications) {
      await markAsRead(notification.id);
    }
    handleRefresh();
  };

  const handleClearAll = async () => {
    await clearAll();
    handleRefresh();
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
                <Bell className={cn("h-5 w-5 transition-colors", isAnimating && "text-yellow-400 animate-pulse")} />
                {unreadCount > 0 && (
                  <>
                    <Badge
                      variant="destructive"
                      className={cn(
                        "absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center",
                        "text-xs font-bold bg-red-500 text-white",
                        "border-2 border-white shadow-sm transition-transform duration-300",
                        isAnimating ? "scale-125" : "scale-100"
                      )}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                    {isAnimating && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 animate-ping opacity-75 border-2 border-white" />
                    )}
                  </>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>

          <PopoverContent className="w-[420px] p-0 shadow-2xl border-2" align="end" sideOffset={8}>
            <div className="px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-blue-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">Notifications</h3>
                    <button
                      className="p-1 rounded hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle();
                        toast(
                          muted ? "Notifications unmuted" : "Notifications muted",
                          { duration: 1500 }
                        );
                      }}
                      title={muted ? "Unmute notifications" : "Mute notifications"}
                    >
                      {muted ? (
                        <VolumeX className="h-4 w-4 text-gray-600" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                  <Badge className={cn(
                    "text-white text-xs px-2.5 py-0.5 shadow-sm",
                    unreadCount > 0 ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-slate-400"
                  )}>
                    {unreadCount} Unread
                  </Badge>
                  {totalCount > 0 && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      Total: {totalCount}
                    </span>
                  )}
                </div>
              </div>
              {allNotifications.length > 0 && (
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
                </div>
              )}
            </div>

            <NotificationsList
              notifications={allNotifications}
              isLoading={notificationsFetching}
              error={notificationsError}
              onRefresh={handleRefresh}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
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
