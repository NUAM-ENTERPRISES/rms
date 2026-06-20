import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CourierRouteDisplay } from "@/features/courier-shipments/components/CourierRouteDisplay";
import { SHIPMENT_STATUS } from "@/features/courier-shipments/constants";

describe("CourierRouteDisplay", () => {
  it("renders card layout with sent-to label for in-transit legs", () => {
    render(
      <CourierRouteDisplay
        fromLabel="Kochi Office"
        toLabel="Delhi Office"
        status={SHIPMENT_STATUS.IN_TRANSIT}
      />,
    );

    expect(screen.getByText("Kochi Office")).toBeInTheDocument();
    expect(screen.getByText("Delhi Office")).toBeInTheDocument();
    expect(screen.getByText("Sent to")).toBeInTheDocument();
    expect(screen.getByText("From")).toBeInTheDocument();
    expect(screen.getByText("Destination")).toBeInTheDocument();
  });

  it("renders inline layout with delivered-to label for received legs", () => {
    render(
      <CourierRouteDisplay
        fromLabel="Kochi Office"
        toLabel="Delhi Office"
        status={SHIPMENT_STATUS.RECEIVED}
        variant="inline"
      />,
    );

    expect(screen.getByText("Delivered to")).toBeInTheDocument();
  });
});
