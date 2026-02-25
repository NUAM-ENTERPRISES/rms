import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Label as FormLabel } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Phone, Mail, Calendar, Save, ArrowLeft, Briefcase, CheckSquare, FileCheck } from "lucide-react";
import { CountryCodeSelect, MultiCountrySelect, MultiSelect } from "@/components/molecules";
import {
  useGetCandidateByIdQuery,
  useUpdateCandidateMutation,
} from "@/features/candidates";
import { useUploadCandidateProfileImageMutation } from "@/services/uploadApi";
import { ProfileImageUpload } from "@/components/molecules";
import { Checkbox } from "@/components/ui/checkbox";
import { useCan } from "@/hooks/useCan";
import { FACILITY_TYPES, SECTOR_TYPES, VISA_TYPES, LICENSING_EXAMS, SKIN_TONES, SMARTNESS_LEVELS } from "@/constants/candidate-constants";

// ==================== VALIDATION SCHEMA ====================

const updateCandidateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  countryCode: z.string().min(1, "Country code is required"),
  mobileNumber: z
    .string()
    .min(10, "Mobile number must be at least 10 characters")
    .max(15, "Mobile number must not exceed 15 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  source: z.enum(["manual", "meta", "referral"]),
  gender: z.any(),
  dateOfBirth: z.string().optional(),
  expectedMinSalary: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(0).optional().nullable()
  ),
  expectedMaxSalary: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(0).optional().nullable()
  ),
  preferredCountries: z.array(z.string()).optional(),
  facilityPreferences: z.array(z.string()).optional(),
  sectorType: z.string().optional(),
  visaType: z.string().optional(),
  height: z.preprocess((val) => (val === "" ? undefined : Number(val)), z.number().optional()),
  weight: z.preprocess((val) => (val === "" ? undefined : Number(val)), z.number().optional()),
  skinTone: z.enum([...SKIN_TONES] as [string, ...string[]]).optional(),
  languageProficiency: z.string().optional(),
  smartness: z.enum([...SMARTNESS_LEVELS] as [string, ...string[]]).optional(),
  licensingExam: z.string().optional(),
  dataFlow: z.boolean().optional(),
  eligibility: z.boolean().optional(),

  referralCompanyName: z.string().optional(),
  referralEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  referralCountryCode: z.string().optional(),
  referralPhone: z.string().optional(),
  referralDescription: z.string().optional(),

  teamId: z
    .union([z.string().uuid("Invalid team ID"), z.literal("none")])
    .optional(),
}).superRefine((data, ctx) => {
  // Make referralCompanyName required when source is 'referral'
  if (data.source === "referral" && (!data.referralCompanyName || data.referralCompanyName.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Referral company name is required when source is referral",
      path: ["referralCompanyName"],
    });
  }
});

type UpdateCandidateFormData = z.infer<typeof updateCandidateSchema>;

// ==================== COMPONENT ====================

