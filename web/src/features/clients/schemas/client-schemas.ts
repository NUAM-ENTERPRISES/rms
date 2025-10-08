import { z } from "zod";

// Client type enum
const clientTypeEnum = z.enum([
  "INDIVIDUAL",
  "SUB_AGENCY",
  "HEALTHCARE_ORGANIZATION",
  "EXTERNAL_SOURCE",
]);

// Individual relationship enum
const individualRelationshipEnum = z.enum([
  "CURRENT_EMPLOYEE",
  "FORMER_EMPLOYEE",
  "NETWORK_CONTACT",
]);

// Agency type enum
const agencyTypeEnum = z.enum(["LOCAL", "REGIONAL", "SPECIALIZED"]);

// Facility type enum
const facilityTypeEnum = z.enum([
  "HOSPITAL",
  "CLINIC",
  "NURSING_HOME",
  "MEDICAL_CENTER",
]);

// Facility size enum
const facilitySizeEnum = z.enum(["SMALL", "MEDIUM", "LARGE"]);

// External source type enum
const sourceTypeEnum = z.enum([
  "JOB_BOARD",
  "SOCIAL_MEDIA",
  "REFERRAL_PLATFORM",
  "INDUSTRY_EVENT",
  "COLD_OUTREACH",
  "OTHER",
]);

// Acquisition method enum
const acquisitionMethodEnum = z.enum([
  "ORGANIC",
  "PAID",
  "PARTNERSHIP",
  "REFERRAL",
]);

// Relationship type enum
const relationshipTypeEnum = z.enum([
  "REFERRAL",
  "PARTNERSHIP",
  "DIRECT_CLIENT",
  "EXTERNAL_SOURCE",
]);

// Main client form schema with conditional validation
export const clientFormSchema = z.object({
  // Required fields
  name: z.string().min(1, "Client name is required"),
  type: clientTypeEnum,

  // Optional basic fields
  pointOfContact: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),

  // Individual Referrer specific fields
  profession: z.string().optional(),
  organization: z.string().optional(),
  relationship: individualRelationshipEnum.optional(),

  // Sub-Agency specific fields
  agencyType: agencyTypeEnum.optional(),
  specialties: z.array(z.string()).optional(),

  // Healthcare Organization specific fields
  facilityType: facilityTypeEnum.optional(),
  facilitySize: facilitySizeEnum.optional(),
  locations: z.array(z.string()).optional(),

  // External Source specific fields
  sourceType: sourceTypeEnum.optional(),
  sourceName: z.string().optional(),
  acquisitionMethod: acquisitionMethodEnum.optional(),
  sourceNotes: z.string().optional(),

  // Financial fields
  relationshipType: relationshipTypeEnum.optional(),
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
});

// Type inference
export type ClientFormData = z.infer<typeof clientFormSchema>;

// Default values for new client form
export const defaultClientValues: Partial<ClientFormData> = {
  type: "INDIVIDUAL",
  specialties: [],
  locations: [],
  commissionRate: 0,
};
