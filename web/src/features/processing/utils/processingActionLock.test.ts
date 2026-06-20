import { describe, expect, it } from "vitest";
import {
  formatProcessingStatusChangeRequestDate,
  getProcessingActionLock,
} from "./processingActionLock";

describe("formatProcessingStatusChangeRequestDate", () => {
  it("formats a valid ISO timestamp", () => {
    const formatted = formatProcessingStatusChangeRequestDate("2026-06-19T12:30:00.000Z");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("at");
  });

  it("returns null for invalid values", () => {
    expect(formatProcessingStatusChangeRequestDate(undefined)).toBeNull();
    expect(formatProcessingStatusChangeRequestDate("not-a-date")).toBeNull();
  });
});

describe("getProcessingActionLock", () => {
  it("returns unlocked when no pending request and processing is active", () => {
    expect(
      getProcessingActionLock({
        pendingRequest: null,
        processingStatus: "in_progress",
      }),
    ).toMatchObject({
      isLocked: false,
      reason: null,
      tooltip: null,
      pendingRequest: null,
      submittedAtLabel: null,
    });
  });

  it("locks for pending cancellation request", () => {
    expect(
      getProcessingActionLock({
        pendingRequest: {
          id: "1",
          requestType: "processing_cancel",
          reason: "test",
          createdAt: "2026-06-19T12:30:00.000Z",
        },
        processingStatus: "in_progress",
      }),
    ).toMatchObject({
      isLocked: true,
      reason: "pending_cancel",
      tooltip: "Cancellation request is pending approval",
      submittedAtLabel: expect.stringContaining("2026"),
    });
  });

  it("locks for pending hold request", () => {
    expect(
      getProcessingActionLock({
        pendingRequest: {
          id: "1",
          requestType: "processing_hold",
          reason: "test",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        processingStatus: "in_progress",
      }),
    ).toMatchObject({
      isLocked: true,
      reason: "pending_hold",
      tooltip: "Hold request is pending approval",
      submittedAtLabel: expect.stringContaining("2026"),
    });
  });

  it("locks when processing is cancelled", () => {
    expect(
      getProcessingActionLock({
        pendingRequest: null,
        processingStatus: "cancelled",
      }),
    ).toMatchObject({
      isLocked: true,
      reason: "cancelled",
      tooltip: "This processing has been cancelled — actions are disabled",
      submittedAtLabel: null,
    });
  });

  it("locks when processing is on hold", () => {
    expect(
      getProcessingActionLock({
        pendingRequest: null,
        processingStatus: "on_hold",
      }),
    ).toMatchObject({
      isLocked: true,
      reason: "on_hold",
      tooltip: "This processing is on hold — actions are disabled",
      submittedAtLabel: null,
    });
  });

  it("locks for pending reactivation request", () => {
    expect(
      getProcessingActionLock({
        pendingRequest: {
          id: "1",
          requestType: "processing_reactivate",
          reason: "test",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        processingStatus: "cancelled",
      }),
    ).toMatchObject({
      isLocked: true,
      reason: "pending_reactivate",
      tooltip: "Reactivation request is pending approval",
    });
  });

  it("prioritizes pending request over processing status", () => {
    expect(
      getProcessingActionLock({
        pendingRequest: {
          id: "1",
          requestType: "processing_cancel",
          reason: "test",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        processingStatus: "on_hold",
      }).reason,
    ).toBe("pending_cancel");
  });
});
