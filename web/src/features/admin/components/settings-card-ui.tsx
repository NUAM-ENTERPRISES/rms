import type { ReactNode } from "react";
import { RefreshCw, Save, X } from "lucide-react";

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

export type SettingsAccent = "sky" | "amber" | "teal" | "emerald";

const ACCENT: Record<
  SettingsAccent,
  {
    bar: string;
    iconWrap: string;
    icon: string;
    metric: string;
    metricIcon: string;
    panel: string;
    panelLabel: string;
    softBadge: string;
    primaryBtn: string;
    headerWash: string;
  }
> = {
  sky: {
    bar: "bg-sky-500",
    iconWrap: "bg-sky-100",
    icon: "text-sky-700",
    metric: "border-sky-100 bg-gradient-to-br from-sky-50/90 via-white to-white",
    metricIcon: "bg-sky-100 text-sky-700",
    panel: "border-sky-100 bg-sky-50/50",
    panelLabel: "text-sky-800",
    softBadge: "border-sky-200 bg-sky-50 text-sky-700",
    primaryBtn: "bg-sky-600 text-white hover:bg-sky-700",
    headerWash: "from-sky-50/90 via-white to-transparent",
  },
  amber: {
    bar: "bg-amber-500",
    iconWrap: "bg-amber-100",
    icon: "text-amber-700",
    metric:
      "border-amber-100 bg-gradient-to-br from-amber-50/90 via-white to-white",
    metricIcon: "bg-amber-100 text-amber-700",
    panel: "border-amber-100 bg-amber-50/50",
    panelLabel: "text-amber-800",
    softBadge: "border-amber-200 bg-amber-50 text-amber-800",
    primaryBtn: "bg-amber-600 text-white hover:bg-amber-700",
    headerWash: "from-amber-50/90 via-white to-transparent",
  },
  teal: {
    bar: "bg-teal-500",
    iconWrap: "bg-teal-100",
    icon: "text-teal-700",
    metric:
      "border-teal-100 bg-gradient-to-br from-teal-50/90 via-white to-white",
    metricIcon: "bg-teal-100 text-teal-700",
    panel: "border-teal-100 bg-teal-50/50",
    panelLabel: "text-teal-800",
    softBadge: "border-teal-200 bg-teal-50 text-teal-700",
    primaryBtn: "bg-teal-600 text-white hover:bg-teal-700",
    headerWash: "from-teal-50/90 via-white to-transparent",
  },
  emerald: {
    bar: "bg-emerald-500",
    iconWrap: "bg-emerald-100",
    icon: "text-emerald-700",
    metric:
      "border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-white to-white",
    metricIcon: "bg-emerald-100 text-emerald-700",
    panel: "border-emerald-100 bg-emerald-50/50",
    panelLabel: "text-emerald-800",
    softBadge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    primaryBtn: "bg-emerald-600 text-white hover:bg-emerald-700",
    headerWash: "from-emerald-50/90 via-white to-transparent",
  },
};

export function settingsAccent(accent: SettingsAccent) {
  return ACCENT[accent];
}

export function SettingsLoadingCard({
  label,
  accent = "sky",
}: {
  label: string;
  accent?: SettingsAccent;
}) {
  const a = ACCENT[accent];
  return (
    <Card className="overflow-hidden border-border bg-card shadow-sm">
      <div className={cn("h-1", a.bar)} />
      <CardContent className="flex items-center justify-center py-20">
        <div className="space-y-3 text-center">
          <LoadingSpinner className="mx-auto h-9 w-9" />
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsCardShell({
  accent,
  icon: Icon,
  title,
  description,
  actions,
  children,
}: {
  accent: SettingsAccent;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <Card className="overflow-hidden border-border bg-card/95 shadow-sm">
      <div className={cn("h-1", a.bar)} />
      <CardHeader className="relative border-b border-border p-5 sm:p-6">
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-r",
            a.headerWash,
          )}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5 sm:items-center">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm",
                a.iconWrap,
                a.icon,
              )}
            >
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {title}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground sm:text-base">
                {description}
              </CardDescription>
            </div>
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">{children}</CardContent>
    </Card>
  );
}

export function SettingsRefreshButton({
  onClick,
  isFetching,
}: {
  onClick: () => void;
  isFetching?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onClick}
      disabled={isFetching}
      className="h-9 w-9 rounded-xl"
      aria-label="Refresh settings"
    >
      <RefreshCw
        className={cn("h-4 w-4", isFetching && "animate-spin")}
        aria-hidden
      />
    </Button>
  );
}

export function SettingsSection({
  icon: Icon,
  title,
  badge,
  badgeTone = "neutral",
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: string;
  badgeTone?: "neutral" | "success" | "warning" | "danger";
  action?: ReactNode;
  children?: ReactNode;
}) {
  const badgeClass =
    badgeTone === "success"
      ? "border-success-200 bg-success-50 text-success-700"
      : badgeTone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : badgeTone === "danger"
          ? "border-danger-200 bg-danger-50 text-danger-700"
          : "border-border bg-muted/60 text-muted-foreground";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {badge ? (
            <Badge variant="outline" className={cn("text-xs", badgeClass)}>
              {badge}
            </Badge>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SettingMetric({
  label,
  value,
  icon: Icon,
  accent = "sky",
}: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: SettingsAccent | "danger";
}) {
  const styles =
    accent === "danger"
      ? {
          card: "border-danger-100 bg-gradient-to-br from-danger-50/90 via-white to-white",
          icon: "bg-danger-100 text-danger-700",
        }
      : {
          card: ACCENT[accent].metric,
          icon: ACCENT[accent].metricIcon,
        };

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-shadow duration-200 hover:shadow-sm",
        styles.card,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        {Icon ? (
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg",
              styles.icon,
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

export function SettingsFieldPanel({
  accent,
  children,
  className,
}: {
  accent: SettingsAccent;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4 rounded-2xl border p-4",
        ACCENT[accent].panel,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SettingsFormActions({
  onCancel,
  accent,
  submitLabel = "Save Changes",
}: {
  onCancel: () => void;
  accent: SettingsAccent;
  submitLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-6">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="rounded-xl px-5"
      >
        <X className="mr-2 h-4 w-4" aria-hidden />
        Cancel
      </Button>
      <Button
        type="submit"
        className={cn("rounded-xl px-5", ACCENT[accent].primaryBtn)}
      >
        <Save className="mr-2 h-4 w-4" aria-hidden />
        {submitLabel}
      </Button>
    </div>
  );
}

export function formatStrategy(strategy: string): string {
  return strategy
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
