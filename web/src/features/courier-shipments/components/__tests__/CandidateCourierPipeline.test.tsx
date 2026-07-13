import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CandidateCourierPipeline } from "../CandidateCourierPipeline";
import { DELIVERY_MODE, SHIPMENT_STATUS } from "../../constants";
import type { CourierShipment } from "../../types";

function buildLeg(
  overrides: Partial<CourierShipment> & Pick<CourierShipment, "id" | "legNumber">,
): CourierShipment {
  return {
    candidateId: "c1",
    collectionId: "col1",
    purposeType: "internal",
    deliveryMode: DELIVERY_MODE.COURIER,
    status: SHIPMENT_STATUS.IN_TRANSIT,
    fromAddressType: "kochi",
    toAddressType: "delhi",
    fromAddressSnapshot: {},
    toAddressSnapshot: {},
    createdByUserId: "u1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    candidate: {
      id: "c1",
      firstName: "Jane",
      lastName: "Doe",
    },
    documents: [],
    fromAddressLabel: "Kochi Office",
    toAddressLabel: "Delhi Office",
    ...overrides,
  };
}

describe("CandidateCourierPipeline", () => {
  it("shows remarks on leg cards when present", () => {
    render(
      <CandidateCourierPipeline
        legs={[
          buildLeg({
            id: "leg-1",
            legNumber: 1,
            remarks: "Handle with care",
          }),
        ]}
      />,
    );

    expect(screen.getByRole("note")).toHaveTextContent("Remarks");
    expect(screen.getByText("Handle with care")).toBeInTheDocument();
  });

  it("shows tracking pending when partner is set without tracking ID", () => {
    render(
      <CandidateCourierPipeline
        legs={[
          buildLeg({
            id: "leg-1",
            legNumber: 1,
            courierPartner: "Blue Dart",
            trackingId: null,
          }),
        ]}
      />,
    );

    expect(screen.getByText(/Tracking pending · Blue Dart/)).toBeInTheDocument();
  });

  it("does not render remarks section when remarks are blank", () => {
    render(
      <CandidateCourierPipeline
        legs={[
          buildLeg({
            id: "leg-1",
            legNumber: 1,
            remarks: "   ",
          }),
        ]}
      />,
    );

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});
