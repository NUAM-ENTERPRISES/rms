import { format } from "date-fns";

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
  const raw = (countryCode ?? "") + (phone ?? "");
  const digits = raw.replace(/\D/g, "");
  return digits || null;
}
