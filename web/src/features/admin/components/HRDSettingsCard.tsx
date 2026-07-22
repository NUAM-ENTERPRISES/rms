import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Clock,
  Bell,
  AlertTriangle,
  Edit,
  Zap,
  Timer,
  CalendarDays,
  FlaskConical,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
  useGetHRDSettingsQuery,
  useUpdateHRDSettingsMutation,
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

const hrdSettingsSchema = z.object({
  daysAfterSubmission: z.number().min(1, "Must be at least 1 day"),
  remindersPerDay: z.number().min(1, "Must be at least 1 reminder"),
  dailyTimes: z.array(z.string()),
  totalDays: z.number().min(1, "Must be at least 1 day"),
  delayBetweenReminders: z.number().min(0, "Must be 0 or more"),
  officeHours: z.object({
    enabled: z.boolean(),
    start: z.string(),
    end: z.string(),
  }),
  escalate: z.object({
    enabled: z.boolean(),
    afterDays: z.number().min(0),
    assignmentStrategy: z.enum(["round_robin", "load_balanced", "manual"]),
  }),
  testMode: z.object({
    enabled: z.boolean(),
    immediateDelayMinutes: z.number().min(0),
  }),
});

type HRDFormData = z.infer<typeof hrdSettingsSchema>;

export function HRDSettingsCard() {
  const canManage = useCan("manage:system_config");
  const [isEditing, setIsEditing] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingValues, setPendingValues] = useState<HRDFormData | null>(null);

  const { data: hrdData, isLoading, refetch, isFetching } = useGetHRDSettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateHRDSettingsMutation();

  const form = useForm<HRDFormData>({
    resolver: zodResolver(hrdSettingsSchema),
    defaultValues: {
      daysAfterSubmission: 2,
      remindersPerDay: 1,
      dailyTimes: ["09:00"],
      totalDays: 3,
      delayBetweenReminders: 1440,
      officeHours: {
        enabled: true,
        start: "09:00",
        end: "18:00",
      },
      escalate: {
        enabled: false,
        afterDays: 3,
        assignmentStrategy: "round_robin",
      },
      testMode: {
        enabled: false,
        immediateDelayMinutes: 1,
      },
    },
  });

  const handleEditClick = () => setShowEditConfirm(true);

  const handleEditConfirm = () => {
    if (hrdData?.data) form.reset(hrdData.data);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (hrdData?.data) form.reset(hrdData.data);
  };

  const handleFormSubmit = (values: HRDFormData) => {
    setPendingValues(values);
    setShowSaveConfirm(true);
  };

  const handleSaveConfirm = async () => {
    if (!pendingValues) return;
    try {
      await updateSettings(pendingValues).unwrap();
      toast.success("HRD settings updated successfully");
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
          : "Failed to update HRD settings";
      toast.error(message);
      setShowSaveConfirm(false);
    }
  };

  if (isLoading) {
    return <SettingsLoadingCard label="Loading HRD settings..." accent="amber" />;
  }

  const settings = hrdData?.data;

  return (
    <>
      <SettingsCardShell
        accent="amber"
        icon={ClipboardList}
        title="HRD Reminder Settings"
        description="Configure reminders for HRD document verification workflow"
        actions={
          <>
            {canManage && !isEditing && (
              <Button
                type="button"
                size="sm"
                onClick={handleEditClick}
                className="rounded-xl bg-amber-600 text-white hover:bg-amber-700"
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
                <SettingsFieldPanel
                  accent="amber"
                  className="md:grid-cols-2 lg:grid-cols-4"
                >
                  <FormField
                    control={form.control}
                    name="daysAfterSubmission"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Days After Submission</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            min={1}
                            className="bg-background"
                          />
                        </FormControl>
                        <FormDescription>Start reminders after</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                        <FormDescription>Daily reminders count</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="delayBetweenReminders"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delay Between (mins)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            min={0}
                            className="bg-background"
                          />
                        </FormControl>
                        <FormDescription>Minutes between reminders</FormDescription>
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
                  <SettingsFieldPanel accent="amber" className="grid-cols-2">
                    <FormField
                      control={form.control}
                      name="officeHours.start"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-amber-800">Start Time</FormLabel>
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
                          <FormLabel className="text-amber-800">End Time</FormLabel>
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
                icon={AlertTriangle}
                title="Escalation"
                action={
                  <FormField
                    control={form.control}
                    name="escalate.enabled"
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
                {form.watch("escalate.enabled") && (
                  <SettingsFieldPanel accent="amber" className="md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="escalate.afterDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-amber-800">Escalate After Days</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              min={0}
                              className="bg-background"
                            />
                          </FormControl>
                          <FormDescription>Days before escalation</FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="escalate.assignmentStrategy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-amber-800">Assignment Strategy</FormLabel>
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

              <Separator />

              <SettingsSection
                icon={FlaskConical}
                title="Test Mode"
                action={
                  <FormField
                    control={form.control}
                    name="testMode.enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 space-y-0">
                        <FormLabel className="text-sm font-normal text-muted-foreground">
                          {field.value ? "Active" : "Disabled"}
                        </FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                }
              >
                {form.watch("testMode.enabled") && (
                  <div className="space-y-4 rounded-2xl border border-danger-200 bg-danger-50/60 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className="mt-0.5 h-5 w-5 shrink-0 text-danger-600"
                        aria-hidden
                      />
                      <p className="text-xs text-danger-700">
                        Test mode is active. Reminders will be sent with reduced delays
                        for testing purposes.
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="testMode.immediateDelayMinutes"
                      render={({ field }) => (
                        <FormItem className="max-w-xs">
                          <FormLabel className="text-danger-700">
                            Immediate Delay (mins)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              min={0}
                              className="bg-background"
                            />
                          </FormControl>
                          <FormDescription>Minutes delay in test mode</FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </SettingsSection>

              <SettingsFormActions onCancel={handleCancel} accent="amber" />
            </form>
          </Form>
        ) : (
          <div className="space-y-8">
            <SettingsSection icon={Timer} title="Reminder Configuration">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                <SettingMetric
                  label="Days After Submission"
                  value={`${settings?.daysAfterSubmission || 0} days`}
                  icon={CalendarDays}
                  accent="amber"
                />
                <SettingMetric
                  label="Total Days"
                  value={`${settings?.totalDays || 0} days`}
                  icon={CalendarDays}
                  accent="amber"
                />
                <SettingMetric
                  label="Reminders Per Day"
                  value={`${settings?.remindersPerDay || 0} reminders`}
                  icon={Bell}
                  accent="amber"
                />
                <SettingMetric
                  label="Delay Between"
                  value={`${settings?.delayBetweenReminders || 0} mins`}
                  icon={Timer}
                  accent="amber"
                />
              </div>
              {settings?.dailyTimes && settings.dailyTimes.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Daily Times:
                  </span>
                  {settings.dailyTimes.map((time) => (
                    <Badge
                      key={time}
                      variant="outline"
                      className="border-amber-200 bg-amber-50 text-amber-800"
                    >
                      {time}
                    </Badge>
                  ))}
                </div>
              )}
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
              icon={AlertTriangle}
              title="Escalation"
              badge={settings?.escalate?.enabled ? "Enabled" : "Disabled"}
              badgeTone={settings?.escalate?.enabled ? "warning" : "neutral"}
            >
              {settings?.escalate?.enabled && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <SettingMetric
                    label="Escalate After"
                    value={`${settings.escalate.afterDays} days`}
                    icon={CalendarDays}
                    accent="amber"
                  />
                  <SettingMetric
                    label="Strategy"
                    value={formatStrategy(settings.escalate.assignmentStrategy)}
                    icon={Zap}
                    accent="amber"
                  />
                </div>
              )}
            </SettingsSection>

            <Separator />

            <SettingsSection
              icon={FlaskConical}
              title="Test Mode"
              badge={settings?.testMode?.enabled ? "Active" : "Disabled"}
              badgeTone={settings?.testMode?.enabled ? "danger" : "neutral"}
            >
              {settings?.testMode?.enabled && (
                <div className="space-y-3 rounded-2xl border border-danger-200 bg-danger-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className="h-5 w-5 shrink-0 text-danger-600"
                      aria-hidden
                    />
                    <p className="text-xs font-medium text-danger-700">
                      Test mode is currently active. Reminders are using reduced delays.
                    </p>
                  </div>
                  <SettingMetric
                    label="Immediate Delay"
                    value={`${settings.testMode.immediateDelayMinutes} mins`}
                    icon={Timer}
                    accent="danger"
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
        settingsType="HRD Reminder Settings"
      />
      <SettingsConfirmDialog
        open={showSaveConfirm}
        onOpenChange={setShowSaveConfirm}
        onConfirm={handleSaveConfirm}
        type="save"
        isLoading={isUpdating}
        settingsType="HRD Reminder Settings"
      />
    </>
  );
}
