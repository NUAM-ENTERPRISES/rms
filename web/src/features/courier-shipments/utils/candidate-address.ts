import type { Candidate } from "@/features/candidates/api";
import type { AddressSnapshot } from "../types";

export function formatCandidatePhone(candidate: {
  countryCode?: string | null;
  mobileNumber?: string | null;
}): string {
  const code = candidate.countryCode?.trim();
  const mobile = candidate.mobileNumber?.trim() ?? "";
  if (!mobile) return "";
  return `${code ? `${code} ` : ""}${mobile}`.trim();
}

export function buildCandidateAddressSnapshot(
  candidate: Pick<
    Candidate,
    | "address"
    | "addressPincode"
    | "countryCode"
    | "mobileNumber"
    | "alternatePhone"
  >,
): AddressSnapshot {
  return {
    label: "Candidate",
    address: candidate.address?.trim() || undefined,
    pincode: candidate.addressPincode?.trim() || undefined,
    phone: formatCandidatePhone(candidate) || undefined,
    altPhone: candidate.alternatePhone?.trim() || undefined,
  };
}

export function hasCandidateMailingAddress(
  candidate: Pick<Candidate, "address" | "addressPincode">,
): boolean {
  return Boolean(
    candidate.address?.trim() || candidate.addressPincode?.trim(),
  );
}
