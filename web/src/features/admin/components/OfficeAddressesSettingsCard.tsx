import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  Edit,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoadingSpinner } from "@/components/ui";

import { useCan } from "@/hooks/useCan";
import {
  useGetOfficeAddressesQuery,
  useUpdateOfficeAddressesMutation,
} from "@/features/admin/api";
import { SettingsConfirmDialog } from "./SettingsConfirmDialog";

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

function OfficeViewSection({
  title,
  preset,
}: {
  title: string;
  preset: OfficeAddressesFormData["kochi"];
}) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Building2 className="h-4 w-4 text-teal-600" />
        {title}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-slate-500">Office name</p>
          <p className="text-sm text-slate-800">{preset.label || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Pincode</p>
          <p className="text-sm text-slate-800">{preset.pincode || "—"}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs font-medium text-slate-500">Address</p>
          <p className="text-sm text-slate-800">{preset.address || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Primary phone</p>
          <p className="text-sm text-slate-800">{preset.phone || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Alternate phone</p>
          <p className="text-sm text-slate-800">{preset.altPhone || "—"}</p>
        </div>
      </div>
    </div>
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
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <MapPin className="h-4 w-4 text-teal-600" />
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
                <Input {...field} className="bg-white" />
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
                <Input {...field} className="bg-white" />
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
                <Textarea {...field} rows={3} className="bg-white resize-none" />
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
                <Input {...field} className="bg-white" />
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
                <Input {...field} className="bg-white" />
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

  const handleEditClick = () => {
    setShowEditConfirm(true);
  };

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
      <Card className="overflow-hidden border-0 bg-white shadow-xl">
        <CardContent className="flex items-center justify-center py-20">
          <div className="space-y-4 text-center">
            <LoadingSpinner className="mx-auto h-10 w-10" />
            <p className="text-sm text-slate-500">Loading office addresses...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const settings = data?.data;

  return (
    <>
      <Card className="overflow-hidden border-0 bg-white shadow-xl">
        <CardHeader className="border-b bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-white/20 p-3 shadow-lg backdrop-blur-sm">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-white">
                  Office Addresses
                </CardTitle>
                <CardDescription className="mt-1 text-teal-100">
                  Manage Affiniks Kochi and Delhi office presets used in courier
                  and document flows
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canManage && !isEditing && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleEditClick}
                  className="border-0 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Addresses
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
                className="text-white hover:bg-white/20"
              >
                <RefreshCw
                  className={`h-5 w-5 ${isFetching ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {!canManage && !isEditing && (
            <p className="mb-4 text-sm text-slate-500">
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

                <div className="flex flex-wrap justify-end gap-3">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              {settings ? (
                <>
                  <OfficeViewSection title="Kochi Office" preset={settings.kochi} />
                  <Separator />
                  <OfficeViewSection title="Delhi Office" preset={settings.delhi} />
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  No office address presets configured yet.
                </p>
              )}

              <div className="flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50 p-4">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                <p className="text-xs text-teal-800">
                  Updates apply immediately to new courier legs and office address
                  selections. Existing shipment snapshots are not changed.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
