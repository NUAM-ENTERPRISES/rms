import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  buildCreateCandidateSchema,
  type CreateCandidateFormData,
} from "@/features/candidates/createCandidateFormSchema";
import { toast } from "sonner";
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
import {
  useCreateCandidateMutation,
  useGetProfessionTypesQuery,
  useUploadDocumentMutation,
} from "@/features/candidates";
import { useUploadCandidateProfileImageMutation } from "@/services/uploadApi";
import { useCreateDocumentMutation, useUpdateDocumentMutation } from "@/features/documents/api";
import { DOCUMENT_TYPE } from "@/constants/document-types";
import CandidatePreview from "../components/CandidatePreview";
import { useCan } from "@/hooks/useCan";
import { usePermissions } from "@/hooks/usePermissions";
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
import { ROLE_NAMES } from "@/config/role-names";
import { useGetSystemConfigQuery } from "@/shared/hooks/useSystemConfig";

// ==================== WORK EXPERIENCE TYPES ====================

type PendingCertBatch = {
  id: string;
  docName: string;
  files: File[];
};

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
  pendingCertBatches?: PendingCertBatch[];
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
  const [searchParams] = useSearchParams();
  const canCreateCandidate =
    useCan("write:candidates") || useCan("manage:candidates");
  const { hasRole } = usePermissions();
  const isRecruiter = hasRole("Recruiter");
  const isOperations = hasRole(ROLE_NAMES.OPERATIONS) || hasRole("CRE");
  const isAgentCoordinator = hasRole(ROLE_NAMES.AGENT_COORDINATOR);
  const { data: systemConfig } = useGetSystemConfigQuery("religions");
  const religions = systemConfig?.data?.constants?.religions ?? [];

  const candidatesHomePath = isAgentCoordinator
    ? "/agents"
    : isOperations
      ? "/operations-dashboard"
      : "/candidates";

  // API
  const [createCandidate, { isLoading }] = useCreateCandidateMutation();
  const [uploadProfileImage, { isLoading: uploadingImage }] =
    useUploadCandidateProfileImageMutation();
  const [uploadDocument] = useUploadDocumentMutation();
  const [eligibilityLetterFile, setEligibilityLetterFile] = useState<File | null>(null);
  const [eligibilityLetterFileError, setEligibilityLetterFileError] = useState<string | null>(null);
  const [createDocument] = useCreateDocumentMutation();
  const [updateDocument] = useUpdateDocumentMutation();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  // Local state for uploads
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preferredRoleLabels, setPreferredRoleLabels] = useState<Record<string, string>>({});
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
    pendingCertBatches: [],
  });
  const [newSkill, setNewSkill] = useState("");
  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [passportDuplicate, setPassportDuplicate] = useState(false);

  const [qualifications, setQualifications] = useState<CandidateQualification[]>([]);

  const candidateSchema = useMemo(
    () => buildCreateCandidateSchema({ isAgentCoordinator }),
    [isAgentCoordinator],
  );

  const handlePassportDuplicateChange = useCallback((isDuplicate: boolean) => {
    setPassportDuplicate(isDuplicate);
  }, []);

  // Form
  const form = useForm<CreateCandidateFormData>({
    resolver: zodResolver(candidateSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    shouldUnregister: false,
    defaultValues: {
      firstName: "",
      lastName: "",
      countryCode: isAgentCoordinator ? "" : "+91",
      mobileNumber: "",
      passportNumber: "",
      email: "",
      source: (isOperations
        ? "direct_enquiry"
        : isRecruiter
          ? "referral"
          : isAgentCoordinator
            ? "agent"
            : "manual") as any,
      agentId: "",
      declaredProjectIds: [],
      gender: "" as any,
      dateOfBirth: "",
      referralCompanyName: "",
      referralEmail: "",
      referralCountryCode: "",
      referralPhone: "",
      referralDescription: "",
      addressCountryCode: "",
      addressStateId: "",
      address: "",
      addressPincode: "",
      alternatePhone: "",
      // physical information defaults
      height: undefined,
      weight: undefined,
      skinTone: "",
      languageProficiency: "",
      smartness: "",
      religionId: "",
      licensingExam: "",
      dataFlow: false,
      eligibility: false,
      eligibilityNumber: "",
      eligibilityIssuedAt: "",
      eligibilityExpiryAt: "",
      highestEducation: "",
      university: "",
      graduationYear: undefined,
      gpa: undefined,
      qualifications: [],
      professionTypeId: "",
      sectorType: SECTOR_TYPES.ANY_PREFERENCE,
      visaType: VISA_TYPES.NOT_APPLICABLE,
      preferredCountries: [],
      facilityPreferences: [],
      preferredRoles: [],
    },
  });

  const professionTypeId = form.watch("professionTypeId");
  const { data: professionTypesData } = useGetProfessionTypesQuery();
  const selectedProfessionTypeName = useMemo(
    () =>
      professionTypesData?.professionTypes.find((type) => type.id === professionTypeId)
        ?.name,
    [professionTypeId, professionTypesData?.professionTypes],
  );

  // Preselect agent when coming from Agent screens
  useEffect(() => {
    const agentIdFromUrl = searchParams.get("agentId")?.trim() || "";
    if (!agentIdFromUrl) return;

    // Set only if the form doesn't already have an agentId (avoid clobbering user choice)
    const currentAgentId = (form.getValues("agentId") || "").trim();
    if (!currentAgentId) {
      form.setValue("agentId", agentIdFromUrl, { shouldValidate: true, shouldDirty: true });
      // Ensure source is agent for this flow (agent-driven creation)
      form.setValue("source", "agent" as any, { shouldValidate: true, shouldDirty: true });
    }
  }, [searchParams, form]);

  // Permission check
  if (!canCreateCandidate) {
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
            <Button onClick={() => navigate(candidatesHomePath)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {isOperations ? "Back to Operations Dashboard" : isAgentCoordinator ? "Back to Agents" : "Back to Candidates"}
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
      ...(isAgentCoordinator
        ? ["passportNumber", "countryCode", "mobileNumber"]
        : ["countryCode", "mobileNumber"]),
      "source",
      "agentId",
      "gender",
      "professionTypeId",
      "height",
      "weight",
      "skinTone",
      "smartness",
      "languageProficiency",
    ];
    const isValid = await form.trigger(step1Fields as any);

    if (isValid && isAgentCoordinator && passportDuplicate) {
      toast.error(
        "A candidate with this passport number already exists. Use the existing record.",
      );
      return false;
    }
    
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
      "expectedSalary",
      "preferredCountries",
      "facilityPreferences",
      "preferredRoles",
      "sectorType",
      "visaType",
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

  const handleFinish = async () => {
    if (isAgentCoordinator && passportDuplicate) {
      toast.error(
        "A candidate with this passport number already exists. Use the existing record.",
      );
      return;
    }
    const step1Ok = await validateStep1();
    if (!step1Ok) return;
    setShowPreview(true);
  };

  // Form submission
  const onSubmit = async (data: CreateCandidateFormData) => {
    try {
      if (isAgentCoordinator && passportDuplicate) {
        toast.error(
          "A candidate with this passport number already exists. Use the existing record.",
        );
        return;
      }

      const payload: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        source: data.source || "manual",
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
      };

      const cc = data.countryCode?.trim();
      const mn = data.mobileNumber?.trim();
      if (cc && mn) {
        payload.countryCode = cc;
        payload.mobileNumber = mn;
      }

      if (isAgentCoordinator) {
        const passport = data.passportNumber?.trim();
        if (passport) {
          payload.passportNumber = passport;
        }
      }

      // Add optional fields only if they have values
      if (data.email && data.email.trim()) {
        payload.email = data.email;
      }

      if (data.source === "agent" && data.agentId?.trim()) {
        payload.agentId = data.agentId.trim();
      }

      if (data.source === "agent" && Array.isArray(data.declaredProjectIds) && data.declaredProjectIds.length > 0) {
        payload.declaredProjectIds = data.declaredProjectIds;
      }

      // Referral fields
      if (data.source === "referral") {
        if (data.referralCompanyName) payload.referralCompanyName = data.referralCompanyName;
        if (data.referralEmail) payload.referralEmail = data.referralEmail;
        if (data.referralCountryCode) payload.referralCountryCode = data.referralCountryCode;
        if (data.referralPhone) payload.referralPhone = data.referralPhone;
        if (data.referralDescription) payload.referralDescription = data.referralDescription;
      }

      if (data.addressCountryCode?.trim()) {
        payload.addressCountryCode = data.addressCountryCode.trim();
      }
      if (data.addressStateId?.trim()) {
        payload.addressStateId = data.addressStateId.trim();
      }
      if (data.address?.trim()) {
        payload.address = data.address.trim();
      }
      const addressPincode = (
        data.addressPincode ??
        form.getValues("addressPincode") ??
        ""
      ).trim();
      if (addressPincode) {
        payload.addressPincode = addressPincode;
      }
      if (data.alternatePhone?.trim()) {
        payload.alternatePhone = data.alternatePhone.trim();
      }

      payload.professionTypeId = data.professionTypeId;

      // Preference fields
      if (data.expectedSalary !== undefined) payload.expectedMinSalary = data.expectedSalary;
      if (data.sectorType) payload.sectorType = data.sectorType;
      if (data.visaType) payload.visaType = data.visaType;
      if (data.preferredCountries && data.preferredCountries.length > 0) {
        payload.preferredCountries = data.preferredCountries;
      }
      if (data.facilityPreferences && data.facilityPreferences.length > 0) {
        payload.facilityPreferences = data.facilityPreferences;
      }
      if (data.preferredRoles && data.preferredRoles.length > 0) {
        payload.preferredRoles = data.preferredRoles;
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
      if (data.expectedSalary !== undefined) {
        payload.expectedMinSalary = data.expectedSalary;
      }
      if (data.preferredCountries && data.preferredCountries.length > 0) {
        payload.preferredCountries = data.preferredCountries;
      }
      if (data.facilityPreferences && data.facilityPreferences.length > 0) {
        payload.facilityPreferences = data.facilityPreferences;
      }
      if (data.preferredRoles && data.preferredRoles.length > 0) {
        payload.preferredRoles = data.preferredRoles;
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
          ...(qual.countryCode?.trim() && { countryCode: qual.countryCode.trim() }),
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
      if (data.religionId) {
        payload.religionId = data.religionId;
      }
      if (data.licensingExam) {
        payload.licensingExam = data.licensingExam;
      }
      // dataFlow and eligibility default false but send anyway
      payload.dataFlow = data.dataFlow;
      payload.eligibility = data.eligibility;
      if (data.eligibility) {
        if (data.eligibilityNumber?.trim()) {
          payload.eligibilityNumber = data.eligibilityNumber.trim();
        }
        if (data.eligibilityIssuedAt?.trim()) {
          payload.eligibilityIssuedAt = data.eligibilityIssuedAt.trim();
        }
        if (data.eligibilityExpiryAt?.trim()) {
          payload.eligibilityExpiryAt = data.eligibilityExpiryAt.trim();
        }
        if (!eligibilityLetterFile) {
          setEligibilityLetterFileError(
            "Eligibility letter is required when eligibility is enabled",
          );
          toast.error("Please upload the eligibility letter");
          return;
        }
      }

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
            ...(expData.countryCode?.trim() && {
              countryCode: expData.countryCode.trim(),
            }),
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

        // Upload experience certificate files for each work experience
        // The API response work experiences are in the same order as submitted.
        const createdWorkExperiences: any[] =
          (result as any).workExperiences ||
          (result as any).data?.workExperiences ||
          (result as any).data?.candidate?.workExperiences ||
          [];

        const experiencesWithFiles = workExperiences.filter((exp) =>
          (exp.pendingCertBatches ?? []).some((b) => b.files.length > 0)
        );

        if (candidateId && experiencesWithFiles.length > 0) {
          let fileUploadErrors = 0;
          for (let i = 0; i < workExperiences.length; i++) {
            const localExp = workExperiences[i];
            const batches = (localExp.pendingCertBatches ?? []).filter(
              (b) => b.files.length > 0
            );
            if (batches.length === 0) continue;
            // Match by index — same submission order as returned by backend
            const createdExp = createdWorkExperiences[i];
            const workExperienceId = createdExp?.id;
            if (!workExperienceId) continue;

            for (const batch of batches) {
              const desiredDocName =
                (batch.docName && batch.docName.trim()) ||
                (localExp.companyName && localExp.companyName.trim()) ||
                "";

              for (const file of batch.files) {
                try {
                  const formData = new FormData();
                  formData.append("file", file);
                  formData.append("docType", DOCUMENT_TYPE.EXPERIENCE_LETTERS);
                  formData.append("workExperienceId", workExperienceId);
                  const uploadResult = await uploadDocument({ candidateId, formData }).unwrap();
                  const uploadData: any = (uploadResult as any).data;
                  const uploadedDocument =
                    uploadData?.document && uploadData.document.id
                      ? uploadData.document
                      : uploadData?.id
                        ? uploadData
                        : null;

                  if (uploadedDocument) {
                    if (desiredDocName) {
                      await updateDocument({
                        id: uploadedDocument.id,
                        docName: desiredDocName,
                      }).unwrap();
                    }
                  } else {
                    await createDocument({
                      candidateId,
                      docType: DOCUMENT_TYPE.EXPERIENCE_LETTERS,
                      docName: desiredDocName || undefined,
                      fileName: uploadData.fileName,
                      fileUrl: uploadData.fileUrl,
                      fileSize: uploadData.fileSize,
                      mimeType: uploadData.mimeType,
                      workExperienceId,
                    }).unwrap();
                  }
                } catch {
                  fileUploadErrors++;
                }
              }
            }
          }
          if (fileUploadErrors > 0) {
            toast.warning(`Candidate created but ${fileUploadErrors} certificate file(s) failed to upload`);
          }
        }

        if (candidateId && data.eligibility && eligibilityLetterFile) {
          try {
            const formData = new FormData();
            formData.append("file", eligibilityLetterFile);
            formData.append("docType", DOCUMENT_TYPE.ELIGIBILITY_LETTER);
            if (data.eligibilityNumber?.trim()) {
              formData.append("documentNumber", data.eligibilityNumber.trim());
            }
            if (data.eligibilityExpiryAt?.trim()) {
              formData.append("expiryDate", data.eligibilityExpiryAt.trim());
            }
            const uploadResult = await uploadDocument({ candidateId, formData }).unwrap();
            const uploadData: any = (uploadResult as any).data;
            const uploadedDocument =
              uploadData?.document && uploadData.document.id
                ? uploadData.document
                : uploadData?.id
                  ? uploadData
                  : null;

            if (!uploadedDocument) {
              await createDocument({
                candidateId,
                docType: DOCUMENT_TYPE.ELIGIBILITY_LETTER,
                fileName: uploadData.fileName,
                fileUrl: uploadData.fileUrl,
                fileSize: uploadData.fileSize,
                mimeType: uploadData.mimeType,
                documentNumber: data.eligibilityNumber?.trim() || undefined,
                expiryDate: data.eligibilityExpiryAt?.trim()
                  ? new Date(data.eligibilityExpiryAt.trim()).toISOString()
                  : undefined,
              }).unwrap();
            } else if (data.eligibilityNumber?.trim() || data.eligibilityExpiryAt?.trim()) {
              await updateDocument({
                id: uploadedDocument.id,
                documentNumber: data.eligibilityNumber?.trim() || undefined,
                expiryDate: data.eligibilityExpiryAt?.trim()
                  ? new Date(data.eligibilityExpiryAt.trim()).toISOString()
                  : undefined,
              }).unwrap();
            }
          } catch (uploadError) {
            console.error("Eligibility letter upload failed:", uploadError);
            toast.warning("Candidate created but eligibility letter upload failed");
          }
        }

        toast.success("Candidate created successfully!");
        navigate(candidatesHomePath);
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
            lockSourceToAgent={isAgentCoordinator}
            showPassportField={isAgentCoordinator}
            onPassportDuplicateChange={handlePassportDuplicateChange}
            setValue={form.setValue}
          />
        );
      case 2:
        return (
          <JobPreferenceStep
            control={form.control}
            errors={form.formState.errors}
            isLoading={isLoading}
            professionTypeName={selectedProfessionTypeName}
            onPreferredRoleLabelsChange={setPreferredRoleLabels}
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
            editingExperienceId={editingExperienceId}
            setEditingExperienceId={setEditingExperienceId}
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
            eligibilityLetterFile={eligibilityLetterFile}
            onEligibilityLetterFileChange={(file) => {
              setEligibilityLetterFile(file);
              if (file) setEligibilityLetterFileError(null);
            }}
            eligibilityLetterFileError={eligibilityLetterFileError}
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
            onClick={() => navigate(candidatesHomePath)}
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
        contact: (() => {
          const mn = form.getValues("mobileNumber")?.trim();
          const cc = form.getValues("countryCode")?.trim();
          return mn && cc ? `${cc}${mn}` : mn ? mn : "";
        })(),
        email: form.getValues("email"),
        source: form.getValues("source"),
        gender: form.getValues("gender"),
        dateOfBirth: form.getValues("dateOfBirth") || "",
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
        professionTypeId: form.getValues("professionTypeId"),
        professionTypeLabel:
          professionTypesData?.professionTypes.find(
            (type) => type.id === form.getValues("professionTypeId"),
          )?.label,
        expectedSalary: form.getValues("expectedSalary") ?? undefined,
        preferredCountries: form.getValues("preferredCountries"),
        facilityPreferences: form.getValues("facilityPreferences"),
        preferredRoles: form.getValues("preferredRoles"),
        preferredRoleLabels,
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
        eligibilityNumber: form.getValues("eligibilityNumber"),
        eligibilityIssuedAt: form.getValues("eligibilityIssuedAt"),
        eligibilityExpiryAt: form.getValues("eligibilityExpiryAt"),
        religionName: religions.find(
          (religion) => religion.id === form.getValues("religionId"),
        )?.name,
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