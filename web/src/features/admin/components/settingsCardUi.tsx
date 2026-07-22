import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { Edit, RefreshCw, Save, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui";
import { cn } from "@/lib/utils";

export type SettingsAccent =
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger";

const accentConfig: Record<
  SettingsAccent,
  {
    bar: string;
    iconWrap: string;
    icon: string;
    stat: string;
    panel: string;
    panelLabel: string;
    button: string;
    callout: string;
    calloutText: string;
    calloutIcon: string;
  }
> = {
  primary: {
    bar: "from-primary-500 to-primary-600",
    iconWrap: "bg-primary-100 dark:!bg-muted/40",
    icon: "text-primary-600 dark:text-primary-400",
    stat: "border-primary-200/80 bg-primary-50/50 dark:!border-border dark:!bg-muted/30",
    panel: "border-primary-200/60 bg-primary-50/30 dark:!border-border dark:!bg-muted/20",
    panelLabel: "text-primary-700 dark:text-primary-300",
    button:
      "bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-500",
    callout: "border-primary-200/60 bg-primary-50/40 dark:!border-border dark:!bg-muted/25",
    calloutText: "text-primary-800 dark:text-primary-200",
    calloutIcon: "text-primary-600 dark:text-primary-400",
  },
  accent: {
    bar: "from-accent-500 to-accent-600",
    iconWrap: "bg-accent-100 dark:!bg-muted/40",
    icon: "text-accent-600 dark:text-accent-400",
    stat: "border-accent-200/80 bg-accent-50/50 dark:!border-border dark:!bg-muted/30",
    panel: "border-accent-200/60 bg-accent-50/30 dark:!border-border dark:!bg-muted/20",
    panelLabel: "text-accent-700 dark:text-accent-300",
    button:
      "bg-accent-600 hover:bg-accent-700 dark:bg-accent-600 dark:hover:bg-accent-500",
    callout: "border-accent-200/60 bg-accent-50/40 dark:!border-border dark:!bg-muted/25",
    calloutText: "text-accent-800 dark:text-accent-200",
    calloutIcon: "text-accent-600 dark:text-accent-400",
  },
  success: {
    bar: "from-success-500 to-success-600",
    iconWrap: "bg-success-100 dark:!bg-muted/40",
    icon: "text-success-600 dark:text-success-400",
    stat: "border-success-200/80 bg-success-50/50 dark:!border-border dark:!bg-muted/30",
    panel: "border-success-200/60 bg-success-50/30 dark:!border-border dark:!bg-muted/20",
    panelLabel: "text-success-700 dark:text-success-300",
    button:
      "bg-success-600 hover:bg-success-700 dark:bg-success-600 dark:hover:bg-success-500",
    callout: "border-success-200/60 bg-success-50/40 dark:!border-border dark:!bg-muted/25",
    calloutText: "text-success-800 dark:text-success-200",
    calloutIcon: "text-success-600 dark:text-success-400",
  },
  warning: {
    bar: "from-amber-500 to-amber-600",
    iconWrap: "bg-amber-100 dark:!bg-muted/40",
    icon: "text-amber-600 dark:text-amber-400",
    stat: "border-amber-200/80 bg-amber-50/50 dark:!border-border dark:!bg-muted/30",
    panel: "border-amber-200/60 bg-amber-50/30 dark:!border-border dark:!bg-muted/20",
    panelLabel: "text-amber-700 dark:text-amber-300",
    button: "bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500",
    callout: "border-amber-200/60 bg-amber-50/40 dark:!border-border dark:!bg-muted/25",
    calloutText: "text-amber-800 dark:text-amber-200",
    calloutIcon: "text-amber-600 dark:text-amber-400",
  },
  danger: {
    bar: "from-danger-500 to-danger-600",
    iconWrap: "bg-danger-100 dark:!bg-muted/40",
    icon: "text-danger-600 dark:text-danger-400",
    stat: "border-danger-200/80 bg-danger-50/50 dark:!border-border dark:!bg-muted/30",
    panel: "border-danger-200/60 bg-danger-50/30 dark:!border-border dark:!bg-muted/20",
    panelLabel: "text-danger-700 dark:text-danger-300",
    button: "bg-danger-600 hover:bg-danger-700 dark:bg-danger-600 dark:hover:bg-danger-500",
    callout: "border-danger-200/60 bg-danger-50/40 dark:!border-border dark:!bg-muted/25",
    calloutText: "text-danger-800 dark:text-danger-200",
    calloutIcon: "text-danger-600 dark:text-danger-400",
  },
};

export const settingsFieldClass =
  "bg-card dark:!bg-muted/15 dark:!border-border";

export function formatAssignmentStrategy(strategy: string): string {
  return strategy
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function SettingsLoadingCard({ label }: { label: string }) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm dark:bg-card dark:shadow-none">
      <CardContent className="flex items-center justify-center py-20">
        <div className="space-y-4 text-center">
          <LoadingSpinner className="mx-auto h-10 w-10" />
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

type SettingsCardShellProps = {
  accent: SettingsAccent;
  icon: LucideIcon;
  title: string;
  description: string;
  canManage: boolean;
  isEditing: boolean;
  editLabel?: string;
  onEdit?: () => void;
  onRefresh?: () => void;
  isFetching?: boolean;
  showRefresh?: boolean;
  viewOnlyMessage?: string;
  children: ReactNode;
};

export function SettingsCardShell({
  accent,
  icon: Icon,
  title,
  description,
  canManage,
  isEditing,
  editLabel = "Edit Settings",
  onEdit,
  onRefresh,
  isFetching = false,
  showRefresh = true,
  viewOnlyMessage,
  children,
}: SettingsCardShellProps) {
  const styles = accentConfig[accent];
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || card.offsetParent === null) return;

    const logSurfaces = () => {
      const panel = card.querySelector<HTMLElement>("[data-debug-panel]");
      const iconWrap = card.querySelector<HTMLElement>("[data-debug-icon-wrap]");
      const stat = card.querySelector<HTMLElement>("[data-debug-stat]");
      const isDark = document.documentElement.classList.contains("dark");
      const cardBg = getComputedStyle(card).backgroundColor;
      const panelBg = panel ? getComputedStyle(panel).backgroundColor : null;
      const iconBg = iconWrap ? getComputedStyle(iconWrap).backgroundColor : null;
      const statBg = stat ? getComputedStyle(stat).backgroundColor : null;

      // #region agent log
      fetch("http://127.0.0.1:7578/ingest/70912b05-e68c-4f9a-9177-0cf0ac2648f6", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "e1db97",
        },
        body: JSON.stringify({
          sessionId: "e1db97",
          runId: "post-fix-2",
          hypothesisId: "H1",
          location: "settingsCardUi.tsx:SettingsCardShell",
          message: "Visible card computed surface colors",
          data: { title, isDark, cardBg, panelBg, iconBg, statBg },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    };

    requestAnimationFrame(() => requestAnimationFrame(logSurfaces));
  }, [title]);

  return (
    <Card
      ref={cardRef}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm dark:bg-card dark:shadow-none"
    >
      <div className={cn("h-1 bg-gradient-to-r", styles.bar)} />
      <CardHeader className="border-b border-border/60 bg-muted/20 pb-4 dark:bg-muted/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              data-debug-icon-wrap
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/50",
                styles.iconWrap,
              )}
            >
              <Icon className={cn("h-6 w-6", styles.icon)} aria-hidden />
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                {title}
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                {description}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {canManage && !isEditing && onEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="gap-2 shadow-sm dark:border-border dark:bg-background/60 dark:hover:bg-muted/40"
              >
                <Edit className="h-4 w-4" aria-hidden />
                {editLabel}
              </Button>
            )}
            {showRefresh && onRefresh && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={isFetching}
                aria-label="Refresh settings"
                className="shrink-0"
              >
                <RefreshCw
                  className={cn("h-4 w-4", isFetching && "animate-spin")}
                  aria-hidden
                />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {viewOnlyMessage && !isEditing && (
          <p className="mb-5 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground dark:bg-muted/20">
            {viewOnlyMessage}
          </p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

type SettingStatCardProps = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  accent?: SettingsAccent;
};

export function SettingStatCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
}: SettingStatCardProps) {
  const styles = accentConfig[accent];

  return (
    <div
      className={cn(
        "group rounded-xl border p-4 transition-all duration-200 hover:shadow-md dark:hover:shadow-none",
        styles.stat,
      )}
      data-debug-stat
    >
      <div className="mb-2 flex items-center gap-2">
        {Icon && (
          <Icon
            className={cn("h-4 w-4 opacity-70", styles.icon)}
            aria-hidden
          />
        )}
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

type SettingsSectionHeaderProps = {
  icon: LucideIcon;
  title: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive";
  action?: ReactNode;
};

export function SettingsSectionHeader({
  icon: Icon,
  title,
  badge,
  badgeVariant = "default",
  action,
}: SettingsSectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted ring-1 ring-border/50 dark:bg-muted/60">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        {title}
      </h3>
      <div className="flex items-center gap-3">
        {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
        {action}
      </div>
    </div>
  );
}

type SettingsSectionProps = {
  icon: LucideIcon;
  title: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive";
  action?: ReactNode;
  children: ReactNode;
};

export function SettingsSection({
  icon,
  title,
  badge,
  badgeVariant,
  action,
  children,
}: SettingsSectionProps) {
  return (
    <section className="space-y-4">
      <SettingsSectionHeader
        icon={icon}
        title={title}
        badge={badge}
        badgeVariant={badgeVariant}
        action={action}
      />
      {children}
    </section>
  );
}

export function SettingsFormPanel({
  children,
  accent = "primary",
  className,
}: {
  children: ReactNode;
  accent?: SettingsAccent;
  className?: string;
}) {
  const styles = accentConfig[accent];

  return (
    <div
      data-debug-panel
      className={cn(
        "rounded-xl border p-4 sm:p-5",
        styles.panel,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function settingsFormLabelClass(accent: SettingsAccent = "primary") {
  return accentConfig[accent].panelLabel;
}

export function SettingsFormActions({
  onCancel,
  accent = "primary",
}: {
  onCancel: () => void;
  accent?: SettingsAccent;
}) {
  const styles = accentConfig[accent];

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/60 pt-6 dark:border-border">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="gap-2 dark:border-border dark:hover:bg-muted/40"
      >
        <X className="h-4 w-4" aria-hidden />
        Cancel
      </Button>
      <Button type="submit" className={cn("gap-2 text-white", styles.button)}>
        <Save className="h-4 w-4" aria-hidden />
        Save Changes
      </Button>
    </div>
  );
}

export function SettingsInfoCallout({
  icon: Icon,
  children,
  accent = "primary",
}: {
  icon: LucideIcon;
  children: ReactNode;
  accent?: SettingsAccent;
}) {
  const styles = accentConfig[accent];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4",
        styles.callout,
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", styles.calloutIcon)} aria-hidden />
      <p className={cn("text-xs leading-relaxed", styles.calloutText)}>
        {children}
      </p>
    </div>
  );
}

export function SettingsDivider() {
  return <div className="h-px bg-border/60 dark:bg-border" role="separator" />;
}
