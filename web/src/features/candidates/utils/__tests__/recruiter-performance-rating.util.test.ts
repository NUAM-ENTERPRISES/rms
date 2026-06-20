import { describe, it, expect } from "vitest";
import {
  buildChartData,
  computePerformanceScore,
  getOverallRatingInfo,
  getRatingProgress,
  resolvePerformanceRating,
  getRatingStarCount,
  NAV_RATING_STAR_TOTAL,
} from "../recruiter-performance-rating.util";

describe("recruiter-performance-rating.util", () => {
  const counts = {
    positiveCandidate: 10,
    documentVerified: 8,
    interviewShortlisted: 7,
    interviewPassed: 5,
    processing: 3,
    deployed: 2,
  };

  it("computePerformanceScore matches business example (113)", () => {
    expect(computePerformanceScore(counts)).toBe(113);
  });

  it("resolvePerformanceRating assigns Outstanding for 113", () => {
    expect(resolvePerformanceRating(113)).toBe("Outstanding");
  });

  it("getRatingProgress returns next tier message", () => {
    const progress = getRatingProgress(113);
    expect(progress.nextLabel).toBe("Top Performer");
    expect(progress.pointsToNext).toBe(38);
    expect(progress.helperText).toContain("Top Performer");
  });

  it("getOverallRatingInfo returns score range without tier percent", () => {
    const info = getOverallRatingInfo(113);
    expect(info.rating).toBe("Outstanding");
    expect(info.scoreRange).toBe("101–150 points");
    expect(info.nextStep).toContain("Top Performer");
  });

  it("buildChartData includes contribution per stage", () => {
    const data = buildChartData(counts);
    const deployed = data.find((d) => d.key === "deployed");
    expect(deployed?.count).toBe(2);
    expect(deployed?.contribution).toBe(20);
  });

  it("getRatingStarCount maps tiers to 1–5 stars", () => {
    expect(NAV_RATING_STAR_TOTAL).toBe(5);
    expect(getRatingStarCount("Poor")).toBe(1);
    expect(getRatingStarCount("Average")).toBe(2);
    expect(getRatingStarCount("Good")).toBe(3);
    expect(getRatingStarCount("Excellent")).toBe(4);
    expect(getRatingStarCount("Outstanding")).toBe(5);
    expect(getRatingStarCount("Top Performer")).toBe(5);
    expect(getRatingStarCount("Unknown")).toBe(1);
  });
});
