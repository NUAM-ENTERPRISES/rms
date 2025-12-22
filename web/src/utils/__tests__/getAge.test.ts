import { describe, it, expect, afterEach, vi } from "vitest";
import { getAge } from "../getAge";

describe("getAge", () => {
  afterEach(() => {
    // Restore system time
    vi.useRealTimers();
  });

  it("calculates age correctly when birthday is today", () => {
    vi.setSystemTime(new Date("2025-12-22T00:00:00Z"));
    expect(getAge("2000-12-22")).toBe(25);
  });

  it("calculates age correctly when birthday is tomorrow", () => {
    vi.setSystemTime(new Date("2025-12-22T00:00:00Z"));
    expect(getAge("2000-12-23")).toBe(24);
  });

  it("handles leap day birthdays across non-leap years", () => {
    // Before adjusted birthday (2025 is not a leap year)
    vi.setSystemTime(new Date("2025-02-28T00:00:00Z"));
    expect(getAge("2004-02-29")).toBe(20);

    // On/after adjusted birthday (JS will roll Feb 29 to Mar 1 in non-leap years)
    vi.setSystemTime(new Date("2025-03-01T00:00:00Z"));
    expect(getAge("2004-02-29")).toBe(21);
  });

  it("returns null for invalid dates or future DOBs", () => {
    vi.setSystemTime(new Date("2025-12-22T00:00:00Z"));
    expect(getAge("not-a-date" as any)).toBeNull();
    expect(getAge("3000-01-01")).toBeNull();
  });

  it("accepts Date objects and timestamps", () => {
    vi.setSystemTime(new Date("2025-12-22T00:00:00Z"));
    expect(getAge(new Date("2000-12-22"))).toBe(25);
    expect(getAge(new Date("2000-12-23").getTime())).toBe(24);
  });
});
