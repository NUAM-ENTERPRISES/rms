import { z } from "zod";

// User form schema for creation (matching backend CreateUserDto)
export const createUserSchema = z.object({
  // Required fields
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

  countryCode: z
    .string()
    .min(1, "Country code is required")
    .regex(/^\+[1-9]\d{0,3}$/, "Please select a valid country code"),

  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\d{6,15}$/, "Please provide a valid phone number (6-15 digits)"),

  dateOfBirth: z.string().optional().or(z.literal("")),

  // Role assignment
  roleId: z.string().optional(),
});

// User form schema for updating (matching backend UpdateUserDto)
export const updateUserSchema = z.object({
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

  phone: z
    .string()
    .regex(/^\d{6,15}$/, "Please provide a valid phone number (6-15 digits)")
    .optional()
    .or(z.literal("")),

  dateOfBirth: z.string().optional().or(z.literal("")),

  // Role assignment
  roleId: z.string().optional(),
});

// Type inference
export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;

// Default values for new user form
export const defaultCreateUserValues: Partial<CreateUserFormData> = {
  name: "",
  email: "",
  password: "",
  countryCode: "+91",
  phone: "",
  dateOfBirth: "",
  roleId: "",
};

// Default values for update user form
export const defaultUpdateUserValues: Partial<UpdateUserFormData> = {
  name: "",
  email: "",
  countryCode: "",
  phone: "",
  dateOfBirth: "",
  roleId: "",
};
