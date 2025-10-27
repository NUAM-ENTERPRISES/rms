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
  rolesNeeded: z
    .array(
      z.object({
        designation: z.string().min(1, "Designation is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        priority: z.enum(["low", "medium", "high", "urgent"]),
        minExperience: z.union([z.number().min(0), z.undefined()]).optional(),
        maxExperience: z.union([z.number().min(0), z.undefined()]).optional(),
        specificExperience: z.string().optional(),
        educationRequirementsList: z
          .array(
            z.object({
              qualificationId: z.string(),
              mandatory: z.boolean(),
            })
          )
          .optional(),
        requiredCertifications: z.string().optional(),
        institutionRequirements: z.string().optional(),
        skills: z.string().optional(),
        technicalSkills: z.string().optional(),
        languageRequirements: z.string().optional(),
        licenseRequirements: z.string().optional(),
        salaryRange: z.string().optional(),
        benefits: z.string().optional(),
        backgroundCheckRequired: z.boolean(),
        drugScreeningRequired: z.boolean(),
        shiftType: z
          .union([
            z.enum(["day", "night", "rotating", "flexible"]),
            z.literal(""),
          ])
          .optional(),
        onCallRequired: z.boolean(),
        physicalDemands: z.string().optional(),
        relocationAssistance: z.boolean(),
        additionalRequirements: z.string().optional(),
        notes: z.string().optional(),
        employmentType: z.enum(["contract", "permanent"]).default("permanent"),
        contractDurationYears: z.number().min(1).max(10).optional(),
        genderRequirement: z.enum(["female", "male", "all"]).default("all"),
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
  rolesNeeded: [
    {
      designation: "",
      quantity: 1,
      priority: "medium" as const,
      backgroundCheckRequired: false,
      drugScreeningRequired: false,
      onCallRequired: false,
      relocationAssistance: false,
      employmentType: "permanent" as const,
      genderRequirement: "all" as const,
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
