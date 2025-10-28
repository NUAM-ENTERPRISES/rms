import { z } from "zod";

// Shared validation schema for project forms (create and edit)
export const projectFormSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  clientId: z.string().optional(),
  countryCode: z.string().optional(),
  deadline: z.date({ message: "Deadline is required" }),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  projectType: z.enum(["private", "ministry"]).default("private"),
  resumeEditable: z.boolean().default(true),
  groomingRequired: z
    .enum(["formal", "casual", "not_specified"])
    .default("formal"),
  hideContactInfo: z.boolean().default(true), // Default to hide contact info for private projects
  rolesNeeded: z
    .array(
      z.object({
        designation: z.string().min(1, "Designation is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        // Removed priority from requirement criteria
        minExperience: z.union([z.number().min(0), z.undefined()]).optional(),
        maxExperience: z.union([z.number().min(0), z.undefined()]).optional(),
        specificExperience: z.string().nullable().optional(),
        educationRequirementsList: z
          .array(
            z.object({
              qualificationId: z.string(),
              mandatory: z.boolean(),
            })
          )
          .optional(),
        requiredCertifications: z.string().nullable().optional(),
        institutionRequirements: z.string().nullable().optional(),
        skills: z.string().nullable().optional(),
        // Removed technicalSkills
        languageRequirements: z.string().nullable().optional(),
        licenseRequirements: z.string().nullable().optional(),
        salaryRange: z.string().nullable().optional(),
        benefits: z.string().nullable().optional(),
        // Commented out for now as per requirements
        // backgroundCheckRequired: z.boolean(),
        // drugScreeningRequired: z.boolean(),
        shiftType: z
          .string()
          .nullable()
          .optional()
          .transform((val) =>
            val === "" || val === "none" || val === null ? undefined : val
          )
          .pipe(
            z
              .union([
                z.enum(["day", "night", "rotating", "flexible"]),
                z.undefined(),
              ])
              .optional()
          ),
        // onCallRequired: z.boolean(),
        physicalDemands: z.string().nullable().optional(),
        // relocationAssistance: z.boolean(),
        additionalRequirements: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        // Changed from employmentType to visaType
        visaType: z.enum(["contract", "permanent"]).default("contract"),
        contractDurationYears: z
          .union([z.number().min(1).max(10), z.undefined()])
          .optional(),
        genderRequirement: z.enum(["female", "male", "all"]).default("all"),
        // New candidate criteria fields
        requiredSkills: z.array(z.string()).default([]),
        candidateStates: z.array(z.string()).default([]),
        candidateReligions: z.array(z.string()).default([]),
        minHeight: z.union([z.number().min(0), z.undefined()]).optional(),
        maxHeight: z.union([z.number().min(0), z.undefined()]).optional(),
        minWeight: z.union([z.number().min(0), z.undefined()]).optional(),
        maxWeight: z.union([z.number().min(0), z.undefined()]).optional(),
      })
    )
    .min(1, "At least one role is required"),
  documentRequirements: z
    .array(
      z.object({
        docType: z.string().min(1, "Document type is required"),
        mandatory: z.boolean().default(true),
        description: z.string().optional(),
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
  rolesNeeded: [
    {
      designation: "",
      quantity: 1,
      visaType: "contract" as const,
      genderRequirement: "all" as const,
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
