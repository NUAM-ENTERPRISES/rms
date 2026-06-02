import { describe, it, expect } from "vitest";
import {
  BLOCKED_ACCOUNT_MESSAGE,
  extractApiErrorMessage,
  isBlockedAccountMessage,
} from "../account-status";

describe("isBlockedAccountMessage", () => {
  it("matches only the exact blocked account message", () => {
    expect(isBlockedAccountMessage(BLOCKED_ACCOUNT_MESSAGE)).toBe(true);
  });

  it("does not match partial or unrelated messages", () => {
    expect(isBlockedAccountMessage("Status must be BLOCKED")).toBe(false);
    expect(isBlockedAccountMessage("Unauthorized")).toBe(false);
    expect(isBlockedAccountMessage(undefined)).toBe(false);
  });
});

describe("extractApiErrorMessage", () => {
  it("reads string and array NestJS message fields", () => {
    expect(
      extractApiErrorMessage({ message: BLOCKED_ACCOUNT_MESSAGE }),
    ).toBe(BLOCKED_ACCOUNT_MESSAGE);
    expect(
      extractApiErrorMessage({
        message: [BLOCKED_ACCOUNT_MESSAGE, "other"],
      }),
    ).toBe(BLOCKED_ACCOUNT_MESSAGE);
  });
});
