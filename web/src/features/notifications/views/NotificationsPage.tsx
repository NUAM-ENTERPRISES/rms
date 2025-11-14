import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Loader2, RefreshCw, CheckCheck, Trash2 } from "lucide-react";
import {
  useNotificationsList,
  useMarkNotificationRead,
  useClearNotifications,
} from "@/features/notifications/hooks";
import { NotificationsList } from "@/features/notifications/components";
import type { QueryNotificationsRequest } from "@/features/notifications/data";

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<"unread" | "all">("unread");
  const [refreshing, setRefreshing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { markAsRead } = useMarkNotificationRead();
  const { clearAll } = useClearNotifications();

  // Query parameters based on active tab
  const queryParams: QueryNotificationsRequest = {
    status: activeTab === "unread" ? "unread" : undefined,
    limit: 20,
  };

  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = useNotificationsList(queryParams);

  const notifications = notificationsData?.data?.notifications || [];
  const hasMore = notificationsData?.data?.pagination?.hasMore || false;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    // TODO: Implement cursor-based pagination
    console.log("Load more notifications");
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(
      (n) => n.status === "unread"
    );
    for (const notification of unreadNotifications) {
      await markAsRead(notification.id);
    }
    await refetch();
  };

  const handleClearAll = async () => {
    await clearAll();
    await refetch();
  };

  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your latest notifications
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}

          {notifications.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowConfirmDialog(true)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear all
            </Button>
          )}

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
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "unread" | "all")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="unread" className="mt-6">
          <NotificationsList
            notifications={notifications.filter((n) => n.status === "unread")}
            isLoading={isLoading}
            error={error}
            onLoadMore={hasMore ? handleLoadMore : undefined}
            hasMore={hasMore}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <NotificationsList
            notifications={notifications}
            isLoading={isLoading}
            error={error}
            onLoadMore={hasMore ? handleLoadMore : undefined}
            hasMore={hasMore}
            onRefresh={handleRefresh}
          />
        </TabsContent>
      </Tabs>

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
    </div>
  );
}
