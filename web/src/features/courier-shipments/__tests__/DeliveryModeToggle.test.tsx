import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeliveryModeToggle } from "../components/DeliveryModeToggle";
import { DELIVERY_MODE } from "../constants";

describe("DeliveryModeToggle", () => {
  it("shows courier and direct options", () => {
    const onChange = vi.fn();
    render(
      <DeliveryModeToggle
        value={DELIVERY_MODE.COURIER}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Courier")).toBeInTheDocument();
    expect(screen.getByText("Direct Handover")).toBeInTheDocument();
  });

  it("calls onChange when direct selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DeliveryModeToggle
        value={DELIVERY_MODE.COURIER}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Direct Handover/i }));
    expect(onChange).toHaveBeenCalledWith(DELIVERY_MODE.DIRECT);
  });
});
