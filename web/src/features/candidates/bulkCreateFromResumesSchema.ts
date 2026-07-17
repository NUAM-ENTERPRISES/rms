import { z } from "zod";
import { CANDIDATE_SOURCES } from "@/constants/candidate-constants";

const CANDIDATE_SOURCE_IDS = CANDIDATE_SOURCES.map((s) => s.id) as [
  string,
  ...string[],
];

export const BULK_RESUME_MAX_FILES = 25;
/** Max files per parse API call / review page size (fixed at 10). */
export const BULK_RESUME_PARSE_PAGE_LIMIT = 10;

export const bulkCreateFromResumesSchema = z.object({
  source: z.enum(CANDIDATE_SOURCE_IDS).default("direct_application"),
  roleCatalogId: z.string().optional().or(z.literal("")),
});

export type BulkCreateFromResumesFormData = z.infer<
  typeof bulkCreateFromResumesSchema
>;

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

export const bulkResumeDraftEducationSchema = z.object({
  rawDegree: z.string().optional(),
  qualificationId: z.preprocess(emptyToUndefined, z.string().optional()),
  university: z.preprocess(emptyToUndefined, z.string().optional()),
  graduationYear: z
    .preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
      z.number().int().min(1950).max(2035).optional(),
    )
    .optional(),
  notes: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const bulkResumeDraftWorkExperienceSchema = z.object({
  jobTitle: z.string().min(2, "Job title is required").max(100),
  companyName: z.preprocess(emptyToUndefined, z.string().max(150).optional()),
  location: z.preprocess(emptyToUndefined, z.string().max(150).optional()),
  startDate: z.preprocess(emptyToUndefined, z.string().optional()),
  endDate: z.preprocess(emptyToUndefined, z.string().optional()),
  isCurrent: z.boolean().optional(),
  description: z.preprocess(emptyToUndefined, z.string().max(2000).optional()),
});

export const bulkResumeReviewDraftSchema = z.object({
  draftId: z.string().min(1),
  fileName: z.string().min(1),
  included: z.boolean(),
  parseWarnings: z.array(z.string()).default([]),
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.preprocess(
    emptyToUndefined,
    z.string().email("Invalid email").optional(),
  ),
  countryCode: z.preprocess(emptyToUndefined, z.string().optional()),
  mobileNumber: z.preprocess(emptyToUndefined, z.string().optional()),
  passportNumber: z.preprocess(emptyToUndefined, z.string().optional()),
  dateOfBirth: z.preprocess(emptyToUndefined, z.string().optional()),
  address: z.preprocess(emptyToUndefined, z.string().optional()),
  educations: z.array(bulkResumeDraftEducationSchema).default([]),
  workExperiences: z.array(bulkResumeDraftWorkExperienceSchema).default([]),
});

export const bulkResumeReviewSchema = z
  .object({
    source: z.string().min(1),
    roleCatalogId: z.string().optional(),
    drafts: z.array(bulkResumeReviewDraftSchema).min(1),
  })
  .superRefine((data, ctx) => {
    data.drafts.forEach((draft, index) => {
      if (!draft.included) return;
      const cc = draft.countryCode?.trim() || "";
      const mobile = draft.mobileNumber?.trim() || "";
      if (!cc || !mobile) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Phone (country code and mobile) is required",
          path: ["drafts", index, "mobileNumber"],
        });
      }
    });
  });

export type BulkResumeReviewFormData = z.infer<typeof bulkResumeReviewSchema>;
export type BulkResumeReviewDraftFormData = z.infer<
  typeof bulkResumeReviewDraftSchema
>;
