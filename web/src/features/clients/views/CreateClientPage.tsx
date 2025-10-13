import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller, useWatch } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  User,
  Briefcase,
  Hospital,
  ExternalLink,
  Plus,
  X,
  Save,
} from "lucide-react";
import { useCreateClientMutation } from "@/features/clients";
import { useCan } from "@/hooks/useCan";
import {
  clientFormSchema,
  type ClientFormData,
} from "@/features/clients/schemas/client-schemas";

export default function CreateClientPage() {
  const navigate = useNavigate();
  const canCreateClients = useCan("manage:clients");

  const [createClient, { isLoading }] = useCreateClientMutation();
  const [newSpecialty, setNewSpecialty] = useState("");
  const [newLocation, setNewLocation] = useState("");

  // Use the main schema with conditional validation
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      type: "INDIVIDUAL",
      specialties: [],
      locations: [],
      commissionRate: 0,
    },
  });

  // Use useWatch for better performance
  const clientType = useWatch({ control: form.control, name: "type" });
  const specialties =
    useWatch({ control: form.control, name: "specialties" }) ?? [];
  const locations =
    useWatch({ control: form.control, name: "locations" }) ?? [];

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

      const result = await createClient(formData).unwrap();

      if (result.success) {
        toast.success("Client created successfully");
        navigate(`/clients/${result.data.id}`);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create client");
    }
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() && !specialties.includes(newSpecialty.trim())) {
      const updatedSpecialties = [...specialties, newSpecialty.trim()];
      form.setValue("specialties", updatedSpecialties, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setNewSpecialty("");
    }
  };

  const removeSpecialty = (index: number) => {
    const updatedSpecialties = specialties.filter((_, i) => i !== index);
    form.setValue("specialties", updatedSpecialties, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const addLocation = () => {
    if (newLocation.trim() && !locations.includes(newLocation.trim())) {
      const updatedLocations = [...locations, newLocation.trim()];
      form.setValue("locations", updatedLocations, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setNewLocation("");
    }
  };

  const removeLocation = (index: number) => {
    const updatedLocations = locations.filter((_, i) => i !== index);
    form.setValue("locations", updatedLocations, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  if (!canCreateClients) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Access Denied
              </CardTitle>
              <CardDescription className="text-slate-600">
                You don't have permission to create clients.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const getClientTypeIcon = (type: ClientFormData["type"]) => {
    switch (type) {
      case "INDIVIDUAL":
        return User;
      case "SUB_AGENCY":
        return Building2;
      case "HEALTHCARE_ORGANIZATION":
        return Hospital;
      case "EXTERNAL_SOURCE":
        return ExternalLink;
      default:
        return Briefcase;
    }
  };

  const ClientTypeIcon = getClientTypeIcon(clientType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
              Create Client
            </h1>
            <p className="text-slate-600 mt-1">
              Add a new client to the system
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/clients")}
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
                          form.setValue("locations", [], {
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
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                          <SelectValue placeholder="Select client type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INDIVIDUAL">
                            Individual Referrer
                          </SelectItem>
                          <SelectItem value="SUB_AGENCY">Sub Agency</SelectItem>
                          <SelectItem value="HEALTHCARE_ORGANIZATION">
                            Healthcare Organization
                          </SelectItem>
                          <SelectItem value="EXTERNAL_SOURCE">
                            External Source
                          </SelectItem>
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

                {/* Address */}
                <div className="space-y-2">
                  <Label
                    htmlFor="address"
                    className="text-sm font-medium text-slate-700"
                  >
                    Address
                  </Label>
                  <Controller
                    name="address"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="123 Main St, City, State"
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {form.formState.errors.address && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.address.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Referrer Details */}
          {clientType === "INDIVIDUAL" && (
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Individual Referrer Details
                </CardTitle>
                <CardDescription>
                  Specific information for individual referrers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Profession */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="profession"
                      className="text-sm font-medium text-slate-700"
                    >
                      Profession
                    </Label>
                    <Controller
                      name="profession"
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="e.g., Nurse, Doctor"
                          className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      )}
                    />
                    {form.formState.errors.profession && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.profession.message}
                      </p>
                    )}
                  </div>

                  {/* Organization */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="organization"
                      className="text-sm font-medium text-slate-700"
                    >
                      Organization
                    </Label>
                    <Controller
                      name="organization"
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="Current employer"
                          className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      )}
                    />
                    {form.formState.errors.organization && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.organization.message}
                      </p>
                    )}
                  </div>

                  {/* Relationship */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="relationship"
                      className="text-sm font-medium text-slate-700"
                    >
                      Relationship Type
                    </Label>
                    <Controller
                      name="relationship"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CURRENT_EMPLOYEE">
                              Current Employee
                            </SelectItem>
                            <SelectItem value="FORMER_EMPLOYEE">
                              Former Employee
                            </SelectItem>
                            <SelectItem value="NETWORK_CONTACT">
                              Network Contact
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.relationship && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.relationship.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sub Agency Details */}
          {clientType === "SUB_AGENCY" && (
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Sub Agency Details
                </CardTitle>
                <CardDescription>
                  Specific information for sub agencies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Agency Type */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="agencyType"
                      className="text-sm font-medium text-slate-700"
                    >
                      Agency Type
                    </Label>
                    <Controller
                      name="agencyType"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                            <SelectValue placeholder="Select agency type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOCAL">Local</SelectItem>
                            <SelectItem value="REGIONAL">Regional</SelectItem>
                            <SelectItem value="SPECIALIZED">
                              Specialized
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.agencyType && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.agencyType.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700">
                    Specialties
                  </Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Add specialty"
                      value={newSpecialty}
                      onChange={(e) => setNewSpecialty(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSpecialty();
                        }
                      }}
                      className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                    <Button type="button" onClick={addSpecialty} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {specialties.map((specialty, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
                        >
                          {specialty}
                          <button
                            type="button"
                            onClick={() => removeSpecialty(index)}
                            className="hover:text-blue-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Healthcare Organization Details */}
          {clientType === "HEALTHCARE_ORGANIZATION" && (
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <Hospital className="h-5 w-5 text-blue-600" />
                  Healthcare Organization Details
                </CardTitle>
                <CardDescription>
                  Specific information for healthcare organizations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Facility Type */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="facilityType"
                      className="text-sm font-medium text-slate-700"
                    >
                      Facility Type
                    </Label>
                    <Controller
                      name="facilityType"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                            <SelectValue placeholder="Select facility type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HOSPITAL">Hospital</SelectItem>
                            <SelectItem value="CLINIC">Clinic</SelectItem>
                            <SelectItem value="NURSING_HOME">
                              Nursing Home
                            </SelectItem>
                            <SelectItem value="MEDICAL_CENTER">
                              Medical Center
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.facilityType && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.facilityType.message}
                      </p>
                    )}
                  </div>

                  {/* Facility Size */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="facilitySize"
                      className="text-sm font-medium text-slate-700"
                    >
                      Facility Size
                    </Label>
                    <Controller
                      name="facilitySize"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                            <SelectValue placeholder="Select facility size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SMALL">Small</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="LARGE">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.facilitySize && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.facilitySize.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700">
                    Locations
                  </Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Add location"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addLocation();
                        }
                      }}
                      className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                    <Button type="button" onClick={addLocation} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {locations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {locations.map((location, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-md text-sm"
                        >
                          {location}
                          <button
                            type="button"
                            onClick={() => removeLocation(index)}
                            className="hover:text-green-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* External Source Details */}
          {clientType === "EXTERNAL_SOURCE" && (
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-blue-600" />
                  External Source Details
                </CardTitle>
                <CardDescription>
                  Specific information for external sources
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Source Type */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="sourceType"
                      className="text-sm font-medium text-slate-700"
                    >
                      Source Type
                    </Label>
                    <Controller
                      name="sourceType"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                            <SelectValue placeholder="Select source type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="JOB_BOARD">Job Board</SelectItem>
                            <SelectItem value="SOCIAL_MEDIA">
                              Social Media
                            </SelectItem>
                            <SelectItem value="REFERRAL_PLATFORM">
                              Referral Platform
                            </SelectItem>
                            <SelectItem value="INDUSTRY_EVENT">
                              Industry Event
                            </SelectItem>
                            <SelectItem value="COLD_OUTREACH">
                              Cold Outreach
                            </SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.sourceType && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.sourceType.message}
                      </p>
                    )}
                  </div>

                  {/* Source Name */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="sourceName"
                      className="text-sm font-medium text-slate-700"
                    >
                      Source Name
                    </Label>
                    <Controller
                      name="sourceName"
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="e.g., LinkedIn, Indeed"
                          className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      )}
                    />
                    {form.formState.errors.sourceName && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.sourceName.message}
                      </p>
                    )}
                  </div>

                  {/* Acquisition Method */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="acquisitionMethod"
                      className="text-sm font-medium text-slate-700"
                    >
                      Acquisition Method
                    </Label>
                    <Controller
                      name="acquisitionMethod"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                            <SelectValue placeholder="Select acquisition method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ORGANIC">Organic</SelectItem>
                            <SelectItem value="PAID">Paid</SelectItem>
                            <SelectItem value="PARTNERSHIP">
                              Partnership
                            </SelectItem>
                            <SelectItem value="REFERRAL">Referral</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.acquisitionMethod && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.acquisitionMethod.message}
                      </p>
                    )}
                  </div>

                  {/* Source Notes */}
                  <div className="space-y-2 md:col-span-2">
                    <Label
                      htmlFor="sourceNotes"
                      className="text-sm font-medium text-slate-700"
                    >
                      Source Notes
                    </Label>
                    <Controller
                      name="sourceNotes"
                      control={form.control}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          placeholder="Additional notes about this source"
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      )}
                    />
                    {form.formState.errors.sourceNotes && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.sourceNotes.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financial Information */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Financial Information
              </CardTitle>
              <CardDescription>
                Optional financial tracking and contract details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Relationship Type */}
                <div className="space-y-2">
                  <Label
                    htmlFor="relationshipType"
                    className="text-sm font-medium text-slate-700"
                  >
                    Relationship Type
                  </Label>
                  <Controller
                    name="relationshipType"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                          <SelectValue placeholder="Select relationship type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REFERRAL">Referral</SelectItem>
                          <SelectItem value="PARTNERSHIP">
                            Partnership
                          </SelectItem>
                          <SelectItem value="DIRECT_CLIENT">
                            Direct Client
                          </SelectItem>
                          <SelectItem value="EXTERNAL_SOURCE">
                            External Source
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.relationshipType && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.relationshipType.message}
                    </p>
                  )}
                </div>

                {/* Commission Rate */}
                <div className="space-y-2">
                  <Label
                    htmlFor="commissionRate"
                    className="text-sm font-medium text-slate-700"
                  >
                    Commission Rate (%)
                  </Label>
                  <Controller
                    name="commissionRate"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {form.formState.errors.commissionRate && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.commissionRate.message}
                    </p>
                  )}
                </div>

                {/* Payment Terms */}
                <div className="space-y-2">
                  <Label
                    htmlFor="paymentTerms"
                    className="text-sm font-medium text-slate-700"
                  >
                    Payment Terms
                  </Label>
                  <Controller
                    name="paymentTerms"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="e.g., Net 30, Net 60"
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {form.formState.errors.paymentTerms && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.paymentTerms.message}
                    </p>
                  )}
                </div>

                {/* Tax ID */}
                <div className="space-y-2">
                  <Label
                    htmlFor="taxId"
                    className="text-sm font-medium text-slate-700"
                  >
                    Tax ID
                  </Label>
                  <Controller
                    name="taxId"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="12-3456789"
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {form.formState.errors.taxId && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.taxId.message}
                    </p>
                  )}
                </div>

                {/* Contract Start Date */}
                <div className="space-y-2">
                  <Label
                    htmlFor="contractStartDate"
                    className="text-sm font-medium text-slate-700"
                  >
                    Contract Start Date
                  </Label>
                  <Controller
                    name="contractStartDate"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="date"
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {form.formState.errors.contractStartDate && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.contractStartDate.message}
                    </p>
                  )}
                </div>

                {/* Contract End Date */}
                <div className="space-y-2">
                  <Label
                    htmlFor="contractEndDate"
                    className="text-sm font-medium text-slate-700"
                  >
                    Contract End Date
                  </Label>
                  <Controller
                    name="contractEndDate"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="date"
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {form.formState.errors.contractEndDate && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.contractEndDate.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Billing Address */}
              <div className="space-y-2">
                <Label
                  htmlFor="billingAddress"
                  className="text-sm font-medium text-slate-700"
                >
                  Billing Address
                </Label>
                <Controller
                  name="billingAddress"
                  control={form.control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      placeholder="Billing address for invoices"
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  )}
                />
                {form.formState.errors.billingAddress && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.billingAddress.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/clients")}
              className="h-11 px-6 border-slate-200 hover:border-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !form.formState.isValid}
              className="h-11 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Client
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
