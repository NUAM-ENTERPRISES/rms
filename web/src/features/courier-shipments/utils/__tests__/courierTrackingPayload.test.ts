import { describe, expect, it } from "vitest";
import {
  buildCourierTrackingUpdatePayload,
  buildDispatchPayload,
} from "../courierTrackingPayload";

describe("courierTrackingPayload", () => {
  it("omits empty tracking and partner from dispatch payload", () => {
    expect(
      buildDispatchPayload({
        trackingId: "  ",
        courierPartner: "",
        sentAt: "2026-01-01T00:00:00.000Z",
        sentByUserId: "u1",
        approvedByUserId: "u2",
      }),
    ).toEqual({
      sentAt: "2026-01-01T00:00:00.000Z",
      sentByUserId: "u1",
      approvedByUserId: "u2",
    });
  });

  it("includes trimmed tracking and partner when provided", () => {
    expect(
      buildDispatchPayload({
        trackingId: " TRK-1 ",
        courierPartner: "Delhivery",
        sentAt: "2026-01-01T00:00:00.000Z",
        sentByUserId: "u1",
        approvedByUserId: "u2",
      }),
    ).toEqual({
      trackingId: "TRK-1",
      courierPartner: "Delhivery",
      sentAt: "2026-01-01T00:00:00.000Z",
      sentByUserId: "u1",
      approvedByUserId: "u2",
    });
  });

  it("builds courier tracking update payload", () => {
    expect(
      buildCourierTrackingUpdatePayload({
        trackingId: " TRK-2 ",
        courierPartner: "Blue Dart",
      }),
    ).toEqual({
      trackingId: "TRK-2",
      courierPartner: "Blue Dart",
    });
  });
});
