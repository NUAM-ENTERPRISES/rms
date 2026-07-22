import { useState } from "react";
import { Button } from "@/components/ui/button";
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
      <div className={cn("p-8 text-center bg-card", className)}>
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <span className="text-3xl">⚠️</span>
        </div>
        <p className="text-sm font-medium text-foreground mb-2">
          Failed to load notifications
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-2"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Try Again
        </Button>
      </div>
    );
  }

  if (isLoading && notifications.length === 0) {
    return (
      <div className={cn("p-8 text-center bg-card", className)}>
        <div className="mx-auto mb-3 flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-blue-500/10">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-sm font-medium text-foreground">
          Loading notifications...
        </p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className={cn("p-8 text-center bg-card", className)}>
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <span className="text-3xl">🔔</span>
        </div>
        <p className="text-sm font-semibold text-foreground mb-1">
          No notifications yet
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          We'll notify you when something new arrives
        </p>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col bg-card", className)}>
      <div className="max-h-[500px] overflow-y-auto overflow-x-hidden">
        <div className="space-y-2 p-3">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      </div>

      {hasMore && (
        <div className="p-3 border-t bg-muted">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-2 hover:bg-muted font-medium"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              "Load More Notifications"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
