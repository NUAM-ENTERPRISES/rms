import { z } from "zod";
import { COLLECTION_TYPE, DIRECT_OFFICE } from "../constants";

const collectionItemSchema = z.object({
  docType: z.string(),
  isReceived: z.boolean(),
  remarks: z.string().max(500).optional(),
});

const baseSchema = z.object({
  candidateId: z.string().min(1, "Candidate is required"),
  collectionType: z.enum([
    COLLECTION_TYPE.DIRECT,
    COLLECTION_TYPE.RECRUITER,
    COLLECTION_TYPE.INTERVIEW_COORDINATOR,
    COLLECTION_TYPE.AGENT,
    COLLECTION_TYPE.COURIER,
  ]),
  collectedByUserId: z.string().min(1, "Collected by is required"),
  collectedAt: z.string().min(1, "Collection date is required"),
  remarks: z.string().max(1000).optional(),
  items: z.array(collectionItemSchema).optional(),
});

export const createCollectionSchema = baseSchema
  .extend({
    directOffice: z.string().optional(),
    directOfficeOther: z.string().max(200).optional(),
    interviewVenue: z.string().max(300).optional(),
    agentId: z.string().optional(),
    agentNameManual: z.string().max(200).optional(),
    courierPartner: z.string().max(100).optional(),
    trackingNumber: z.string().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.collectionType === COLLECTION_TYPE.DIRECT && !data.directOffice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Office is required for direct collection",
        path: ["directOffice"],
      });
    }
    if (
      data.collectionType === COLLECTION_TYPE.DIRECT &&
      data.directOffice === DIRECT_OFFICE.OTHER &&
      !data.directOfficeOther?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please specify the office",
        path: ["directOfficeOther"],
      });
    }
    if (
      data.collectionType === COLLECTION_TYPE.AGENT &&
      !data.agentId &&
      !data.agentNameManual?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select an agent or enter agent name",
        path: ["agentNameManual"],
      });
    }
  });

export type CreateCollectionFormValues = z.infer<typeof createCollectionSchema>;

export const submitToLockerSchema = z.object({
  lockerFileNumber: z.string().min(1, "Locker file number is required").max(100),
});
