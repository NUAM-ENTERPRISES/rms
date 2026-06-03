import { z } from "zod";
import {
  CANDIDATE_SOURCES,
  SKIN_TONES,
  SMARTNESS_LEVELS,
  LANGUAGE_PROFICIENCY_LEVELS,
} from "@/constants/candidate-constants";

const CANDIDATE_SOURCE_IDS = CANDIDATE_SOURCES.map((s) => s.id) as [
  string,
  ...string[],
];

export type CreateCandidateSchemaOptions = {
  isAgentCoordinator?: boolean;
};

export function buildCreateCandidateSchema(
  options: CreateCandidateSchemaOptions = {},
) {
  const isAgentCoordinator = options.isAgentCoordinator ?? false;

  return z
    .object({
      firstName: z.string().min(1, "First name is required").max(50),
      lastName: z.string().min(1, "Last name is required").max(50),
      countryCode: isAgentCoordinator
        ? z.string().optional().or(z.literal(""))
        : z.string().min(1, "Country code is required"),
      mobileNumber: isAgentCoordinator
        ? z.string().optional().or(z.literal(""))
        : z
            .string()
            .min(10, "Mobile number must be at least 10 characters")
            .max(15, "Mobile number must not exceed 15 characters"),
      passportNumber: isAgentCoordinator
        ? z
            .string()
            .min(3, "Passport number is required")
            .max(50, "Passport number is too long")
        : z.string().max(50).optional().or(z.literal("")),
      email: z.string().email("Invalid email address").optional().or(z.literal("")),
      source: z.enum(CANDIDATE_SOURCE_IDS),
      agentId: z.string().optional(),
      declaredProjectIds: z.array(z.string()).optional().default([]),
      gender: z.enum(["MALE", "FEMALE", "OTHER"]),
      dateOfBirth: z.string().optional(),
      expectedSalary: z.preprocess(
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
      height: z.preprocess(
        (val) => {
          if (val === "" || val === undefined || val === null) return undefined;
          const num = Number(val);
          return isNaN(num) ? undefined : num;
        },
        z.number().optional()
      ),
      weight: z.preprocess(
        (val) => {
          if (val === "" || val === undefined || val === null) return undefined;
          const num = Number(val);
          return isNaN(num) ? undefined : num;
        },
        z.number().optional()
      ),
      skinTone: z.enum([...SKIN_TONES] as [string, ...string[]]).optional().or(z.literal("")),
      languageProficiency: z
        .enum([...LANGUAGE_PROFICIENCY_LEVELS] as [string, ...string[]])
        .optional()
        .or(z.literal("")),
      smartness: z.enum([...SMARTNESS_LEVELS] as [string, ...string[]]).optional().or(z.literal("")),
      licensingExam: z.string().optional(),
      dataFlow: z.boolean().optional().default(false),
      eligibility: z.boolean().optional().default(false),

      referralCompanyName: z.string().optional(),
      referralEmail: z
        .string()
        .email("Invalid email address")
        .optional()
        .or(z.literal("")),
      referralCountryCode: z.string().optional(),
      referralPhone: z.string().optional(),
      referralDescription: z.string().optional(),

      addressCountryCode: z.string().max(8).optional().or(z.literal("")),
      addressStateId: z.string().optional().or(z.literal("")),
      address: z.string().max(500).optional().or(z.literal("")),

      highestEducation: z.string().max(100).optional(),
      university: z.string().max(200).optional(),
      graduationYear: z.number().min(1950).max(2030).optional(),
      gpa: z.number().min(0).max(4).optional(),

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
    })
    .superRefine((data, ctx) => {
      if (
        data.source === "agent" &&
        (!data.agentId || !String(data.agentId).trim())
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select an agent",
          path: ["agentId"],
        });
      }
    })
    .superRefine((data, ctx) => {
      if (data.addressStateId?.trim() && !data.addressCountryCode?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select a country before state",
          path: ["addressCountryCode"],
        });
      }
    })
    .superRefine((data, ctx) => {
      if (!isAgentCoordinator) return;
      const cc = data.countryCode?.trim() || "";
      const mn = data.mobileNumber?.trim() || "";
      // Optional contact: empty mobile means no phone (ignore default country code in UI)
      if (!mn) return;
      if (!cc) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select a country code when entering a mobile number",
          path: ["countryCode"],
        });
        return;
      }
      if (mn.length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mobile number must be at least 6 digits",
          path: ["mobileNumber"],
        });
      }
      if (mn.length > 15) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mobile number must not exceed 15 characters",
          path: ["mobileNumber"],
        });
      }
    });
}

/** Default schema (non–Agent Coordinator rules). */
export const createCandidateSchema = buildCreateCandidateSchema();

export type CreateCandidateFormData = z.infer<typeof createCandidateSchema>;
