import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  Edit,
  MapPin,
  Phone,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  SettingsLoadingCard,
  SettingsRefreshButton,
} from "./settings-card-ui";
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

function FieldReadout({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

function OfficeViewSection({
  title,
  preset,
}: {
  title: string;
  preset: OfficeAddressesFormData["kochi"];
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/70 via-white to-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3 border-b border-teal-100/80 bg-teal-50/40 px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
          <Building2 className="h-4 w-4" aria-hidden />
        </span>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <FieldReadout label="Office name" value={preset.label} />
        <FieldReadout label="Pincode" value={preset.pincode} />
        <FieldReadout
          label="Address"
          value={preset.address}
          className="sm:col-span-2"
        />
        <FieldReadout label="Primary phone" value={preset.phone} />
        <FieldReadout label="Alternate phone" value={preset.altPhone} />
      </div>
    </article>
  );
}

function OfficeEditSection({
  title,
  prefix,
  control,
}: {
  title: string;
  prefix: "kochi" | "delhi";
  control: ReturnType<typeof useForm<OfficeAddressesFormData>>["control"];
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-teal-100 bg-teal-50/40 p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
          <MapPin className="h-4 w-4" aria-hidden />
        </span>
        {title}
      </h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name={`${prefix}.label`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Office name</FormLabel>
              <FormControl>
                <Input {...field} className="bg-background" />
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
              <FormLabel>Pincode</FormLabel>
              <FormControl>
                <Input {...field} className="bg-background" />
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
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} className="resize-none bg-background" />
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
              <FormLabel>Primary phone</FormLabel>
              <FormControl>
                <Input {...field} className="bg-background" />
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
              <FormLabel>Alternate phone</FormLabel>
              <FormControl>
                <Input {...field} className="bg-background" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
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

  const handleEditClick = () => setShowEditConfirm(true);

  const handleEditConfirm = () => {
    if (data?.data) {
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
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (data?.data) {
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
    }
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
    return (
      <SettingsLoadingCard label="Loading office addresses..." accent="teal" />
    );
  }

  const settings = data?.data;

  return (
    <>
      <SettingsCardShell
        accent="teal"
        icon={Building2}
        title="Office Addresses"
        description="Manage Affiniks Kochi and Delhi office presets used in courier and document flows"
        actions={
          <>
            {canManage && !isEditing && (
              <Button
                type="button"
                size="sm"
                onClick={handleEditClick}
                className="rounded-xl bg-teal-600 text-white hover:bg-teal-700"
              >
                <Edit className="mr-2 h-4 w-4" aria-hidden />
                Edit Addresses
              </Button>
            )}
            <SettingsRefreshButton onClick={() => refetch()} isFetching={isFetching} />
          </>
        }
      >
        {!canManage && !isEditing && (
          <p className="mb-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            You have view-only access to office addresses.
          </p>
        )}

        {isEditing ? (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleFormSubmit, handleInvalidSubmit)}
              className="space-y-6"
            >
              <OfficeEditSection
                title="Kochi Office"
                prefix="kochi"
                control={form.control}
              />
              <OfficeEditSection
                title="Delhi Office"
                prefix="delhi"
                control={form.control}
              />
              <SettingsFormActions onCancel={handleCancel} accent="teal" />
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            {settings ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <OfficeViewSection title="Kochi Office" preset={settings.kochi} />
                <OfficeViewSection title="Delhi Office" preset={settings.delhi} />
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
                No office address presets configured yet.
              </p>
            )}

            <div className="flex items-start gap-3 rounded-2xl border border-teal-100 bg-teal-50/70 p-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                <Info className="h-4 w-4" aria-hidden />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium text-teal-900">Applies to new flows</p>
                <p className="text-xs leading-relaxed text-teal-800">
                  Updates apply immediately to new courier legs and office address
                  selections. Existing shipment snapshots are not changed.
                </p>
                <p className="flex items-center gap-1.5 pt-1 text-xs text-teal-700">
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  Keep primary and alternate numbers current for ops handoff.
                </p>
              </div>
            </div>
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
