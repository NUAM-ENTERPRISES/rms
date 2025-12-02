import { describe, it, expect } from "vitest";
import {
  PROCESSING_STEP_META,
  PROCESSING_STEP_STATUS_META,
} from "./processingSteps";

describe("processing step metadata", () => {
  it("contains 11 ordered steps", () => {
    expect(PROCESSING_STEP_META).toHaveLength(11);
    expect(PROCESSING_STEP_META[0].key).toBe("MEDICAL_CERTIFICATE");
    expect(PROCESSING_STEP_META[10].key).toBe("JOINING");
  });

  it("maps statuses to badges", () => {
    expect(PROCESSING_STEP_STATUS_META.DONE.label).toBe("Done");
    expect(PROCESSING_STEP_STATUS_META.REJECTED.badge).toContain("rose");
  });
});
