import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MessageCircle,
  Instagram,
  Facebook,
  Phone,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";

import { useCan } from "@/hooks/useCan";
import { LEADGEN_CHANNELS_MANAGE } from "@/features/admin/constants/system-settings-permissions";
import {
  useGetLeadgenChannelsSettingsQuery,
  useUpdateLeadgenChannelsSettingsMutation,
} from "@/features/admin/api";
import { SettingsConfirmDialog } from "./SettingsConfirmDialog";
import {
  SettingStatCard,
  SettingsCardShell,
  SettingsFormActions,
  SettingsFormPanel,
  SettingsLoadingCard,
  SettingsSection,
} from "./settingsCardUi";

const leadgenChannelsSchema = z.object({
  whatsapp: z.boolean(),
  instagram: z.boolean(),
  messenger: z.boolean(),
  leadgenForms: z.boolean(),
});

type LeadgenChannelsFormData = z.infer<typeof leadgenChannelsSchema>;

function channelStatusLabel(enabled: boolean): string {
  return enabled ? "Enabled" : "Disabled";
}

export function LeadgenChannelsSettingsCard() {
  const canManage = useCan([...LEADGEN_CHANNELS_MANAGE]);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingValues, setPendingValues] =
    useState<LeadgenChannelsFormData | null>(null);

  const {
    data: leadgenData,
    isLoading,
    refetch,
    isFetching,
  } = useGetLeadgenChannelsSettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] =
    useUpdateLeadgenChannelsSettingsMutation();

  const form = useForm<LeadgenChannelsFormData>({
    resolver: zodResolver(leadgenChannelsSchema),
    defaultValues: {
      whatsapp: true,
      instagram: true,
      messenger: true,
      leadgenForms: true,
    },
  });

  const handleEditClick = () => {
    setShowEditConfirm(true);
  };

  const handleEditConfirm = () => {
    if (leadgenData?.data) {
      form.reset(leadgenData.data);
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (leadgenData?.data) {
      form.reset(leadgenData.data);
    }
  };

  const handleFormSubmit = (values: LeadgenChannelsFormData) => {
    setPendingValues(values);
    setShowSaveConfirm(true);
  };

  const handleSaveConfirm = async () => {
    if (!pendingValues) return;
    try {
      await updateSettings(pendingValues).unwrap();
      toast.success("Leadgen channel settings updated successfully");
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
          : "Failed to update leadgen channel settings";
      toast.error(message);
      setShowSaveConfirm(false);
    }
  };

  if (isLoading) {
    return <SettingsLoadingCard label="Loading leadgen channel settings..." />;
  }

  const settings = leadgenData?.data;

  return (
    <>
      <SettingsCardShell
        accent="primary"
        icon={MessageCircle}
        title="Leadgen Channels"
        description="Enable or disable inbound Meta channels: WhatsApp, Instagram, Messenger, and Lead Ads forms"
        canManage={canManage}
        isEditing={isEditing}
        onEdit={handleEditClick}
        onRefresh={() => refetch()}
        isFetching={isFetching}
      >
        {isEditing ? (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleFormSubmit)}
              className="space-y-8"
            >
              <SettingsSection icon={MessageCircle} title="Channel Toggles">
                <SettingsFormPanel accent="primary">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="whatsapp"
                      render={({ field }) => (
                        <FormItem className="flex flex-col gap-3 space-y-0 rounded-lg border border-border/60 bg-card p-4">
                          <div className="flex items-center justify-between gap-3">
                            <FormLabel className="text-base font-semibold">
                              WhatsApp
                            </FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                aria-label="Enable WhatsApp leadgen"
                              />
                            </FormControl>
                          </div>
                          <FormDescription>
                            {channelStatusLabel(field.value)}. Inbound WhatsApp
                            Business Account webhooks.
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="instagram"
                      render={({ field }) => (
                        <FormItem className="flex flex-col gap-3 space-y-0 rounded-lg border border-border/60 bg-card p-4">
                          <div className="flex items-center justify-between gap-3">
                            <FormLabel className="text-base font-semibold">
                              Instagram
                            </FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                aria-label="Enable Instagram leadgen"
                              />
                            </FormControl>
                          </div>
                          <FormDescription>
                            {channelStatusLabel(field.value)}. Inbound Instagram
                            messaging webhooks.
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="messenger"
                      render={({ field }) => (
                        <FormItem className="flex flex-col gap-3 space-y-0 rounded-lg border border-border/60 bg-card p-4">
                          <div className="flex items-center justify-between gap-3">
                            <FormLabel className="text-base font-semibold">
                              Messenger
                            </FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                aria-label="Enable Messenger messaging"
                              />
                            </FormControl>
                          </div>
                          <FormDescription>
                            {channelStatusLabel(field.value)}. Facebook Page
                            Messenger messaging only.
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="leadgenForms"
                      render={({ field }) => (
                        <FormItem className="flex flex-col gap-3 space-y-0 rounded-lg border border-border/60 bg-card p-4">
                          <div className="flex items-center justify-between gap-3">
                            <FormLabel className="text-base font-semibold">
                              Meta Leadgen
                            </FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                aria-label="Enable Meta Leadgen forms"
                              />
                            </FormControl>
                          </div>
                          <FormDescription>
                            {channelStatusLabel(field.value)}. Facebook Lead Ads
                            form submissions.
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                </SettingsFormPanel>
              </SettingsSection>

              <SettingsFormActions onCancel={handleCancel} accent="primary" />
            </form>
          </Form>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
             <SettingStatCard
              accent="warning"
              icon={FileText}
              label="Meta Leadgen"
              value={channelStatusLabel(settings?.leadgenForms ?? true)}
            />
            <SettingStatCard
              accent="primary"
              icon={Facebook}
              label="Messenger"
              value={channelStatusLabel(settings?.messenger ?? true)}
            />
            <SettingStatCard
              accent="success"
              icon={Phone}
              label="WhatsApp"
              value={channelStatusLabel(settings?.whatsapp ?? true)}
            />
            <SettingStatCard
              accent="accent"
              icon={Instagram}
              label="Instagram"
              value={channelStatusLabel(settings?.instagram ?? true)}
            />
          </div>
        )}
      </SettingsCardShell>

      <SettingsConfirmDialog
        open={showEditConfirm}
        onOpenChange={setShowEditConfirm}
        onConfirm={handleEditConfirm}
        type="edit"
        settingsType="Leadgen Channel Settings"
      />
      <SettingsConfirmDialog
        open={showSaveConfirm}
        onOpenChange={setShowSaveConfirm}
        onConfirm={handleSaveConfirm}
        type="save"
        isLoading={isUpdating}
        settingsType="Leadgen Channel Settings"
      />
    </>
  );
}
