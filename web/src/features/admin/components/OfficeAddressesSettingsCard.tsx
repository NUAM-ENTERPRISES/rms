import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  MapPin,
  Phone,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { useCan } from "@/hooks/useCan";
import {
  useGetOfficeAddressesQuery,
  useUpdateOfficeAddressesMutation,
} from "@/features/admin/api";
import { SettingsConfirmDialog } from "./SettingsConfirmDialog";
import {
  SettingsCardShell,
  SettingsFormActions,
  SettingsFormPanel,
  SettingsInfoCallout,
  SettingsLoadingCard,
  SettingsSection,
  settingsFormLabelClass,
  settingsFieldClass,
} from "./settingsCardUi";
import { cn } from "@/lib/utils";

const officePresetSchema = z.object({
  label: z.string().trim().min(1, "Office name is required"),
  address: z.string().trim().min(1, "Address is required"),
  addressCountryCode: z.string().trim().min(1, "Country code is required"),
  addressStateId: z.string().nullable().optional(),
  pincode: z.string().optional(),
  phone: z.string().optional(),
  altPhone: z.string().optional(),
});

const officeAddressesSchema = z.object({
  kochi: officePresetSchema,
  delhi: officePresetSchema,
});

type OfficeAddressesFormData = z.infer<typeof officeAddressesSchema>;

const defaultValues: OfficeAddressesFormData = {
  kochi: {
    label: "Kochi Office",
    address: "",
    addressCountryCode: "IN",
    addressStateId: null,
    pincode: "",
    phone: "",
    altPhone: "",
  },
  delhi: {
    label: "Delhi Office",
    address: "",
    addressCountryCode: "IN",
    addressStateId: null,
    pincode: "",
    phone: "",
    altPhone: "",
  },
};

function OfficeDetailRow({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
        {label}
      </p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

function OfficeViewCard({
  title,
  preset,
  accent,
}: {
  title: string;
  preset: OfficeAddressesFormData["kochi"];
  accent: "primary" | "accent";
}) {
  return (
    <SettingsFormPanel accent={accent}>
      <div className="mb-4 flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-border/50 dark:ring-border",
            accent === "primary"
              ? "bg-primary-100 dark:!bg-muted/40"
              : "bg-accent-100 dark:!bg-muted/40",
          )}
        >
          <Building2
            className={cn(
              "h-5 w-5",
              accent === "primary"
                ? "text-primary-600 dark:text-primary-400"
                : "text-accent-600 dark:text-accent-400",
            )}
            aria-hidden
          />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground">{preset.label || title}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <OfficeDetailRow label="Pincode" value={preset.pincode ?? ""} />
        <OfficeDetailRow
          label="Primary phone"
          value={preset.phone ?? ""}
          icon={Phone}
        />
        <OfficeDetailRow
          label="Address"
          value={preset.address ?? ""}
          icon={MapPin}
          className="sm:col-span-2"
        />
        <OfficeDetailRow
          label="Alternate phone"
          value={preset.altPhone ?? ""}
          icon={Phone}
          className="sm:col-span-2"
        />
      </div>
    </SettingsFormPanel>
  );
}

function OfficeEditCard({
  title,
  prefix,
  control,
  accent,
}: {
  title: string;
  prefix: "kochi" | "delhi";
  control: ReturnType<typeof useForm<OfficeAddressesFormData>>["control"];
  accent: "primary" | "accent";
}) {
  const labelClass = settingsFormLabelClass(accent);

  return (
    <SettingsFormPanel accent={accent}>
      <div className="mb-4 flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-border/50 dark:ring-border",
            accent === "primary"
              ? "bg-primary-100 dark:!bg-muted/40"
              : "bg-accent-100 dark:!bg-muted/40",
          )}
        >
          <MapPin
            className={cn(
              "h-5 w-5",
              accent === "primary"
                ? "text-primary-600 dark:text-primary-400"
                : "text-accent-600 dark:text-accent-400",
            )}
            aria-hidden
          />
        </div>
        <h4 className="font-semibold text-foreground">{title}</h4>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name={`${prefix}.label`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Office name</FormLabel>
              <FormControl>
                <Input {...field} className={settingsFieldClass} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`${prefix}.pincode`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Pincode</FormLabel>
              <FormControl>
                <Input {...field} className={settingsFieldClass} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`${prefix}.address`}
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel className={labelClass}>Address</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} className={cn("resize-none", settingsFieldClass)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`${prefix}.phone`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Primary phone</FormLabel>
              <FormControl>
                <Input {...field} className={settingsFieldClass} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`${prefix}.altPhone`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Alternate phone</FormLabel>
              <FormControl>
                <Input {...field} className={settingsFieldClass} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </SettingsFormPanel>
  );
}

