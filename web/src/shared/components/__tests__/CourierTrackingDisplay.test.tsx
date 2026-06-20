import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CourierTrackingDisplay } from "../CourierTrackingDisplay";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("CourierTrackingDisplay", () => {
  it("renders external track link for known courier partner", () => {
    render(
      <CourierTrackingDisplay
        courierPartner="Delhivery"
        trackingId="DEL123"
      />,
    );

    const trackLink = screen.getByRole("link", {
      name: "Track shipment on Delhivery (opens in new tab)",
    });

    expect(trackLink).toHaveAttribute(
      "href",
      "https://www.delhivery.com/track/package/DEL123",
    );
    expect(trackLink).toHaveAttribute("target", "_blank");
    expect(trackLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("Delhivery")).toBeInTheDocument();
    expect(screen.getByText("DEL123")).toBeInTheDocument();
  });

  it("does not render track link for Other partner", () => {
    render(
      <CourierTrackingDisplay courierPartner="Other" trackingId="CUSTOM123" />,
    );

    expect(
      screen.queryByRole("link", { name: /Track shipment/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
    expect(screen.getByText("CUSTOM123")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy tracking ID" })).toBeInTheDocument();
  });

  it("displays the full tracking ID without truncation", () => {
    render(
      <CourierTrackingDisplay
        courierPartner="Delhivery"
        trackingId="1234567890123456789"
      />,
    );

    expect(
      screen.getByText("1234567890123456789"),
    ).toBeInTheDocument();
  });

  it("renders success variant track link", () => {
    render(
      <CourierTrackingDisplay
        variant="success"
        courierPartner="Delhivery"
        trackingId="DEL123"
      />,
    );

    const trackLink = screen.getByRole("link", {
      name: "Track shipment on Delhivery (opens in new tab)",
    });

    expect(trackLink).toHaveTextContent("Track");
    expect(trackLink).toHaveAttribute(
      "href",
      "https://www.delhivery.com/track/package/DEL123",
    );
  });
});
