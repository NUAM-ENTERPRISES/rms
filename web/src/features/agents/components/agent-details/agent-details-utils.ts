import { format } from "date-fns";
import { toPhoneDigits } from "@/lib/phone-links";

export function formatAgentDetailDate(dateString?: string): string {
  if (!dateString) return "—";
  try {
    return format(new Date(dateString), "dd MMM yyyy");
  } catch {
    return "—";
  }
}

export function getAgentDetailInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function formatAgentPhoneForLink(phone?: string, countryCode?: string): string | null {
  return toPhoneDigits({ countryCode, mobileNumber: phone });
}
