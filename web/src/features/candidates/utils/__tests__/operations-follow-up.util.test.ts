import { describe, expect, it } from "vitest";
import {
  canLogNoAnswerOperationsCall,
  canLogOperationsCall,
  canMarkOperationsJunk,
  canMoveToWeekOne,
  canMoveToWeekTwo,
  canOpenOperationsCallModal,
  formatOperationsCallCountLabel,
  formatOperationsWeekOneFollowUpAt,
  formatOperationsWaitRemaining,
  getDisplayedOperationsCallAttempts,
  getOperationsCallAttempts,
  getOperationsFollowUpStage,
  getOperationsHandlerAssignment,
  getOperationsStageWaitRemainingMs,
  hasOperationsStageWaitElapsed,
  isEligibleForWeekOneDashboardBucket,
  isPrematureWeekOneAssignment,
  isWaitingBeforeWeekOneBucket,
  isWaitingToAdvanceToWeekOne,
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

  it("allows opening call modal except junk", () => {
    expect(canOpenOperationsCallModal(OPERATIONS_FOLLOW_UP_STAGE.INITIAL)).toBe(true);
    expect(canOpenOperationsCallModal(OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE)).toBe(true);
    expect(canOpenOperationsCallModal(OPERATIONS_FOLLOW_UP_STAGE.JUNK)).toBe(true);
  });

  it("allows no-answer logging in initial (before 3), week_one, and week_two", () => {
    expect(canLogNoAnswerOperationsCall(OPERATIONS_FOLLOW_UP_STAGE.INITIAL, 0)).toBe(true);
    expect(canLogNoAnswerOperationsCall(OPERATIONS_FOLLOW_UP_STAGE.INITIAL, 2)).toBe(true);
    expect(canLogNoAnswerOperationsCall(OPERATIONS_FOLLOW_UP_STAGE.INITIAL, 3)).toBe(false);
    expect(canLogOperationsCall(OPERATIONS_FOLLOW_UP_STAGE.INITIAL, 3)).toBe(false);
    expect(canLogNoAnswerOperationsCall(OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE, 0)).toBe(true);
    expect(canLogNoAnswerOperationsCall(OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO, 5)).toBe(true);
    expect(canLogNoAnswerOperationsCall(OPERATIONS_FOLLOW_UP_STAGE.JUNK, 0)).toBe(false);
  });

  it("detects premature week_one assignments still in untouched bucket", () => {
    expect(
      isPrematureWeekOneAssignment({
        operationsFollowUpStage: "week_one",
        operationsCallAttempts: 0,
        operationsLastCallAt: thirtySecondsAgo,
        operationsStageEnteredAt: thirtySecondsAgo,
      }),
    ).toBe(true);
    expect(
      isEligibleForWeekOneDashboardBucket({
        operationsFollowUpStage: "week_one",
        operationsCallAttempts: 0,
        operationsLastCallAt: thirtySecondsAgo,
        operationsStageEnteredAt: thirtySecondsAgo,
      }),
    ).toBe(false);
    expect(
      isEligibleForWeekOneDashboardBucket({
        operationsFollowUpStage: "week_one",
        operationsCallAttempts: 1,
        operationsLastCallAt: thirtySecondsAgo,
        operationsStageEnteredAt: twoMinutesAgo,
      }),
    ).toBe(true);
  });

  it("tracks initial 3/3 wait before week_one bucket", () => {
    expect(
      isWaitingToAdvanceToWeekOne(
        OPERATIONS_FOLLOW_UP_STAGE.INITIAL,
        OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE,
        thirtySecondsAgo,
        nowMs,
      ),
    ).toBe(true);
    expect(
      isWaitingToAdvanceToWeekOne(
        OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
        OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE,
        thirtySecondsAgo,
        nowMs,
      ),
    ).toBe(false);
    expect(
      isWaitingBeforeWeekOneBucket(
        {
          operationsFollowUpStage: "initial",
          operationsCallAttempts: 3,
          operationsStageEnteredAt: thirtySecondsAgo,
        },
        nowMs,
      ),
    ).toBe(true);
  });

  it("caps displayed call attempts only in initial stage", () => {
    expect(getDisplayedOperationsCallAttempts(4, OPERATIONS_FOLLOW_UP_STAGE.INITIAL)).toBe(3);
    expect(getDisplayedOperationsCallAttempts(4, OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE)).toBe(4);
  });

  it("formats call count labels by stage", () => {
    expect(
      formatOperationsCallCountLabel(2, OPERATIONS_FOLLOW_UP_STAGE.INITIAL),
    ).toBe("2/3 calls");
    expect(
      formatOperationsCallCountLabel(4, OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE),
    ).toBe("4 calls");
  });

  it("disables manual move buttons in automated flow", () => {
    expect(
      canMoveToWeekOne(
        OPERATIONS_FOLLOW_UP_STAGE.INITIAL,
        OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE,
      ),
    ).toBe(false);
    expect(
      canMoveToWeekTwo(
        OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
        twoMinutesAgo,
        nowMs,
      ),
    ).toBe(false);
    expect(
      canMarkOperationsJunk(
        OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO,
        twoMinutesAgo,
        nowMs,
      ),
    ).toBe(false);
  });

  it("tracks automatic wait windows for week stages", () => {
    expect(
      isWaitingToMoveToWeekTwo(
        OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
        thirtySecondsAgo,
        nowMs,
      ),
    ).toBe(true);
    expect(
      isWaitingToMarkOperationsJunk(
        OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO,
        thirtySecondsAgo,
        nowMs,
      ),
    ).toBe(true);
  });

  it("formats 1-week follow-up target date", () => {
    expect(
      formatOperationsWeekOneFollowUpAt("2026-06-01T00:00:00.000Z"),
    ).toMatch(/Jun 2026/);
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
