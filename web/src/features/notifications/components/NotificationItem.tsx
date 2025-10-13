import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const handleClick = async () => {
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

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start p-4 h-auto text-left",
        "hover:bg-muted/50 transition-colors",
        notification.status === "unread" && "bg-muted/30"
      )}
      onClick={handleClick}
    >
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm leading-tight">
              {notification.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {notification.message}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {notification.status === "unread" && (
              <Badge variant="secondary" className="text-xs">
                New
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
        </div>
      </div>
    </Button>
  );
}
