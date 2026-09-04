import { useEffect, useMemo, useState } from "react";
import { CircleHelp, ListChecks, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PermissionCatalogItem } from "@/features/admin/api/roles";
import {
  getPermissionAccessLabel,
  getPermissionBadgeClassName,
  getPermissionDescription,
  getPermissionDetail,
  getPermissionLabel,
  groupCatalogPermissionsByResource,
} from "@/features/admin/utils/permission-display";

interface RolePermissionPickerProps {
  permissions: PermissionCatalogItem[];
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
  search: string;
  onSearchChange: (value: string) => void;
  readOnly?: boolean;
  disabled?: boolean;
}

function PermissionHelp({
  label,
  detail,
}: {
  label: string;
  detail: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`What ${label} allows`}
          onClick={(event) => event.preventDefault()}
        >
          <CircleHelp className="h-4 w-4" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        align="start"
        className="max-w-xs border border-border bg-popover p-3 text-left text-popover-foreground shadow-md"
      >
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {detail}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export function RolePermissionPicker({
  permissions,
  selectedKeys,
  onChange,
  search,
  onSearchChange,
  readOnly = false,
  disabled = false,
}: RolePermissionPickerProps) {
  const groups = useMemo(
    () => groupCatalogPermissionsByResource(permissions),
    [permissions],
  );

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const label = getPermissionLabel(item.key);
          const description = getPermissionDescription(
            item.key,
            item.description,
          );
          const detail = getPermissionDetail(item.key, item.description);
          return (
            item.key.toLowerCase().includes(query) ||
            label.toLowerCase().includes(query) ||
            description?.toLowerCase().includes(query) ||
            detail.toLowerCase().includes(query) ||
            group.label.toLowerCase().includes(query)
          );
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, search]);

  const [activeGroupId, setActiveGroupId] = useState(
    filteredGroups[0]?.id ?? "",
  );

  useEffect(() => {
    if (filteredGroups.length === 0) {
      setActiveGroupId("");
      return;
    }
    if (!filteredGroups.some((group) => group.id === activeGroupId)) {
      setActiveGroupId(filteredGroups[0].id);
    }
  }, [activeGroupId, filteredGroups]);

  const activeGroup =
    filteredGroups.find((group) => group.id === activeGroupId) ??
    filteredGroups[0];

  const allVisibleKeys = useMemo(
    () => filteredGroups.flatMap((group) => group.items.map((item) => item.key)),
    [filteredGroups],
  );

  const selectedItems = useMemo(
    () =>
      selectedKeys
        .map((key) => permissions.find((item) => item.key === key))
        .filter((item): item is PermissionCatalogItem => Boolean(item)),
    [permissions, selectedKeys],
  );

  const toggleKey = (key: string, checked: boolean) => {
    if (readOnly || disabled) return;
    if (checked) {
      onChange([...new Set([...selectedKeys, key])]);
      return;
    }
    onChange(selectedKeys.filter((item) => item !== key));
  };

  const toggleKeys = (keys: string[], checked: boolean) => {
    if (readOnly || disabled) return;
    onChange(
      checked
        ? [...new Set([...selectedKeys, ...keys])]
        : selectedKeys.filter((key) => !keys.includes(key)),
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        <div className="sticky top-0 z-10 space-y-3 rounded-xl border border-border bg-card/95 p-3 backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold">
                  What can this role do?{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Badge
                  variant="outline"
                  className="rounded-lg bg-muted/40 text-[10px] font-semibold tabular-nums"
                >
                  {selectedKeys.length} selected
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Pick an app area on the left, then tick the actions this person
                should have. Hover the question mark to see what each action
                unlocks.
              </p>
            </div>
            {!readOnly ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  onClick={() => toggleKeys(allVisibleKeys, true)}
                  disabled={disabled || allVisibleKeys.length === 0}
                >
                  Select visible
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onChange([])}
                  disabled={disabled || selectedKeys.length === 0}
                >
                  Clear all
                </Button>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by what they can do, e.g. candidates or reports"
              className="h-10 rounded-xl border-border bg-muted/30 pl-10 pr-10 focus:bg-card"
              aria-label="Search access"
            />
            {search ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-lg"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">See</span> — open
              and look
            </span>
            <span>
              <span className="font-semibold text-foreground">Change</span> —
              add or update
            </span>
            <span>
              <span className="font-semibold text-foreground">Full access</span>{" "}
              — including delete and setup
            </span>
          </div>
        </div>

        {selectedItems.length > 0 ? (
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <div className="mb-2 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground">
                Selected access
              </p>
            </div>
            <div className="max-h-28 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                {selectedItems.map((item) => {
                  const label = getPermissionLabel(item.key);
                  return (
                    <Badge
                      key={item.id}
                      variant="outline"
                      className={cn(
                        "group flex max-w-full items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium",
                        getPermissionBadgeClassName(item.key),
                      )}
                    >
                      <span className="max-w-[220px] truncate">{label}</span>
                      {!readOnly ? (
                        <button
                          type="button"
                          className="ml-0.5 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onClick={() => toggleKey(item.key, false)}
                          aria-label={`Remove ${label}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      ) : null}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {filteredGroups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              No matching access
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a plain word such as candidates, documents, or reports.
            </p>
          </div>
        ) : (
          <div className="grid min-h-[32rem] overflow-hidden rounded-xl border border-border lg:grid-cols-[18rem_minmax(0,1fr)]">
            <nav
              aria-label="App areas"
              className="max-h-[40rem] overflow-y-auto border-b border-border bg-muted/30 lg:border-b-0 lg:border-r"
            >
              {filteredGroups.map((group) => {
                const GroupIcon = group.icon;
                const groupKeys = group.items.map((item) => item.key);
                const selectedCount = groupKeys.filter((key) =>
                  selectedKeys.includes(key),
                ).length;
                const isActive = group.id === activeGroup?.id;

                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setActiveGroupId(group.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0",
                      isActive
                        ? "bg-card text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <GroupIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {group.label}
                        </span>
                        <span className="shrink-0 text-[10px] font-semibold tabular-nums">
                          {selectedCount}/{group.items.length}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>

            {activeGroup ? (
              <div className="flex min-h-0 flex-col bg-card">
                <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {activeGroup.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {activeGroup.description}
                    </p>
                  </div>
                  {!readOnly ? (
                    <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={
                          activeGroup.items.every((item) =>
                            selectedKeys.includes(item.key),
                          )
                            ? true
                            : activeGroup.items.some((item) =>
                                  selectedKeys.includes(item.key),
                                )
                              ? "indeterminate"
                              : false
                        }
                        disabled={disabled}
                        onCheckedChange={(checked) =>
                          toggleKeys(
                            activeGroup.items.map((item) => item.key),
                            checked === true,
                          )
                        }
                        aria-label={`Select all in ${activeGroup.label}`}
                      />
                      Select all
                    </label>
                  ) : null}
                </div>

                <div className="max-h-[34rem] overflow-y-auto p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {activeGroup.items.map((permission) => {
                      const checked = selectedKeys.includes(permission.key);
                      const label = getPermissionLabel(permission.key);
                      const description = getPermissionDescription(
                        permission.key,
                        permission.description,
                      );
                      const detail = getPermissionDetail(
                        permission.key,
                        permission.description,
                      );
                      const access = getPermissionAccessLabel(permission.key);

                      return (
                        <div
                          key={permission.id}
                          className={cn(
                            "flex items-start gap-2.5 rounded-xl border p-3 transition-colors",
                            checked
                              ? "border-border bg-muted/60 shadow-sm"
                              : "border-transparent bg-muted/20 hover:border-border hover:bg-muted/50",
                            (readOnly || disabled) && "opacity-80",
                          )}
                        >
                          <Checkbox
                            id={`perm-${permission.id}`}
                            checked={checked}
                            disabled={readOnly || disabled}
                            className="mt-0.5"
                            onCheckedChange={(next) =>
                              toggleKey(permission.key, next === true)
                            }
                            aria-label={label}
                          />
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <label
                                htmlFor={`perm-${permission.id}`}
                                className={cn(
                                  "min-w-0 cursor-pointer",
                                  (readOnly || disabled) && "cursor-default",
                                )}
                              >
                                <span className="block text-sm font-medium text-foreground">
                                  {label}
                                </span>
                              </label>
                              <PermissionHelp label={label} detail={detail} />
                            </div>
                            {description ? (
                              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                {description}
                              </p>
                            ) : null}
                            <span
                              className={cn(
                                "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                                getPermissionBadgeClassName(permission.key),
                              )}
                            >
                              {access}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
