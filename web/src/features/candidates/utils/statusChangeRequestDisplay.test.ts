import { describe, expect, it } from "vitest";
import {
  getStatusChangeRequestDisplay,
  getStatusChangeRequestTitle,
  isProcessingStatusChangeRequestType,
} from "./statusChangeRequestDisplay";

describe("statusChangeRequestDisplay", () => {
  it("identifies processing request types", () => {
    expect(isProcessingStatusChangeRequestType("processing_cancel")).toBe(true);
    expect(isProcessingStatusChangeRequestType("block")).toBe(false);
  });

  it("maps pipeline block requests from requestedStatus", () => {
    expect(
      getStatusChangeRequestTitle({
        requestType: "block",
        requestedStatus: "withdrawn",
      }),
    ).toBe("Withdrawn");

    expect(
      getStatusChangeRequestTitle({
        requestType: "block",
        requestedStatus: "on_hold",
      }),
    ).toBe("On Hold");
  });

  it("maps processing cancel without treating it as withdrawn", () => {
    expect(
      getStatusChangeRequestTitle({
        requestType: "processing_cancel",
        requestedStatus: "processing_cancelled",
      }),
    ).toBe("Processing Cancellation");
  });

  it("maps processing hold and reactivation titles", () => {
    expect(
      getStatusChangeRequestTitle({
        requestType: "processing_hold",
        requestedStatus: "processing_hold",
      }),
    ).toBe("Processing Hold");

    expect(
      getStatusChangeRequestTitle({
        requestType: "processing_reactivate",
        requestedStatus: "processing_in_progress",
      }),
    ).toBe("Processing Reactivation");
  });

  it("builds display with processing transition", () => {
    const display = getStatusChangeRequestDisplay({
      requestType: "processing_cancel",
      requestedStatus: "processing_cancelled",
      stepKey: "medical",
    });

    expect(display.headline).toBe("Processing Cancellation Request");
    expect(display.category).toBe("processing");
    expect(display.processingTransition?.fromLabel).toBe(
      "Processing In Progress",
    );
    expect(display.processingTransition?.toLabel).toBe("Processing Cancelled");
    expect(display.stepLabel).toBeTruthy();
  });
});
