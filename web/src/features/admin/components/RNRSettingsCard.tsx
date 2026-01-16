import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Clock,
  Bell,
  Users,
  Save,
  X,
  Edit,
  RefreshCw,
  Zap,
  Timer,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui";

import { useCan } from "@/hooks/useCan";
import {
  useGetRNRSettingsQuery,
  useUpdateRNRSettingsMutation,
} from "@/features/admin/api";
import { SettingsConfirmDialog } from "./SettingsConfirmDialog";

// ==================== Schema ====================
const rnrSettingsSchema = z.object({
  totalDays: z.number().min(1, "Must be at least 1 day"),
  remindersPerDay: z.number().min(1, "Must be at least 1 reminder"),
  delayBetweenReminders: z.number().min(0, "Must be 0 or more"),
  officeHours: z.object({
    enabled: z.boolean(),
    start: z.string(),
    end: z.string(),
  }),
  creAssignment: z.object({
    enabled: z.boolean(),
    afterDays: z.number().min(0),
    assignmentStrategy: z.enum(["round_robin", "load_balanced", "manual"]),
    creRoleId: z.string().nullable(),
    creTeamId: z.string().nullable(),
  }),
});

type RNRFormData = z.infer<typeof rnrSettingsSchema>;

// ==================== Helper Components ====================
function SettingCard({
  label,
  value,
  icon: Icon,
  accent = "blue",
}: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: "blue" | "purple" | "green" | "orange";
}) {
  const accentColors = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    purple: "bg-purple-50 border-purple-100 text-purple-700",
    green: "bg-green-50 border-green-100 text-green-700",
    orange: "bg-orange-50 border-orange-100 text-orange-700",
  };

  return (
    <div
      className={`p-4 rounded-xl border-2 ${accentColors[accent]} transition-all hover:shadow-md`}
    >
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="h-4 w-4 opacity-70" />}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  badge,
  badgeVariant = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive";
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-slate-100">
          <Icon className="h-4 w-4 text-slate-600" />
        </div>
        {title}
      </h3>
      {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
    </div>
  );
}

