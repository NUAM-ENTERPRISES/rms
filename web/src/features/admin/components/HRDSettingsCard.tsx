import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Clock,
  Bell,
  AlertTriangle,
  Zap,
  Timer,
  CalendarDays,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  formatAssignmentStrategy,
  SettingStatCard,
  SettingsCardShell,
  SettingsDivider,
  SettingsFormActions,
  SettingsFormPanel,
  SettingsInfoCallout,
  SettingsLoadingCard,
  SettingsSection,
  settingsFormLabelClass,
  settingsFieldClass,
} from "./settingsCardUi";

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

  const handleEditClick = () => {
    setShowEditConfirm(true);
  };

  const handleEditConfirm = () => {
    if (hrdData?.data) {
      form.reset(hrdData.data);
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (hrdData?.data) {
      form.reset(hrdData.data);
    }
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
    return <SettingsLoadingCard label="Loading HRD settings..." />;
  }

  const settings = hrdData?.data;
  const warningLabel = settingsFormLabelClass("warning");
  const dangerLabel = settingsFormLabelClass("danger");

  return (
    <>
      <SettingsCardShell
        accent="accent"
        icon={Bell}
        title="HRD Reminder Settings"
        description="Configure reminders for HRD document verification workflow"
        canManage={canManage}
        isEditing={isEditing}
        onEdit={handleEditClick}
        onRefresh={() => refetch()}
        isFetching={isFetching}
      >
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
              <SettingsSection icon={Timer} title="Reminder Configuration">
                <SettingsFormPanel accent="accent">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                              className={settingsFieldClass}
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
                              className={settingsFieldClass}
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
                              className={settingsFieldClass}
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
                              className={settingsFieldClass}
                            />
                          </FormControl>
                          <FormDescription>Minutes between reminders</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </SettingsFormPanel>
              </SettingsSection>

              <SettingsDivider />

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
                  <SettingsFormPanel accent="success">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="officeHours.start"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={settingsFormLabelClass("success")}>
                              Start Time
                            </FormLabel>
                            <FormControl>
                              <Input type="time" {...field} className={settingsFieldClass} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="officeHours.end"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={settingsFormLabelClass("success")}>
                              End Time
                            </FormLabel>
                            <FormControl>
                              <Input type="time" {...field} className={settingsFieldClass} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </SettingsFormPanel>
                )}
              </SettingsSection>

              <SettingsDivider />

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
                  <SettingsFormPanel accent="warning">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="escalate.afterDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={warningLabel}>Escalate After Days</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                min={0}
                                className={settingsFieldClass}
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
                            <FormLabel className={warningLabel}>Assignment Strategy</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className={settingsFieldClass}>
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
                  </SettingsFormPanel>
                )}
              </SettingsSection>

              <SettingsDivider />

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
                  <SettingsFormPanel accent="danger">
                    <SettingsInfoCallout icon={AlertTriangle} accent="danger">
                      Test mode is active. Reminders will be sent with reduced delays
                      for testing purposes.
                    </SettingsInfoCallout>
                    <div className="mt-4">
                      <FormField
                        control={form.control}
                        name="testMode.immediateDelayMinutes"
                        render={({ field }) => (
                          <FormItem className="max-w-xs">
                            <FormLabel className={dangerLabel}>
                              Immediate Delay (mins)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                min={0}
                                className={settingsFieldClass}
                              />
                            </FormControl>
                            <FormDescription>Minutes delay in test mode</FormDescription>
                          </FormItem>
                        )}
                      />
                    </div>
                  </SettingsFormPanel>
                )}
              </SettingsSection>

              <SettingsFormActions onCancel={handleCancel} accent="accent" />
            </form>
          </Form>
        ) : (
          <div className="space-y-8">
            <SettingsSection icon={Timer} title="Reminder Configuration">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <SettingStatCard
                  label="Days After Submission"
                  value={`${settings?.daysAfterSubmission || 0} days`}
                  icon={CalendarDays}
                  accent="accent"
                />
                <SettingStatCard
                  label="Total Days"
                  value={`${settings?.totalDays || 0} days`}
                  icon={CalendarDays}
                  accent="accent"
                />
                <SettingStatCard
                  label="Reminders Per Day"
                  value={`${settings?.remindersPerDay || 0} reminders`}
                  icon={Bell}
                  accent="accent"
                />
                <SettingStatCard
                  label="Delay Between"
                  value={`${settings?.delayBetweenReminders || 0} mins`}
                  icon={Timer}
                  accent="accent"
                />
              </div>
              {settings?.dailyTimes && settings.dailyTimes.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Daily times
                  </span>
                  {settings.dailyTimes.map((time, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="border-accent-200 bg-accent-50 text-accent-700 dark:!border-border dark:!bg-muted/30 dark:text-accent-300"
                    >
                      {time}
                    </Badge>
                  ))}
                </div>
              )}
            </SettingsSection>

            <SettingsDivider />

            <SettingsSection
              icon={Clock}
              title="Office Hours"
              badge={settings?.officeHours?.enabled ? "Enabled" : "Disabled"}
              badgeVariant={settings?.officeHours?.enabled ? "default" : "secondary"}
            >
              {settings?.officeHours?.enabled && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SettingStatCard
                    label="Start Time"
                    value={settings.officeHours.start}
                    icon={Zap}
                    accent="success"
                  />
                  <SettingStatCard
                    label="End Time"
                    value={settings.officeHours.end}
                    icon={Clock}
                    accent="success"
                  />
                </div>
              )}
            </SettingsSection>

            <SettingsDivider />

            <SettingsSection
              icon={AlertTriangle}
              title="Escalation"
              badge={settings?.escalate?.enabled ? "Enabled" : "Disabled"}
              badgeVariant={settings?.escalate?.enabled ? "default" : "secondary"}
            >
              {settings?.escalate?.enabled && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <SettingStatCard
                    label="Escalate After"
                    value={`${settings.escalate.afterDays} days`}
                    icon={CalendarDays}
                    accent="warning"
                  />
                  <SettingStatCard
                    label="Strategy"
                    value={formatAssignmentStrategy(settings.escalate.assignmentStrategy)}
                    icon={Zap}
                    accent="warning"
                  />
                </div>
              )}
            </SettingsSection>

            <SettingsDivider />

            <SettingsSection
              icon={FlaskConical}
              title="Test Mode"
              badge={settings?.testMode?.enabled ? "Active" : "Disabled"}
              badgeVariant={settings?.testMode?.enabled ? "destructive" : "secondary"}
            >
              {settings?.testMode?.enabled && (
                <SettingsFormPanel accent="danger">
                  <SettingsInfoCallout icon={AlertTriangle} accent="danger">
                    Test mode is currently active. Reminders are using reduced delays.
                  </SettingsInfoCallout>
                  <div className="mt-4 max-w-xs">
                    <SettingStatCard
                      label="Immediate Delay"
                      value={`${settings.testMode.immediateDelayMinutes} mins`}
                      icon={Timer}
                      accent="danger"
                    />
                  </div>
                </SettingsFormPanel>
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
