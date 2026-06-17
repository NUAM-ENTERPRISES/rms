const COURIER_TRACKING_URL_TEMPLATES: Record<string, string> = {
  "Blue Dart":
    "https://www.bluedart.com/web/guest/trackdartresultthirdparty?trackFor=0&trackNo={trackingId}",
  DTDC: "https://www.dtdc.in/tracking.asp?strCnno={trackingId}",
  Delhivery: "https://www.delhivery.com/track/package/{trackingId}",
  "India Post":
    "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consignmentnumber={trackingId}",
  FedEx: "https://www.fedex.com/fedextrack/?trknbr={trackingId}",
  DHL: "https://www.dhl.com/in-en/home/tracking.html?tracking-id={trackingId}",
};

const TRACKING_ID_PLACEHOLDER = "{trackingId}";

export function buildCourierTrackingUrl(
  courierPartner: string | null | undefined,
  trackingId: string | null | undefined,
): string | null {
  const partner = courierPartner?.trim();
  const id = trackingId?.trim();

  if (!partner || !id || partner === "Other") {
    return null;
  }

  const template = COURIER_TRACKING_URL_TEMPLATES[partner];
  if (!template) {
    return null;
  }

  return template.replace(
    TRACKING_ID_PLACEHOLDER,
    encodeURIComponent(id),
  );
}
