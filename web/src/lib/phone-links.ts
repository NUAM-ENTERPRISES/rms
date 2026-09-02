export type PhoneLinkParts = {
  countryCode?: string | null;
  mobileNumber?: string | null;
  contact?: string | null;
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function toPhoneDigits(parts: PhoneLinkParts): string | null {
  const country = digitsOnly(String(parts.countryCode ?? ""));
  const local = digitsOnly(
    String(parts.mobileNumber ?? parts.contact ?? ""),
  );
  if (!local) {
    return null;
  }
  if (country && local.startsWith(country)) {
    return local;
  }
  const combined = `${country}${local}`;
  return combined || null;
}

export function toTelHref(parts: PhoneLinkParts): string | null {
  const digits = toPhoneDigits(parts);
  return digits ? `tel:+${digits}` : null;
}

export function toWhatsAppHref(parts: PhoneLinkParts): string | null {
  const digits = toPhoneDigits(parts);
  return digits ? `https://wa.me/${digits}` : null;
}
