import { z } from "zod";
import { refinePhysicalAddress } from "@/shared/utils/physical-address";

export const profileFormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Please provide a valid email address"),
    mobileNumber: z
      .string()
      .regex(/^\d{6,15}$/, "Please provide a valid mobile number (6-15 digits)"),
    countryCode: z
      .string()
      .regex(/^\+[1-9]\d{0,3}$/, "Please select a valid country code"),
    dateOfBirth: z.string().optional().or(z.literal("")),
    addressCountryCode: z.string().max(8).optional().or(z.literal("")),
    addressStateId: z.string().optional().or(z.literal("")),
    address: z.string().max(500).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    refinePhysicalAddress(data, ctx);
  });

export type ProfileFormData = z.infer<typeof profileFormSchema>;

export const PROFILE_FORM_DEFAULT_VALUES: ProfileFormData = {
  name: "",
  email: "",
  mobileNumber: "",
  countryCode: "",
  dateOfBirth: "",
  addressCountryCode: "",
  addressStateId: "",
  address: "",
};
