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
  beforeEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
  });

  it("renders disabled button when phone is missing", () => {
    render(
      <PhoneCallButton
        parts={{ countryCode: "+91", mobileNumber: "" }}
        className="call-btn"
      />,
    );

    expect(screen.getByTestId("candidate-call-btn")).toBeDisabled();
  });

  it("opens desktop call menu on laptop instead of direct tel link", async () => {
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
    expect(screen.getByText("+91 9876543210")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Call via Google Chrome/i })).toHaveAttribute(
      "href",
      "https://voice.google.com/u/0/calls?a=tn%2B919876543210",
    );
    expect(screen.getByRole("link", { name: /Call via WhatsApp/i })).toHaveAttribute(
      "href",
      "https://wa.me/919876543210",
    );
    expect(screen.getByRole("link", { name: /Call via linked phone/i })).toHaveAttribute(
      "href",
      "tel:+919876543210",
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
