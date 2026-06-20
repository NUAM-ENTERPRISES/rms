import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
});
