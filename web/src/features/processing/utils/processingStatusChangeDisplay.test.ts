import { describe, expect, it } from "vitest";
import { getProcessingStatusChangeTransition } from "./processingStatusChangeDisplay";

describe("getProcessingStatusChangeTransition", () => {
  it("shows cancelled to in progress for reactivation from cancelled", () => {
    const transition = getProcessingStatusChangeTransition(
      "processing_reactivate",
      "cancelled",
    );

    expect(transition.fromLabel).toBe("Processing Cancelled");
    expect(transition.toLabel).toBe("Processing In Progress");
    expect(transition.actionPhrase).toBe("Reactivating processing");
  });

  it("shows on hold to in progress for reactivation from hold", () => {
    const transition = getProcessingStatusChangeTransition(
      "processing_reactivate",
      "on_hold",
    );

    expect(transition.fromLabel).toBe("Processing On Hold");
    expect(transition.toLabel).toBe("Processing In Progress");
  });

  it("shows in progress to cancelled for cancellation requests", () => {
    const transition = getProcessingStatusChangeTransition(
      "processing_cancel",
      "in_progress",
    );

    expect(transition.fromLabel).toBe("Processing In Progress");
    expect(transition.toLabel).toBe("Processing Cancelled");
  });
});
