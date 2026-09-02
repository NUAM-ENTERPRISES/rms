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

/** Opens Google Voice in Chrome with the number ready to dial. */
export function toGoogleChromeCallHref(parts: PhoneLinkParts): string | null {
  const digits = toPhoneDigits(parts);
  if (!digits) {
    return null;
  }
  const encodedNumber = encodeURIComponent(`+${digits}`);
  return `https://voice.google.com/u/0/calls?a=tn${encodedNumber}`;
}

export function formatPhoneDisplay(parts: PhoneLinkParts): string | null {
  const country = String(parts.countryCode ?? "").trim();
  const local = String(parts.mobileNumber ?? parts.contact ?? "").trim();
  if (!local) {
    return null;
  }
  return country ? `${country} ${local}` : local;
}

/** True on phones/tablets where tel: opens the native dialer. */
export function supportsNativeTelDialer(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent;
  return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

export type DesktopCallPlatform = "windows" | "mac" | "other";

export function getDesktopCallPlatform(): DesktopCallPlatform {
  if (typeof navigator === "undefined") {
    return "other";
  }
  const ua = navigator.userAgent;
  if (/Win/i.test(ua)) {
    return "windows";
  }
  if (/Mac/i.test(ua)) {
    return "mac";
  }
  return "other";
}

export function getLinkedPhoneCallHint(platform: DesktopCallPlatform): string {
  switch (platform) {
    case "windows":
      return "For Phone Link: pair your Android in the Phone Link app. For Chrome: sign in with Gmail at voice.google.com.";
    case "mac":
      return "Mac does not dial Android phones directly. Use WhatsApp call or copy the number to your phone.";
    default:
      return "Opens your system's phone app if a device is linked.";
  }
}

export function getGoogleChromeCallHint(platform: DesktopCallPlatform): string {
  if (platform === "windows") {
    return "Opens Google Voice in Chrome. Sign in with your Gmail once; the number is pre-filled to dial.";
  }
  return "Opens Google Voice in your browser. Sign in with Gmail to place the call.";
}
