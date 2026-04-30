import { z } from "zod";
import {
  CLIENT_TYPES,
  type ClientTypeValue,
} from "../constants/client-types";

const clientTypeValues = CLIENT_TYPES as readonly string[];

/** API / RHF may send null, "", or legacy strings — keep form validation stable. */
export function normalizeClientFormType(value: unknown): ClientTypeValue {
  const s = typeof value === "string" ? value.trim() : "";
  if (s && clientTypeValues.includes(s)) return s as ClientTypeValue;
  return "DIRECT_CLIENT";
}

const messyClientTypeUnion = z.union([
  z.enum(CLIENT_TYPES),
  z.string(),
  z.null(),
  z.undefined(),
]);

const clientTypeSchema = messyClientTypeUnion
  .transform((v) => normalizeClientFormType(v))
  .pipe(z.enum(CLIENT_TYPES));

const optionalEmailSchema = z.union([
  z.literal(""),
  z.string().email("Invalid email format"),
]).optional();

const subClientFormSchema = z
  .object({
    name: z.string(),
    type: clientTypeSchema.default("DIRECT_CLIENT"),
    email: z
      .union([z.literal(""), z.string().email("Invalid email format")])
      .optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    addressCountryCode: z.string().max(8).optional().or(z.literal("")),
    addressStateId: z.string().optional().or(z.literal("")),
  })
  .optional();

/** Create / edit client form (narrowed taxonomy + optional sub-client) */
export const clientFormSchema = z
  .object({
    name: z.string().min(1, "Client name is required"),
    type: clientTypeSchema,

    pointOfContact: z.string().optional(),
    email: optionalEmailSchema,
    phone: z.string().optional(),
    address: z.string().optional(),
    addressCountryCode: z.string().max(8).optional().or(z.literal("")),
    addressStateId: z.string().optional().or(z.literal("")),

    subClient: subClientFormSchema,

    // Legacy columns still on Client model — optional for edits / future sections
    profession: z.string().optional(),
    organization: z.string().optional(),
    relationship: z.enum([
      "CURRENT_EMPLOYEE",
      "FORMER_EMPLOYEE",
      "NETWORK_CONTACT",
    ]).optional(),
    agencyType: z.enum(["LOCAL", "REGIONAL", "SPECIALIZED"]).optional(),
    specialties: z.array(z.string()).optional(),
    facilityType: z
      .enum(["HOSPITAL", "CLINIC", "NURSING_HOME", "MEDICAL_CENTER"])
      .optional(),
    facilitySize: z.enum(["SMALL", "MEDIUM", "LARGE"]).optional(),
    locations: z.array(z.string()).optional(),
    sourceType: z
      .enum([
        "JOB_BOARD",
        "SOCIAL_MEDIA",
        "REFERRAL_PLATFORM",
        "INDUSTRY_EVENT",
        "COLD_OUTREACH",
        "OTHER",
      ])
      .optional(),
    sourceName: z.string().optional(),
    acquisitionMethod: z
      .enum(["ORGANIC", "PAID", "PARTNERSHIP", "REFERRAL"])
      .optional(),
    sourceNotes: z.string().optional(),
    relationshipType: z
      .enum([
        "REFERRAL",
        "PARTNERSHIP",
        "DIRECT_CLIENT",
        "EXTERNAL_SOURCE",
      ])
      .optional(),
    commissionRate: z
      .number()
      .min(0)
      .max(100, "Commission rate must be between 0-100%")
      .optional(),
    paymentTerms: z.string().optional(),
    contractStartDate: z.string().optional(),
    contractEndDate: z.string().optional(),
    billingAddress: z.string().optional(),
    taxId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasNestedText = (s?: string) => !!(s && s.trim());

    if (data.addressStateId?.trim() && !data.addressCountryCode?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a country before state",
        path: ["addressCountryCode"],
      });
    }

    const sc = data.subClient;
    if (
      (data.type === "SUB_AGENT" || data.type === "FREELANCE") &&
      sc !== undefined
    ) {
      const hasSubClientContent =
        hasNestedText(sc.name) ||
        hasNestedText(sc.email) ||
        hasNestedText(sc.phone) ||
        hasNestedText(sc.address) ||
        hasNestedText(sc.addressCountryCode) ||
        hasNestedText(sc.addressStateId);

      if (hasSubClientContent && !hasNestedText(sc.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sub-client name is required when adding linked organisation details",
          path: ["subClient", "name"],
        });
      }
    }

    if (data.type === "DIRECT_CLIENT" && data.subClient?.name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Remove sub-client details for Direct client type",
        path: ["subClient", "name"],
      });
    }

    if (
      sc?.addressStateId?.trim() &&
      !sc?.addressCountryCode?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a country before state",
        path: ["subClient", "addressCountryCode"],
      });
    }
  });

export type ClientFormData = z.infer<typeof clientFormSchema>;

/**
 * Full RHF defaults so inputs stay controlled before `reset()` and when optional
 * fields are cleared (empty string / undefined).
 */
export const CLIENT_FORM_DEFAULT_VALUES: ClientFormData = {
  name: "",
  type: "DIRECT_CLIENT",
  pointOfContact: "",
  email: "",
  phone: "",
  address: "",
  addressCountryCode: "",
  addressStateId: "",
  subClient: undefined,
  profession: "",
  organization: "",
  relationship: undefined,
  agencyType: undefined,
  specialties: [],
  facilityType: undefined,
  facilitySize: undefined,
  locations: [],
  sourceType: undefined,
  sourceName: "",
  acquisitionMethod: undefined,
  sourceNotes: "",
  relationshipType: undefined,
  commissionRate: undefined,
  paymentTerms: "",
  contractStartDate: "",
  contractEndDate: "",
  billingAddress: "",
  taxId: "",
};

export type { ClientTypeValue };
