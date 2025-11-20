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
import {
  UserPlus,
  ArrowLeft,
  ArrowRight,
  Save,
} from "lucide-react";
import { useCreateCandidateMutation } from "@/features/candidates";
import { useUploadCandidateProfileImageMutation } from "@/services/uploadApi";
import CandidatePreview from "../components/CandidatePreview";
import { useCan } from "@/hooks/useCan";
import type { CandidateQualification } from "@/components/molecules/CandidateQualificationSelect";
import CandidateCreationStepper from "../components/CandidateCreationStepper";
import {
  PersonalInformationStep,
  EducationalQualificationStep,
  WorkExperienceStep,
} from "../components/steps";

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

  // Educational Qualifications (legacy fields for backward compatibility)
  highestEducation: z.string().max(100).optional(),
  university: z.string().max(200).optional(),
  graduationYear: z.number().min(1950).max(2030).optional(),
  gpa: z.number().min(0).max(4).optional(),

  // Multiple qualifications
  qualifications: z
    .array(
      z.object({
        id: z.string(),
        qualificationId: z.string(),
        university: z.string().optional(),
        graduationYear: z.number().min(1950).max(2030).optional(),
        gpa: z.number().min(0).max(4).optional(),
        isCompleted: z.boolean(),
        notes: z.string().optional(),
      })
    )
    .optional(),
});

type CreateCandidateFormData = z.infer<typeof createCandidateSchema>;

// ==================== WORK EXPERIENCE TYPES ====================

type WorkExperience = {
  id: string;
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  salary?: number;
  location: string;
  skills: string[];
  achievements: string;
};

// ==================== COMPONENT ====================

// Define steps
const STEPS = [
  {
    id: 1,
    title: "Personal Info",
    description: "Basic candidate information",
  },
  {
    id: 2,
    title: "Education",
    description: "Educational qualifications",
  },
  {
    id: 3,
    title: "Experience",
    description: "Work experience (optional)",
  },
];

export default function CreateCandidatePage() {
  const navigate = useNavigate();
  const canManageCandidates = useCan("manage:candidates");

  // API
  const [createCandidate, { isLoading }] = useCreateCandidateMutation();
  const [uploadProfileImage, { isLoading: uploadingImage }] =
    useUploadCandidateProfileImageMutation();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  // Local state for uploads
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([]);
  const [newWorkExperience, setNewWorkExperience] = useState<Omit<WorkExperience, "id">>({
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
  const [newSkill, setNewSkill] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [qualifications, setQualifications] = useState<CandidateQualification[]>([]);

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
      qualifications: [],
    },
  });

  // Permission check
  if (!canManageCandidates) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
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

  // Step validation functions
  const validateStep1 = async () => {
    const step1Fields = ["firstName", "lastName", "countryCode", "mobileNumber", "dateOfBirth", "source"];
    const isValid = await form.trigger(step1Fields as any);
    
    if (isValid) {
      if (!completedSteps.includes(1)) {
        setCompletedSteps([...completedSteps, 1]);
      }
      return true;
    }
    return false;
  };

  const handleNextStep = async () => {
    let canProceed = false;

    if (currentStep === 1) {
      canProceed = await validateStep1();
    } else if (currentStep === 2) {
      // Educational qualifications are optional, so we can always proceed
      canProceed = true;
      if (!completedSteps.includes(2)) {
        setCompletedSteps([...completedSteps, 2]);
      }
    }

    if (canProceed) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
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
        dateOfBirth: data.dateOfBirth,
      };

      // Add optional fields only if they have values
      if (data.email && data.email.trim()) {
        payload.email = data.email;
      }

      // Educational qualifications (legacy fields)
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

      // Multiple qualifications
      if (qualifications && qualifications.length > 0) {
        payload.qualifications = qualifications.map((qual) => ({
          qualificationId: qual.qualificationId,
          university: qual.university,
          graduationYear: qual.graduationYear,
          gpa: qual.gpa,
          isCompleted: qual.isCompleted,
          notes: qual.notes,
        }));
      }

      // Work experiences
      if (workExperiences && workExperiences.length > 0) {
        payload.workExperiences = workExperiences.map((exp) => ({
          companyName: exp.companyName,
          jobTitle: exp.jobTitle,
          startDate: exp.startDate,
          endDate: exp.endDate || undefined,
          isCurrent: exp.isCurrent || false,
          description: exp.description || undefined,
          salary: exp.salary || undefined,
          location: exp.location || undefined,
          skills:
            exp.skills && exp.skills.length > 0
              ? exp.skills
              : undefined,
          achievements: exp.achievements || undefined,
        }));
      }

      const result = await createCandidate(payload).unwrap();

      if (result) {
        const candidateId = result.id;

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

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <PersonalInformationStep
            control={form.control}
            errors={form.formState.errors}
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
            uploadingImage={uploadingImage}
            isLoading={isLoading}
          />
        );
      case 2:
        return (
          <EducationalQualificationStep
            qualifications={qualifications}
            setQualifications={setQualifications}
          />
        );
      case 3:
        return (
          <WorkExperienceStep
            workExperiences={workExperiences}
            setWorkExperiences={setWorkExperiences}
            newWorkExperience={newWorkExperience}
            setNewWorkExperience={setNewWorkExperience}
            newSkill={newSkill}
            setNewSkill={setNewSkill}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container w-full mx-auto space-y-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-blue-600" />
              Create New Candidate
            </h1>
            <p className="text-slate-600 mt-2">
              Follow the steps to add a new candidate to the system. After creation, you can nominate them for projects.
            </p>
          </div>

          {/* Progress Stepper */}
          <div className="mb-8">
            <CandidateCreationStepper
              currentStep={currentStep}
              steps={STEPS}
              completedSteps={completedSteps}
            />
          </div>

          {/* Current Step Content */}
          <div className="space-y-6">
            {renderCurrentStep()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/candidates")}
                disabled={isLoading || uploadingImage}
                className="min-w-[120px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviousStep}
                  disabled={isLoading || uploadingImage}
                  className="min-w-[120px]"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              {currentStep < STEPS.length && (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isLoading || uploadingImage}
                  className="min-w-[120px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              
              {currentStep === STEPS.length && (
                <Button
                  type="button"
                  onClick={handleFinish}
                  disabled={isLoading || uploadingImage}
                  className="min-w-[120px] bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Preview & Create
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Component */}
      {showPreview && (
        <CandidatePreview
          candidateData={{
            firstName: form.getValues("firstName"),
            lastName: form.getValues("lastName"),
            contact: `${form.getValues("countryCode")}${form.getValues("mobileNumber")}`,
            email: form.getValues("email"),
            source: form.getValues("source"),
            dateOfBirth: form.getValues("dateOfBirth"),
            highestEducation: form.getValues("highestEducation"),
            university: form.getValues("university"),
            graduationYear: form.getValues("graduationYear"),
            gpa: form.getValues("gpa"),
            qualifications,
            workExperiences,
          }}
          onConfirm={handlePreviewConfirm}
          onCancel={handlePreviewCancel}
          isLoading={isLoading || uploadingImage}
        />
      )}
    </>
  );
}