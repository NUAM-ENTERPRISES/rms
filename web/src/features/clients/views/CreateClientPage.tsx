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
  Users,
  Globe,
  Stethoscope,
  Home,
  UserCheck,
  Building,
  MapPin,
  Share2,
  Calendar,
  Mail,
  Search,
  DollarSign,
  Handshake,
  UserPlus,
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
     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-8 border-b border-gray-200">
  <div className="flex items-center gap-4 gap-5">
    {/* Premium Icon */}
    <div className="relative">
      <div className="absolute inset-0 blur-xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-30 scale-150"></div>
      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl flex items-center justify-center">
        <Users className="h-7 w-7 text-white" />
      </div>
    </div>

    {/* Title & Subtitle */}
    <div className="space-y-1.5">
      <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
        Create Client
      </h1>
      <p className="text-lg text-slate-600">
        Add a new client to your system
      </p>
    </div>
  </div>

  {/* Cancel Button */}
  <Button
    variant="outline"
    size="lg"
    onClick={() => navigate("/clients")}
    className="h-12 px-6 rounded-xl border border-slate-300 hover:border-slate-400
               bg-white hover:bg-slate-50 text-slate-700 font-medium
               shadow-sm hover:shadow-md transition-all duration-300
               group min-w-fit"
  >
    <X className="h-4.5 w-4.5 mr-2.5 group-hover:rotate-90 transition-transform duration-300" />
    Cancel
  </Button>
