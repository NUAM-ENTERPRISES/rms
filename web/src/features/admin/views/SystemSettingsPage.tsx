import { useEffect, useMemo, useState } from "react";
import {
  Settings,
  AlertTriangle,
  CheckCircle,
  Shield,
  Building2,
  Library,
  Bell,
  Users,
  Info,
  ChevronRight,
  Eye,
  MessageCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { useCan } from "@/hooks/useCan";
import {
  CATALOG_TAB_ACCESS,
  HRD_SETTINGS_MANAGE,
  HRD_SETTINGS_READ,
  LEADGEN_CHANNELS_MANAGE,
  LEADGEN_CHANNELS_READ,
  MASTER_CATALOG_MANAGE,
  OFFICE_ADDRESSES_MANAGE,
  OFFICE_ADDRESSES_READ,
  RNR_SETTINGS_MANAGE,
  RNR_SETTINGS_READ,
  SYSTEM_SETTINGS_PAGE_ACCESS,
} from "@/features/admin/constants/system-settings-permissions";
import {
  RNRSettingsCard,
  HRDSettingsCard,
  LeadgenChannelsSettingsCard,
  OfficeAddressesSettingsCard,
  CatalogSettingsCard,
} from "../components";

type SettingsTab = "rnr" | "hrd" | "leadgen" | "offices" | "catalog";

const SETTINGS_SECTIONS: {
  value: SettingsTab;
  label: string;
  shortDescription: string;
  icon: typeof Bell;
  iconBg: string;
  iconColor: string;
  accentBar: string;
  activeCard: string;
}[] = [
  {
    value: "rnr",
    label: "RNR Settings",
    shortDescription: "Reminders, office hours & CRE assignment",
    icon: Bell,
    iconBg: "bg-primary-100 dark:!bg-muted/40",
    iconColor: "text-primary-600 dark:text-primary-400",
    accentBar: "from-primary-500 to-primary-600",
    activeCard:
      "border-primary-300 bg-primary-50/60 shadow-md shadow-primary-100/50 dark:!border-border dark:!bg-muted/30 dark:shadow-none",
  },
  {
    value: "hrd",
    label: "HRD Settings",
    shortDescription: "Human resource development reminders",
    icon: Users,
    iconBg: "bg-accent-100 dark:!bg-muted/40",
    iconColor: "text-accent-600 dark:text-accent-400",
    accentBar: "from-accent-500 to-accent-600",
    activeCard:
      "border-accent-300 bg-accent-50/60 shadow-md shadow-accent-100/50 dark:!border-border dark:!bg-muted/30 dark:shadow-none",
  },
  {
    value: "leadgen",
    label: "Leadgen Channels",
    shortDescription: "WhatsApp, Instagram, Messenger & Lead Ads",
    icon: MessageCircle,
    iconBg: "bg-amber-100 dark:!bg-muted/40",
    iconColor: "text-amber-700 dark:text-amber-400",
    accentBar: "from-amber-500 to-amber-600",
    activeCard:
      "border-amber-300 bg-amber-50/60 shadow-md shadow-amber-100/50 dark:!border-border dark:!bg-muted/30 dark:shadow-none",
  },
  {
    value: "offices",
    label: "Office Addresses",
    shortDescription: "Preset office locations & contact info",
    icon: Building2,
    iconBg: "bg-success-100 dark:!bg-muted/40",
    iconColor: "text-success-600 dark:text-success-400",
    accentBar: "from-success-500 to-success-600",
    activeCard:
      "border-success-300 bg-success-50/60 shadow-md shadow-success-100/50 dark:!border-border dark:!bg-muted/30 dark:shadow-none",
  },
  {
    value: "catalog",
    label: "Master Catalog",
    shortDescription: "Professions, departments, roles & qualifications",
    icon: Library,
    iconBg: "bg-primary-100 dark:!bg-muted/40",
    iconColor: "text-primary-700 dark:text-primary-300",
    accentBar: "from-primary-400 to-accent-500",
    activeCard:
      "border-primary-200 bg-gradient-to-br from-primary-50/80 to-accent-50/40 shadow-md dark:!border-border dark:!from-muted/30 dark:!to-muted/20 dark:shadow-none",
  },
];

function getAccessMessage(args: {
  canManageRnr: boolean;
  canManageHrd: boolean;
  canManageLeadgen: boolean;
  canManageOffices: boolean;
  canManageCatalog: boolean;
  canManageQualifications: boolean;
}): string {
  const manageLabels: string[] = [];
  if (args.canManageRnr) manageLabels.push("RNR");
  if (args.canManageHrd) manageLabels.push("HRD");
  if (args.canManageLeadgen) manageLabels.push("leadgen channels");
  if (args.canManageOffices) manageLabels.push("office addresses");
  if (args.canManageCatalog || args.canManageQualifications) {
    manageLabels.push("master catalog");
  }

  if (manageLabels.length === 0) {
    return "You have view-only access to the sections shown below.";
  }
  if (manageLabels.length >= 5) {
    return "You have full configuration access. Changes take effect immediately.";
  }
  return `You can edit ${manageLabels.join(", ")}.`;
}

export default function SystemSettingsPage() {
  const canAccessPage = useCan([...SYSTEM_SETTINGS_PAGE_ACCESS]);
  const canReadRnr = useCan([...RNR_SETTINGS_READ]);
  const canReadHrd = useCan([...HRD_SETTINGS_READ]);
  const canReadLeadgen = useCan([...LEADGEN_CHANNELS_READ]);
  const canReadOffices = useCan([...OFFICE_ADDRESSES_READ]);
  const canReadCatalog = useCan([...CATALOG_TAB_ACCESS]);

  const canManageRnr = useCan([...RNR_SETTINGS_MANAGE]);
  const canManageHrd = useCan([...HRD_SETTINGS_MANAGE]);
  const canManageLeadgen = useCan([...LEADGEN_CHANNELS_MANAGE]);
  const canManageOffices = useCan([...OFFICE_ADDRESSES_MANAGE]);
  const canManageCatalog = useCan([...MASTER_CATALOG_MANAGE]);
  const canManageQualifications = useCan("manage:qualifications");

  const visibleSections = useMemo(
    () =>
      SETTINGS_SECTIONS.filter((section) => {
        switch (section.value) {
          case "rnr":
            return canReadRnr;
          case "hrd":
            return canReadHrd;
          case "leadgen":
            return canReadLeadgen;
          case "offices":
            return canReadOffices;
          case "catalog":
            return canReadCatalog;
          default:
            return false;
        }
      }),
    [canReadRnr, canReadHrd, canReadLeadgen, canReadOffices, canReadCatalog],
  );

  const defaultTab = visibleSections[0]?.value ?? "rnr";
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);

  useEffect(() => {
    if (
      visibleSections.length > 0 &&
      !visibleSections.some((section) => section.value === activeTab)
    ) {
      setActiveTab(visibleSections[0].value);
    }
  }, [visibleSections, activeTab]);

  const manageCount = [
    canManageRnr,
    canManageHrd,
    canManageLeadgen,
    canManageOffices,
    canManageCatalog || canManageQualifications,
  ].filter(Boolean).length;
  const hasFullAccess = manageCount >= 5;
  const hasViewOnly = manageCount === 0;
  const accessMessage = getAccessMessage({
    canManageRnr,
    canManageHrd,
    canManageLeadgen,
    canManageOffices,
    canManageCatalog,
    canManageQualifications,
  });

  if (!canAccessPage) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center px-4"
        role="alert"
      >
        <Card className="max-w-md w-full overflow-hidden border-border shadow-xl">
          <div className="h-1 bg-gradient-to-r from-danger-500 to-danger-600" />
          <CardHeader className="text-center py-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-50 ring-1 ring-danger-200 dark:!bg-muted/40 dark:ring-border">
              <AlertTriangle
                className="h-8 w-8 text-danger-600 dark:text-danger-400"
                aria-hidden
              />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Access Denied
            </CardTitle>
            <CardDescription className="mt-3 text-base leading-relaxed">
              You don&apos;t have permission to view system settings. Please
              contact your administrator for access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card
        data-debug-hero
        className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary-50/30 shadow-xl ring-1 ring-border/60 dark:border-border dark:bg-card dark:from-card dark:via-card dark:!to-card dark:shadow-none"
      >
        <div className="h-1 bg-gradient-to-r from-primary-500 via-accent-500 to-primary-600" />
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                <div
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 opacity-30 blur-lg transition-opacity duration-500 group-hover:opacity-50"
                  aria-hidden
                />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 shadow-lg transition-transform duration-300 group-hover:scale-105">
                  <Settings className="h-7 w-7 text-white" aria-hidden />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary-700 via-accent-600 to-primary-600 bg-clip-text text-transparent dark:from-primary-300 dark:via-accent-400 dark:to-primary-400">
                  System Settings
                </CardTitle>
                <CardDescription className="mt-1.5 text-sm sm:text-base font-medium">
                  Configure reminders, leadgen channels, office addresses, and
                  the master catalog including qualifications
                </CardDescription>
              </div>
            </div>

            <Badge
              variant="outline"
              className={cn(
                "self-start sm:self-center px-4 py-2 text-sm font-medium shadow-sm",
                hasFullAccess &&
                  "bg-success-50 text-success-700 border-success-200 dark:!bg-muted/30 dark:text-success-300 dark:!border-border",
                hasViewOnly &&
                  "bg-muted text-muted-foreground border-border",
                !hasFullAccess &&
                  !hasViewOnly &&
                  "bg-accent-50 text-accent-700 border-accent-200 dark:!bg-muted/30 dark:text-accent-300 dark:!border-border",
              )}
            >
              {hasFullAccess ? (
                <CheckCircle className="h-4 w-4 mr-2" aria-hidden />
              ) : hasViewOnly ? (
                <Eye className="h-4 w-4 mr-2" aria-hidden />
              ) : (
                <Shield className="h-4 w-4 mr-2" aria-hidden />
              )}
              {hasFullAccess
                ? "Full Access"
                : hasViewOnly
                  ? "View Only"
                  : "Partial Access"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pb-6 pt-0">
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 p-4 dark:!bg-muted/20">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card shadow-sm ring-1 ring-border/50">
              <Info
                className="h-4 w-4 text-primary-600 dark:text-primary-400"
                aria-hidden
              />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pt-1.5">
              These settings control reminder systems, inbound leadgen channels,
              office address presets, and the
              profession/department/role/qualification catalog.{" "}
              {accessMessage}
            </p>
          </div>
        </CardContent>
      </Card>

      <div
        className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory"
        role="navigation"
        aria-label="Settings sections"
      >
        {visibleSections.map((section) => {
          const Icon = section.icon;
          const isActive = activeTab === section.value;

          return (
            <button
              key={section.value}
              type="button"
              onClick={() => setActiveTab(section.value)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "group relative min-w-[16rem] shrink-0 snap-start overflow-hidden rounded-xl border border-border bg-card p-4 text-left transition-all duration-200 dark:bg-card",
                "hover:shadow-md hover:border-border/80 dark:hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background",
                isActive && section.activeCard,
              )}
            >
              <div
                className={cn(
                  "absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r opacity-0 transition-opacity duration-200",
                  section.accentBar,
                  isActive && "opacity-100",
                )}
                aria-hidden
              />
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
                    section.iconBg,
                  )}
                >
                  <Icon className={cn("h-5 w-5", section.iconColor)} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-sm">
                    {section.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {section.shortDescription}
                  </p>
                </div>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground/50 transition-all duration-200 mt-0.5",
                    isActive && "text-foreground translate-x-0.5",
                    "group-hover:text-muted-foreground group-hover:translate-x-0.5",
                  )}
                  aria-hidden
                />
              </div>
            </button>
          );
        })}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as SettingsTab)}
      >
        {canReadRnr ? (
          <TabsContent
            value="rnr"
            className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-300"
          >
            <RNRSettingsCard />
          </TabsContent>
        ) : null}

        {canReadHrd ? (
          <TabsContent
            value="hrd"
            className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-300"
          >
            <HRDSettingsCard />
          </TabsContent>
        ) : null}

        {canReadLeadgen ? (
          <TabsContent
            value="leadgen"
            className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-300"
          >
            <LeadgenChannelsSettingsCard />
          </TabsContent>
        ) : null}

        {canReadOffices ? (
          <TabsContent
            value="offices"
            className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-300"
          >
            <OfficeAddressesSettingsCard />
          </TabsContent>
        ) : null}

        {canReadCatalog ? (
          <TabsContent
            value="catalog"
            className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-300"
          >
            <CatalogSettingsCard />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
