import { describe, expect, it } from "vitest";
import { toPhoneDigits, toTelHref, toWhatsAppHref } from "./phone-links";

describe("phone-links", () => {
  it("builds E.164 tel and wa.me digits from +91 and local number", () => {
    const parts = { countryCode: "+91", mobileNumber: "9876543210" };
    expect(toPhoneDigits(parts)).toBe("919876543210");
    expect(toTelHref(parts)).toBe("tel:+919876543210");
    expect(toWhatsAppHref(parts)).toBe("https://wa.me/919876543210");
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
});
