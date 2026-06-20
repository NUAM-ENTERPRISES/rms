import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CourierPartnerFields } from "../CourierPartnerFields";

describe("CourierPartnerFields", () => {
  it("renders tracking ID and courier partner fields", () => {
    render(
      <CourierPartnerFields
        trackingId="TRK123"
        courierPartner="Delhivery"
        onTrackingIdChange={vi.fn()}
        onCourierPartnerChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/Tracking ID/i)).toHaveValue("TRK123");
    expect(screen.getByText("Delhivery")).toBeInTheDocument();
  });

  it("calls change handlers when values are edited", async () => {
    const user = userEvent.setup();
    const onTrackingIdChange = vi.fn();

    render(
      <CourierPartnerFields
        trackingId=""
        courierPartner="Delhivery"
        onTrackingIdChange={onTrackingIdChange}
        onCourierPartnerChange={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/Tracking ID/i), "ABC");

    expect(onTrackingIdChange).toHaveBeenCalled();
  });
});
