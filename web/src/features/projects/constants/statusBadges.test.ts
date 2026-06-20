import { describe, expect, it } from "vitest";
import { getProjectStatusBlinkClass } from "./statusBadges";

describe("getProjectStatusBlinkClass", () => {
  it("returns orange hold blink for on-hold projects", () => {
    expect(getProjectStatusBlinkClass("on_hold")).toBe(
      "animate-project-status-blink-hold"
    );
    expect(getProjectStatusBlinkClass("ON_HOLD")).toBe(
      "animate-project-status-blink-hold"
    );
  });

  it("returns green completed blink for completed projects", () => {
    expect(getProjectStatusBlinkClass("completed")).toBe(
      "animate-project-status-blink-completed"
    );
    expect(getProjectStatusBlinkClass("COMPLETED")).toBe(
      "animate-project-status-blink-completed"
    );
  });

  it("returns red cancelled blink for cancelled projects", () => {
    expect(getProjectStatusBlinkClass("cancelled")).toBe(
      "animate-project-status-blink-cancelled"
    );
    expect(getProjectStatusBlinkClass("inactive")).toBe(
      "animate-project-status-blink-cancelled"
    );
  });

  it("returns no blink class for in-progress projects", () => {
    expect(getProjectStatusBlinkClass("in_progress")).toBeUndefined();
    expect(getProjectStatusBlinkClass("IN_PROGRESS")).toBeUndefined();
    expect(getProjectStatusBlinkClass("active")).toBeUndefined();
  });
});
