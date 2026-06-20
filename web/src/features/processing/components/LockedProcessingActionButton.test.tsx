import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { ProcessingActionLockProvider } from "../context/ProcessingActionLockContext";
import { LockedProcessingActionButton } from "./LockedProcessingActionButton";

describe("LockedProcessingActionButton", () => {
  it("disables wrapped action buttons when processing is locked", () => {
    render(
      <ProcessingActionLockProvider
        pendingRequest={{
          id: "req-1",
          requestType: "processing_cancel",
          reason: "Candidate withdrew temporarily",
          createdAt: "2026-01-01T00:00:00.000Z",
        }}
        processingStatus="in_progress"
      >
        <LockedProcessingActionButton forceDisabled>
          <Button>Upload</Button>
        </LockedProcessingActionButton>
      </ProcessingActionLockProvider>,
    );

    expect(screen.getByRole("button", { name: /upload/i })).toBeDisabled();
  });

  it("leaves action buttons enabled when processing is not locked", () => {
    render(
      <ProcessingActionLockProvider pendingRequest={null} processingStatus="in_progress">
        <LockedProcessingActionButton forceDisabled={false}>
          <Button>Upload</Button>
        </LockedProcessingActionButton>
      </ProcessingActionLockProvider>,
    );

    expect(screen.getByRole("button", { name: /upload/i })).not.toBeDisabled();
  });
});
