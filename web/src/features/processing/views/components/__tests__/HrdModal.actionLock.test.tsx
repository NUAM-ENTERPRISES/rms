import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { Eye, Upload } from "lucide-react";
import { ProcessingActionLockProvider } from "@/features/processing/context/ProcessingActionLockContext";
import { LockedProcessingActionButton } from "@/features/processing/components/LockedProcessingActionButton";

describe("HrdModal action lock pattern", () => {
  it("keeps view enabled while upload actions are disabled when locked", () => {
    render(
      <ProcessingActionLockProvider
        pendingRequest={{
          id: "req-1",
          requestType: "processing_cancel",
          reason: "Cancellation request pending approval",
          createdAt: "2026-01-01T00:00:00.000Z",
        }}
        processingStatus="in_progress"
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View document">
            <Eye className="h-4 w-4" />
          </Button>
          <LockedProcessingActionButton forceDisabled>
            <Button size="sm" disabled={false}>
              <Upload className="h-3 w-3 mr-1" />
              Upload
            </Button>
          </LockedProcessingActionButton>
        </div>
      </ProcessingActionLockProvider>,
    );

    expect(screen.getByTitle("View document")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /upload/i })).toBeDisabled();
  });
});
