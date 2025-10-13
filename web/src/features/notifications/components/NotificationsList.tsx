import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationItem from "./NotificationItem";
import type { NotificationDto } from "@/features/notifications/data";

interface NotificationsListProps {
  notifications: NotificationDto[];
  isLoading?: boolean;
  error?: unknown;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export default function NotificationsList({
  notifications,
  isLoading,
  error,
  onLoadMore,
  hasMore,
  onRefresh,
  className,
}: NotificationsListProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  };

  if (error) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <p className="text-sm text-muted-foreground mb-2">
          Failed to load notifications
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading && notifications.length === 0) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Loading notifications...
        </p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <p className="text-sm text-muted-foreground mb-2">
          No notifications yet
        </p>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <ScrollArea className="flex-1 max-h-96">
        <div className="space-y-1 p-2">
          {notifications.map((notification, index) => (
            <div key={notification.id}>
              <NotificationItem notification={notification} />
              {index < notifications.length - 1 && (
                <Separator className="my-1" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {hasMore && (
        <div className="p-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
