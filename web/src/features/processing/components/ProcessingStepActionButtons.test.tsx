import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProcessingActionLockProvider } from "../context/ProcessingActionLockContext";
import { ProcessingStepActionButtons } from "./ProcessingStepActionButtons";

vi.mock("@/app/hooks", () => ({
  useAppSelector: () => ({
    user: { roles: ["Processing Team"] },
  }),
}));

vi.mock("../data/processing.endpoints", () => ({
  useCreateProcessingStatusChangeRequestMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("./RequestProcessingActionModal", () => ({
  default: () => null,
}));

describe("ProcessingStepActionButtons", () => {
  it("disables hold and cancel when a pending request locks processing actions", () => {
    render(
      <ProcessingActionLockProvider
        pendingRequest={{
          id: "req-1",
          requestType: "processing_hold",
          reason: "Waiting for manager decision",
          createdAt: "2026-01-01T00:00:00.000Z",
        }}
        processingStatus="in_progress"
      >
        <ProcessingStepActionButtons processingStepId="step-1" />
      </ProcessingActionLockProvider>,
    );

    expect(screen.getByRole("button", { name: /request hold/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /request cancel/i })).toBeDisabled();
  });
});
