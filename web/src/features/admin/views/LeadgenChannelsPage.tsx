import { AlertTriangle, MessageCircle } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCan, useHasRole } from "@/hooks/useCan";
import { LEADGEN_CHANNELS_READ } from "@/features/admin/constants/system-settings-permissions";
import { LeadgenChannelsSettingsCard } from "@/features/admin/components";

const LEADGEN_ADMIN_ROLES = [
  "Managing Director",
  "Director",
  "Manager",
  "Recruitment Lead",
  "System Admin",
] as const;

export default function LeadgenChannelsPage() {
  const canReadLeadgen = useCan([...LEADGEN_CHANNELS_READ]);
  const isAdminRole = useHasRole([...LEADGEN_ADMIN_ROLES]);
  const canAccessPage = canReadLeadgen || isAdminRole;

  if (!canAccessPage) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center px-4"
        role="alert"
      >
        <Card className="w-full max-w-md overflow-hidden border-border shadow-xl">
          <div className="h-1 bg-gradient-to-r from-danger-500 to-danger-600" />
          <CardHeader className="py-12 text-center">
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
              You don&apos;t have permission to view leadgen channel settings.
              Please contact your administrator for access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-amber-50/30 shadow-xl ring-1 ring-border/60 dark:border-border dark:bg-card dark:from-card dark:via-card dark:!to-card dark:shadow-none">
        <div className="h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />
        <CardHeader className="pb-6">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0 group">
              <div
                className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 opacity-30 blur-lg transition-opacity duration-500 group-hover:opacity-50"
                aria-hidden
              />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg transition-transform duration-300 group-hover:scale-105">
                <MessageCircle className="h-7 w-7 text-white" aria-hidden />
              </div>
            </div>
            <div>
              <CardTitle className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-500 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent sm:text-3xl dark:from-amber-300 dark:via-amber-400 dark:to-amber-300">
                Leadgen Channels
              </CardTitle>
              <CardDescription className="mt-1.5 text-sm font-medium sm:text-base">
                Enable or disable inbound Meta channels: WhatsApp, Instagram,
                Messenger, and Lead Ads forms
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <LeadgenChannelsSettingsCard />
    </div>
  );
}
