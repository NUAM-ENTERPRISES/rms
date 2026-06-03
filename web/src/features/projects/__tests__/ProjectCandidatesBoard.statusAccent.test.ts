import { describe, expect, it } from "vitest";
import { getPipelineStatusCardClass } from "../components/ProjectCandidatesBoard";

describe("getPipelineStatusCardClass", () => {
  it("uses blue for eligible column pool cards", () => {
    const accent = getPipelineStatusCardClass("", {
      columnId: "eligible",
      isAssigned: false,
    });
    expect(accent.cardClass).toContain("from-blue-50");
    expect(accent.isProcessing).toBe(false);
  });

  it("uses red for document verification statuses", () => {
    const accent = getPipelineStatusCardClass("verification_in_progress", {
      columnId: "nominated",
      isAssigned: true,
    });
    expect(accent.cardClass).toContain("from-red-50");
  });

  it("uses violet for interview statuses", () => {
    const accent = getPipelineStatusCardClass("interview_scheduled", {
      columnId: "nominated",
      isAssigned: true,
    });
    expect(accent.cardClass).toContain("from-violet-50");
  });

  it("uses stone tones for training statuses", () => {
    const accent = getPipelineStatusCardClass("training_assigned", {
      columnId: "nominated",
      isAssigned: true,
    });
    expect(accent.cardClass).toContain("from-stone-100");
  });

  it("uses orange for processing statuses", () => {
    const accent = getPipelineStatusCardClass("processing", {
      columnId: "nominated",
      isAssigned: true,
    });
    expect(accent.cardClass).toContain("from-orange-50");
    expect(accent.isProcessing).toBe(true);
  });

  it("uses green for deployed statuses", () => {
    const accent = getPipelineStatusCardClass("deployed", {
      columnId: "nominated",
      isAssigned: true,
    });
    expect(accent.cardClass).toContain("from-green-50");
  });
});
