import { Settings, AlertTriangle, CheckCircle, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useCan } from "@/hooks/useCan";
import { RNRSettingsCard, HRDSettingsCard } from "../components";

export default function SystemSettingsPage() {
  const canReadSystemConfig = useCan("read:system_config");
  const canManageSystemConfig = useCan("manage:system_config");

  if (!canReadSystemConfig) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="max-w-lg mx-auto mt-20">
          <Card className="border-0 shadow-2xl bg-white dark:bg-slate-900 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-red-500 to-orange-500" />
            <CardHeader className="text-center py-12">
              <div className="mx-auto p-4 rounded-2xl bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20 w-fit mb-6 shadow-lg">
                <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Access Denied
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 text-base mt-2">
                You don't have permission to view system settings.
                <br />
                Please contact your administrator for access.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-purple-200 dark:shadow-purple-900/20">
              <Settings className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                System Settings
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Configure RNR and HRD reminder system settings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canManageSystemConfig ? (
              <Badge
                variant="outline"
                className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 px-4 py-2 text-sm font-medium shadow-sm"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Full Access
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 px-4 py-2 text-sm font-medium shadow-sm"
              >
                <Shield className="h-4 w-4 mr-2" />
                View Only
              </Badge>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
              <Settings className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">System Configuration</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                These settings control how the RNR and HRD reminder systems operate. Changes will take effect immediately.
                {!canManageSystemConfig && " You have view-only access to these settings."}
              </p>
            </div>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="rnr" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 shadow-lg rounded-xl p-1.5 border border-slate-200 dark:border-slate-800">
            <TabsTrigger
              value="rnr"
              className="rounded-lg px-6 py-3 font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg dark:text-slate-400 dark:data-[state=active]:text-white"
            >
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-white/20">
                  <Settings className="h-4 w-4" />
                </div>
                RNR Settings
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="hrd"
              className="rounded-lg px-6 py-3 font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg dark:text-slate-400 dark:data-[state=active]:text-white"
            >
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-white/20">
                  <Settings className="h-4 w-4" />
                </div>
                HRD Settings
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rnr" className="mt-6">
            <RNRSettingsCard />
          </TabsContent>

          <TabsContent value="hrd" className="mt-6">
            <HRDSettingsCard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
