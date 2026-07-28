import { z } from "zod";

export const roleFormSchema = z.object({
  name: z
    .string({ required_error: "Role name is required" })
    .trim()
    .min(2, "Role name must be at least 2 characters")
    .max(100, "Role name must be at most 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .or(z.literal("")),
  permissionKeys: z
    .array(z.string())
    .min(1, "Select at least one permission"),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;
