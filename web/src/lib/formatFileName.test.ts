import { describe, expect, it } from "vitest";
import { truncateFileName } from "@/lib/formatFileName";

describe("truncateFileName", () => {
  it("returns full name when under max length", () => {
    const result = truncateFileName("abhijith_aster_intro_video.mp4", 80);
    expect(result.display).toBe("abhijith_aster_intro_video.mp4");
    expect(result.isTruncated).toBe(false);
  });

  it("truncates long names with ellipsis", () => {
    const longName =
      "Create-a-realistic-30-second-cinematic-nurse-introduction-video-in-a-modern-hospital-environment-----seed1084244456-1779724607094-e17bf5a2fc698729.mp4";
    const result = truncateFileName(longName, 80);
    expect(result.display).toHaveLength(83);
    expect(result.display.endsWith("...")).toBe(true);
    expect(result.full).toBe(longName);
    expect(result.isTruncated).toBe(true);
  });
});
