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
      <div className={cn("p-8 text-center bg-white", className)}>
        <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl">⚠️</span>
        </div>
        <p className="text-sm font-medium text-slate-900 mb-2">
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
      <div className={cn("p-8 text-center bg-white", className)}>
        <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3 animate-pulse">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-700">
          Loading notifications...
        </p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className={cn("p-8 text-center bg-white", className)}>
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl">🔔</span>
        </div>
        <p className="text-sm font-semibold text-slate-900 mb-1">
          No notifications yet
        </p>
        <p className="text-xs text-slate-500 mb-3">
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
    <div className={cn("flex flex-col bg-white", className)}>
      <div className="max-h-[500px] overflow-y-auto overflow-x-hidden">
        <div className="space-y-2 p-3">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      </div>

      {hasMore && (
        <div className="p-3 border-t bg-slate-50">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-2 hover:bg-white font-medium"
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
