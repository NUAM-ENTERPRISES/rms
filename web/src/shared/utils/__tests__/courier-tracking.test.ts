import { describe, expect, it } from "vitest";
import { buildCourierTrackingUrl } from "../courier-tracking";

describe("buildCourierTrackingUrl", () => {
  it.each([
    [
      "Blue Dart",
      "BD123456",
      "https://www.bluedart.com/web/guest/trackdartresultthirdparty?trackFor=0&trackNo=BD123456",
    ],
    [
      "DTDC",
      "DTDC987",
      "https://www.dtdc.in/tracking.asp?strCnno=DTDC987",
    ],
    [
      "Delhivery",
      "DEL123",
      "https://www.delhivery.com/track/package/DEL123",
    ],
    [
      "India Post",
      "IN123456789IN",
      "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consignmentnumber=IN123456789IN",
    ],
    [
      "FedEx",
      "FX999",
      "https://www.fedex.com/fedextrack/?trknbr=FX999",
    ],
    [
      "DHL",
      "DHL456",
      "https://www.dhl.com/in-en/home/tracking.html?tracking-id=DHL456",
    ],
  ])("returns tracking URL for %s", (partner, trackingId, expectedUrl) => {
    expect(buildCourierTrackingUrl(partner, trackingId)).toBe(expectedUrl);
  });

  it("returns null for Other partner", () => {
    expect(buildCourierTrackingUrl("Other", "ABC123")).toBeNull();
  });

  it("returns null for unknown partner", () => {
    expect(buildCourierTrackingUrl("Unknown Courier", "ABC123")).toBeNull();
  });

  it("returns null when partner is missing", () => {
    expect(buildCourierTrackingUrl(null, "ABC123")).toBeNull();
    expect(buildCourierTrackingUrl("", "ABC123")).toBeNull();
  });

  it("returns null when tracking ID is missing", () => {
    expect(buildCourierTrackingUrl("Delhivery", null)).toBeNull();
    expect(buildCourierTrackingUrl("Delhivery", "")).toBeNull();
  });

  it("encodes special characters in tracking IDs", () => {
    expect(buildCourierTrackingUrl("Delhivery", "ABC 123/45")).toBe(
      "https://www.delhivery.com/track/package/ABC%20123%2F45",
    );
  });

  it("trims whitespace from partner and tracking ID", () => {
    expect(buildCourierTrackingUrl("  Delhivery  ", "  DEL123  ")).toBe(
      "https://www.delhivery.com/track/package/DEL123",
    );
  });
});
