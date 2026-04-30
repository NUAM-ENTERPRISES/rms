import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Briefcase,
  Handshake,
  X,
  Save,
} from "lucide-react";
import { useGetClientQuery, useUpdateClientMutation } from "@/features/clients";
import { useCan } from "@/hooks/useCan";
import {
  clientFormSchema,
  CLIENT_FORM_DEFAULT_VALUES,
  normalizeClientFormType,
  type ClientFormData,
} from "@/features/clients/schemas/client-schemas";
import {
  CLIENT_TYPE_LABELS,
  CLIENT_TYPES,
} from "@/features/clients/constants/client-types";
import { PhysicalAddressFields } from "@/components/molecules";

const INDIVIDUAL_RELATIONSHIPS = [
  "CURRENT_EMPLOYEE",
  "FORMER_EMPLOYEE",
  "NETWORK_CONTACT",
] as const;

const AGENCY_TYPES = ["LOCAL", "REGIONAL", "SPECIALIZED"] as const;

const FACILITY_TYPES = [
  "HOSPITAL",
  "CLINIC",
  "NURSING_HOME",
  "MEDICAL_CENTER",
] as const;

const FACILITY_SIZES = ["SMALL", "MEDIUM", "LARGE"] as const;

const SOURCE_TYPES = [
  "JOB_BOARD",
  "SOCIAL_MEDIA",
  "REFERRAL_PLATFORM",
  "INDUSTRY_EVENT",
  "COLD_OUTREACH",
  "OTHER",
] as const;

const ACQUISITION_METHODS = [
  "ORGANIC",
  "PAID",
  "PARTNERSHIP",
  "REFERRAL",
] as const;

const RELATIONSHIP_TYPES = [
  "REFERRAL",
  "PARTNERSHIP",
  "DIRECT_CLIENT",
  "EXTERNAL_SOURCE",
] as const;

function coerceOptionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  return (allowed as readonly string[]).includes(s) ? (s as T) : undefined;
}

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canUpdateClients = useCan("manage:clients");

  const [updateClient, { isLoading }] = useUpdateClientMutation();

  const {
    data: clientData,
    isLoading: isLoadingClient,
    error: clientError,
  } = useGetClientQuery(id!);

  // Use the main schema with conditional validation
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema) as Resolver<ClientFormData>,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: CLIENT_FORM_DEFAULT_VALUES,
  });

  // Use useWatch for better performance
  const watchedClientType = useWatch({ control: form.control, name: "type" });
  const clientType = watchedClientType ?? clientData?.data?.type;
  // Load client data into form
  useEffect(() => {
    if (clientData?.data) {
      const client = clientData.data;
      // console.log("Loading client data:", { clientType: client.type, client });

      // Reset form with client data - this sets the new default values
      form.reset({
        name: client.name,
        type: normalizeClientFormType(client.type),
        pointOfContact: client.pointOfContact || "",
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
        addressCountryCode: client.addressCountryCode || "",
        addressStateId: client.addressStateId || "",
        profession: client.profession || "",
        organization: client.organization || "",
        relationship: coerceOptionalEnum(
          client.relationship,
          INDIVIDUAL_RELATIONSHIPS,
        ),
        agencyType: coerceOptionalEnum(client.agencyType, AGENCY_TYPES),
        specialties: client.specialties || [],
        facilityType: coerceOptionalEnum(client.facilityType, FACILITY_TYPES),
        facilitySize: coerceOptionalEnum(client.facilitySize, FACILITY_SIZES),
        locations: client.locations || [],
        sourceType: coerceOptionalEnum(client.sourceType, SOURCE_TYPES),
        sourceName: client.sourceName || "",
        acquisitionMethod: coerceOptionalEnum(
          client.acquisitionMethod,
          ACQUISITION_METHODS,
        ),
        sourceNotes: client.sourceNotes || "",
        relationshipType: coerceOptionalEnum(
          client.relationshipType,
          RELATIONSHIP_TYPES,
        ),
        commissionRate: client.commissionRate ?? undefined,
        paymentTerms: client.paymentTerms || "",
        contractStartDate: client.contractStartDate ?? "",
        contractEndDate: client.contractEndDate ?? "",
        billingAddress: client.billingAddress || "",
        taxId: client.taxId || "",
      });
    }
  }, [clientData, form]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      // Prepare form data
      const formData = {
        ...data,
        // Convert empty strings to undefined
        pointOfContact: data.pointOfContact || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        addressCountryCode: data.addressCountryCode?.trim() || undefined,
        addressStateId: data.addressStateId?.trim() || undefined,
        profession: data.profession || undefined,
        organization: data.organization || undefined,
        sourceName: data.sourceName || undefined,
        sourceNotes: data.sourceNotes || undefined,
        paymentTerms: data.paymentTerms || undefined,
        billingAddress: data.billingAddress || undefined,
        taxId: data.taxId || undefined,
        contractStartDate: data.contractStartDate || undefined,
        contractEndDate: data.contractEndDate || undefined,
      };

      const result = await updateClient({
        id: id!,
        ...formData,
      }).unwrap();

      if (result.success) {
        toast.success("Client updated successfully");
        navigate(`/clients/${id}`);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update client");
    }
  };

  if (!canUpdateClients) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Access Denied
              </CardTitle>
              <CardDescription className="text-slate-600">
                You don't have permission to edit clients.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoadingClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Loading Client...
              </CardTitle>
              <CardDescription className="text-slate-600">
                Please wait while we load the client details.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (clientError || !clientData?.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Client Not Found
              </CardTitle>
              <CardDescription className="text-slate-600">
                The client you're looking for doesn't exist or has been removed.
              </CardDescription>
              <Button onClick={() => navigate("/clients")} className="mt-4">
                Back to Clients
              </Button>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const getClientTypeIcon = (type: ClientFormData["type"]) => {
    switch (type) {
      case "DIRECT_CLIENT":
        return Briefcase;
      case "SUB_AGENT":
        return Building2;
      case "FREELANCE":
        return Handshake;
      default:
        return Briefcase;
    }
  };

  const ClientTypeIcon = getClientTypeIcon(clientType);

  // Debug form state (remove this in production)
  // console.log("Form State Debug:", {
  //   isDirty: form.formState.isDirty,
  //   isValid: form.formState.isValid,
  //   errors: form.formState.errors,
  //   clientType,
  //   formValue: form.getValues("type"),
  //   clientDataType: clientData?.data?.type,
  //   watchedClientType,
  // });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
              Edit Client
            </h1>
            <p className="text-slate-600 mt-1">
              Update client details and information
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/clients/${id}`)}
            className="h-11 px-6 border-slate-200 hover:border-slate-300"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Client Information */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <ClientTypeIcon className="h-5 w-5 text-blue-600" />
                Client Details
              </CardTitle>
              <CardDescription>
                Basic information about the client
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client Name */}
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-sm font-medium text-slate-700"
                  >
                    Client Name *
                  </Label>
                  <Controller
                    name="name"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="e.g., John Smith, ABC Healthcare"
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Client Type */}
                <div className="space-y-2">
                  <Label
                    htmlFor="type"
                    className="text-sm font-medium text-slate-700"
                  >
                    Client Type *
                  </Label>
                  <Controller
                    name="type"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Clear type-specific fields when type changes
                          form.setValue("profession", "", {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          form.setValue("organization", "", {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          form.setValue("agencyType", undefined, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          form.setValue("specialties", [], {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          form.setValue("facilityType", undefined, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          form.setValue("facilitySize", undefined, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          form.setValue("sourceType", undefined, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          form.setValue("sourceName", "", {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          form.setValue("acquisitionMethod", undefined, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                        value={field.value ?? CLIENT_FORM_DEFAULT_VALUES.type}
                      >
                        <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                          <SelectValue placeholder="Select client type" />
                        </SelectTrigger>
                        <SelectContent>
                          {CLIENT_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {CLIENT_TYPE_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.type && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.type.message}
                    </p>
                  )}
                </div>

                {/* Point of Contact */}
                <div className="space-y-2">
                  <Label
                    htmlFor="pointOfContact"
                    className="text-sm font-medium text-slate-700"
                  >
                    Point of Contact
                  </Label>
                  <Controller
                    name="pointOfContact"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Contact person name"
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {form.formState.errors.pointOfContact && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.pointOfContact.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-slate-700"
                  >
                    Email
                  </Label>
                  <Controller
                    name="email"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        type="email"
                        placeholder="client@example.com"
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="text-sm font-medium text-slate-700"
                  >
                    Phone
                  </Label>
                  <Controller
                    name="phone"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="+1 (555) 123-4567"
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                {/* Address (optional) */}
                <div className="md:col-span-2">
                  <PhysicalAddressFields
                    control={form.control}
                    setValue={form.setValue}
                    errors={form.formState.errors}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/clients/${id}`)}
              className="h-11 px-6 border-slate-200 hover:border-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading || !form.formState.isDirty || !form.formState.isValid
              }
              className="h-11 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Client
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
