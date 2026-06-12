import { describe, it, expect } from "vitest";
import {
  formatProcessingStepLabel,
  formatProcessingStepStatus,
} from "./formatProcessingStepLabel";

describe("formatProcessingStepLabel", () => {
  it("uses known overrides for step keys", () => {
    expect(formatProcessingStepLabel("document_received")).toBe(
      "Document Original Received",
    );
    expect(formatProcessingStepLabel("verify_offer_letter")).toBe(
      "Verify Offer Letter",
    );
  });

  it("prefers API label when provided", () => {
    expect(formatProcessingStepLabel("hrd", "HRD Attestation")).toBe(
      "HRD Attestation",
    );
  });
});

describe("formatProcessingStepStatus", () => {
  it("maps processing step statuses", () => {
    expect(formatProcessingStepStatus("in_progress")).toBe("In progress");
    expect(formatProcessingStepStatus("pending")).toBe("Pending");
  });
});
