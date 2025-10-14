import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as FormLabel } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  User,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  Star,
  Plus,
  X,
  Save,
  ArrowLeft,
  GraduationCap,
} from "lucide-react";
import {
  useCreateCandidateMutation,
  useCreateWorkExperienceMutation,
} from "@/features/candidates";
import {
  useUploadCandidateProfileImageMutation,
  useUploadResumeMutation,
} from "@/services/uploadApi";
import {
  ProfileImageUpload,
  DocumentUpload,
  CountryCodeSelect,
  type UploadedDocument,
} from "@/components/molecules";
import CandidatePreview from "../components/CandidatePreview";
import { useCan } from "@/hooks/useCan";

// ==================== VALIDATION SCHEMA ====================

const createCandidateSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50),
  countryCode: z.string().min(1, "Country code is required"),
  mobileNumber: z
    .string()
    .min(10, "Mobile number must be at least 10 characters")
    .max(15, "Mobile number must not exceed 15 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  source: z.enum(["manual", "meta", "referral"]),
  dateOfBirth: z.string().min(1, "Date of birth is required"),

  // Educational Qualifications
  highestEducation: z.string().max(100).optional(),
  university: z.string().max(200).optional(),
  graduationYear: z.number().min(1950).max(2030).optional(),
  gpa: z.number().min(0).max(4).optional(),
});

type CreateCandidateFormData = z.infer<typeof createCandidateSchema>;

// ==================== COMPONENT ====================

