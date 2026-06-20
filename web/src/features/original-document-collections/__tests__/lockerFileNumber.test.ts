import { describe, expect, it } from "vitest";
import { normalizeLockerFileNumber } from "../utils/lockerFileNumber";

describe("normalizeLockerFileNumber", () => {
  it("trims and uppercases locker file numbers", () => {
    expect(normalizeLockerFileNumber(" l-100 ")).toBe("L-100");
  });
});
