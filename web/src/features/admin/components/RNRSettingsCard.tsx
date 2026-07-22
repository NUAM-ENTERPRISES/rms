import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Clock,
  Bell,
  Users,
  Edit,
  Zap,
  Timer,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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

import { useCan } from "@/hooks/useCan";
import {
  useGetRNRSettingsQuery,
  useUpdateRNRSettingsMutation,
} from "@/features/admin/api";
import { SettingsConfirmDialog } from "./SettingsConfirmDialog";
import {
  SettingMetric,
  SettingsCardShell,
  SettingsFieldPanel,
  SettingsFormActions,
  SettingsLoadingCard,
  SettingsRefreshButton,
  SettingsSection,
  formatStrategy,
} from "./settings-card-ui";

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

  const handleEditClick = () => setShowEditConfirm(true);

  const handleEditConfirm = () => {
    if (rnrData?.data) form.reset(rnrData.data);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (rnrData?.data) form.reset(rnrData.data);
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
    } catch (error: unknown) {
      const message =
        error &&
        typeof error === "object" &&
        "data" in error &&
        error.data &&
        typeof error.data === "object" &&
        "message" in error.data &&
        typeof error.data.message === "string"
          ? error.data.message
          : "Failed to update RNR settings";
      toast.error(message);
      setShowSaveConfirm(false);
    }
  };

  if (isLoading) {
    return <SettingsLoadingCard label="Loading RNR settings..." accent="sky" />;
  }

  const settings = rnrData?.data;

  return (
    <>
      <SettingsCardShell
        accent="sky"
        icon={Bell}
        title="RNR Reminder Settings"
        description="Configure reminders for Right to Represent workflow"
        actions={
          <>
            {canManage && !isEditing && (
              <Button
                type="button"
                size="sm"
                onClick={handleEditClick}
                className="rounded-xl bg-sky-600 text-white hover:bg-sky-700"
              >
                <Edit className="mr-2 h-4 w-4" aria-hidden />
                Edit Settings
              </Button>
            )}
            <SettingsRefreshButton onClick={() => refetch()} isFetching={isFetching} />
          </>
        }
      >
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
              <SettingsSection icon={Timer} title="Reminder Configuration">
                <SettingsFieldPanel accent="sky" className="md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="totalDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Days</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            min={1}
                            className="bg-background"
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
                        <FormLabel>Reminders Per Day</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            min={1}
                            className="bg-background"
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
                        <FormLabel>Delay Between (hours)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            min={0}
                            className="bg-background"
                          />
                        </FormControl>
                        <FormDescription>Hours between reminders</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFieldPanel>
              </SettingsSection>

              <Separator />

              <SettingsSection
                icon={Clock}
                title="Office Hours"
                action={
                  <FormField
                    control={form.control}
                    name="officeHours.enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 space-y-0">
                        <FormLabel className="text-sm font-normal text-muted-foreground">
                          {field.value ? "Enabled" : "Disabled"}
                        </FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                }
              >
                {form.watch("officeHours.enabled") && (
                  <SettingsFieldPanel accent="sky" className="grid-cols-2">
                    <FormField
                      control={form.control}
                      name="officeHours.start"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sky-800">Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} className="bg-background" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="officeHours.end"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sky-800">End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} className="bg-background" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </SettingsFieldPanel>
                )}
              </SettingsSection>

              <Separator />

              <SettingsSection
                icon={Users}
                title="Operations Assignment"
                action={
                  <FormField
                    control={form.control}
                    name="creAssignment.enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 space-y-0">
                        <FormLabel className="text-sm font-normal text-muted-foreground">
                          {field.value ? "Enabled" : "Disabled"}
                        </FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                }
              >
                {form.watch("creAssignment.enabled") && (
                  <SettingsFieldPanel accent="sky" className="md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="creAssignment.afterDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sky-800">Assign After Days</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              min={0}
                              className="bg-background"
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
                          <FormLabel className="text-sky-800">Assignment Strategy</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background">
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
                  </SettingsFieldPanel>
                )}
              </SettingsSection>

              <SettingsFormActions onCancel={handleCancel} accent="sky" />
            </form>
          </Form>
        ) : (
          <div className="space-y-8">
            <SettingsSection icon={Timer} title="Reminder Configuration">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <SettingMetric
                  label="Total Days"
                  value={`${settings?.totalDays || 0} days`}
                  icon={CalendarDays}
                  accent="sky"
                />
                <SettingMetric
                  label="Reminders Per Day"
                  value={`${settings?.remindersPerDay || 0} reminders`}
                  icon={Bell}
                  accent="sky"
                />
                <SettingMetric
                  label="Delay Between"
                  value={`${settings?.delayBetweenReminders || 0} hours`}
                  icon={Timer}
                  accent="sky"
                />
              </div>
            </SettingsSection>

            <Separator />

            <SettingsSection
              icon={Clock}
              title="Office Hours"
              badge={settings?.officeHours?.enabled ? "Enabled" : "Disabled"}
              badgeTone={settings?.officeHours?.enabled ? "success" : "neutral"}
            >
              {settings?.officeHours?.enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <SettingMetric
                    label="Start Time"
                    value={settings.officeHours.start}
                    icon={Zap}
                    accent="emerald"
                  />
                  <SettingMetric
                    label="End Time"
                    value={settings.officeHours.end}
                    icon={Clock}
                    accent="emerald"
                  />
                </div>
              )}
            </SettingsSection>

            <Separator />

            <SettingsSection
              icon={Users}
              title="Operations Assignment"
              badge={settings?.creAssignment?.enabled ? "Enabled" : "Disabled"}
              badgeTone={settings?.creAssignment?.enabled ? "success" : "neutral"}
            >
              {settings?.creAssignment?.enabled && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <SettingMetric
                    label="Assign After"
                    value={`${settings.creAssignment.afterDays} days`}
                    icon={CalendarDays}
                    accent="sky"
                  />
                  <SettingMetric
                    label="Strategy"
                    value={formatStrategy(settings.creAssignment.assignmentStrategy)}
                    icon={Zap}
                    accent="sky"
                  />
                </div>
              )}
            </SettingsSection>
          </div>
        )}
      </SettingsCardShell>

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
