import { useEffect, useMemo, useState } from "react";
import { Check, CheckCheck, Users } from "lucide-react";
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
import { useAppSelector } from "@/app/hooks";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useIdleSessionsDismissed } from "@/shared/hooks/useIdleSessionsDismissed";
import { useLazyGetAdminSessionsQuery } from "@/features/admin/api";

const MANAGER_ADMIN_ROLES = ["CEO", "Director", "Manager", "Recruiter Manager", "System Admin"] as const;
const IDLE_POPOVER_LIMIT = 10;

export default function IdleUsersNotification() {
  const { hasRole } = usePermissions();
  const canSee = hasRole([...MANAGER_ADMIN_ROLES]);
  const userId = useAppSelector((s) => s.auth.user?.id);
  const [open, setOpen] = useState(false);

  const [fetchIdleSessions, { data, isFetching, isError }] =
    useLazyGetAdminSessionsQuery();

  useEffect(() => {
    if (!canSee || !open) return;
    void fetchIdleSessions(
      { status: "IDLE", page: 1, limit: IDLE_POPOVER_LIMIT },
      true
    );
  }, [canSee, open, fetchIdleSessions]);

  const sessions = data?.data ?? [];
  const idleTotal = data?.counts?.idle ?? data?.total ?? 0;
  const sessionIdsKey = useMemo(
    () =>
      (data?.data ?? [])
        .map((s) => s.id)
        .slice()
        .sort()
        .join("|"),
    [data?.data]
  );

  const { dismissOne, dismissAll, visibleSessions, syncPrune } =
    useIdleSessionsDismissed(userId);

  useEffect(() => {
    if (!canSee || !userId || isFetching || isError) return;
    const ids = sessionIdsKey
      ? sessionIdsKey.split("|").filter(Boolean)
      : [];
    syncPrune(ids);
  }, [canSee, userId, isFetching, isError, sessionIdsKey, syncPrune]);

  if (!canSee) return null;

  const unreadSessions = visibleSessions(sessions);
  const unreadCount = unreadSessions.length;

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
                aria-label="Idle users"
              >
                <Users className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className={cn(
                      "absolute -top-1 -right-1 h-5 min-w-5 rounded-full p-0 px-1",
                      "text-[10px] font-bold bg-red-500 text-white",
                      "border-2 border-white shadow-sm"
                    )}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>

          <PopoverContent className="w-[380px] p-0 shadow-2xl border-2" align="end" sideOffset={8}>
            <div className="px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-blue-50">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-base text-slate-900 truncate">
                    Idle Users
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Users inactive for 15+ minutes
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {sessions.length > 0 && unreadCount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() =>
                        dismissAll(sessions.map((s) => s.id))
                      }
                      aria-label="Mark all idle users as read"
                    >
                      <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                      <span className="hidden sm:inline">Mark all read</span>
                    </Button>
                  )}
                  <Badge
                    className={cn(
                      "text-white text-xs px-2.5 py-0.5 shadow-sm",
                      unreadCount > 0
                        ? "bg-gradient-to-r from-red-500 to-rose-600"
                        : "bg-slate-400"
                    )}
                  >
                    {idleTotal} Idle
                  </Badge>
                </div>
              </div>
            </div>

            <div className="max-h-[340px] overflow-auto">
              {isError && (
                <div className="p-4 text-sm text-slate-600">
                  Failed to load idle users.
                </div>
              )}

              {!isError && sessions.length === 0 && (
                <div className="p-4 text-sm text-slate-600">
                  {isFetching ? "Loading..." : "No idle users right now."}
                </div>
              )}

              {!isError && sessions.length > 0 && unreadSessions.length === 0 && (
                <div className="p-4 text-sm text-slate-600">
                  All idle alerts marked as read. New idle users will appear
                  here when detected.
                </div>
              )}

              {!isError && unreadSessions.length > 0 && (
                <ul className="divide-y">
                  {unreadSessions.map((s) => (
                    <li key={s.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-slate-900 truncate">
                            {s.userName || s.userEmail || "Unknown user"}
                          </p>
                          {s.userEmail && (
                            <p className="text-xs text-slate-500 truncate">
                              {s.userEmail}
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {s.roles?.slice(0, 2).map((r) => (
                              <span
                                key={r}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"
                              >
                                {r}
                              </span>
                            ))}
                            {s.roles && s.roles.length > 2 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                +{s.roles.length - 2}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start gap-2 shrink-0">
                          <div className="text-right">
                            <p className="text-[11px] font-medium text-slate-700">
                              {s.ipAddress || "—"}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {s.deviceType || "—"}{" "}
                              {s.browser ? `• ${s.browser}` : ""}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-slate-600 hover:text-slate-900"
                            aria-label={`Mark ${s.userName || s.userEmail || "user"} as read`}
                            onClick={() => dismissOne(s.id)}
                          >
                            <Check className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </PopoverContent>

          <TooltipContent
            className={cn(
              "bg-gray-900 text-white border-gray-700",
              "px-2 py-1 text-xs"
            )}
          >
            <p>Idle users {unreadCount > 0 ? `(${unreadCount})` : ""}</p>
          </TooltipContent>
        </Popover>
      </Tooltip>
    </TooltipProvider>
  );
}

