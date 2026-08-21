import { describe, expect, it } from "vitest";
import {
  canDirectApplyProcessingStatusChange,
  PROCESSING_STATUS_CHANGE_DIRECT_ROLES,
} from "./processingStatusChangeRoles";

describe("processingStatusChangeRoles", () => {
  it("allows manager and processing manager to apply directly", () => {
    expect(PROCESSING_STATUS_CHANGE_DIRECT_ROLES).toEqual([
      "Department Head",
      "Processing Team Lead",
    ]);
    expect(canDirectApplyProcessingStatusChange(["Department Head"])).toBe(true);
    expect(canDirectApplyProcessingStatusChange(["Processing Team Lead"])).toBe(
      true,
    );
    expect(canDirectApplyProcessingStatusChange(["Processing Executive"])).toBe(
      false,
    );
  });
});
