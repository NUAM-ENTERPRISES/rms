import { describe, expect, it } from "vitest";
import {
  canLogOperationsCall,
  canMarkOperationsJunk,
  canMoveToWeekOne,
  canMoveToWeekTwo,
  getOperationsCallAttempts,
  getOperationsFollowUpStage,
  OPERATIONS_FOLLOW_UP_STAGE,
  OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE,
} from "../operations-follow-up.util";

describe("operations-follow-up.util", () => {
  it("defaults missing stage to initial", () => {
    expect(getOperationsFollowUpStage(undefined)).toBe(
      OPERATIONS_FOLLOW_UP_STAGE.INITIAL,
    );
  });

  it("allows logging calls only in initial stage", () => {
    expect(canLogOperationsCall(OPERATIONS_FOLLOW_UP_STAGE.INITIAL)).toBe(true);
    expect(canLogOperationsCall(OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE)).toBe(false);
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

  it("allows move to week two only from week one", () => {
    expect(canMoveToWeekTwo(OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE)).toBe(true);
    expect(canMoveToWeekTwo(OPERATIONS_FOLLOW_UP_STAGE.INITIAL)).toBe(false);
  });

  it("allows mark junk only from week two", () => {
    expect(canMarkOperationsJunk(OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO)).toBe(true);
    expect(canMarkOperationsJunk(OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE)).toBe(false);
  });

  it("reads call attempts from assignment", () => {
    expect(getOperationsCallAttempts({ operationsCallAttempts: 2 })).toBe(2);
    expect(getOperationsCallAttempts(undefined)).toBe(0);
  });
});
