import { describe, expect, it } from "vitest";
import { getPipelineStatusCardClass } from "../components/ProjectCandidatesBoard";

describe("getPipelineStatusCardClass", () => {
  it("uses purple for nominated statuses with glance preset", () => {
    const accent = getPipelineStatusCardClass("nominated_initial", {
      columnId: "nominated",
      isAssigned: true,
    });
    expect(accent.cardClass).toContain("from-purple-50");
    expect(accent.cardClass).toContain("pipeline-status-accent");
    expect(accent.glance?.accentBar).toBe("bg-purple-500");
    expect(accent.glance?.glanceAccent).toContain("purple");
  });

  it("keeps document accent ahead of nominated main status", () => {
    const accent = getPipelineStatusCardClass("verification_in_progress", {
      columnId: "nominated",
      isAssigned: true,
    });
    expect(accent.cardClass).toContain("from-red-50");
    expect(accent.glance?.accentBar).toBe("bg-red-500");
  });

  it("uses blue for eligible column pool cards with glance", () => {
    const accent = getPipelineStatusCardClass("", {
      columnId: "eligible",
      isAssigned: false,
    });
    expect(accent.cardClass).toContain("from-blue-50");
    expect(accent.glance?.accentBar).toBe("bg-blue-500");
  });

  it("uses red for document verification statuses", () => {
    const accent = getPipelineStatusCardClass("verification_in_progress", {
      columnId: "nominated",
      isAssigned: true,
    });
    expect(accent.cardClass).toContain("from-red-50");
    expect(accent.glance?.glanceAccent).toContain("red");
  });

  it("uses indigo for submitted to client statuses", () => {
    const accent = getPipelineStatusCardClass("submitted_to_client", {
      columnId: "nominated",
      isAssigned: true,
    });
    expect(accent.cardClass).toContain("from-indigo-50");
    expect(accent.glance?.accentBar).toBe("bg-indigo-500");
    expect(accent.glance?.glanceAccent).toContain("indigo");
    expect(accent.cardClass).not.toContain("emerald");
    expect(accent.cardClass).not.toContain("green");
  });

  it("keeps submitted to client accent ahead of generic document statuses", () => {
    const accent = getPipelineStatusCardClass("Submitted to Client", {
      columnId: "nominated",
      isAssigned: true,
    });
    expect(accent.cardClass).toContain("from-indigo-50");
    expect(accent.cardClass).not.toContain("from-red-50");
  });

  it("uses violet for interview statuses", () => {
    const accent = getPipelineStatusCardClass("interview_scheduled", {
      columnId: "nominated",
      isAssigned: true,
    });
    expect(accent.cardClass).toContain("from-violet-50");
    expect(accent.glance?.accentBar).toBe("bg-violet-500");
  });

  it("uses stone tones for training statuses", () => {
    const accent = getPipelineStatusCardClass("training_assigned", {
      columnId: "nominated",
      isAssigned: true,
    });
    expect(accent.cardClass).toContain("from-stone-100");
    expect(accent.glance?.accentBar).toBe("bg-stone-500");
  });

  it("uses orange for processing statuses with glance", () => {
    const accent = getPipelineStatusCardClass("processing", {
      columnId: "nominated",
      isAssigned: true,
    });
    expect(accent.cardClass).toContain("from-orange-50");
    expect(accent.glance?.accentBar).toBe("bg-orange-500");
  });

  it("uses green for deployed statuses", () => {
    const accent = getPipelineStatusCardClass("deployed", {
      columnId: "nominated",
      isAssigned: true,
    });
    expect(accent.cardClass).toContain("from-green-50");
    expect(accent.glance?.accentBar).toBe("bg-green-500");
  });

  it("staggers glance animation delays by card index", () => {
    const first = getPipelineStatusCardClass("processing", {
      columnId: "nominated",
      isAssigned: true,
      staggerIndex: 0,
    });
    const second = getPipelineStatusCardClass("processing", {
      columnId: "nominated",
      isAssigned: true,
      staggerIndex: 2,
    });
    expect(Number.parseFloat(first.glance?.whiteDelay ?? "0")).toBe(0);
    expect(Number.parseFloat(second.glance?.whiteDelay ?? "0")).toBeCloseTo(0.76, 2);
    expect(Number.parseFloat(second.glance?.accentDelay ?? "0")).toBeCloseTo(1.61, 2);
  });
});
