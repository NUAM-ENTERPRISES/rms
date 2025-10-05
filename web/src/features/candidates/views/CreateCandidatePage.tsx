import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
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
  ArrowLeft,
  UserPlus,
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
} from "lucide-react";
import { useCreateCandidateMutation } from "@/features/candidates";
import { useGetTeamsQuery } from "@/features/teams";
import { useCan } from "@/hooks/useCan";

// ==================== VALIDATION SCHEMA ====================

const createCandidateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  contact: z
    .string()
    .min(10, "Contact must be at least 10 characters")
    .max(15, "Contact must not exceed 15 characters"),
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

type CreateCandidateFormData = z.infer<typeof createCandidateSchema>;

// ==================== COMPONENT ====================

export default function CreateCandidatePage() {
  const navigate = useNavigate();
  const canManageCandidates = useCan("manage:candidates");

  // API
  const [createCandidate, { isLoading }] = useCreateCandidateMutation();
  const { data: teamsData, isLoading: teamsLoading } = useGetTeamsQuery({});

  // Local state for skills
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  // Teams data
  const teams = teamsData?.data?.teams || [];

  // Form
  const form = useForm<CreateCandidateFormData>({
    resolver: zodResolver(createCandidateSchema),
    defaultValues: {
      name: "",
      contact: "",
      email: "",
      source: "manual",
      dateOfBirth: "",
      experience: 0,
      currentEmployer: "",
      expectedSalary: 0,
      teamId: "none",
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
  const onSubmit = async (data: CreateCandidateFormData) => {
    try {
      const payload: any = {
        name: data.name,
        contact: data.contact,
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
        payload.teamId = data.teamId;
      }
      if (skills.length > 0) {
        payload.skills = JSON.stringify(skills);
      }

      await createCandidate(payload).unwrap();
      toast.success("Candidate created successfully!");
      navigate("/candidates");
    } catch (error: any) {
      console.error("Error creating candidate:", error);
      toast.error(error?.data?.message || "Failed to create candidate");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/candidates")}
            className="mb-4 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Candidates
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-blue-600" />
            Create New Candidate
          </h1>
          <p className="text-slate-600 mt-2">
            Add a new candidate to the system. After creation, you can nominate
            them for projects.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information Card */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
                <User className="h-5 w-5 text-blue-600" />
                Personal Information
              </CardTitle>
              <CardDescription>Basic candidate information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  <FormLabel
                    htmlFor="contact"
                    className="text-slate-700 font-medium"
                  >
                    Contact Number *
                  </FormLabel>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="contact"
                      {...form.register("contact")}
                      placeholder="+1234567890"
                      className="h-11 pl-10 bg-white border-slate-200"
                    />
                  </div>
                  {form.formState.errors.contact && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.contact.message}
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
              disabled={isLoading || skills.length === 0}
              className="min-w-[120px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Candidate
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
