import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarkNotificationRead } from "@/features/notifications/hooks";
import type { NotificationDto } from "@/features/notifications/data";

interface NotificationItemProps {
  notification: NotificationDto;
  onMarkAsRead?: () => void;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const navigate = useNavigate();
  const { markAsRead } = useMarkNotificationRead();

  const handleClick = async (e: React.MouseEvent) => {
    // Don't trigger if clicking the mark as read button
    if ((e.target as HTMLElement).closest('button[data-mark-read]')) {
      return;
    }

    // Mark as read if unread
    if (notification.status === "unread") {
      await markAsRead(notification.id);
      onMarkAsRead?.();
    }

    // Navigate if link exists
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.status === "unread") {
      await markAsRead(notification.id);
      onMarkAsRead?.();
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  const isUnread = notification.status === "unread";

  return (
    <div
      className={cn(
        "relative p-4 rounded-lg border transition-all duration-200 cursor-pointer group",
        isUnread
          ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300 hover:shadow-md"
          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
      )}
      onClick={handleClick}
    >
      {/* Unread Indicator */}
      {isUnread && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-l-lg" />
      )}

      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
          isUnread
            ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md"
            : "bg-slate-100"
        )}>
          <Bell className={cn(
            "h-5 w-5",
            isUnread ? "text-white" : "text-slate-500"
          )} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "font-semibold text-sm leading-tight",
              isUnread ? "text-slate-900" : "text-slate-700"
            )}>
              {notification.title}
            </h4>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isUnread && (
                <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs px-2 shadow-sm">
                  New
                </Badge>
              )}
              {isUnread && (
                <Button
                  data-mark-read
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAsRead}
                  className="h-7 w-7 p-0 hover:bg-green-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Mark as read"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
              )}
            </div>
          </div>
          
          <p className={cn(
            "text-xs leading-relaxed line-clamp-2",
            isUnread ? "text-slate-700" : "text-slate-500"
          )}>
            {notification.message}
          </p>
          
          <div className="flex items-center gap-1 text-xs text-slate-500 pt-1">
            <Clock className="h-3 w-3" />
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
