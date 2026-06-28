import { describe, expect, it } from "vitest";
import { resolveProjectCandidateStatusDisplay } from "@/constants/statuses";
import {
  getPipelineStatusCardClass,
  SCREENING_PASSED_STATUS_BADGE,
} from "../components/ProjectCandidatesBoard";

describe("getPipelineStatusCardClass", () => {
  it("uses purple for nominated statuses", () => {
    const accent = getPipelineStatusCardClass("nominated_initial", {
      columnId: "nominated",
      isAssigned: true,
    });
    expect(accent.cardClass).toContain("bg-purple-100");
    expect(accent.cardClass).toContain("pipeline-status-accent");
    expect(accent.isProcessing).toBe(false);
  });

  it("keeps document accent ahead of nominated main status", () => {
    const accent = getPipelineStatusCardClass("verification_in_progress", {
      columnId: "nominated",
      isAssigned: true,
    });
    expect(accent.cardClass).toContain("from-red-50");
  });

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

  it("uses emerald for screening passed statuses", () => {
    const accent = getPipelineStatusCardClass("screening_passed", {
      columnId: "nominated",
      isAssigned: true,
    });
    expect(accent.cardClass).toContain("from-emerald-50");
    expect(accent.isProcessing).toBe(false);
  });
});

describe("screening passed badge", () => {
  it("exports dedicated screening passed badge styling", () => {
    expect(SCREENING_PASSED_STATUS_BADGE.label).toBe("Screening Passed");
    expect(SCREENING_PASSED_STATUS_BADGE.badgeClass).toContain("emerald");
  });

  it("resolves screening_passed status name to Screening Passed badge", () => {
    const badge = resolveProjectCandidateStatusDisplay("screening_passed");
    expect(badge.label).toBe("Screening Passed");
    expect(badge.badgeClass).toContain("emerald");
  });

  it("resolves Screening Passed label to Screening Passed badge", () => {
    const badge = resolveProjectCandidateStatusDisplay("Screening Passed");
    expect(badge.label).toBe("Screening Passed");
    expect(badge.badgeClass).toContain("emerald");
  });
});
