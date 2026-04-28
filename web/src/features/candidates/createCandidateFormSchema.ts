import { z } from "zod";
import {
  CANDIDATE_SOURCES,
  SKIN_TONES,
  SMARTNESS_LEVELS,
} from "@/constants/candidate-constants";

const CANDIDATE_SOURCE_IDS = CANDIDATE_SOURCES.map((s) => s.id) as [
  string,
  ...string[],
];

export const createCandidateSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(50),
    lastName: z.string().min(1, "Last name is required").max(50),
    countryCode: z.string().min(1, "Country code is required"),
    mobileNumber: z
      .string()
      .min(10, "Mobile number must be at least 10 characters")
      .max(15, "Mobile number must not exceed 15 characters"),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    source: z.enum(CANDIDATE_SOURCE_IDS),
    agentId: z.string().optional(),
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
      (val) => (val === "" ? undefined : Number(val)),
      z.number().optional()
    ),
    weight: z.preprocess(
      (val) => (val === "" ? undefined : Number(val)),
      z.number().optional()
    ),
    skinTone: z.enum([...SKIN_TONES] as [string, ...string[]]).optional(),
    languageProficiency: z.string().optional(),
    smartness: z.enum([...SMARTNESS_LEVELS] as [string, ...string[]]).optional(),
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
    if (
      data.source === "referral" &&
      (!data.referralCompanyName || data.referralCompanyName.trim() === "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Referral company name is required when source is referral",
        path: ["referralCompanyName"],
      });
    }
  });

export type CreateCandidateFormData = z.infer<typeof createCandidateSchema>;
