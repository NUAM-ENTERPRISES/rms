import { describe, expect, it } from "vitest";
import { getCandidateCreatedByDisplay } from "../getCandidateCreatedByDisplay";

describe("getCandidateCreatedByDisplay", () => {
  it("shows createdBy for unassigned candidates", () => {
    expect(
      getCandidateCreatedByDisplay(
        { createdBy: { id: "u1", name: "Mike Manager", email: "m@x.com" } },
        undefined,
      ),
    ).toEqual({ id: "u1", name: "Mike Manager", email: "m@x.com" });
  });

  it("returns null when no creator name exists", () => {
    expect(getCandidateCreatedByDisplay({ createdBy: null }, null)).toBeNull();
  });
});
