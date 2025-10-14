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
import {
  User,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  DollarSign,
  Building2,
  Star,
  Plus,
  X,
  Save,
  Users,
  ArrowLeft,
} from "lucide-react";
import { CountryCodeSelect } from "@/components/molecules";
import {
  useGetCandidateByIdQuery,
  useUpdateCandidateMutation,
} from "@/features/candidates";
import { useGetTeamsQuery } from "@/features/teams";
import {
  useUploadCandidateProfileImageMutation,
  useUploadResumeMutation,
} from "@/services/uploadApi";
import {
  ProfileImageUpload,
  DocumentUpload,
  type UploadedDocument,
} from "@/components/molecules";
import { useCan } from "@/hooks/useCan";

// ==================== VALIDATION SCHEMA ====================

const updateCandidateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  countryCode: z.string().min(1, "Country code is required"),
  mobileNumber: z
    .string()
    .min(10, "Mobile number must be at least 10 characters")
    .max(15, "Mobile number must not exceed 15 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  source: z.enum(["manual", "meta", "referral"]).default("manual"),
  dateOfBirth: z.string().optional(),
  experience: z.number().min(0).max(50).optional(),
  currentEmployer: z.string().max(200).optional(),
  expectedSalary: z.number().min(0).optional(),
  teamId: z
    .union([z.string().uuid("Invalid team ID"), z.literal("none")])
    .optional(),
});

type UpdateCandidateFormData = z.infer<typeof updateCandidateSchema>;

// ==================== COMPONENT ====================

