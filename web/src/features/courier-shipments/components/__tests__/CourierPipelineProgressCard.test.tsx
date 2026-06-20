import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CourierPipelineProgressCard } from "@/features/courier-shipments/components/CourierPipelineProgressCard";
import { SHIPMENT_STATUS } from "@/features/courier-shipments/constants";
import type { CourierShipment } from "@/features/courier-shipments/types";

function buildLeg(
  overrides: Partial<CourierShipment> & Pick<CourierShipment, "id" | "legNumber">,
): CourierShipment {
  return {
    candidateId: "c1",
    collectionId: "col1",
    purposeType: "internal",
    deliveryMode: "courier",
    status: SHIPMENT_STATUS.RECEIVED,
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

describe("CourierPipelineProgressCard", () => {
  it("renders progress, stat tiles, and leg journey", () => {
    const legs = [
      buildLeg({ id: "leg-1", legNumber: 1, status: SHIPMENT_STATUS.RECEIVED }),
      buildLeg({
        id: "leg-2",
        legNumber: 2,
        status: SHIPMENT_STATUS.IN_TRANSIT,
      }),
    ];

    render(
      <CourierPipelineProgressCard
        legs={legs}
        receivedLegs={1}
        totalLegs={2}
        currentLocationHint="Delhi Office"
      />,
    );

    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("1 / 2 legs received")).toBeInTheDocument();
    expect(screen.getByText("Received")).toBeInTheDocument();
    expect(screen.getByText("In transit")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Leg journey")).toBeInTheDocument();
    expect(screen.getByText("Delhi Office")).toBeInTheDocument();
  });

  it("scrolls to a leg when a timeline item is clicked", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    const leg = buildLeg({ id: "leg-2", legNumber: 2 });
    const element = document.createElement("div");
    element.id = "courier-leg-leg-2";
    element.scrollIntoView = scrollIntoView;
    document.body.appendChild(element);

    render(
      <CourierPipelineProgressCard
        legs={[leg]}
        receivedLegs={1}
        totalLegs={1}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /go to leg 2: kochi office to delhi office/i,
      }),
    );

    expect(scrollIntoView).toHaveBeenCalled();
    element.remove();
  });
});
