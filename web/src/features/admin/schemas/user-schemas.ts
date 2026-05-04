import { z } from "zod";

export const LANGUAGE_PROFICIENCIES = ["PRIMARY", "SECONDARY", "TERTIARY"] as const;
export type LanguageProficiencyValue = (typeof LANGUAGE_PROFICIENCIES)[number];

export const RECRUITER_SECTOR_SCOPES = ["HEALTHCARE", "NON_HEALTH_CARE"] as const;
export type RecruiterSectorScopeValue = (typeof RECRUITER_SECTOR_SCOPES)[number];

const recruiterLanguageRowSchema = z.object({
  languageCode: z
    .string()
    .min(2, "Select a language")
    .max(8, "Invalid language code"),
  proficiency: z.enum(LANGUAGE_PROFICIENCIES),
});

const recruiterCountryRowSchema = z.object({
  countryCode: z
    .string()
    .min(2, "Select a country")
    .max(8, "Invalid country code"),
  sectorScopes: z
    .array(z.enum(RECRUITER_SECTOR_SCOPES))
    .min(1, "Select at least one sector")
    .max(2),
});

function refineRecruiterCapabilityRows(
  data: {
    recruiterLanguages: z.infer<typeof recruiterLanguageRowSchema>[];
    recruiterCountryCoverages: z.infer<typeof recruiterCountryRowSchema>[];
  },
  ctx: z.RefinementCtx,
  enabled: boolean
) {
  if (!enabled) return;

  const langs = data.recruiterLanguages;
  const langCodes = langs.map((l) => l.languageCode);
  if (langCodes.length !== new Set(langCodes).size) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Each language can only appear once",
      path: ["recruiterLanguages"],
    });
  }
  const primaryIndices = langs
    .map((l, i) => (l.proficiency === "PRIMARY" ? i : -1))
    .filter((i) => i >= 0);
  if (primaryIndices.length > 1) {
    for (let k = 1; k < primaryIndices.length; k++) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At most one PRIMARY language",
        path: ["recruiterLanguages", primaryIndices[k], "proficiency"],
      });
    }
  }

  const cov = data.recruiterCountryCoverages;
  const countryCodes = cov.map((c) => c.countryCode);
  if (countryCodes.length !== new Set(countryCodes).size) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Each country can only appear once",
      path: ["recruiterCountryCoverages"],
    });
  }
  cov.forEach((row, i) => {
    const set = new Set(row.sectorScopes);
    if (set.size !== row.sectorScopes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sector scopes must be unique",
        path: ["recruiterCountryCoverages", i, "sectorScopes"],
      });
    }
  });
}

const createUserFieldsShape = {
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name cannot exceed 100 characters"),

  email: z
    .string()
    .email("Please provide a valid email address")
    .min(1, "Email is required"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),

  confirmPassword: z
    .string()
    .min(8, "Confirm password must be at least 8 characters long"),

  countryCode: z
    .string()
    .min(1, "Country code is required")
    .regex(/^\+[1-9]\d{0,3}$/, "Please select a valid country code"),

  mobileNumber: z
    .string()
    .min(1, "Mobile number is required")
    .regex(
      /^\d{6,15}$/,
      "Please provide a valid mobile number (6-15 digits)"
    ),

  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((val) => val && val.trim() !== "", "Date of birth is required"),

  roleId: z
    .string()
    .min(1, "Role is required")
    .refine((val) => val && val !== "no-role", "Please select a role"),

  addressCountryCode: z.string().max(8).optional().or(z.literal("")),
  addressStateId: z.string().optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),

  recruiterLanguages: z.array(recruiterLanguageRowSchema).default([]),
  recruiterCountryCoverages: z.array(recruiterCountryRowSchema).default([]),
};

/** When `isRecruiterRole` is true, recruiter language & country rows are validated (mirrors backend rules). */
export function buildCreateUserSchema(isRecruiterRole: boolean) {
  return z
    .object(createUserFieldsShape)
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    })
    .superRefine((data, ctx) => {
      if (data.addressStateId?.trim() && !data.addressCountryCode?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select a country before state",
          path: ["addressCountryCode"],
        });
      }

      if (!isRecruiterRole) return;

      refineRecruiterCapabilityRows(
        {
          recruiterLanguages: data.recruiterLanguages,
          recruiterCountryCoverages: data.recruiterCountryCoverages,
        },
        ctx,
        true
      );
    });
}

// Default export for tooling/tests — recruiter-specific checks off
export const createUserSchema = buildCreateUserSchema(false);

const updateUserFieldsShape = {
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name cannot exceed 100 characters")
    .optional(),

  email: z
    .string()
    .email("Please provide a valid email address")
    .optional()
    .or(z.literal("")),

  countryCode: z
    .string()
    .regex(/^\+[1-9]\d{0,3}$/, "Please select a valid country code")
    .optional()
    .or(z.literal("")),

  mobileNumber: z
    .string()
    .regex(/^\d{6,15}$/, "Please provide a valid mobile number (6-15 digits)")
    .optional()
    .or(z.literal("")),

  dateOfBirth: z.string().optional().or(z.literal("")),

  roleId: z.string().optional().or(z.literal("no-role")),

  addressCountryCode: z.string().max(8).optional().or(z.literal("")),
  addressStateId: z.string().optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),

  recruiterLanguages: z.array(recruiterLanguageRowSchema).default([]),
  recruiterCountryCoverages: z.array(recruiterCountryRowSchema).default([]),
};

/** When true, validates recruiter language / country rows (Recruiter & Manager forms). */
export function buildUpdateUserSchema(validateRecruiterCapabilities: boolean) {
  return z
    .object(updateUserFieldsShape)
    .superRefine((data, ctx) => {
      if (data.addressStateId?.trim() && !data.addressCountryCode?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select a country before state",
          path: ["addressCountryCode"],
        });
      }
      refineRecruiterCapabilityRows(
        {
          recruiterLanguages: data.recruiterLanguages,
          recruiterCountryCoverages: data.recruiterCountryCoverages,
        },
        ctx,
        validateRecruiterCapabilities
      );
    });
}

/** Base update schema without recruiter row validation (e.g. tools). */
export const updateUserSchema = buildUpdateUserSchema(false);

// Type inference
export type CreateUserFormData = z.infer<ReturnType<typeof buildCreateUserSchema>>;
export type UpdateUserFormData = z.infer<ReturnType<typeof buildUpdateUserSchema>>;

// Default values for new user form
export const defaultCreateUserValues: Partial<CreateUserFormData> = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  countryCode: "+91",
  mobileNumber: "",
  dateOfBirth: "",
  roleId: "",
  addressCountryCode: "",
  addressStateId: "",
  address: "",
  recruiterLanguages: [],
  recruiterCountryCoverages: [],
};

// Default values for update user form
export const defaultUpdateUserValues: Partial<UpdateUserFormData> = {
  name: "",
  email: "",
  countryCode: "",
  mobileNumber: "",
  dateOfBirth: "",
  roleId: "",
  addressCountryCode: "",
  addressStateId: "",
  address: "",
  recruiterLanguages: [],
  recruiterCountryCoverages: [],
};
