import { z } from "zod";

// Team form schema
export const teamFormSchema = z.object({
  // Required fields
  name: z
    .string()
    .min(2, "Team name must be at least 2 characters long")
    .max(100, "Team name cannot exceed 100 characters"),

  // Optional leadership fields
  leadId: z.string().optional(),
  headId: z.string().optional(),
  managerId: z.string().optional(),
});

// Type inference
export type TeamFormData = z.infer<typeof teamFormSchema>;

// Default values for new team form
export const defaultTeamValues: Partial<TeamFormData> = {
  name: "",
  leadId: undefined,
  headId: undefined,
  managerId: undefined,
};
