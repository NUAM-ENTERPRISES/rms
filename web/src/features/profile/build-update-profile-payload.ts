import type { UpdateProfileRequest } from "./api";

export type ProfileFormValues = {
  name?: string;
  email?: string;
  mobileNumber?: string;
  countryCode?: string;
  dateOfBirth?: string | null;
  addressCountryCode?: string | null;
  addressStateId?: string | null;
  address?: string | null;
};

function emptyToNull(value?: string | null): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** HTML `type="date"` value (`YYYY-MM-DD`) from an API timestamp. */
export function toDateInputValue(
  dateOfBirth?: string | Date | null,
): string {
  if (!dateOfBirth) {
    return "";
  }
  if (typeof dateOfBirth === "string") {
    return dateOfBirth.split("T")[0] ?? "";
  }
  return dateOfBirth.toISOString().split("T")[0] ?? "";
}

export function buildUpdateProfilePayload(
  data: ProfileFormValues,
): UpdateProfileRequest {
  return {
    name: data.name,
    email: data.email,
    mobileNumber: data.mobileNumber,
    countryCode: data.countryCode,
    dateOfBirth: emptyToNull(data.dateOfBirth),
    addressCountryCode: emptyToNull(data.addressCountryCode),
    addressStateId: emptyToNull(data.addressStateId),
    address: emptyToNull(data.address),
  };
}