export default function EditCandidatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canWriteCandidates = useCan("write:candidates");

  // API
  const { data: candidateData, isLoading: isLoadingCandidate } =
    useGetCandidateByIdQuery(id!);
  const [updateCandidate, { isLoading: isUpdating }] =
    useUpdateCandidateMutation();
  const [uploadProfileImage, { isLoading: uploadingImage }] =
    useUploadCandidateProfileImageMutation();

  // Local state for uploads
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const candidate = candidateData;

  // Form
  const form = useForm<UpdateCandidateFormData>({
    resolver: zodResolver(updateCandidateSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      countryCode: "+91", // Default to India
      mobileNumber: "",
      email: "",
      source: "manual",
      gender: "" as any,
      dateOfBirth: "",
      expectedMinSalary: undefined,
      expectedMaxSalary: undefined,
      preferredCountries: [],
      facilityPreferences: [],
      sectorType: SECTOR_TYPES.NO_PREFERENCE,
      visaType: VISA_TYPES.NOT_APPLICABLE,
      teamId: "none",
      referralCompanyName: "",
      referralEmail: "",
      referralCountryCode: "+91",
      referralPhone: "",
      referralDescription: "",
    },
  });

  // Helper function to parse contact into countryCode and mobileNumber (for backward compatibility)
  const parseContact = (contact: string) => {
    if (!contact) return { countryCode: "+91", mobileNumber: "" };

    // Try to extract country code (assume it starts with + and is 1-4 digits)
    const match = contact.match(/^(\+\d{1,4})(.*)$/);
    if (match) {
      return { countryCode: match[1], mobileNumber: match[2] };
    }

    // If no country code found, treat entire string as mobileNumber with default country code
    return { countryCode: "+91", mobileNumber: contact };
  };

  // Load candidate data into form
  useEffect(() => {
    if (candidate) {
      // Use new separate fields if available, otherwise parse from contact for backward compatibility
      const countryCode =
        candidate.countryCode ||
        parseContact(candidate.contact || "").countryCode;
      const mobileNumber =
        candidate.mobileNumber ||
        parseContact(candidate.contact || "").mobileNumber;

      // Map gender to uppercase and handle short forms (M/F)
      let genderValue = String(candidate.gender || "").trim().toUpperCase();
      if (genderValue === "M") genderValue = "MALE";
      if (genderValue === "F") genderValue = "FEMALE";
      if (!["MALE", "FEMALE", "OTHER"].includes(genderValue)) {
        genderValue = ""; // Reset if invalid
      }

      form.reset({
        name: candidate.name || `${candidate.firstName} ${candidate.lastName}`,
        countryCode,
        mobileNumber,
        email: candidate.email || "",
        source:
          (candidate.source as "manual" | "meta" | "referral") || "manual",
        gender: genderValue,
        dateOfBirth: candidate.dateOfBirth
          ? new Date(candidate.dateOfBirth).toISOString().split("T")[0]
          : "",
        expectedMinSalary: candidate.expectedMinSalary ?? undefined,
        expectedMaxSalary: candidate.expectedMaxSalary ?? undefined,
        preferredCountries: candidate.preferredCountries?.map((pc) => pc.country.code) || [],
        facilityPreferences: candidate.facilityPreferences?.map((fp) => fp.facilityType) || [],
        sectorType: candidate.sectorType || SECTOR_TYPES.NO_PREFERENCE,
        visaType: candidate.visaType || VISA_TYPES.NOT_APPLICABLE,
        height: candidate.height ?? undefined,
        weight: candidate.weight ?? undefined,
        skinTone: candidate.skinTone || "",
        languageProficiency: candidate.languageProficiency || "",
        smartness: candidate.smartness || "",
        licensingExam: candidate.licensingExam || "",
        dataFlow: candidate.dataFlow ?? false,
        eligibility: candidate.eligibility ?? false,
        teamId: candidate.assignedTo || "none",
        referralCompanyName: candidate.referralCompanyName || "",
        referralEmail: candidate.referralEmail || "",
        referralCountryCode: candidate.referralCountryCode || "+91",
        referralPhone: candidate.referralPhone || "",
        referralDescription: candidate.referralDescription || "",
      });
    }
  }, [candidate, form]);

  // Permission check
  if (!canWriteCandidates) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to edit candidates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/candidates")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Candidates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingCandidate) {
    return (
      <div className="min-h-screen p-6">
        <div className="w-full mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">Loading candidate...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Candidate Not Found
              </CardTitle>
              <CardDescription className="text-slate-600">
                The candidate you're trying to edit doesn't exist.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-6">
              <Button onClick={() => navigate("/candidates")}>
                Go to Candidates List
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Skills handlers

  // Form submission
  const onSubmit = async (data: UpdateCandidateFormData) => {
    try {
      // Build payload using the backend's preferred fields.
      // The API rejects a top-level `name` property in updates in newer versions
      // (it expects `firstName` / `lastName`), so we split the single `name`
      // form field and send firstName/lastName instead.
      const payload: any = {
        countryCode: data.countryCode,
        mobileNumber: data.mobileNumber,
        source: data.source || "manual",
        gender: data.gender,
      };

      // Split the single 'name' field into firstName / lastName
      // First token becomes firstName, remainder becomes lastName (if any).
      const fullName = (data.name || "").trim();
      if (fullName) {
        const parts = fullName.split(/\s+/);
        payload.firstName = parts.shift() || "";
        payload.lastName = parts.length ? parts.join(" ") : undefined;
      }

      // Add optional fields only if they have values
      if (data.email && data.email.trim()) {
        payload.email = data.email;
      }
      if (data.dateOfBirth && data.dateOfBirth.trim()) {
        payload.dateOfBirth = data.dateOfBirth;
      }
      if (data.expectedMinSalary !== undefined) {
        payload.expectedMinSalary = data.expectedMinSalary;
      }
      if (data.expectedMaxSalary !== undefined) {
        payload.expectedMaxSalary = data.expectedMaxSalary;
      }
      if (data.preferredCountries && data.preferredCountries.length > 0) {
        payload.preferredCountries = data.preferredCountries;
      }
      if (data.facilityPreferences && data.facilityPreferences.length > 0) {
        payload.facilityPreferences = data.facilityPreferences;
      }
      if (data.sectorType) {
        payload.sectorType = data.sectorType;
      }
      if (data.visaType) {
        payload.visaType = data.visaType;
      }
      if (data.teamId && data.teamId !== "none" && data.teamId.trim()) {
        payload.assignedTo = data.teamId;
      }

      // Physical / Personal / Checklist fields
      payload.height = data.height;
      payload.weight = data.weight;
      payload.skinTone = data.skinTone;
      payload.languageProficiency = data.languageProficiency;
      payload.smartness = data.smartness;
      payload.licensingExam = data.licensingExam;
      payload.dataFlow = data.dataFlow;
      payload.eligibility = data.eligibility;

      // Referral fields
      if (data.source === "referral") {
        if (data.referralCompanyName) payload.referralCompanyName = data.referralCompanyName;
        if (data.referralEmail) payload.referralEmail = data.referralEmail;
        if (data.referralCountryCode) payload.referralCountryCode = data.referralCountryCode;
        if (data.referralPhone) payload.referralPhone = data.referralPhone;
        if (data.referralDescription) payload.referralDescription = data.referralDescription;
      }

      const result = await updateCandidate({
        id: id!,
        ...payload,
      }).unwrap();

      if (result) {
        // Upload profile image if selected
        if (selectedImage) {
          try {
            await uploadProfileImage({
              candidateId: id!,
              file: selectedImage,
            }).unwrap();
          } catch (uploadError: any) {
            console.error("Profile image upload failed:", uploadError);
            toast.warning("Candidate updated but profile image upload failed");
          }
        }

        toast.success("Candidate updated successfully!");
        navigate(`/candidates/${id}`);
      }
    } catch (error: any) {
      console.error("Error updating candidate:", error);
      toast.error(error?.data?.message || "Failed to update candidate");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container w-full mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <User className="h-8 w-8 text-blue-600" />
            Edit Candidate
          </h1>
          <p className="text-slate-600 mt-2">
            Update candidate information and profile details.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information with Profile Image */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
                <User className="h-5 w-5 text-blue-600" />
                Personal Information
              </CardTitle>
              <CardDescription>Basic candidate information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
                {/* Profile Image - Left Side */}
                <div className="flex flex-col items-center">
                  <ProfileImageUpload
                    currentImageUrl={candidate.profileImage}
                    onImageSelected={setSelectedImage}
                    onImageRemove={() => setSelectedImage(null)}
                    uploading={uploadingImage}
                    disabled={isUpdating || uploadingImage}
                    size="md"
                  />
                </div>

                {/* Form Fields - Right Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <FormLabel
                      htmlFor="name"
                      className="text-slate-700 font-medium"
                    >
                      Full Name *
                    </FormLabel>
                    <Input
                      id="name"
                      {...form.register("name")}
                      placeholder="John Doe"
                      className="h-11 bg-white border-slate-200"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-600">
                        {typeof form.formState.errors.name?.message === 'string' ? form.formState.errors.name.message : 'Invalid name'}
                      </p>
                    )}
                  </div>

                  {/* Contact */}
                  <div className="space-y-2">
                    <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-500" />
                      Contact Number *
                    </FormLabel>
                    <div className="flex gap-2">
                      <div className="w-32 flex-shrink-0">
                        <Controller
                          name="countryCode"
                          control={form.control}
                          render={({ field }) => (
                            <CountryCodeSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              name={field.name}
                              placeholder="Code"
                              error={form.formState.errors.countryCode?.message}
                            />
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Controller
                          name="mobileNumber"
                          control={form.control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="mobileNumber"
                              type="tel"
                              placeholder="9876543210"
                              className="h-11 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                            />
                          )}
                        />
                      </div>
                    </div>
                    {form.formState.errors.mobileNumber && (
                      <p className="text-sm text-red-600">
                        {typeof form.formState.errors.mobileNumber?.message === 'string' ? form.formState.errors.mobileNumber.message : 'Invalid mobile number'}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <FormLabel
                      htmlFor="email"
                      className="text-slate-700 font-medium"
                    >
                      Email Address
                    </FormLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        {...form.register("email")}
                        placeholder="john.doe@example.com"
                        className="h-11 pl-10 bg-white border-slate-200"
                      />
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-600">
                        {typeof form.formState.errors.email?.message === 'string' ? form.formState.errors.email.message : 'Invalid email'}
                      </p>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-2">
                    <FormLabel
                      htmlFor="dateOfBirth"
                      className="text-slate-700 font-medium"
                    >
                      Date of Birth
                    </FormLabel>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="dateOfBirth"
                        type="date"
                        {...form.register("dateOfBirth")}
                        className="h-11 pl-10 bg-white border-slate-200"
                      />
                    </div>
                  </div>
                  {/* Salary Range */}
                  <div className="space-y-2">
                    <FormLabel htmlFor="expectedMinSalary" className="text-slate-700 font-medium">
                      Expected Min Salary
                    </FormLabel>
                    <Input
                      id="expectedMinSalary"
                      type="number"
                      {...form.register("expectedMinSalary", { valueAsNumber: true })}
                      placeholder="40000"
                      className="h-11 bg-white border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <FormLabel htmlFor="expectedMaxSalary" className="text-slate-700 font-medium">
                      Expected Max Salary
                    </FormLabel>
                    <Input
                      id="expectedMaxSalary"
                      type="number"
                      {...form.register("expectedMaxSalary", { valueAsNumber: true })}
                      placeholder="60000"
                      className="h-11 bg-white border-slate-200"
                    />
                  </div>
                  {/* Preferences fields */}
                  <div className="space-y-2">
                    <FormLabel className="text-slate-700 font-medium">
                      Preferred Countries
                    </FormLabel>
                    <Controller
                      name="preferredCountries"
                      control={form.control}
                      render={({ field }) => (
                        <MultiCountrySelect
                          placeholder="Select countries..."
                          value={field.value}
                          onValueChange={field.onChange}
                          pageSize={20}
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <FormLabel className="text-slate-700 font-medium">
                      Facility Preferences
                    </FormLabel>
                    <Controller
                      name="facilityPreferences"
                      control={form.control}
                      render={({ field }) => (
                        <MultiSelect
                          placeholder="Select facility types..."
                          options={FACILITY_TYPES.map(type => ({
                            value: type,
                            label: type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
                          }))}
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      )}
                    />
                  </div>

                  {/* Sector Type */}
                  <div className="space-y-2">
                    <FormLabel className="text-slate-700 font-medium">
                      Sector Type
                    </FormLabel>
                    <Select
                      value={form.watch("sectorType") || SECTOR_TYPES.PRIVATE}
                      onValueChange={(value) =>
                        form.setValue("sectorType", value)
                      }
                    >
                      <SelectTrigger className="h-11 bg-white border-slate-200">
                        <SelectValue placeholder="Select sector" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SECTOR_TYPES).map(([key, value]) => (
                          <SelectItem key={value} value={value}>
                            {key.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Visa Type */}
                  <div className="space-y-2">
                    <FormLabel className="text-slate-700 font-medium">
                      Visa Type
                    </FormLabel>
                    <Select
                      value={form.watch("visaType") || VISA_TYPES.EMPLOYMENT}
                      onValueChange={(value) =>
                        form.setValue("visaType", value)
                      }
                    >
                      <SelectTrigger className="h-11 bg-white border-slate-200">
                        <SelectValue placeholder="Select visa type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(VISA_TYPES).map(([key, value]) => (
                          <SelectItem key={value} value={value}>
                            {key.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <FormLabel className="text-slate-700 font-medium">
                      Gender *
                    </FormLabel>
                    <Controller
                      name="gender"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          key={candidate?.id ? `gender-${field.value}` : "loading"}
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="h-11 bg-white border-slate-200">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MALE">Male</SelectItem>
                            <SelectItem value="FEMALE">Female</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.gender && (
                      <p className="text-sm text-red-600">
                        {typeof form.formState.errors.gender?.message === 'string' ? form.formState.errors.gender.message : 'Invalid gender'}
                      </p>
                    )}
                  </div>

                  {/* Source */}
                  <div className="space-y-2">
                    <FormLabel className="text-slate-700 font-medium">
                      Source
                    </FormLabel>
                    <Select
                      value={form.watch("source") || "manual"}
                      onValueChange={(value) =>
                        form.setValue("source", value as any)
                      }
                    >
                      <SelectTrigger className="h-11 bg-white border-slate-200">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="meta">Meta</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Height */}
                  <div className="space-y-2">
                    <FormLabel htmlFor="height" className="text-slate-700 font-medium">
                      Height (cm)
                    </FormLabel>
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      {...form.register("height")}
                      className="h-11 bg-white border-slate-200"
                    />
                  </div>

                  {/* Weight */}
                  <div className="space-y-2">
                    <FormLabel htmlFor="weight" className="text-slate-700 font-medium">
                      Weight (kg)
                    </FormLabel>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      {...form.register("weight")}
                      className="h-11 bg-white border-slate-200"
                    />
                  </div>

                  {/* Skin Tone */}
                  <div className="space-y-2">
                    <FormLabel htmlFor="skinTone" className="text-slate-700 font-medium">
                      Skin Tone
                    </FormLabel>
                    <Select
                      value={form.watch("skinTone") || ""}
                      onValueChange={(val) => form.setValue("skinTone", val)}
                    >
                      <SelectTrigger className="h-11 bg-white border-slate-200">
                        <SelectValue placeholder="Select skin tone" />
                      </SelectTrigger>
                      <SelectContent>
                        {SKIN_TONES.map((tone) => (
                          <SelectItem key={tone} value={tone}>
                            {tone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Language Proficiency */}
                  <div className="space-y-2">
                    <FormLabel htmlFor="languageProficiency" className="text-slate-700 font-medium">
                      Language Proficiency
                    </FormLabel>
                    <Input
                      id="languageProficiency"
                      {...form.register("languageProficiency")}
                      className="h-11 bg-white border-slate-200"
                    />
                  </div>

                  {/* Smartness */}
                  <div className="space-y-2">
                    <FormLabel htmlFor="smartness" className="text-slate-700 font-medium">
                      Smartness
                    </FormLabel>
                    <Select
                      value={form.watch("smartness") || ""}
                      onValueChange={(val) => form.setValue("smartness", val)}
                    >
                      <SelectTrigger className="h-11 bg-white border-slate-200">
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                      <SelectContent>
                        {SMARTNESS_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Referral Information */}
                  {form.watch("source") === "referral" && (
                    <>
                      <div className="space-y-2">
                        <FormLabel
                          htmlFor="referralCompanyName"
                          className="text-slate-700 font-medium"
                        >
                          Referral Company Name *
                        </FormLabel>
                        <Input
                          id="referralCompanyName"
                          {...form.register("referralCompanyName")}
                          placeholder="Global Staffing Solutions"
                          className="h-11 bg-white border-slate-200"
                        />
                      </div>

                      <div className="space-y-2">
                        <FormLabel
                          htmlFor="referralEmail"
                          className="text-slate-700 font-medium"
                        >
                          Referral Email
                        </FormLabel>
                        <Input
                          id="referralEmail"
                          type="email"
                          {...form.register("referralEmail")}
                          placeholder="referrals@globalstaffing.com"
                          className="h-11 bg-white border-slate-200"
                        />
                      </div>

                      <div className="space-y-2">
                        <FormLabel
                          htmlFor="referralPhone"
                          className="text-slate-700 font-medium"
                        >
                          Referral Phone
                        </FormLabel>
                        <div className="flex gap-2">
                          <div className="w-32 flex-shrink-0">
                            <Controller
                              name="referralCountryCode"
                              control={form.control}
                              render={({ field }) => (
                                <CountryCodeSelect
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  name={field.name}
                                  placeholder="Code"
                                  error={form.formState.errors.referralCountryCode?.message}
                                />
                              )}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <Input
                              id="referralPhone"
                              {...form.register("referralPhone")}
                              placeholder="9876543210"
                              className="h-11 bg-white border-slate-200"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <FormLabel
                          htmlFor="referralDescription"
                          className="text-slate-700 font-medium"
                        >
                          Referral Description
                        </FormLabel>
                        <Textarea
                          id="referralDescription"
                          {...form.register("referralDescription")}
                          placeholder="Candidate recommended by our partner agency."
                          className="bg-white border-slate-200 min-h-[100px]"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checklist Section */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-green-600" />
                Final Checklist
              </CardTitle>
              <CardDescription>
                Update candidate's licensing and verification status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Licensing Exam */}
                <div className="space-y-2">
                  <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-slate-500" />
                    Licensing Exam
                  </FormLabel>
                  <Controller
                    name="licensingExam"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value || "none"}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="h-11 bg-white border-slate-200 focus:ring-blue-500/20">
                          <SelectValue placeholder="Select licensing exam" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {Object.entries(LICENSING_EXAMS).map(([key, value]) => (
                            <SelectItem key={value} value={value}>
                              {key.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-6 flex flex-col justify-center">
                  {/* Data Flow */}
                  <div className="flex items-center space-x-3 p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <Controller
                      name="dataFlow"
                      control={form.control}
                      render={({ field }) => (
                        <Checkbox
                          id="dataFlow"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="h-5 w-5"
                        />
                      )}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <FormLabel
                        htmlFor="dataFlow"
                        className="text-sm font-medium leading-none cursor-pointer text-slate-700"
                      >
                        Data Flow Completed
                      </FormLabel>
                      <p className="text-xs text-slate-500">
                        Candidate has completed data flow verification.
                      </p>
                    </div>
                  </div>

                  {/* Eligibility */}
                  <div className="flex items-center space-x-3 p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <Controller
                      name="eligibility"
                      control={form.control}
                      render={({ field }) => (
                        <Checkbox
                          id="eligibility"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="h-5 w-5"
                        />
                      )}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <FormLabel
                        htmlFor="eligibility"
                        className="text-sm font-medium leading-none cursor-pointer text-slate-700"
                      >
                        Eligible
                      </FormLabel>
                      <p className="text-xs text-slate-500">
                        Candidate meets the eligibility criteria.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/candidates/${id}`)}
              disabled={isUpdating}
              className="min-w-[120px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUpdating || uploadingImage}
              className="min-w-[120px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isUpdating || uploadingImage ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {uploadingImage ? "Uploading Image..." : "Updating..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
