import React from "react";
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
      <div className="min-h-screen p-6 bg-black">
        <div className="max-w-lg mx-auto mt-20">
          <Card className="border-0 shadow-2xl bg-black overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-red-500 to-orange-500" />
            <CardHeader className="text-center py-12">
              <div className="mx-auto p-4 rounded-2xl bg-gradient-to-br from-red-900/30 to-orange-900/30 w-fit mb-6 shadow-lg">
                <AlertTriangle className="h-10 w-10 text-red-500 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-100">
                Access Denied
              </CardTitle>
              <CardDescription className="text-slate-400 text-base mt-2">
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
    <div className="min-h-screen p-6 bg-black">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 shadow-xl shadow-purple-900/30">
              <Settings className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                System Settings
              </h1>
              <p className="text-slate-400 mt-1">
                Configure RNR and HRD reminder system settings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canManageSystemConfig ? (
              <Badge
                variant="outline"
                className="bg-emerald-950/40 text-emerald-300 border-emerald-800/50 px-4 py-2 text-sm font-medium shadow-sm"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Full Access
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-slate-900/50 text-slate-300 border-slate-800/50 px-4 py-2 text-sm font-medium shadow-sm"
              >
                <Shield className="h-4 w-4 mr-2" />
                View Only
              </Badge>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-black border border-indigo-900/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-xl bg-slate-900/80">
              <Settings className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">System Configuration</h3>
              <p className="text-sm text-slate-400 mt-1">
                These settings control how the RNR and HRD reminder systems operate. Changes will take effect immediately.
                {!canManageSystemConfig && " You have view-only access to these settings."}
              </p>
            </div>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="rnr" className="space-y-6">
          <TabsList className="bg-black shadow-lg rounded-xl p-1.5 border border-slate-800">
            <TabsTrigger
              value="rnr"
              className="rounded-lg px-6 py-3 font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-700 data-[state=active]:to-purple-700 data-[state=active]:text-white data-[state=active]:shadow-lg dark:text-slate-400 dark:data-[state=active]:text-white"
            >
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-slate-900/70">
                  <Settings className="h-4 w-4 text-indigo-400" />
                </div>
                RNR Settings
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="hrd"
              className="rounded-lg px-6 py-3 font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-700 data-[state=active]:to-pink-700 data-[state=active]:text-white data-[state=active]:shadow-lg dark:text-slate-400 dark:data-[state=active]:text-white"
            >
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-slate-900/70">
                  <Settings className="h-4 w-4 text-purple-400" />
                </div>
                HRD Settings
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rnr" className="mt-6 bg-black">
            <RNRSettingsCard />
          </TabsContent>

          <TabsContent value="hrd" className="mt-6 bg-black">
            <HRDSettingsCard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}