import { z } from "zod";

export const BULK_RESUME_MAX_FILES = 25;
export const BULK_RESUME_PARSE_PAGE_LIMIT = 10;

const dateStringSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
    message: "Please provide a valid date.",
  });

export const bulkCreateFromResumesSchema = z.object({
  source: z.string().trim().optional(),
  professionTypeId: z.string().trim().optional(),
  roleCatalogId: z.string().trim().optional(),
  files: z
    .array(z.instanceof(File))
    .min(1, "Please upload at least one PDF file.")
    .max(
      BULK_RESUME_MAX_FILES,
      `You can upload up to ${BULK_RESUME_MAX_FILES} files at a time.`,
    )
    .refine((files) => files.every((file) => file.type === "application/pdf"), {
      message: "Only PDF files are allowed.",
    }),
});

export const bulkResumeReviewDraftSchema = z.object({
  draftId: z.string().min(1),
  fileName: z.string().optional(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email.")
    .optional()
    .or(z.literal("")),
  countryCode: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{0,3}$/, "Please provide a valid country code."),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^\d{6,15}$/, "Please provide a valid mobile number."),
  passportNumber: z.string().trim().optional(),
  dateOfBirth: dateStringSchema,
  address: z.string().trim().optional(),
  educations: z
    .array(
      z.object({
        rawDegree: z.string().optional(),
        qualificationId: z.string().optional(),
        university: z.string().optional(),
        graduationYear: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .optional(),
  workExperiences: z
    .array(
      z.object({
        jobTitle: z.string().optional(),
        companyName: z.string().optional(),
        location: z.string().optional(),
        startDate: dateStringSchema,
        endDate: dateStringSchema,
        isCurrent: z.boolean().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
});

export const bulkResumeReviewSchema = z.object({
  source: z.string().trim().optional(),
  professionTypeId: z.string().trim().optional(),
  roleCatalogId: z.string().trim().optional(),
  drafts: z.array(bulkResumeReviewDraftSchema).min(1),
});

export type BulkCreateFromResumesFormValues = z.infer<
  typeof bulkCreateFromResumesSchema
>;
export type BulkResumeReviewFormValues = z.infer<typeof bulkResumeReviewSchema>;
