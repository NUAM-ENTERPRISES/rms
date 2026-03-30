import { z } from "zod";

// Shared validation schema for project forms (create and edit)
export const projectFormSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  clientId: z.string().optional(),
  countryCode: z.string().optional(),
  deadline: z.date({ message: "Deadline is required" }),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  projectType: z.enum(["private", "ministry"]),
  resumeEditable: z.boolean(),
  groomingRequired: z.enum(["formal", "casual", "not_specified"]),
  hideContactInfo: z.boolean(),
  requiredScreening: z.boolean(),
  licensingExam: z.string().optional(),
  dataFlow: z.boolean().optional(),
  eligibility: z.boolean().optional(),
  rolesNeeded: z
    .array(
      z.object({
        roleCatalogId: z.string().min(1, "Role catalog ID is required"),
        designation: z.string().min(1, "Designation is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        // Role-level priority (optional) — some UI still uses per-role priority
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        minExperience: z.union([z.number().min(0), z.undefined()]).optional(),
        maxExperience: z.union([z.number().min(0), z.undefined()]).optional(),
        specificExperience: z.string().nullable().optional(),
        educationRequirementsList: z
          .array(
            z.object({
              qualificationId: z.string(),
              mandatory: z.boolean(),
              qualificationLabel: z.string().optional(),
            })
          )
          .optional(),
        requiredCertifications: z.string().nullable().optional(),
        institutionRequirements: z.string().nullable().optional(),
        skills: z.string().nullable().optional(),
        // Optional technical skills string (comma-separated)
        technicalSkills: z.string().nullable().optional(),
        languageRequirements: z.string().nullable().optional(),
        licenseRequirements: z.string().nullable().optional(),
        minSalaryRange: z.number().nullable().optional(),
        maxSalaryRange: z.number().nullable().optional(),
        benefits: z.string().nullable().optional(),
        // Commented out for now as per requirements
        // backgroundCheckRequired: z.boolean(),
        // drugScreeningRequired: z.boolean(),
        shiftType: z
          .enum(["day", "night", "rotating", "flexible"])
          .optional(),
        onCallRequired: z.boolean().optional(),
        physicalDemands: z.string().nullable().optional(),
        relocationAssistance: z.boolean().optional(),
        backgroundCheckRequired: z.boolean().optional(),
        drugScreeningRequired: z.boolean().optional(),
        additionalRequirements: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        // Changed from employmentType to visaType
        visaType: z.enum(["contract", "permanent"]),
        contractDurationYears: z
          .union([z.number().min(1).max(10), z.undefined()])
          .optional(),
        genderRequirement: z.enum(["female", "male", "all", "other"]),
        minAge: z.number().min(0),
        maxAge: z.number().min(0),
        accommodation: z.boolean().optional(),
        food: z.boolean().optional(),
        transport: z.boolean().optional(),
        target: z.union([z.number().int(), z.undefined()]).optional(),
        // New candidate criteria fields
        requiredSkills: z.array(z.string()),
        departmentId: z.string().optional(),
        candidateStates: z.array(z.string()),
        candidateReligions: z.array(z.string()),
        minHeight: z.union([z.number().min(0), z.undefined()]).optional(),
        maxHeight: z.union([z.number().min(0), z.undefined()]).optional(),
        minWeight: z.union([z.number().min(0), z.undefined()]).optional(),
        maxWeight: z.union([z.number().min(0), z.undefined()]).optional(),
      })
    )
    .superRefine((roles, ctx) => {
      roles.forEach((role, idx) => {
        if (role.minAge != null && role.maxAge != null && role.minAge > role.maxAge) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [idx, 'maxAge'],
            message: 'Maximum age must be greater than or equal to minimum age',
          });
        }
      });
    })
    .min(1, "At least one role is required"),
  documentRequirements: z
    .array(
      z.object({
        docType: z.string().min(1, "Document type is required"),
        mandatory: z.boolean(),
        description: z.string().optional(),
        isAutomatic: z.boolean().optional(),
      })
    )
    .min(1, "At least one document requirement is mandatory"),
});

// Type inference from schema
export type ProjectFormData = z.infer<typeof projectFormSchema>;

// Default values for new projects
export const defaultProjectValues = {
  priority: "medium" as const,
  projectType: "private" as const,
  resumeEditable: true,
  groomingRequired: "formal" as const,
  hideContactInfo: true, // Default to hide contact info for private projects
  requiredScreening: false,
  licensingExam: "",
  dataFlow: false,
  eligibility: false,
  rolesNeeded: [
    {
      departmentId: undefined,
      roleCatalogId: "",
      designation: "",
      quantity: 1,
      priority: "medium" as const,
      technicalSkills: undefined,
      minSalaryRange: undefined,
      maxSalaryRange: undefined,
      backgroundCheckRequired: true,
      drugScreeningRequired: true,
      onCallRequired: false,
      relocationAssistance: false,
      visaType: "contract" as const,
      genderRequirement: "all" as const,
      minAge: 18,
      maxAge: 35,
      accommodation: false,
      food: false,
      transport: false,
      target: undefined,
      requiredSkills: [],
      candidateStates: [],
      candidateReligions: [],
    },
  ],
  documentRequirements: [
    {
      docType: "resume",
      mandatory: true,
      description: "Updated resume/CV",
    },
  ],
};