</div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Client Information */}
          <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden">
  <CardHeader className="pb-8 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-transparent">
    <div className="flex items-center gap-4">
      {/* Premium Icon with subtle glow */}
      <div className="relative">
        <div className="absolute inset-0 blur-xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-30 scale-125"></div>
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl flex items-center justify-center">
          <ClientTypeIcon className="h-7 w-7 text-white" />
        </div>
      </div>

      <div>
        <CardTitle className="text-2xl font-bold text-slate-900">
          Client Details
        </CardTitle>
        <CardDescription className="text-base text-slate-600 mt-1.5">
          Enter basic information about the client
        </CardDescription>
      </div>
    </div>
  </CardHeader>

  <CardContent className="pt-2 px-8 pb-10">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
      {/* Client Name */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <span>Client Name</span>
          <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="name"
          control={form.control}
          render={({ field }) => (
            <Input
              {...field}
              id="name"
              placeholder="e.g., Dr. Sarah Johnson, Apex Medical Center"
              className="h-12 text-base rounded-xl border-slate-200 focus:border-blue-500 
                         focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 
                         placeholder:text-slate-400"
            />
          )}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-600 font-medium">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      {/* Client Type */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <span>Client Type</span>
          <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="type"
          control={form.control}
          render={({ field }) => (
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                // Clear type-specific fields when type changes
                form.setValue("profession", "", { shouldDirty: true, shouldValidate: true });
                form.setValue("organization", "", { shouldDirty: true, shouldValidate: true });
                form.setValue("agencyType", undefined, { shouldDirty: true, shouldValidate: true });
                form.setValue("specialties", [], { shouldDirty: true, shouldValidate: true });
                form.setValue("facilityType", undefined, { shouldDirty: true, shouldValidate: true });
                form.setValue("facilitySize", undefined, { shouldDirty: true, shouldValidate: true });
                form.setValue("locations", [], { shouldDirty: true, shouldValidate: true });
                form.setValue("sourceType", undefined, { shouldDirty: true, shouldValidate: true });
                form.setValue("sourceName", "", { shouldDirty: true, shouldValidate: true });
                form.setValue("acquisitionMethod", undefined, { shouldDirty: true, shouldValidate: true });
              }}
              value={field.value}
            >
              <SelectTrigger 
                id="type"
                className="h-12 rounded-xl border-slate-200 focus:border-blue-500 
                           focus:ring-4 focus:ring-blue-500/10"
              >
                <SelectValue placeholder="Select client type" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-xl border-0">
                <SelectItem value="INDIVIDUAL" className="py-3 hover:bg-blue-50 focus:bg-blue-50">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    Individual Referrer
                  </div>
                </SelectItem>
                <SelectItem value="SUB_AGENCY" className="py-3 hover:bg-purple-50 focus:bg-purple-50">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    Sub Agency
                  </div>
                </SelectItem>
                <SelectItem value="HEALTHCARE_ORGANIZATION" className="py-3 hover:bg-emerald-50 focus:bg-emerald-50">
                  <div className="flex items-center gap-3">
                    <Hospital className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    Healthcare Organization
                  </div>
                </SelectItem>
                <SelectItem value="EXTERNAL_SOURCE" className="py-3 hover:bg-amber-50 focus:bg-amber-50">
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    External Source
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.type && (
          <p className="text-sm text-red-600 font-medium">
            {form.formState.errors.type.message}
          </p>
        )}
      </div>

      {/* Point of Contact */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-slate-700">Point of Contact</Label>
        <Controller
          name="pointOfContact"
          control={form.control}
          render={({ field }) => (
            <Input
              {...field}
              id="pointOfContact"
              placeholder="e.g., Dr. Michael Chen"
              className="h-12 rounded-xl border-slate-200 focus:border-blue-500 
                         focus:ring-4 focus:ring-blue-500/10"
            />
          )}
        />
        {form.formState.errors.pointOfContact && (
          <p className="text-sm text-red-600 font-medium">
            {form.formState.errors.pointOfContact.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-slate-700">Email</Label>
        <Controller
          name="email"
          control={form.control}
          render={({ field }) => (
            <Input
              {...field}
              id="email"
              type="email"
              placeholder="client@company.com"
              className="h-12 rounded-xl border-slate-200 focus:border-blue-500 
                         focus:ring-4 focus:ring-blue-500/10"
            />
          )}
        />
        {form.formState.errors.email && (
          <p className="text-sm text-red-600 font-medium">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-slate-700">Phone</Label>
        <Controller
          name="phone"
          control={form.control}
          render={({ field }) => (
            <Input
              {...field}
              id="phone"
              placeholder="+1 (555) 123-4567"
              className="h-12 rounded-xl border-slate-200 focus:border-blue-500 
                         focus:ring-4 focus:ring-blue-500/10"
            />
          )}
        />
        {form.formState.errors.phone && (
          <p className="text-sm text-red-600 font-medium">
            {form.formState.errors.phone.message}
          </p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-slate-700">Address</Label>
        <Controller
          name="address"
          control={form.control}
          render={({ field }) => (
            <Input
              {...field}
              id="address"
              placeholder="123 Health St, Medical City, State 90210"
              className="h-12 rounded-xl border-slate-200 focus:border-blue-500 
                         focus:ring-4 focus:ring-blue-500/10"
            />
          )}
        />
        {form.formState.errors.address && (
          <p className="text-sm text-red-600 font-medium">
            {form.formState.errors.address.message}
          </p>
        )}
      </div>
    </div>
  </CardContent>
</Card>

          {/* Individual Referrer Details */}
          {clientType === "INDIVIDUAL" && (
            <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden">
  <CardHeader className="pb-8 bg-gradient-to-r from-blue-600/5 via-sky-600/5 to-transparent">
    <div className="flex items-center gap-5">
      {/* Stunning glowing icon */}
      <div className="relative">
        <div className="absolute inset-0 blur-xl bg-gradient-to-r from-blue-600 to-sky-600 opacity-40 scale-125"></div>
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-700 shadow-2xl flex items-center justify-center">
          <User className="h-7 w-7 text-white" />
        </div>
      </div>

      <div>
        <CardTitle className="text-2xl font-bold text-slate-900">
          Individual Referrer Details
        </CardTitle>
        <CardDescription className="text-base text-slate-600 mt-1.5">
          Additional info for individual healthcare professionals and contacts
        </CardDescription>
      </div>
    </div>
  </CardHeader>

  <CardContent className="pt-4 px-8 pb-10">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Profession */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          Profession
        </Label>
        <Controller
          name="profession"
          control={form.control}
          render={({ field }) => (
            <Input
              {...field}
              id="profession"
              placeholder="e.g., Registered Nurse, Physician, Therapist"
              className="h-12 rounded-xl border-slate-200 focus:border-blue-500 
                         focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 
                         text-base placeholder:text-slate-400"
            />
          )}
        />
        {form.formState.errors.profession && (
          <p className="text-sm text-red-600 font-medium">
            {form.formState.errors.profession.message}
          </p>
        )}
      </div>

      {/* Organization */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-slate-700">
          Current Organization
        </Label>
        <Controller
          name="organization"
          control={form.control}
          render={({ field }) => (
            <Input
              {...field}
              id="organization"
              placeholder="e.g., St. Mary’s Hospital, Private Practice"
              className="h-12 rounded-xl border-slate-200 focus:border-blue-500 
                         focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
            />
          )}
        />
        {form.formState.errors.organization && (
          <p className="text-sm text-red-600 font-medium">
            {form.formState.errors.organization.message}
          </p>
        )}
      </div>

      {/* Relationship Type */}
      <div className="space-y-3 md:col-span-2">
        <Label className="text-sm font-semibold text-slate-700">
          How do you know this referrer?
        </Label>
        <Controller
          name="relationship"
          control={form.control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger 
                id="relationship"
                className="h-12 rounded-xl border-slate-200 focus:border-blue-500 
                           focus:ring-4 focus:ring-blue-500/10"
              >
                <SelectValue placeholder="Select relationship type" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-xl border-0">
                <SelectItem value="CURRENT_EMPLOYEE" className="py-3 hover:bg-blue-50">
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    Current Employee / Colleague
                  </div>
                </SelectItem>
                <SelectItem value="FORMER_EMPLOYEE" className="py-3 hover:bg-indigo-50">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-indigo-600" />
                    Former Employee / Colleague
                  </div>
                </SelectItem>
                <SelectItem value="NETWORK_CONTACT" className="py-3 hover:bg-purple-50">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-purple-600" />
                    Network Contact / Conference / Referral
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.relationship && (
          <p className="text-sm text-red-600 font-medium">
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
           <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden">
  <CardHeader className="pb-8 bg-gradient-to-r from-emerald-600/5 via-teal-600/5 to-transparent">
    <div className="flex items-center gap-5">
      {/* Stunning glowing hospital icon */}
      <div className="relative">
        <div className="absolute inset-0 blur-xl bg-gradient-to-r from-emerald-600 to-teal-600 opacity-40 scale-125"></div>
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 shadow-2xl flex items-center justify-center">
          <Hospital className="h-7 w-7 text-white" />
        </div>
      </div>

      <div>
        <CardTitle className="text-2xl font-bold text-slate-900">
          Healthcare Organization Details
        </CardTitle>
        <CardDescription className="text-base text-slate-600 mt-1.5">
          Facility type, size, and service locations
        </CardDescription>
      </div>
    </div>
  </CardHeader>

  <CardContent className="pt-4 px-8 pb-10 space-y-10">
    {/* Facility Type & Size */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Facility Type */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-slate-700">
          Facility Type
        </Label>
        <Controller
          name="facilityType"
          control={form.control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger 
                id="facilityType"
                className="h-12 rounded-xl border-slate-200 focus:border-emerald-500 
                           focus:ring-4 focus:ring-emerald-500/10 transition-all"
              >
                <SelectValue placeholder="Select facility type" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-xl border-0">
                <SelectItem value="HOSPITAL" className="py-3 hover:bg-emerald-50">
                  <div className="flex items-center gap-3">
                    <Hospital className="h-4 w-4 text-emerald-600" />
                    Hospital
                  </div>
                </SelectItem>
                <SelectItem value="CLINIC" className="py-3 hover:bg-teal-50">
                  <div className="flex items-center gap-3">
 <Stethoscope className="h-4 w-4 text-teal-600" />
                    Clinic / Outpatient Center
                  </div>
                </SelectItem>
                <SelectItem value="NURSING_HOME" className="py-3 hover:bg-cyan-50">
                  <div className="flex items-center gap-3">
 <Home className="h-4 w-4 text-cyan-600" />
                    Nursing Home / Long-Term Care
                  </div>
                </SelectItem>
                <SelectItem value="MEDICAL_CENTER" className="py-3 hover:bg-green-50">
                  <div className="flex items-center gap-3">
 <Building2 className="h-4 w-4 text-green-600" />
                    Medical Center / Multi-Specialty
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.facilityType && (
          <p className="text-sm text-red-600 font-medium mt-2">
            {form.formState.errors.facilityType.message}
          </p>
        )}
      </div>

      {/* Facility Size */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-slate-700">
          Facility Size
        </Label>
        <Controller
          name="facilitySize"
          control={form.control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger 
                id="facilitySize"
                className="h-12 rounded-xl border-slate-200 focus:border-emerald-500 
                           focus:ring-4 focus:ring-emerald-500/10 transition-all"
              >
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-xl border-0">
                <SelectItem value="SMALL" className="py-3 hover:bg-emerald-50">
                  <div className="flex items-center gap-3">
 <Users className="h-4 w-4 text-emerald-600" />
                    Small (&lt; 50 beds/staff)
                  </div>
                </SelectItem>
                <SelectItem value="MEDIUM" className="py-3 hover:bg-teal-50">
                  <div className="flex items-center gap-3">
 <UserCheck className="h-4 w-4 text-teal-600" />
                    Medium (50–200)
                  </div>
                </SelectItem>
                <SelectItem value="LARGE" className="py-3 hover:bg-green-50">
                  <div className="flex items-center gap-3">
 <Building className="h-4 w-4 text-green-700" />
                    Large (&gt; 200)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.facilitySize && (
          <p className="text-sm text-red-600 font-medium mt-2">
            {form.formState.errors.facilitySize.message}
          </p>
        )}
      </div>
    </div>

    {/* Locations - Tag Input */}
    <div className="space-y-4">
      <Label className="text-sm font-semibold text-slate-700">
        Service Locations
      </Label>
      
      <div className="flex gap-3">
        <Input
          placeholder="e.g., Downtown Clinic, North Campus, Miami Branch"
          value={newLocation}
          onChange={(e) => setNewLocation(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (newLocation.trim()) addLocation();
            }
          }}
          className="h-12 rounded-xl border-slate-200 focus:border-emerald-500 
                     focus:ring-4 focus:ring-emerald-500/10 placeholder:text-slate-400"
        />
        <Button
          type="button"
          onClick={addLocation}
          disabled={!newLocation.trim()}
          className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 
                     hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Plus className="h-5 w-5 text-white" />
        </Button>
      </div>

      {/* Location Tags */}
      {locations.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {locations.map((location, index) => (
            <div
              key={index}
              className="group flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-teal-100 
                         text-emerald-800 px-4 py-2.5 rounded-xl text-sm font-medium 
                         shadow-sm hover:shadow-md transition-all duration-200"
            >
              <MapPin className="h-3.5 w-3.5 text-emerald-600" />
              {location}
              <button
                type="button"
                onClick={() => removeLocation(index)}
                className="ml-1 text-emerald-600 hover:text-emerald-800 
                           hover:bg-emerald-200/60 rounded-full p-1 transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {locations.length === 0 && (
        <p className="text-sm text-slate-500 italic">
          No locations added. Type a location and press Enter or click the + button
        </p>
      )}
    </div>
  </CardContent>
</Card>
          )}

          {/* External Source Details */}
          {clientType === "EXTERNAL_SOURCE" && (
           <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden">
  <CardHeader className="pb-8 bg-gradient-to-r from-orange-600/5 via-amber-600/5 to-transparent">
    <div className="flex items-center gap-5">
      {/* Gorgeous glowing icon */}
      <div className="relative">
        <div className="absolute inset-0 blur-xl bg-gradient-to-r from-orange-600 to-amber-600 opacity-40 scale-125"></div>
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-700 shadow-2xl flex items-center justify-center">
          <ExternalLink className="h-7 w-7 text-white" />
        </div>
      </div>

      <div>
        <CardTitle className="text-2xl font-bold text-slate-900">
          External Source Details
        </CardTitle>
        <CardDescription className="text-base text-slate-600 mt-1.5">
          Track where this client came from and how they were acquired
        </CardDescription>
      </div>
    </div>
  </CardHeader>

  <CardContent className="pt-4 px-8 pb-10">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Source Type */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-slate-700">
          Source Type
        </Label>
        <Controller
          name="sourceType"
          control={form.control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger 
                id="sourceType"
                className="h-12 rounded-xl border-slate-200 focus:border-orange-500 
                           focus:ring-4 focus:ring-orange-500/10 transition-all"
              >
                <SelectValue placeholder="Select source type" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-xl border-0">
                <SelectItem value="JOB_BOARD" className="py-3 hover:bg-orange-50">
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-orange-600" />
                    Job Board (Indeed, Monster, etc.)
                  </div>
                </SelectItem>
                <SelectItem value="SOCIAL_MEDIA" className="py-3 hover:bg-amber-50">
                  <div className="flex items-center gap-3">
                    <Share2 className="h-4 w-4 text-amber-600" />
                    Social Media (LinkedIn, Facebook)
                  </div>
                </SelectItem>
                <SelectItem value="REFERRAL_PLATFORM" className="py-3 hover:bg-yellow-50">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-yellow-700" />
                    Referral Platform (NurseGrid, etc.)
                  </div>
                </SelectItem>
                <SelectItem value="INDUSTRY_EVENT" className="py-3 hover:bg-orange-50">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    Industry Event / Conference
                  </div>
                </SelectItem>
                <SelectItem value="COLD_OUTREACH" className="py-3 hover:bg-amber-50">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-amber-600" />
                    Cold Outreach
                  </div>
                </SelectItem>
                <SelectItem value="OTHER" className="py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-gray-600" />
                    Other
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.sourceType && (
          <p className="text-sm text-red-600 font-medium mt-2">
            {form.formState.errors.sourceType.message}
          </p>
        )}
      </div>

      {/* Source Name */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-slate-700">
          Source Name
        </Label>
        <Controller
          name="sourceName"
          control={form.control}
          render={({ field }) => (
            <Input
              {...field}
              id="sourceName"
              placeholder="e.g., LinkedIn Recruiter, AORN Conference 2025"
              className="h-12 rounded-xl border-slate-200 focus:border-orange-500 
                         focus:ring-4 focus:ring-orange-500/10 transition-all duration-200"
            />
          )}
        />
        {form.formState.errors.sourceName && (
          <p className="text-sm text-red-600 font-medium mt-2">
            {form.formState.errors.sourceName.message}
          </p>
        )}
      </div>

      {/* Acquisition Method */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-slate-700">
          Acquisition Method
        </Label>
        <Controller
          name="acquisitionMethod"
          control={form.control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger 
                id="acquisitionMethod"
                className="h-12 rounded-xl border-slate-200 focus:border-orange-500 
                           focus:ring-4 focus:ring-orange-500/10 transition-all"
              >
                <SelectValue placeholder="How was this client acquired?" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-xl border-0">
                <SelectItem value="ORGANIC" className="py-3 hover:bg-orange-50">
                  <div className="flex items-center gap-3">
                    <Search className="h-4 w-4 text-orange-600" />
                    Organic (Found us)
                  </div>
                </SelectItem>
                <SelectItem value="PAID" className="py-3 hover:bg-amber-50">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-amber-600" />
                    Paid Advertising
                  </div>
                </SelectItem>
                <SelectItem value="PARTNERSHIP" className="py-3 hover:bg-yellow-50">
                  <div className="flex items-center gap-3">
                    <Handshake className="h-4 w-4 text-yellow-700" />
                    Partnership / Collaboration
                  </div>
                </SelectItem>
                <SelectItem value="REFERRAL" className="py-3 hover:bg-orange-50">
                  <div className="flex items-center gap-3">
                    <UserPlus className="h-4 w-4 text-orange-600" />
                    Referral from Existing Client
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.acquisitionMethod && (
          <p className="text-sm text-red-600 font-medium mt-2">
            {form.formState.errors.acquisitionMethod.message}
          </p>
        )}
      </div>

      {/* Source Notes */}
      <div className="space-y-3 md:col-span-2">
        <Label className="text-sm font-semibold text-slate-700">
          Additional Notes (optional)
        </Label>
        <Controller
          name="sourceNotes"
          control={form.control}
          render={({ field }) => (
            <Textarea
              {...field}
              id="sourceNotes"
              placeholder="e.g., Found via LinkedIn post about travel nursing, responded to ad campaign #TN2025"
              rows={4}
              className="rounded-xl border-slate-200 focus:border-orange-500 
                         focus:ring-4 focus:ring-orange-500/10 resize-none"
            />
          )}
        />
        {form.formState.errors.sourceNotes && (
          <p className="text-sm text-red-600 font-medium mt-2">
            {form.formState.errors.sourceNotes.message}
          </p>
        )}
      </div>
    </div>
  </CardContent>
</Card>
          )}

          {/* Financial Information */}
         <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden">
  <CardHeader className="pb-8 bg-gradient-to-r from-amber-600/5 via-yellow-600/5 to-transparent">
    <div className="flex items-center gap-5">
      {/* Premium glowing briefcase */}
      <div className="relative">
        <div className="absolute inset-0 blur-xl bg-gradient-to-r from-amber-600 to-yellow-600 opacity-40 scale-125"></div>
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 to-yellow-700 shadow-2xl flex items-center justify-center">
          <Briefcase className="h-7 w-7 text-white" />
        </div>
      </div>

      <div>
        <CardTitle className="text-2xl font-bold text-slate-900">
          Financial & Contract Information
        </CardTitle>
        <CardDescription className="text-base text-slate-600 mt-1.5">
          Commission rates, payment terms, and billing details
        </CardDescription>
      </div>
    </div>
  </CardHeader>

  <CardContent className="pt-4 px-8 pb-10 space-y-10">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Relationship Type */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-slate-700">
          Relationship Type
        </Label>
        <Controller
          name="relationshipType"
          control={form.control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10">
                <SelectValue placeholder="Select relationship type" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-xl border-0">
                <SelectItem value="REFERRAL">Referral Partner</SelectItem>
                <SelectItem value="PARTNERSHIP">Strategic Partnership</SelectItem>
                <SelectItem value="DIRECT_CLIENT">Direct Client</SelectItem>
                <SelectItem value="EXTERNAL_SOURCE">External Lead Source</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.relationshipType && (
          <p className="text-sm text-red-600 font-medium mt-2">{form.formState.errors.relationshipType.message}</p>
        )}
      </div>

      {/* Commission Rate */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          Commission Rate (%)
        </Label>
        <Controller
          name="commissionRate"
          control={form.control}
          render={({ field }) => (
            <div className="relative">
              <Input
                {...field}
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="15"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                className="h-12 rounded-xl border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 pr-10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">%</span>
            </div>
          )}
        />
        {form.formState.errors.commissionRate && (
          <p className="text-sm text-red-600 font-medium mt-2">
            {form.formState.errors.commissionRate.message}
          </p>
        )}
      </div>

      {/* Payment Terms */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-slate-700">Payment Terms</Label>
        <Controller
          name="paymentTerms"
          control={form.control}
          render={({ field }) => (
            <Input
              {...field}
              placeholder="e.g., Net 30, Net 45, Due on Receipt"
              className="h-12 rounded-xl border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
            />
          )}
        />
      </div>

      {/* Tax ID */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-slate-700">Tax ID / EIN</Label>
        <Controller
          name="taxId"
          control={form.control}
          render={({ field }) => (
            <Input
              {...field}
              placeholder="12-3456789"
              className="h-12 rounded-xl border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 font-mono"
            />
          )}
        />
      </div>

      {/* Contract Start Date */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-slate-700">Contract Start Date</Label>
        <Controller
          name="contractStartDate"
          control={form.control}
          render={({ field }) => (
            <Input
              {...field}
              type="date"
              className="h-12 rounded-xl border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
            />
          )}
        />
      </div>

      {/* Contract End Date */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-slate-700">Contract End Date</Label>
        <Controller
          name="contractEndDate"
          control={form.control}
          render={({ field }) => (
            <Input
              {...field}
              type="date"
              className="h-12 rounded-xl border-slate-200 focus:border-amber-500 focus:ring-amber-500/10"
            />
          )}
        />
      </div>
    </div>

    {/* Billing Address */}
    <div className="space-y-3">
      <Label className="text-sm font-semibold text-slate-700">
        Billing Address (optional)
      </Label>
      <Controller
        name="billingAddress"
        control={form.control}
        render={({ field }) => (
          <Textarea
            {...field}
            placeholder="123 Business Ave&#10;Suite 500&#10;New York, NY 10001&#10;United States"
            rows={4}
            className="rounded-xl border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 resize-none"
          />
        )}
      />
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
