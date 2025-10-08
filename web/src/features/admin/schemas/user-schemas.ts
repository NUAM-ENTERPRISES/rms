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

  // Optional fields
  phone: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]+$/, "Please provide a valid phone number")
    .optional()
    .or(z.literal("")),

  dateOfBirth: z.string().optional().or(z.literal("")),
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

  phone: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]+$/, "Please provide a valid phone number")
    .optional()
    .or(z.literal("")),

  dateOfBirth: z.string().optional().or(z.literal("")),
});

// Type inference
export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;

// Default values for new user form
export const defaultCreateUserValues: Partial<CreateUserFormData> = {
  name: "",
  email: "",
  password: "",
  phone: "",
  dateOfBirth: "",
};

// Default values for update user form
export const defaultUpdateUserValues: Partial<UpdateUserFormData> = {
  name: "",
  email: "",
  phone: "",
  dateOfBirth: "",
};