function formatStrategy(strategy: string): string {
  return strategy
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ==================== Main Component ====================
export function RNRSettingsCard() {
  const canManage = useCan("manage:system_config");
  const [isEditing, setIsEditing] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingValues, setPendingValues] = useState<RNRFormData | null>(null);

  const { data: rnrData, isLoading, refetch, isFetching } = useGetRNRSettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateRNRSettingsMutation();

  const form = useForm<RNRFormData>({
    resolver: zodResolver(rnrSettingsSchema),
    defaultValues: {
      totalDays: 3,
      remindersPerDay: 2,
      delayBetweenReminders: 1,
      officeHours: {
        enabled: true,
        start: "09:00",
        end: "18:00",
      },
      creAssignment: {
        enabled: true,
        afterDays: 3,
        assignmentStrategy: "round_robin",
        creRoleId: null,
        creTeamId: null,
      },
    },
  });

  const handleEditClick = () => {
    setShowEditConfirm(true);
  };

  const handleEditConfirm = () => {
    if (rnrData?.data) {
      form.reset(rnrData.data);
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (rnrData?.data) {
      form.reset(rnrData.data);
    }
  };

  const handleFormSubmit = (values: RNRFormData) => {
    setPendingValues(values);
    setShowSaveConfirm(true);
  };

  const handleSaveConfirm = async () => {
    if (!pendingValues) return;
    try {
      await updateSettings(pendingValues).unwrap();
      toast.success("RNR settings updated successfully");
      setIsEditing(false);
      setShowSaveConfirm(false);
      setPendingValues(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update RNR settings");
      setShowSaveConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-xl bg-white overflow-hidden">
        <CardContent className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <LoadingSpinner className="h-10 w-10 mx-auto" />
            <p className="text-sm text-slate-500">Loading RNR settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const settings = rnrData?.data;

  return (
    <>
      <Card className="border-0 shadow-xl bg-white overflow-hidden">
        {/* Header */}
        <CardHeader className="border-b bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
                <Bell className="h-7 w-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-white">
                  RNR Reminder Settings
                </CardTitle>
                <CardDescription className="text-blue-100 mt-1">
                  Configure reminders for Right to Represent workflow
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canManage && !isEditing && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleEditClick}
                  className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Settings
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
                className="text-white hover:bg-white/20"
              >
                <RefreshCw className={`h-5 w-5 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
                {/* Reminder Configuration */}
                <div className="space-y-4">
                  <SectionHeader icon={Timer} title="Reminder Configuration" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl">
                    <FormField
                      control={form.control}
                      name="totalDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700">Total Days</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              min={1}
                              className="bg-white border-slate-200"
                            />
                          </FormControl>
                          <FormDescription>Duration for reminders</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="remindersPerDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700">Reminders Per Day</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              min={1}
                              className="bg-white border-slate-200"
                            />
                          </FormControl>
                          <FormDescription>Number of daily reminders</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="delayBetweenReminders"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700">Delay Between (hours)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              min={0}
                              className="bg-white border-slate-200"
                            />
                          </FormControl>
                          <FormDescription>Hours between reminders</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Office Hours */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <SectionHeader icon={Clock} title="Office Hours" />
                    <FormField
                      control={form.control}
                      name="officeHours.enabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormLabel className="text-sm text-slate-600 font-normal">
                            {field.value ? "Enabled" : "Disabled"}
                          </FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  {form.watch("officeHours.enabled") && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <FormField
                        control={form.control}
                        name="officeHours.start"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-blue-700">Start Time</FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                className="bg-white border-blue-200"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="officeHours.end"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-blue-700">End Time</FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                className="bg-white border-blue-200"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                <Separator className="my-6" />

                {/* CRE Assignment */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <SectionHeader icon={Users} title="CRE Assignment" />
                    <FormField
                      control={form.control}
                      name="creAssignment.enabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormLabel className="text-sm text-slate-600 font-normal">
                            {field.value ? "Enabled" : "Disabled"}
                          </FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  {form.watch("creAssignment.enabled") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                      <FormField
                        control={form.control}
                        name="creAssignment.afterDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-indigo-700">Assign After Days</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                min={0}
                                className="bg-white border-indigo-200"
                              />
                            </FormControl>
                            <FormDescription>Days before auto-assignment</FormDescription>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="creAssignment.assignmentStrategy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-indigo-700">Assignment Strategy</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-indigo-200">
                                  <SelectValue placeholder="Select strategy" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="round_robin">Round Robin</SelectItem>
                                <SelectItem value="load_balanced">Load Balanced</SelectItem>
                                <SelectItem value="manual">Manual</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    className="px-6"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-8">
              {/* Reminder Configuration Display */}
              <div className="space-y-4">
                <SectionHeader icon={Timer} title="Reminder Configuration" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SettingCard
                    label="Total Days"
                    value={`${settings?.totalDays || 0} days`}
                    icon={CalendarDays}
                    accent="blue"
                  />
                  <SettingCard
                    label="Reminders Per Day"
                    value={`${settings?.remindersPerDay || 0} reminders`}
                    icon={Bell}
                    accent="blue"
                  />
                  <SettingCard
                    label="Delay Between"
                    value={`${settings?.delayBetweenReminders || 0} hours`}
                    icon={Timer}
                    accent="blue"
                  />
                </div>
              </div>

              <Separator />

              {/* Office Hours Display */}
              <div className="space-y-4">
                <SectionHeader
                  icon={Clock}
                  title="Office Hours"
                  badge={settings?.officeHours?.enabled ? "Enabled" : "Disabled"}
                  badgeVariant={settings?.officeHours?.enabled ? "default" : "secondary"}
                />
                {settings?.officeHours?.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <SettingCard
                      label="Start Time"
                      value={settings.officeHours.start}
                      icon={Zap}
                      accent="green"
                    />
                    <SettingCard
                      label="End Time"
                      value={settings.officeHours.end}
                      icon={Clock}
                      accent="green"
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* CRE Assignment Display */}
              <div className="space-y-4">
                <SectionHeader
                  icon={Users}
                  title="CRE Assignment"
                  badge={settings?.creAssignment?.enabled ? "Enabled" : "Disabled"}
                  badgeVariant={settings?.creAssignment?.enabled ? "default" : "secondary"}
                />
                {settings?.creAssignment?.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingCard
                      label="Assign After"
                      value={`${settings.creAssignment.afterDays} days`}
                      icon={CalendarDays}
                      accent="purple"
                    />
                    <SettingCard
                      label="Strategy"
                      value={formatStrategy(settings.creAssignment.assignmentStrategy)}
                      icon={Zap}
                      accent="purple"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <SettingsConfirmDialog
        open={showEditConfirm}
        onOpenChange={setShowEditConfirm}
        onConfirm={handleEditConfirm}
        type="edit"
        settingsType="RNR Reminder Settings"
      />
      <SettingsConfirmDialog
        open={showSaveConfirm}
        onOpenChange={setShowSaveConfirm}
        onConfirm={handleSaveConfirm}
        type="save"
        isLoading={isUpdating}
        settingsType="RNR Reminder Settings"
      />
    </>
  );
}
