import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PhoneCallButton } from "../PhoneCallButton";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("PhoneCallButton", () => {
  it("renders disabled button when phone is missing", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });

    render(
      <PhoneCallButton
        parts={{ countryCode: "+91", mobileNumber: "" }}
        className="call-btn"
      />,
    );

    expect(screen.getByTestId("candidate-call-btn")).toBeDisabled();
  });

  it("uses direct tel link on Windows for one-click phone dialer", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
    });

    render(
      <PhoneCallButton
        parts={{ countryCode: "+91", mobileNumber: "9876543210" }}
        className="call-btn"
      />,
    );

    const link = screen.getByTestId("candidate-call-btn");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "tel:+919876543210");
  });

  it("opens desktop call menu on Mac instead of direct tel link", async () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)",
    });

    render(
      <PhoneCallButton
        parts={{ countryCode: "+91", mobileNumber: "9876543210" }}
        className="call-btn"
      />,
    );

    const trigger = screen.getByTestId("candidate-call-btn");
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).not.toHaveAttribute("href");

    await userEvent.click(trigger);

    expect(screen.getByText("Call candidate")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Call via WhatsApp/i })).toHaveAttribute(
      "href",
      "https://wa.me/919876543210",
    );
  });

  it("uses native tel link on mobile devices", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });

    render(
      <PhoneCallButton
        parts={{ countryCode: "+91", mobileNumber: "9876543210" }}
        className="call-btn"
      />,
    );

    const link = screen.getByTestId("candidate-call-btn");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "tel:+919876543210");
  });
});