export default function EditCandidatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canManageCandidates = useCan("manage:candidates");

  // API
  const { data: candidateData, isLoading: isLoadingCandidate } =
    useGetCandidateByIdQuery(id!);
  const [updateCandidate, { isLoading: isUpdating }] =
    useUpdateCandidateMutation();
  const { data: teamsData, isLoading: teamsLoading } = useGetTeamsQuery({});
  const [uploadProfileImage, { isLoading: uploadingImage }] =
    useUploadCandidateProfileImageMutation();
  const [uploadResume, { isLoading: uploadingResume }] =
    useUploadResumeMutation();

  // Local state for skills
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  // Local state for uploads
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedResume, setSelectedResume] = useState<File | null>(null);
  const [uploadedResumes, setUploadedResumes] = useState<UploadedDocument[]>(
    []
  );

  const candidate = candidateData;
  const teams = teamsData?.data?.teams || [];

  // Form
  const form = useForm<UpdateCandidateFormData>({
    resolver: zodResolver(updateCandidateSchema),
    mode: "onChange",
    reValidateMode: "onChange",
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

      form.reset({
        name: candidate.name || "",
        countryCode,
        mobileNumber,
        email: candidate.email || "",
        source: candidate.source || "manual",
        dateOfBirth: candidate.dateOfBirth
          ? new Date(candidate.dateOfBirth).toISOString().split("T")[0]
          : "",
        experience: candidate.experience || 0,
        currentEmployer: candidate.currentEmployer || "",
        expectedSalary: candidate.expectedSalary || 0,
        teamId: candidate.assignedTo || "none",
      });

      // Load skills
      if (candidate.skills && Array.isArray(candidate.skills)) {
        setSkills(candidate.skills);
      }
    }
  }, [candidate, form]);

  // Permission check
  if (!canManageCandidates) {
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
  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      const newSkills = [...skills, skillInput.trim()];
      setSkills(newSkills);
      setSkillInput("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  // Form submission
  const onSubmit = async (data: UpdateCandidateFormData) => {
    try {
      const payload: any = {
        name: data.name,
        countryCode: data.countryCode,
        mobileNumber: data.mobileNumber,
        source: data.source || "manual",
      };

      // Add optional fields only if they have values
      if (data.email && data.email.trim()) {
        payload.email = data.email;
      }
      if (data.dateOfBirth && data.dateOfBirth.trim()) {
        payload.dateOfBirth = data.dateOfBirth;
      }
      if (data.experience !== undefined && data.experience > 0) {
        payload.experience = data.experience;
      }
      if (data.currentEmployer && data.currentEmployer.trim()) {
        payload.currentEmployer = data.currentEmployer;
      }
      if (data.expectedSalary !== undefined && data.expectedSalary > 0) {
        payload.expectedSalary = data.expectedSalary;
      }
      if (data.teamId && data.teamId !== "none" && data.teamId.trim()) {
        payload.assignedTo = data.teamId;
      }
      if (skills.length > 0) {
        payload.skills = JSON.stringify(skills);
      }

      const result = await updateCandidate({
        id: id!,
        ...payload,
      }).unwrap();

      if (result.success) {
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

        // Upload resume if selected
        if (selectedResume) {
          try {
            await uploadResume({
              candidateId: id!,
              file: selectedResume,
            }).unwrap();
          } catch (uploadError: any) {
            console.error("Resume upload failed:", uploadError);
            toast.warning("Candidate updated but resume upload failed");
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
            Update candidate information and documents.
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
                    disabled={isUpdating || uploadingImage || uploadingResume}
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
                        {form.formState.errors.name.message}
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
                        {form.formState.errors.mobileNumber.message}
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
                        {form.formState.errors.email.message}
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Details Card */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Professional Details
              </CardTitle>
              <CardDescription>
                Work experience and compensation expectations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Experience */}
                <div className="space-y-2">
                  <FormLabel
                    htmlFor="experience"
                    className="text-slate-700 font-medium"
                  >
                    Years of Experience
                  </FormLabel>
                  <Input
                    id="experience"
                    type="number"
                    {...form.register("experience", { valueAsNumber: true })}
                    placeholder="5"
                    min="0"
                    max="50"
                    className="h-11 bg-white border-slate-200"
                  />
                  {form.formState.errors.experience && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.experience.message}
                    </p>
                  )}
                </div>

                {/* Current Employer */}
                <div className="space-y-2">
                  <FormLabel
                    htmlFor="currentEmployer"
                    className="text-slate-700 font-medium"
                  >
                    Current Employer
                  </FormLabel>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="currentEmployer"
                      {...form.register("currentEmployer")}
                      placeholder="ABC Hospital"
                      className="h-11 pl-10 bg-white border-slate-200"
                    />
                  </div>
                </div>

                {/* Expected Salary */}
                <div className="space-y-2">
                  <FormLabel
                    htmlFor="expectedSalary"
                    className="text-slate-700 font-medium"
                  >
                    Expected Salary
                  </FormLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="expectedSalary"
                      type="number"
                      {...form.register("expectedSalary", {
                        valueAsNumber: true,
                      })}
                      placeholder="50000"
                      min="0"
                      className="h-11 pl-10 bg-white border-slate-200"
                    />
                  </div>
                </div>

                {/* Team Assignment */}
                <div className="space-y-2">
                  <FormLabel className="text-slate-700 font-medium">
                    Assign to Team
                  </FormLabel>
                  {teamsLoading ? (
                    <div className="h-11 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-md">
                      <span className="text-sm text-slate-500">
                        Loading teams...
                      </span>
                    </div>
                  ) : (
                    <Select
                      value={form.watch("teamId") || "none"}
                      onValueChange={(value) => form.setValue("teamId", value)}
                    >
                      <SelectTrigger className="h-11 bg-white border-slate-200">
                        <SelectValue placeholder="Select team (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Team Assignment</SelectItem>
                        {teams.map((team: any) => (
                          <SelectItem key={team.id} value={team.id}>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {team.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Skills Section */}
              <div className="space-y-3">
                <FormLabel className="text-slate-700 font-medium">
                  Skills & Expertise
                </FormLabel>

                {/* Add Skill Input */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                      placeholder="Type a skill and press Enter"
                      className="h-11 pl-10 bg-white border-slate-200"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={addSkill}
                    variant="outline"
                    className="h-11 px-4"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Skills List */}
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 text-sm"
                      >
                        <Star className="h-3 w-3" />
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-1 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {skills.length === 0 && (
                  <p className="text-sm text-slate-500 italic">
                    No skills added yet. Add at least one skill.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resume Upload */}
          <DocumentUpload
            title="Resume Upload"
            description="Upload candidate's resume (PDF only)"
            accept="application/pdf"
            maxSizeMB={10}
            allowedTypes={["application/pdf"]}
            multiple={false}
            documents={uploadedResumes}
            onFileSelected={(file) => setSelectedResume(file)}
            onDocumentRemove={() => {
              setSelectedResume(null);
              setUploadedResumes([]);
            }}
            uploading={uploadingResume}
            disabled={isUpdating || uploadingImage || uploadingResume}
          />

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
              disabled={
                isUpdating ||
                uploadingImage ||
                uploadingResume ||
                skills.length === 0
              }
              className="min-w-[120px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isUpdating || uploadingImage || uploadingResume ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {uploadingImage
                    ? "Uploading Image..."
                    : uploadingResume
                    ? "Uploading Resume..."
                    : "Updating..."}
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
