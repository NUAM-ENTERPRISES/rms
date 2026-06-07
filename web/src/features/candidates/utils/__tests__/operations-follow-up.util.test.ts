import { describe, expect, it } from "vitest";
import {
  canLogOperationsCall,
  canMarkOperationsJunk,
  canMoveToWeekOne,
  canMoveToWeekTwo,
  formatOperationsWaitRemaining,
  getDisplayedOperationsCallAttempts,
  getOperationsCallAttempts,
  getOperationsFollowUpStage,
  getOperationsHandlerAssignment,
  getOperationsStageWaitRemainingMs,
  hasOperationsStageWaitElapsed,
  isWaitingToMarkOperationsJunk,
  isWaitingToMoveToWeekTwo,
  OPERATIONS_FOLLOW_UP_STAGE,
  OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE,
  OPERATIONS_WEEK_ONE_WAIT_MS,
  OPERATIONS_WEEK_TWO_WAIT_MS,
} from "../operations-follow-up.util";

describe("operations-follow-up.util", () => {
  const nowMs = Date.parse("2026-06-06T12:00:00.000Z");
  const twoMinutesAgo = new Date(nowMs - OPERATIONS_WEEK_ONE_WAIT_MS).toISOString();
  const thirtySecondsAgo = new Date(nowMs - 30_000).toISOString();

  it("defaults missing stage to initial", () => {
    expect(getOperationsFollowUpStage(undefined)).toBe(
      OPERATIONS_FOLLOW_UP_STAGE.INITIAL,
    );
  });

  it("allows logging calls only before required attempts", () => {
    expect(canLogOperationsCall(OPERATIONS_FOLLOW_UP_STAGE.INITIAL, 0)).toBe(true);
    expect(canLogOperationsCall(OPERATIONS_FOLLOW_UP_STAGE.INITIAL, 2)).toBe(true);
    expect(canLogOperationsCall(OPERATIONS_FOLLOW_UP_STAGE.INITIAL, 3)).toBe(false);
    expect(canLogOperationsCall(OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE, 0)).toBe(false);
  });

  it("caps displayed call attempts at the required maximum", () => {
    expect(getDisplayedOperationsCallAttempts(4)).toBe(3);
    expect(getDisplayedOperationsCallAttempts(2)).toBe(2);
  });

  it("allows move to week one only after required attempts", () => {
    expect(
      canMoveToWeekOne(
        OPERATIONS_FOLLOW_UP_STAGE.INITIAL,
        OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE - 1,
      ),
    ).toBe(false);
    expect(
      canMoveToWeekOne(
        OPERATIONS_FOLLOW_UP_STAGE.INITIAL,
        OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE,
      ),
    ).toBe(true);
  });

  it("requires 2-minute wait before move to week two", () => {
    expect(
      canMoveToWeekTwo(
        OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
        thirtySecondsAgo,
        nowMs,
      ),
    ).toBe(false);
    expect(
      isWaitingToMoveToWeekTwo(
        OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
        thirtySecondsAgo,
        nowMs,
      ),
    ).toBe(true);
    expect(
      canMoveToWeekTwo(
        OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
        twoMinutesAgo,
        nowMs,
      ),
    ).toBe(true);
    expect(canMoveToWeekTwo(OPERATIONS_FOLLOW_UP_STAGE.INITIAL, twoMinutesAgo, nowMs)).toBe(
      false,
    );
  });

  it("requires 2-minute wait before mark junk", () => {
    expect(
      canMarkOperationsJunk(
        OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO,
        thirtySecondsAgo,
        nowMs,
      ),
    ).toBe(false);
    expect(
      isWaitingToMarkOperationsJunk(
        OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO,
        thirtySecondsAgo,
        nowMs,
      ),
    ).toBe(true);
    expect(
      canMarkOperationsJunk(
        OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO,
        twoMinutesAgo,
        nowMs,
      ),
    ).toBe(true);
  });

  it("formats remaining wait time", () => {
    expect(formatOperationsWaitRemaining(90_000)).toBe("1:30");
    expect(formatOperationsWaitRemaining(0)).toBe("0:00");
  });

  it("computes remaining wait ms", () => {
    expect(
      getOperationsStageWaitRemainingMs(twoMinutesAgo, OPERATIONS_WEEK_TWO_WAIT_MS, nowMs),
    ).toBe(0);
    expect(hasOperationsStageWaitElapsed(twoMinutesAgo, OPERATIONS_WEEK_ONE_WAIT_MS, nowMs)).toBe(
      true,
    );
  });

  it("reads call attempts from assignment", () => {
    expect(getOperationsCallAttempts({ operationsCallAttempts: 2 })).toBe(2);
    expect(getOperationsCallAttempts(undefined)).toBe(0);
  });

  it("resolves operations handler assignment by type and user", () => {
    const assignments = [
      {
        isActive: true,
        assignmentType: "recruiter",
        recruiterId: "rec-1",
        recruiter: { id: "rec-1" },
      },
      {
        isActive: true,
        assignmentType: "cre_auto",
        recruiterId: "ops-1",
        recruiter: { id: "ops-1" },
        operationsCallAttempts: 1,
      },
    ];

    expect(getOperationsHandlerAssignment(assignments)).toMatchObject({
      recruiterId: "ops-1",
      operationsCallAttempts: 1,
    });
    expect(getOperationsHandlerAssignment(assignments, "ops-1")).toMatchObject({
      recruiterId: "ops-1",
    });
    expect(getOperationsHandlerAssignment(assignments, "ops-2")).toMatchObject({
      recruiterId: "ops-1",
    });
    expect(getOperationsHandlerAssignment([])).toBeUndefined();
  });
});
