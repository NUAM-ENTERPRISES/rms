import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SKIN_TONES, SMARTNESS_LEVELS } from "@/constants/candidate-constants";
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
  JobPreferenceStep,
  EducationalQualificationStep,
  WorkExperienceStep,
  ChecklistStep,
} from "../components/steps";
import { SECTOR_TYPES, VISA_TYPES } from "@/constants/candidate-constants";

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
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
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
  dataFlow: z.boolean().optional().default(false),
  eligibility: z.boolean().optional().default(false),

  // Referral Fields
  referralCompanyName: z.string().optional(),
  referralEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  referralCountryCode: z.string().optional(),
  referralPhone: z.string().optional(),
  referralDescription: z.string().optional(),

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

type CreateCandidateFormData = z.infer<typeof createCandidateSchema>;

// ==================== WORK EXPERIENCE TYPES ====================

type WorkExperience = {
  id: string;
  companyName: string;
  departmentId?: string;
  roleCatalogId: string;
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
    description: "Basic information",
  },
  {
    id: 2,
    title: "Job Preference",
    description: "Salary & work preferences",
  },
  {
    id: 3,
    title: "Education",
    description: "Qualifications",
  },
  {
    id: 4,
    title: "Experience",
    description: "Work history (optional)",
  },
  {
    id: 5,
    title: "Checklist",
    description: "Licensing & Verification",
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
    departmentId: undefined,
    roleCatalogId: "",
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
      gender: "" as any,
      dateOfBirth: "",
      // physical information defaults
      height: undefined,
      weight: undefined,
      skinTone: "",
      languageProficiency: "",
      smartness: "",
      licensingExam: "",
      dataFlow: false,
      eligibility: false,
      referralCompanyName: "",
      referralEmail: "",
      referralCountryCode: "+91",
      referralPhone: "",
      referralDescription: "",
      highestEducation: "",
      university: "",
      graduationYear: undefined,
      gpa: undefined,
      qualifications: [],
      sectorType: SECTOR_TYPES.NO_PREFERENCE,
      visaType: VISA_TYPES.NOT_APPLICABLE,
      preferredCountries: [],
      facilityPreferences: [],
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
    const step1Fields = [
      "firstName",
      "lastName",
      "countryCode",
      "mobileNumber",
      "dateOfBirth",
      "source",
      "gender",
      "referralCompanyName",
      "referralEmail",
      "referralCountryCode",
      "referralPhone",
      "referralDescription"
    ];
    const isValid = await form.trigger(step1Fields as any);
    
    if (isValid) {
      if (!completedSteps.includes(1)) {
        setCompletedSteps([...completedSteps, 1]);
      }
      return true;
    }
    return false;
  };

  const validateStep2 = async () => {
    const step2Fields = [
      "expectedMinSalary",
      "expectedMaxSalary",
      "preferredCountries",
      "facilityPreferences",
      "sectorType",
      "visaType"
    ];
    const isValid = await form.trigger(step2Fields as any);
    
    if (isValid) {
      if (!completedSteps.includes(2)) {
        setCompletedSteps([...completedSteps, 2]);
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
      canProceed = await validateStep2();
    } else if (currentStep === 3) {
      // Educational qualifications are optional, so we can always proceed
      canProceed = true;
      if (!completedSteps.includes(3)) {
        setCompletedSteps([...completedSteps, 3]);
      }
    } else if (currentStep === 4) {
      // Work experiences are optional, so we can always proceed
      canProceed = true;
      if (!completedSteps.includes(4)) {
        setCompletedSteps([...completedSteps, 4]);
      }
    } else if (currentStep === 5) {
      // Checklist is optional, so we can always proceed
      canProceed = true;
      if (!completedSteps.includes(5)) {
        setCompletedSteps([...completedSteps, 5]);
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
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
      };

      // Add optional fields only if they have values
      if (data.email && data.email.trim()) {
        payload.email = data.email;
      }

      // Referral fields
      if (data.source === "referral") {
        if (data.referralCompanyName) payload.referralCompanyName = data.referralCompanyName;
        if (data.referralEmail) payload.referralEmail = data.referralEmail;
        if (data.referralCountryCode) payload.referralCountryCode = data.referralCountryCode;
        if (data.referralPhone) payload.referralPhone = data.referralPhone;
        if (data.referralDescription) payload.referralDescription = data.referralDescription;
      }

      // Preference fields
      if (data.expectedMinSalary !== undefined) payload.expectedMinSalary = data.expectedMinSalary;
      if (data.expectedMaxSalary !== undefined) payload.expectedMaxSalary = data.expectedMaxSalary;
      if (data.sectorType) payload.sectorType = data.sectorType;
      if (data.visaType) payload.visaType = data.visaType;
      if (data.preferredCountries && data.preferredCountries.length > 0) {
        payload.preferredCountries = data.preferredCountries;
      }
      if (data.facilityPreferences && data.facilityPreferences.length > 0) {
        payload.facilityPreferences = data.facilityPreferences;
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
      // salary range & preferences
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

      // Physical information
      if (data.height !== undefined && data.height !== null) {
        payload.height = data.height;
      }
      if (data.weight !== undefined && data.weight !== null) {
        payload.weight = data.weight;
      }
      if (data.skinTone) {
        payload.skinTone = data.skinTone;
      }
      if (data.languageProficiency) {
        payload.languageProficiency = data.languageProficiency;
      }
      if (data.smartness) {
        payload.smartness = data.smartness;
      }
      if (data.licensingExam) {
        payload.licensingExam = data.licensingExam;
      }
      // dataFlow and eligibility default false but send anyway
      payload.dataFlow = data.dataFlow;
      payload.eligibility = data.eligibility;

      // Work experiences
      if (workExperiences && workExperiences.length > 0) {
        payload.workExperiences = workExperiences.map((exp) => {
          const { departmentId, id, ...expData } = exp;
          return {
            companyName: expData.companyName || undefined,
            roleCatalogId: expData.roleCatalogId || undefined,
            jobTitle: expData.jobTitle,
            startDate: expData.startDate,
            endDate: expData.endDate || undefined,
            isCurrent: expData.isCurrent || false,
            description: expData.description || undefined,
            salary: expData.salary || undefined,
            location: expData.location || undefined,
            skills:
              expData.skills && expData.skills.length > 0
                ? expData.skills
                : undefined,
            achievements: expData.achievements || undefined,
          };
        });
      }

      const result = await createCandidate(payload).unwrap();

      if (result) {
        // The backend sometimes returns the created candidate directly, and
        // sometimes wraps it in a { success, data, message } envelope. Be
        // defensive and extract the id from either shape.
        const candidateId =
          (result as any).id || (result as any).data?.id || (result as any).data?.candidate?.id;

        if (!candidateId) {
          console.warn("Could not determine created candidate ID from response:", result);
          toast.warning("Candidate created but profile image could not be uploaded (missing id)");
        }

        // Upload profile image if selected and we have a valid id
        if (selectedImage && candidateId) {
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
          <JobPreferenceStep
            control={form.control}
            errors={form.formState.errors}
            isLoading={isLoading}
          />
        );
      case 3:
        return (
          <EducationalQualificationStep
            qualifications={qualifications}
            setQualifications={setQualifications}
          />
        );
      case 4:
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
      case 5:
        return (
          <ChecklistStep
            control={form.control}
            errors={form.formState.errors}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
  <>
  <div className="min-h-screen bg-slate-100">
    <div className="mx-auto w-full max-w-6xl px-6 py-10 space-y-10">

      {/* Header */}
      <div className="pb-4">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <UserPlus className="h-9 w-9 text-blue-600" />
          Create New Candidate
        </h1>
        <p className="text-slate-600 mt-2 text-lg">
          Follow the guided steps to add a new candidate.
        </p>
      </div>

      {/* Stepper in Card */}
      <div className="rounded-lg bg-white shadow-sm border border-slate-200 p-6">
        <CandidateCreationStepper
          currentStep={currentStep}
          steps={STEPS}
          completedSteps={completedSteps}
        />
      </div>

      {/* Step Content (No card) */}
      <div className="pt-2">
        {renderCurrentStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-8">

        {/* Left Buttons */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/candidates")}
            disabled={isLoading || uploadingImage}
            className="min-w-[120px] border-slate-300"
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
              className="min-w-[120px] border-slate-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
        </div>

        {/* Right Buttons */}
        <div className="flex gap-3">
          {/* Allow finishing early if personal info (step 1) is valid */}
          {completedSteps.includes(1) && currentStep < STEPS.length && (
            <Button
              type="button"
              onClick={handleFinish}
              disabled={isLoading || uploadingImage}
              className="min-w-[160px] bg-slate-800 hover:bg-slate-900 text-white shadow-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Preview & Create
            </Button>
          )}

          {currentStep < STEPS.length && (
            <Button
              type="button"
              onClick={handleNextStep}
              disabled={isLoading || uploadingImage}
              className="min-w-[140px] bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
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
              className="min-w-[160px] bg-green-600 hover:bg-green-700 text-white shadow-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Preview & Create
            </Button>
          )}
        </div>

      </div>
    </div>
  </div>

  {/* Preview */}
  {showPreview && (
    <CandidatePreview
      candidateData={{
        firstName: form.getValues("firstName"),
        lastName: form.getValues("lastName"),
        contact: `${form.getValues("countryCode")}${form.getValues("mobileNumber")}`,
        email: form.getValues("email"),
        source: form.getValues("source"),
        gender: form.getValues("gender"),
        dateOfBirth: form.getValues("dateOfBirth"),
        referralCompanyName: form.getValues("referralCompanyName"),
        referralEmail: form.getValues("referralEmail"),
        referralCountryCode: form.getValues("referralCountryCode"),
        referralPhone: form.getValues("referralPhone"),
        referralDescription: form.getValues("referralDescription"),
        highestEducation: form.getValues("highestEducation"),
        university: form.getValues("university"),
        graduationYear: form.getValues("graduationYear"),
        gpa: form.getValues("gpa"),
        qualifications,
        workExperiences,
        expectedMinSalary: form.getValues("expectedMinSalary"),
        expectedMaxSalary: form.getValues("expectedMaxSalary"),
        preferredCountries: form.getValues("preferredCountries"),
        facilityPreferences: form.getValues("facilityPreferences"),
        sectorType: form.getValues("sectorType"),
        visaType: form.getValues("visaType"),
        skinTone: form.getValues("skinTone"),
        height: form.getValues("height"),
        weight: form.getValues("weight"),
        languageProficiency: form.getValues("languageProficiency"),
        smartness: form.getValues("smartness"),
        licensingExam: form.getValues("licensingExam"),
        dataFlow: form.getValues("dataFlow"),
        eligibility: form.getValues("eligibility"),
      }}
      onConfirm={handlePreviewConfirm}
      onCancel={handlePreviewCancel}
      onEditStep={(step) => {
        setCurrentStep(step);
        setShowPreview(false);
      }}
      isLoading={isLoading || uploadingImage}
    />
  )}
</>

  );
}