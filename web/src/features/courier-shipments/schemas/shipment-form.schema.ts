import { z } from "zod";
import {
  ADDRESS_TYPE,
  DELIVERY_MODE,
  SHIPMENT_PURPOSE,
} from "../constants";

const addressSnapshotSchema = z.object({
  label: z.string().optional(),
  address: z.string().optional(),
  addressCountryCode: z.string().optional(),
  addressStateId: z.string().optional(),
  pincode: z.string().optional(),
  phone: z.string().optional(),
  altPhone: z.string().optional(),
});

export const candidateStepSchema = z.object({
  candidateId: z.string().min(1, "Select a candidate"),
});

export const documentsStepSchema = z.object({
  docTypes: z.array(z.string()).min(1, "Select at least one document"),
});

export const routeStepSchema = z.object({
  purposeType: z.enum([SHIPMENT_PURPOSE.INTERNAL, SHIPMENT_PURPOSE.RETURN]),
  deliveryMode: z.enum([DELIVERY_MODE.COURIER, DELIVERY_MODE.DIRECT]),
  fromAddressType: z.enum([
    ADDRESS_TYPE.KOCHI,
    ADDRESS_TYPE.DELHI,
    ADDRESS_TYPE.CLIENT,
    ADDRESS_TYPE.CANDIDATE,
    ADDRESS_TYPE.OTHER,
  ]),
  toAddressType: z.enum([
    ADDRESS_TYPE.KOCHI,
    ADDRESS_TYPE.DELHI,
    ADDRESS_TYPE.CLIENT,
    ADDRESS_TYPE.CANDIDATE,
    ADDRESS_TYPE.OTHER,
  ]),
  projectId: z.string().optional(),
  fromAddressSnapshot: addressSnapshotSchema.optional(),
  toAddressSnapshot: addressSnapshotSchema.optional(),
  remarks: z.string().max(2000).optional(),
});

export const courierDispatchSchema = z.object({
  trackingId: z.string().max(100).optional(),
  courierPartner: z
    .enum([
      "Blue Dart",
      "DTDC",
      "Delhivery",
      "India Post",
      "FedEx",
      "DHL",
      "Other",
    ] as const)
    .optional(),
  sentAt: z.string().min(1, "Send date is required"),
  sentByUserId: z.string().min(1, "Select who sent"),
  approvedByUserId: z.string().min(1, "Select who approved"),
});

export const directHandoverSchema = z.object({
  sentAt: z.string().min(1, "Handover date is required"),
  sentByUserId: z.string().min(1, "Select who handed over"),
  approvedByUserId: z.string().min(1, "Select who approved"),
});

export const verifiedDocumentSchema = z.object({
  docType: z.string().min(1),
  isReceived: z.boolean(),
  remarks: z.string().max(500).optional(),
});

export const markReceivedSchema = z.object({
  receivedAt: z.string().min(1, "Received date is required"),
  verifiedDocuments: z
    .array(verifiedDocumentSchema)
    .min(1, "Review at least one document"),
});

export function createMarkReceivedSchema(expectedDocTypes: string[]) {
  return markReceivedSchema.superRefine((data, ctx) => {
    const expected = new Set(expectedDocTypes);
    const reviewed = new Set(data.verifiedDocuments.map((doc) => doc.docType));

    if (expected.size === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "This leg has no documents to review",
        path: ["verifiedDocuments"],
      });
      return;
    }

    for (const docType of expected) {
      if (!reviewed.has(docType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Cross-check ${docType} before confirming receipt`,
          path: ["verifiedDocuments"],
        });
      }
    }

    for (const doc of data.verifiedDocuments) {
      if (!expected.has(doc.docType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unexpected document ${doc.docType}`,
          path: ["verifiedDocuments"],
        });
      }

      if (!doc.isReceived && !doc.remarks?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Add a remark for ${doc.docType} because it did not arrive`,
          path: ["verifiedDocuments"],
        });
      }
    }
  });
}

export type CandidateStepValues = z.infer<typeof candidateStepSchema>;
export type DocumentsStepValues = z.infer<typeof documentsStepSchema>;
export type RouteStepValues = z.infer<typeof routeStepSchema>;
export type CourierDispatchValues = z.infer<typeof courierDispatchSchema>;
export type DirectHandoverValues = z.infer<typeof directHandoverSchema>;
export type MarkReceivedValues = z.infer<typeof markReceivedSchema>;