export function OfficeAddressesSettingsCard() {
  const canManage = useCan("manage:office_addresses");
  const [isEditing, setIsEditing] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingValues, setPendingValues] =
    useState<OfficeAddressesFormData | null>(null);

  const { data, isLoading, refetch, isFetching } = useGetOfficeAddressesQuery();
  const [updateOfficeAddresses, { isLoading: isUpdating }] =
    useUpdateOfficeAddressesMutation();

  const form = useForm<OfficeAddressesFormData>({
    resolver: zodResolver(officeAddressesSchema),
    defaultValues,
  });

  const resetFormFromData = () => {
    if (!data?.data) return;
    form.reset({
      kochi: {
        ...defaultValues.kochi,
        ...data.data.kochi,
        addressStateId: data.data.kochi.addressStateId ?? null,
      },
      delhi: {
        ...defaultValues.delhi,
        ...data.data.delhi,
        addressStateId: data.data.delhi.addressStateId ?? null,
      },
    });
  };

  const handleEditClick = () => {
    setShowEditConfirm(true);
  };

  const handleEditConfirm = () => {
    resetFormFromData();
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    resetFormFromData();
  };

  const handleFormSubmit = (values: OfficeAddressesFormData) => {
    setPendingValues(values);
    setShowSaveConfirm(true);
  };

  const handleInvalidSubmit = () => {
    toast.error("Complete required office address fields");
  };

  const handleSaveConfirm = async () => {
    if (!pendingValues) return;
    try {
      await updateOfficeAddresses({
        kochi: {
          ...pendingValues.kochi,
          addressStateId: pendingValues.kochi.addressStateId ?? null,
        },
        delhi: {
          ...pendingValues.delhi,
          addressStateId: pendingValues.delhi.addressStateId ?? null,
        },
      }).unwrap();
      toast.success("Office addresses updated successfully");
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
          : "Failed to update office addresses";
      toast.error(message);
      setShowSaveConfirm(false);
    }
  };

  if (isLoading) {
    return <SettingsLoadingCard label="Loading office addresses..." />;
  }

  const settings = data?.data;

  return (
    <>
      <SettingsCardShell
        accent="success"
        icon={Building2}
        title="Office Addresses"
        description="Manage Affiniks Kochi and Delhi office presets used in courier and document flows"
        canManage={canManage}
        isEditing={isEditing}
        editLabel="Edit Addresses"
        onEdit={handleEditClick}
        onRefresh={() => refetch()}
        isFetching={isFetching}
        viewOnlyMessage={
          !canManage
            ? "You have view-only access to office addresses."
            : undefined
        }
      >
        {isEditing ? (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleFormSubmit, handleInvalidSubmit)}
              className="space-y-6"
            >
              <SettingsSection icon={MapPin} title="Office locations">
                <div className="grid gap-4 lg:grid-cols-2">
                  <OfficeEditCard
                    title="Kochi Office"
                    prefix="kochi"
                    control={form.control}
                    accent="primary"
                  />
                  <OfficeEditCard
                    title="Delhi Office"
                    prefix="delhi"
                    control={form.control}
                    accent="accent"
                  />
                </div>
              </SettingsSection>

              <SettingsFormActions onCancel={handleCancel} accent="success" />
            </form>
          </Form>
        ) : (
          <div className="space-y-6">
            {settings ? (
              <SettingsSection icon={Building2} title="Office locations">
                <div className="grid gap-4 lg:grid-cols-2">
                  <OfficeViewCard
                    title="Kochi Office"
                    preset={settings.kochi}
                    accent="primary"
                  />
                  <OfficeViewCard
                    title="Delhi Office"
                    preset={settings.delhi}
                    accent="accent"
                  />
                </div>
              </SettingsSection>
            ) : (
              <p className="text-sm text-muted-foreground">
                No office address presets configured yet.
              </p>
            )}

            <SettingsInfoCallout icon={Phone} accent="success">
              Updates apply immediately to new courier legs and office address
              selections. Existing shipment snapshots are not changed.
            </SettingsInfoCallout>
          </div>
        )}
      </SettingsCardShell>

      <SettingsConfirmDialog
        open={showEditConfirm}
        onOpenChange={setShowEditConfirm}
        onConfirm={handleEditConfirm}
        type="edit"
        settingsType="Office Addresses"
      />
      <SettingsConfirmDialog
        open={showSaveConfirm}
        onOpenChange={setShowSaveConfirm}
        onConfirm={handleSaveConfirm}
        type="save"
        isLoading={isUpdating}
        settingsType="Office Addresses"
      />
    </>
  );
}
