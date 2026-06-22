import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RequestProcessingActionModal from "./RequestProcessingActionModal";

describe("RequestProcessingActionModal", () => {
  it("requires at least 10 characters in reason before submit", async () => {
    const onConfirm = vi.fn();
    render(
      <RequestProcessingActionModal
        isOpen
        onClose={() => {}}
        actionType="cancel"
        onConfirm={onConfirm}
      />,
    );

    const submit = screen.getByRole("button", { name: /submit request/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/minimum 10 characters/i), {
      target: { value: "short" },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/minimum 10 characters/i), {
      target: { value: "Valid cancel reason here" },
    });
    expect(submit).not.toBeDisabled();
  });

  it("shows country restriction checkbox for data_flow cancel", () => {
    render(
      <RequestProcessingActionModal
        isOpen
        onClose={() => {}}
        actionType="cancel"
        onConfirm={vi.fn()}
        stepKey="data_flow"
        projectCountry={{ code: "SA", name: "Saudi Arabia" }}
      />,
    );

    expect(
      screen.getByRole("checkbox", {
        name: /request country restriction for saudi arabia/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Saudi Arabia").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/SA · Project destination/i)).toBeInTheDocument();
  });

  it("passes restrictCountryCode when country restriction is checked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <RequestProcessingActionModal
        isOpen
        onClose={() => {}}
        actionType="cancel"
        onConfirm={onConfirm}
        stepKey="data_flow"
        projectCountry={{ code: "SA", name: "Saudi Arabia" }}
      />,
    );

    await user.type(
      screen.getByPlaceholderText(/minimum 10 characters/i),
      "Valid cancel reason here",
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: /request country restriction for saudi arabia/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: /submit request/i }));

    expect(onConfirm).toHaveBeenCalledWith({
      reason: "Valid cancel reason here",
      applyCountryRestriction: true,
      restrictCountryCode: "SA",
    });
  });

  it("does not show country restriction checkbox for hold actions", () => {
    render(
      <RequestProcessingActionModal
        isOpen
        onClose={() => {}}
        actionType="hold"
        onConfirm={vi.fn()}
        stepKey="data_flow"
        projectCountry={{ code: "SA", name: "Saudi Arabia" }}
      />,
    );

    expect(
      screen.queryByRole("checkbox", { name: /request country restriction/i }),
    ).not.toBeInTheDocument();
  });
});
