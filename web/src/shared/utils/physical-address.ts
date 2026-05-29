import { z } from "zod";

/** ISO country code for India — state is required on physical address fields. */
export const PHYSICAL_ADDRESS_INDIA_COUNTRY_CODE = "IN";

export function refinePhysicalAddress(
  data: { addressCountryCode?: string; addressStateId?: string },
  ctx: z.RefinementCtx,
  paths: { country?: (string | number)[]; state?: (string | number)[] } = {},
) {
  const countryPath = paths.country ?? ["addressCountryCode"];
  const statePath = paths.state ?? ["addressStateId"];

  if (data.addressStateId?.trim() && !data.addressCountryCode?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select a country before state",
      path: countryPath,
    });
  }

  if (
    data.addressCountryCode?.trim() === PHYSICAL_ADDRESS_INDIA_COUNTRY_CODE &&
    !data.addressStateId?.trim()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "State is required when country is India",
      path: statePath,
    });
  }
}

export function buildPhysicalAddressPayload(data: {
  addressCountryCode?: string | null;
  addressStateId?: string | null;
  address?: string | null;
}) {
  return {
    addressCountryCode: data.addressCountryCode?.trim()
      ? data.addressCountryCode.trim()
      : null,
    addressStateId: data.addressStateId?.trim()
      ? data.addressStateId.trim()
      : null,
    address: data.address?.trim() ? data.address.trim() : null,
  };
}

export function isPhysicalAddressIndiaCountry(
  countryCode?: string | null,
): boolean {
  return (countryCode?.trim() ?? "") === PHYSICAL_ADDRESS_INDIA_COUNTRY_CODE;
}
