import { useState, useEffect } from "react";
import { useAppSelector } from "@/app/hooks";
import { BellRing, Eye, FileClock, ClipboardCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGetProcessingRemindersQuery } from "@/services/processingRemindersApi";
import { skipToken } from "@reduxjs/toolkit/query/react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useHasRole } from "@/hooks/useCan";
import { formatDistanceToNow } from "date-fns";

const PAGE_LIMIT = 10;

export function ProcessingRemindersBadge() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { accessToken, user } = useAppSelector((s) => s.auth);
  
  const isProcessingUser = useHasRole("processing") || (!!user && (
    Array.isArray(user.roles)
      ? user.roles.some((r: string) => r.toLowerCase().includes("processing"))
      : typeof (user as any).role === "string" && (user as any).role.toLowerCase().includes("processing")
  ));

  const queryArg = accessToken && isProcessingUser ? { page, limit: PAGE_LIMIT } : skipToken;

  const { data, isLoading, refetch } = useGetProcessingRemindersQuery(queryArg as any, {
    pollingInterval: 300000, // 5 minutes fallback
    refetchOnMountOrArgChange: true,
  });

  // Listen for socket events to refresh and reset to page 1
  useEffect(() => {
    const handleRefresh = () => {
      setPage(1);
      // Only refetch if query has been started (user is authenticated and is processing user)
      if (accessToken && isProcessingUser) {
        try {
          refetch();
        } catch (error) {
          console.warn("Failed to refetch processing reminders:", error);
        }
      }
    };
    window.addEventListener("notifications:refresh", handleRefresh);
    return () => window.removeEventListener("notifications:refresh", handleRefresh);
  }, [refetch, accessToken, isProcessingUser]);

  if (!accessToken || !isProcessingUser) return null;

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  if (isLoading) {
    return (
      <div className="h-10 w-10 flex items-center justify-center">
        <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (total === 0) return null;

  const handleView = (route: string) => {
    navigate(route);
    setOpen(false);
  };

  const getIcon = (stepKey: string) => {
    if (stepKey.includes('hrd')) return <FileClock className="h-4 w-4 text-red-500" />;
    return <ClipboardCheck className="h-4 w-4 text-sky-500" />;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-10 w-10 rounded-full",
            "hover:bg-orange-100/20",
            "transition-all duration-300"
          )}
        >
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-60" />
            <BellRing className={cn("h-5 w-5 relative z-10 text-white animate-pulse")} />
          </div>

          {total > 0 && (
            <Badge
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 rounded-full p-0",
                "flex items-center justify-center text-[10px] font-bold",
                "bg-gradient-to-br from-orange-500 to-red-600 text-white border-none"
              )}
            >
              {total}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-[#0f172a] border-violet-500/30 text-white" align="end">
        <div className="p-3 border-b border-violet-500/20 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Processing Reminders</h3>
          <Badge variant="outline" className="text-[10px] border-violet-500/50 text-violet-300">
            {total} Pending
          </Badge>
        </div>
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              No active reminders
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3 border-b border-violet-500/10 hover:bg-violet-500/10 transition-colors cursor-pointer group"
                onClick={() => handleView(item.route)}
              >
                <div className="flex gap-3">
                  <div className="mt-1">{getIcon(item.stepKey)}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-tight group-hover:text-orange-400 transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {item.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                       <span className="text-[10px] text-gray-500">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-violet-400 hover:text-white p-0">
                        View Details <Eye className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {totalPages > 1 && (
          <div className="p-2 border-t border-violet-500/20 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-7 w-7 p-0 text-violet-400 hover:text-white hover:bg-violet-500/20 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[11px] text-violet-300 font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-7 w-7 p-0 text-violet-400 hover:text-white hover:bg-violet-500/20 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
