import { useState } from "react";
import {
  Settings,
  AlertTriangle,
  CheckCircle,
  Shield,
  Building2,
  Library,
  Bell,
  ClipboardList,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { useCan } from "@/hooks/useCan";
import {
  RNRSettingsCard,
  HRDSettingsCard,
  OfficeAddressesSettingsCard,
  CatalogSettingsCard,
} from "../components";

type SettingsSection = "rnr" | "hrd" | "offices" | "catalog";

const SECTIONS: Array<{
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof Settings;
  accent: {
    icon: string;
    iconBg: string;
    active: string;
    bar: string;
  };
}> = [
  {
    id: "rnr",
    label: "RNR Settings",
    description: "Reminder cadence, office hours, and CRE assignment",
    icon: Bell,
    accent: {
      icon: "text-sky-700",
      iconBg: "bg-sky-100",
      active: "border-sky-300 bg-sky-50/80 ring-sky-200/60",
      bar: "bg-sky-500",
    },
  },
  {
    id: "hrd",
    label: "HRD Settings",
    description: "Submission follow-ups, escalation, and test mode",
    icon: ClipboardList,
    accent: {
      icon: "text-amber-700",
      iconBg: "bg-amber-100",
      active: "border-amber-300 bg-amber-50/80 ring-amber-200/60",
      bar: "bg-amber-500",
    },
  },
  {
    id: "offices",
    label: "Office Addresses",
    description: "Preset locations used across candidate workflows",
    icon: Building2,
    accent: {
      icon: "text-teal-700",
      iconBg: "bg-teal-100",
      active: "border-teal-300 bg-teal-50/80 ring-teal-200/60",
      bar: "bg-teal-500",
    },
  },
  {
    id: "catalog",
    label: "Master Catalog",
    description: "Professions, departments, and role definitions",
    icon: Library,
    accent: {
      icon: "text-emerald-700",
      iconBg: "bg-emerald-100",
      active: "border-emerald-300 bg-emerald-50/80 ring-emerald-200/60",
      bar: "bg-emerald-500",
    },
  },
];

function accessCopy(
  canManageSystemConfig: boolean,
  canManageOfficeAddresses: boolean,
): string {
  if (canManageSystemConfig && canManageOfficeAddresses) {
    return "You can edit every section. Changes apply immediately.";
  }
  if (canManageSystemConfig) {
    return "You can manage RNR, HRD, and the master catalog. Office addresses are view-only.";
  }
  if (canManageOfficeAddresses) {
    return "You can edit office addresses. Other sections are view-only.";
  }
  return "You have view-only access. Contact an administrator to request edit rights.";
}

export default function SystemSettingsPage() {
  const canReadSystemConfig = useCan("read:system_config");
  const canManageSystemConfig = useCan("manage:system_config");
  const canManageOfficeAddresses = useCan("manage:office_addresses");
  const [activeSection, setActiveSection] = useState<SettingsSection>("rnr");

  const canEdit =
    canManageSystemConfig || canManageOfficeAddresses;
  const active = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0];
  const ActiveIcon = active.icon;

  if (!canReadSystemConfig) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Card className="max-w-lg overflow-hidden border-border shadow-lg">
          <div className="h-1 bg-gradient-to-r from-danger-500 to-amber-500" />
          <CardHeader className="py-12 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-100">
              <AlertTriangle className="h-7 w-7 text-danger-600" aria-hidden />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Access Denied
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              You don&apos;t have permission to view system settings.
              <br />
              Please contact your administrator for access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full space-y-6">
      {/* Ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-6 h-56 overflow-hidden rounded-b-[2rem]"
      >
        <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-teal-200/30 blur-3xl" />
        <div className="absolute left-1/3 top-8 h-40 w-56 rounded-full bg-sky-200/25 blur-3xl" />
        <div className="absolute -right-10 top-0 h-44 w-44 rounded-full bg-emerald-200/25 blur-3xl" />
      </div>

      {/* Page header */}
      <header className="relative overflow-hidden rounded-2xl border border-border bg-card/90 shadow-sm backdrop-blur-sm">
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-teal-50/80 via-sky-50/40 to-transparent"
        />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4 sm:items-center sm:gap-5">
            <div className="relative shrink-0">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-600 shadow-lg shadow-teal-200/60 transition-transform duration-300 hover:scale-105 sm:h-16 sm:w-16">
                <Settings className="h-7 w-7 text-white sm:h-8 sm:w-8" aria-hidden />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-emerald-500 shadow-sm">
                <Sparkles className="h-2.5 w-2.5 text-white" aria-hidden />
              </span>
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  System Settings
                </h1>
                {canEdit ? (
                  <Badge
                    variant="outline"
                    className="border-success-200 bg-success-50 px-2.5 py-0.5 text-xs font-medium text-success-700"
                  >
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Full Access
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    <Shield className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    View Only
                  </Badge>
                )}
              </div>
              <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
                {accessCopy(canManageSystemConfig, canManageOfficeAddresses)}
              </p>
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-3 text-sm text-muted-foreground lg:flex">
            <span className={cn("h-2 w-2 rounded-full", active.accent.bar)} />
            {canEdit ? "Editing" : "Viewing"}
            <span className="font-semibold text-foreground">{active.label}</span>
          </div>
        </div>
      </header>

      {/* Section shell */}
      <div className="relative grid gap-6 lg:grid-cols-[minmax(240px,280px)_1fr]">
        {/* Nav */}
        <nav
          aria-label="Settings sections"
          className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex min-w-[220px] flex-1 items-start gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200 lg:min-w-0 lg:flex-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? cn("shadow-sm ring-2", section.accent.active)
                    : "border-border bg-card/70 hover:border-muted-300 hover:bg-card hover:shadow-sm",
                )}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-0 top-3 bottom-3 hidden w-1 rounded-full lg:block",
                      section.accent.bar,
                    )}
                  />
                )}
                <span
                  className={cn(
                    "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
                    section.accent.iconBg,
                    section.accent.icon,
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {section.label}
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-all duration-200",
                        isActive
                          ? "translate-x-0.5 opacity-100"
                          : "opacity-0 group-hover:opacity-60",
                      )}
                      aria-hidden
                    />
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {section.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <section
          key={activeSection}
          aria-labelledby={`settings-section-${activeSection}`}
          className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
        >
          <div className="mb-4 flex items-center gap-3">
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl lg:h-10 lg:w-10",
                active.accent.iconBg,
                active.accent.icon,
              )}
            >
              <ActiveIcon className="h-4 w-4 lg:h-5 lg:w-5" aria-hidden />
            </span>
            <div>
              <h2
                id={`settings-section-${activeSection}`}
                className="text-base font-semibold text-foreground lg:text-lg"
              >
                {active.label}
              </h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {active.description}
              </p>
            </div>
          </div>

          {activeSection === "rnr" && <RNRSettingsCard />}
          {activeSection === "hrd" && <HRDSettingsCard />}
          {activeSection === "offices" && <OfficeAddressesSettingsCard />}
          {activeSection === "catalog" && <CatalogSettingsCard />}
        </section>
      </div>
    </div>
  );
}