export default function CreateCandidatePage() {
  const navigate = useNavigate();
  const canManageCandidates = useCan("manage:candidates");

  // API
  const [createCandidate, { isLoading }] = useCreateCandidateMutation();
  const [createWorkExperience] = useCreateWorkExperienceMutation();
  const [uploadProfileImage, { isLoading: uploadingImage }] =
    useUploadCandidateProfileImageMutation();
  const [uploadResume, { isLoading: uploadingResume }] =
    useUploadResumeMutation();

  // Local state for uploads
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedResume, setSelectedResume] = useState<File | null>(null);
  const [uploadedResumes, setUploadedResumes] = useState<UploadedDocument[]>(
    []
  );
  const [workExperiences, setWorkExperiences] = useState<any[]>([]);
  const [newWorkExperience, setNewWorkExperience] = useState({
    companyName: "",
    jobTitle: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    description: "",
    salary: undefined as number | undefined,
    location: "",
    skills: [] as string[],
    achievements: "",
  });
  const [newSkill, setNewSkill] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Form
  const form = useForm<CreateCandidateFormData>({
    resolver: zodResolver(createCandidateSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      countryCode: "+91",
      mobileNumber: "",
      email: "",
      source: "manual" as const,
      dateOfBirth: "",
      highestEducation: "",
      university: "",
      graduationYear: undefined,
      gpa: undefined,
    },
  });

  // Permission check
  if (!canManageCandidates) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to create candidates.
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

  // Work experience management
  const addWorkExperience = () => {
    if (
      newWorkExperience.companyName &&
      newWorkExperience.jobTitle &&
      newWorkExperience.startDate
    ) {
      setWorkExperiences([
        ...workExperiences,
        { ...newWorkExperience, id: Date.now().toString() },
      ]);
      setNewWorkExperience({
        companyName: "",
        jobTitle: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        description: "",
        salary: undefined,
        location: "",
        skills: [],
        achievements: "",
      });
      setNewSkill("");
    } else {
      toast.error(
        "Please fill in required fields (Company, Job Title, Start Date)"
      );
    }
  };

  const removeWorkExperience = (id: string) => {
    setWorkExperiences(workExperiences.filter((exp) => exp.id !== id));
  };

  const addSkillToNewExperience = () => {
    if (
      newSkill.trim() &&
      !newWorkExperience.skills.includes(newSkill.trim())
    ) {
      setNewWorkExperience({
        ...newWorkExperience,
        skills: [...newWorkExperience.skills, newSkill.trim()],
      });
      setNewSkill("");
    }
  };

  const removeSkillFromNewExperience = (skillToRemove: string) => {
    setNewWorkExperience({
      ...newWorkExperience,
      skills: newWorkExperience.skills.filter(
        (skill) => skill !== skillToRemove
      ),
    });
  };

  // Show preview
  const handleShowPreview = () => {
    setShowPreview(true);
  };

  // Form submission
  const onSubmit = async (data: CreateCandidateFormData) => {
    try {
      const payload: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        countryCode: data.countryCode,
        mobileNumber: data.mobileNumber,
        source: data.source || "manual",
        dateOfBirth: data.dateOfBirth, // Now mandatory
      };

      // Add optional fields only if they have values
      if (data.email && data.email.trim()) {
        payload.email = data.email;
      }

      // Educational qualifications
      if (data.highestEducation && data.highestEducation.trim()) {
        payload.highestEducation = data.highestEducation;
      }
      if (data.university && data.university.trim()) {
        payload.university = data.university;
      }
      if (data.graduationYear && data.graduationYear > 1950) {
        payload.graduationYear = data.graduationYear;
      }
      if (data.gpa && data.gpa > 0) {
        payload.gpa = data.gpa;
      }

      const result = await createCandidate(payload).unwrap();

      if (result) {
        const candidateId = result.id;

        // Create work experiences if any
        if (workExperiences.length > 0) {
          for (const experience of workExperiences) {
            try {
              await createWorkExperience({
                candidateId,
                companyName: experience.companyName,
                jobTitle: experience.jobTitle,
                startDate: experience.startDate,
                endDate: experience.endDate,
                isCurrent: experience.isCurrent,
                description: experience.description,
                salary: experience.salary,
                location: experience.location,
                skills: JSON.stringify(experience.skills || []),
                achievements: experience.achievements,
              }).unwrap();
            } catch (error) {
              console.error("Failed to create work experience:", error);
              // Continue with other work experiences even if one fails
            }
          }
        }

        // Upload profile image if selected
        if (selectedImage) {
          try {
            await uploadProfileImage({
              candidateId,
              file: selectedImage,
            }).unwrap();
          } catch (uploadError: any) {
            console.error("Profile image upload failed:", uploadError);
            toast.warning("Candidate created but profile image upload failed");
          }
        }

        // Upload resume if selected
        if (selectedResume) {
          try {
            await uploadResume({
              candidateId,
              file: selectedResume,
            }).unwrap();
          } catch (uploadError: any) {
            console.error("Resume upload failed:", uploadError);
            toast.warning("Candidate created but resume upload failed");
          }
        }

        toast.success("Candidate created successfully!");
        navigate("/candidates");
      }
    } catch (error: any) {
      console.error("Error creating candidate:", error);
      toast.error(error?.data?.message || "Failed to create candidate");
    }
  };

  // Handle preview confirmation
  const handlePreviewConfirm = async () => {
    const formData = form.getValues();
    await onSubmit(formData);
  };

  // Handle preview cancel
  const handlePreviewCancel = () => {
    setShowPreview(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container w-full mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-blue-600" />
            Create New Candidate
          </h1>
          <p className="text-slate-600 mt-2">
            Add a new candidate to the system. After creation, you can nominate
            them for projects.
          </p>
        </div>

        <form
          onSubmit={form.handleSubmit(handleShowPreview)}
          className="space-y-6"
        >
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
                    onImageSelected={setSelectedImage}
                    onImageRemove={() => setSelectedImage(null)}
                    uploading={uploadingImage}
                    disabled={isLoading || uploadingImage || uploadingResume}
                    size="md"
                  />
                </div>

                {/* Form Fields - Right Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div className="space-y-2">
                    <FormLabel
                      htmlFor="firstName"
                      className="text-slate-700 font-medium"
                    >
                      First Name *
                    </FormLabel>
                    <Input
                      id="firstName"
                      {...form.register("firstName")}
                      placeholder="John"
                      className="h-11 bg-white border-slate-200"
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="space-y-2">
                    <FormLabel
                      htmlFor="lastName"
                      className="text-slate-700 font-medium"
                    >
                      Last Name *
                    </FormLabel>
                    <Input
                      id="lastName"
                      {...form.register("lastName")}
                      placeholder="Doe"
                      className="h-11 bg-white border-slate-200"
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>

                  {/* Contact Number */}
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
                      Date of Birth *
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

          {/* Educational Qualifications */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                Educational Qualifications
              </CardTitle>
              <CardDescription>
                Academic background and qualifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Highest Education */}
                <div className="space-y-2">
                  <FormLabel
                    htmlFor="highestEducation"
                    className="text-slate-700 font-medium"
                  >
                    Highest Education
                  </FormLabel>
                  <Input
                    id="highestEducation"
                    {...form.register("highestEducation")}
                    placeholder="BSc Nursing"
                    className="h-11 bg-white border-slate-200"
                  />
                </div>

                {/* University */}
                <div className="space-y-2">
                  <FormLabel
                    htmlFor="university"
                    className="text-slate-700 font-medium"
                  >
                    University/Institution
                  </FormLabel>
                  <Input
                    id="university"
                    {...form.register("university")}
                    placeholder="University of Health Sciences"
                    className="h-11 bg-white border-slate-200"
                  />
                </div>

                {/* Graduation Year */}
                <div className="space-y-2">
                  <FormLabel
                    htmlFor="graduationYear"
                    className="text-slate-700 font-medium"
                  >
                    Graduation Year
                  </FormLabel>
                  <Input
                    id="graduationYear"
                    type="number"
                    {...form.register("graduationYear", {
                      valueAsNumber: true,
                    })}
                    placeholder="2018"
                    min="1950"
                    max="2030"
                    className="h-11 bg-white border-slate-200"
                  />
                </div>

                {/* GPA */}
                <div className="space-y-2">
                  <FormLabel
                    htmlFor="gpa"
                    className="text-slate-700 font-medium"
                  >
                    GPA/Percentage
                  </FormLabel>
                  <Input
                    id="gpa"
                    type="number"
                    step="0.1"
                    {...form.register("gpa", { valueAsNumber: true })}
                    placeholder="3.8"
                    min="0"
                    max="4"
                    className="h-11 bg-white border-slate-200"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Experience */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Work Experience
              </CardTitle>
              <CardDescription>
                Add work experience entries for the candidate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Work Experience List */}
              {workExperiences.length > 0 && (
                <div className="space-y-4">
                  {workExperiences.map((experience) => (
                    <div
                      key={experience.id}
                      className="p-4 border border-slate-200 rounded-lg bg-slate-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">
                            {experience.jobTitle}
                          </h4>
                          <p className="text-slate-600">
                            {experience.companyName}
                          </p>
                          <p className="text-sm text-slate-500">
                            {new Date(
                              experience.startDate
                            ).toLocaleDateString()}{" "}
                            -{" "}
                            {experience.isCurrent
                              ? "Present"
                              : new Date(
                                  experience.endDate
                                ).toLocaleDateString()}
                          </p>
                          {experience.location && (
                            <p className="text-sm text-slate-500">
                              {experience.location}
                            </p>
                          )}
                          {experience.skills &&
                            experience.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {experience.skills.map(
                                  (skill: string, index: number) => (
                                    <span
                                      key={index}
                                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                                    >
                                      {skill}
                                    </span>
                                  )
                                )}
                              </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeWorkExperience(experience.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Work Experience Form */}
              <div className="border border-slate-200 rounded-lg p-6 bg-slate-50">
                <h4 className="text-lg font-semibold text-slate-800 mb-4">
                  Add New Work Experience
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company Name */}
                  <div className="space-y-2">
                    <FormLabel className="text-slate-700 font-medium">
                      Company Name *
                    </FormLabel>
                    <Input
                      value={newWorkExperience.companyName}
                      onChange={(e) =>
                        setNewWorkExperience({
                          ...newWorkExperience,
                          companyName: e.target.value,
                        })
                      }
                      placeholder="ABC Hospital"
                      className="h-11 bg-white border-slate-200"
                    />
                  </div>

                  {/* Job Title */}
                  <div className="space-y-2">
                    <FormLabel className="text-slate-700 font-medium">
                      Job Title *
                    </FormLabel>
                    <Input
                      value={newWorkExperience.jobTitle}
                      onChange={(e) =>
                        setNewWorkExperience({
                          ...newWorkExperience,
                          jobTitle: e.target.value,
                        })
                      }
                      placeholder="Staff Nurse"
                      className="h-11 bg-white border-slate-200"
                    />
                  </div>

                  {/* Start Date */}
                  <div className="space-y-2">
                    <FormLabel className="text-slate-700 font-medium">
                      Start Date *
                    </FormLabel>
                    <Input
                      type="date"
                      value={newWorkExperience.startDate}
                      onChange={(e) =>
                        setNewWorkExperience({
                          ...newWorkExperience,
                          startDate: e.target.value,
                        })
                      }
                      className="h-11 bg-white border-slate-200"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-2">
                    <FormLabel className="text-slate-700 font-medium">
                      End Date
                    </FormLabel>
                    <Input
                      type="date"
                      value={newWorkExperience.endDate}
                      onChange={(e) =>
                        setNewWorkExperience({
                          ...newWorkExperience,
                          endDate: e.target.value,
                        })
                      }
                      disabled={newWorkExperience.isCurrent}
                      className="h-11 bg-white border-slate-200"
                    />
                  </div>

                  {/* Current Position */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isCurrent"
                      checked={newWorkExperience.isCurrent}
                      onChange={(e) =>
                        setNewWorkExperience({
                          ...newWorkExperience,
                          isCurrent: e.target.checked,
                        })
                      }
                      className="border-slate-300"
                    />
                    <FormLabel
                      htmlFor="isCurrent"
                      className="text-slate-700 font-medium cursor-pointer"
                    >
                      This is my current position
                    </FormLabel>
                  </div>

                  {/* Salary */}
                  <div className="space-y-2">
                    <FormLabel className="text-slate-700 font-medium">
                      Salary
                    </FormLabel>
                    <Input
                      type="number"
                      value={newWorkExperience.salary || ""}
                      onChange={(e) =>
                        setNewWorkExperience({
                          ...newWorkExperience,
                          salary: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      placeholder="50000"
                      min="0"
                      className="h-11 bg-white border-slate-200"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <FormLabel className="text-slate-700 font-medium">
                      Location
                    </FormLabel>
                    <Input
                      value={newWorkExperience.location}
                      onChange={(e) =>
                        setNewWorkExperience({
                          ...newWorkExperience,
                          location: e.target.value,
                        })
                      }
                      placeholder="New York, NY"
                      className="h-11 bg-white border-slate-200"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2 mt-4">
                  <FormLabel className="text-slate-700 font-medium">
                    Job Description
                  </FormLabel>
                  <textarea
                    value={newWorkExperience.description}
                    onChange={(e) =>
                      setNewWorkExperience({
                        ...newWorkExperience,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe your responsibilities and achievements..."
                    className="w-full min-h-[80px] p-3 border border-slate-200 rounded-md bg-white"
                  />
                </div>

                {/* Skills */}
                <div className="space-y-3 mt-4">
                  <FormLabel className="text-slate-700 font-medium">
                    Skills Gained/Used
                  </FormLabel>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkillToNewExperience();
                        }
                      }}
                      placeholder="Add a skill..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={addSkillToNewExperience}
                      variant="outline"
                      size="sm"
                      className="px-3"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Skills List */}
                  {newWorkExperience.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newWorkExperience.skills.map((skill, index) => (
                        <div
                          key={index}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 text-sm"
                        >
                          <Star className="h-3 w-3" />
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkillFromNewExperience(skill)}
                            className="ml-1 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Button */}
                <div className="flex justify-end mt-4">
                  <Button
                    type="button"
                    onClick={addWorkExperience}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Work Experience
                  </Button>
                </div>
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
            disabled={isLoading || uploadingImage || uploadingResume}
          />

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/candidates")}
              disabled={isLoading}
              className="min-w-[120px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || uploadingImage || uploadingResume}
              className="min-w-[120px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Save className="h-4 w-4 mr-2" />
              Preview & Create
            </Button>
          </div>
        </form>

        {/* Preview Component */}
        {showPreview && (
          <CandidatePreview
            candidateData={{
              firstName: form.getValues("firstName"),
              lastName: form.getValues("lastName"),
              contact: `${form.getValues("countryCode")}${form.getValues(
                "mobileNumber"
              )}`,
              email: form.getValues("email"),
              source: form.getValues("source"),
              dateOfBirth: form.getValues("dateOfBirth"),
              highestEducation: form.getValues("highestEducation"),
              university: form.getValues("university"),
              graduationYear: form.getValues("graduationYear"),
              gpa: form.getValues("gpa"),
              workExperiences,
            }}
            onConfirm={handlePreviewConfirm}
            onCancel={handlePreviewCancel}
            isLoading={isLoading || uploadingImage || uploadingResume}
          />
        )}
      </div>
    </div>
  );
}
