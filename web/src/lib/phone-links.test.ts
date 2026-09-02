import { describe, expect, it } from "vitest";
import {
  formatPhoneDisplay,
  getDesktopCallPlatform,
  getLinkedPhoneCallHint,
  supportsNativeTelDialer,
  toGoogleChromeCallHref,
  toPhoneDigits,
  toTelHref,
  toWhatsAppHref,
} from "./phone-links";

describe("phone-links", () => {
  it("builds E.164 tel and wa.me digits from +91 and local number", () => {
    const parts = { countryCode: "+91", mobileNumber: "9876543210" };
    expect(toPhoneDigits(parts)).toBe("919876543210");
    expect(toTelHref(parts)).toBe("tel:+919876543210");
    expect(toWhatsAppHref(parts)).toBe("https://wa.me/919876543210");
    expect(toGoogleChromeCallHref(parts)).toBe(
      "https://voice.google.com/u/0/calls?a=tn%2B919876543210",
    );
  });

  it("strips spaces and punctuation", () => {
    const parts = {
      countryCode: "+91 ",
      mobileNumber: "98765 43210",
    };
    expect(toTelHref(parts)).toBe("tel:+919876543210");
  });

  it("returns null when the local number is missing", () => {
    expect(toPhoneDigits({ countryCode: "+91" })).toBeNull();
    expect(toTelHref({ countryCode: "+91", mobileNumber: "" })).toBeNull();
    expect(toWhatsAppHref({})).toBeNull();
  });

  it("does not double country digits already on the local number", () => {
    const parts = { countryCode: "+91", mobileNumber: "919876543210" };
    expect(toPhoneDigits(parts)).toBe("919876543210");
    expect(toTelHref(parts)).toBe("tel:+919876543210");
  });

  it("falls back to contact when mobileNumber is absent", () => {
    expect(
      toTelHref({ countryCode: "+91", contact: "9876543210" }),
    ).toBe("tel:+919876543210");
  });

  it("formats phone display with country code and local number", () => {
    expect(
      formatPhoneDisplay({ countryCode: "+91", mobileNumber: "9876543210" }),
    ).toBe("+91 9876543210");
  });

  it("detects native tel dialer support from user agent", () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    expect(supportsNativeTelDialer()).toBe(true);
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
    expect(supportsNativeTelDialer()).toBe(false);
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: original,
    });
  });

  it("returns platform-specific linked phone hints", () => {
    expect(getLinkedPhoneCallHint("windows")).toMatch(/Phone Link|Chrome/i);
    expect(getLinkedPhoneCallHint("mac")).toMatch(/WhatsApp/i);
  });

  it("detects desktop platform from user agent", () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
    expect(getDesktopCallPlatform()).toBe("windows");
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)",
    });
    expect(getDesktopCallPlatform()).toBe("mac");
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: original,
    });
  });
});
