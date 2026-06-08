export const OPERATIONS_FOLLOW_UP_STAGE = {
  INITIAL: "initial",
  WEEK_ONE: "week_one",
  WEEK_TWO: "week_two",
  JUNK: "junk",
} as const;

export type OperationsFollowUpStage =
  (typeof OPERATIONS_FOLLOW_UP_STAGE)[keyof typeof OPERATIONS_FOLLOW_UP_STAGE];

export const OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE = 3;

const OPERATIONS_SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const OPERATIONS_TEST_TWO_MIN_MS = 2 * 60 * 1000;

const useOperationsFollowUpTestTimers =
  import.meta.env.VITE_OPERATIONS_FOLLOW_UP_TEST_TIMERS === "true";

/** 7 days in production; 2 minutes when VITE_OPERATIONS_FOLLOW_UP_TEST_TIMERS=true */
export const OPERATIONS_WEEK_ONE_WAIT_MS = useOperationsFollowUpTestTimers
  ? OPERATIONS_TEST_TWO_MIN_MS
  : OPERATIONS_SEVEN_DAYS_MS;

/** 7 days in production; 2 minutes when VITE_OPERATIONS_FOLLOW_UP_TEST_TIMERS=true */
export const OPERATIONS_WEEK_TWO_WAIT_MS = useOperationsFollowUpTestTimers
  ? OPERATIONS_TEST_TWO_MIN_MS
  : OPERATIONS_SEVEN_DAYS_MS;

export const OPERATIONS_HANDLER_ASSIGNMENT_TYPES = [
  "cre_auto",
  "cre_manual",
] as const;

export type OperationsFollowUpAssignment = {
  assignmentType?: string | null;
  operationsFollowUpStage?: string | null;
  operationsCallAttempts?: number | null;
  operationsLastCallAt?: string | null;
  operationsStageEnteredAt?: string | null;
  recruiter?: { id?: string };
  recruiterId?: string;
  isActive?: boolean;
};

export function getOperationsHandlerAssignment(
  assignments: OperationsFollowUpAssignment[] | undefined,
  operationsUserId?: string,
): OperationsFollowUpAssignment | undefined {
  const handlerAssignments = assignments?.filter(
    (assignment) =>
      assignment.isActive !== false &&
      assignment.assignmentType != null &&
      OPERATIONS_HANDLER_ASSIGNMENT_TYPES.includes(
        assignment.assignmentType as (typeof OPERATIONS_HANDLER_ASSIGNMENT_TYPES)[number],
      ),
  );

  if (!handlerAssignments?.length) {
    return undefined;
  }

  if (operationsUserId) {
    const ownedAssignment = handlerAssignments.find(
      (assignment) =>
        assignment.recruiter?.id === operationsUserId ||
        assignment.recruiterId === operationsUserId,
    );
    if (ownedAssignment) {
      return ownedAssignment;
    }
  }

  return handlerAssignments[0];
}

export function getOperationsStageWaitRemainingMs(
  stageEnteredAt: Date | string | null | undefined,
  requiredWaitMs: number,
  nowMs = Date.now(),
): number {
  if (!stageEnteredAt) {
    return requiredWaitMs;
  }
  const enteredMs = new Date(stageEnteredAt).getTime();
  return Math.max(0, requiredWaitMs - (nowMs - enteredMs));
}

export function hasOperationsStageWaitElapsed(
  stageEnteredAt: Date | string | null | undefined,
  requiredWaitMs: number,
  nowMs = Date.now(),
): boolean {
  if (!stageEnteredAt) {
    return false;
  }
  return getOperationsStageWaitRemainingMs(stageEnteredAt, requiredWaitMs, nowMs) === 0;
}

export function formatOperationsWaitRemaining(remainingMs: number): string {
  if (remainingMs >= 24 * 60 * 60 * 1000) {
    const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  const totalSec = Math.ceil(remainingMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function getActiveOperationsAssignment(
  assignments: OperationsFollowUpAssignment[] | undefined,
  operationsUserId?: string,
): OperationsFollowUpAssignment | undefined {
  return assignments?.find(
    (assignment) =>
      assignment.isActive !== false &&
      (!operationsUserId || assignment.recruiter?.id === operationsUserId),
  );
}

export function getOperationsFollowUpStage(
  assignment?: OperationsFollowUpAssignment,
): OperationsFollowUpStage {
  const stage = assignment?.operationsFollowUpStage;
  if (
    stage === OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE ||
    stage === OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO ||
    stage === OPERATIONS_FOLLOW_UP_STAGE.JUNK
  ) {
    return stage;
  }
  return OPERATIONS_FOLLOW_UP_STAGE.INITIAL;
}

export function getOperationsCallAttempts(
  assignment?: OperationsFollowUpAssignment,
): number {
  return assignment?.operationsCallAttempts ?? 0;
}

export function canLogOperationsCall(
  stage: OperationsFollowUpStage,
  attempts: number,
): boolean {
  if (stage === OPERATIONS_FOLLOW_UP_STAGE.JUNK) {
    return false;
  }
  if (stage === OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE) {
    return true;
  }
  if (stage === OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO) {
    return true;
  }
  return (
    stage === OPERATIONS_FOLLOW_UP_STAGE.INITIAL &&
    attempts < OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE
  );
}

export function getDisplayedOperationsCallAttempts(
  attempts: number,
  stage: OperationsFollowUpStage = OPERATIONS_FOLLOW_UP_STAGE.INITIAL,
): number {
  if (stage === OPERATIONS_FOLLOW_UP_STAGE.INITIAL) {
    return Math.min(attempts, OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE);
  }
  return attempts;
}

export function formatOperationsCallCountLabel(
  attempts: number,
  stage: OperationsFollowUpStage,
): string {
  if (stage === OPERATIONS_FOLLOW_UP_STAGE.INITIAL) {
    const displayed = getDisplayedOperationsCallAttempts(attempts, stage);
    return `${displayed}/${OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE} calls`;
  }
  const count = getDisplayedOperationsCallAttempts(attempts, stage);
  return `${count} call${count === 1 ? "" : "s"}`;
}

export function canMoveToWeekOne(
  stage: OperationsFollowUpStage,
  attempts: number,
): boolean {
  return false;
}

export function canMoveToWeekTwo(
  stage: OperationsFollowUpStage,
  stageEnteredAt?: string | null,
  nowMs = Date.now(),
): boolean {
  return false;
}

export function isWaitingToMoveToWeekTwo(
  stage: OperationsFollowUpStage,
  stageEnteredAt?: string | null,
  nowMs = Date.now(),
): boolean {
  return (
    stage === OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE &&
    !hasOperationsStageWaitElapsed(
      stageEnteredAt,
      OPERATIONS_WEEK_ONE_WAIT_MS,
      nowMs,
    )
  );
}

export function canMarkOperationsJunk(
  stage: OperationsFollowUpStage,
  stageEnteredAt?: string | null,
  nowMs = Date.now(),
): boolean {
  return false;
}

export function isWaitingToMarkOperationsJunk(
  stage: OperationsFollowUpStage,
  stageEnteredAt?: string | null,
  nowMs = Date.now(),
): boolean {
  return (
    stage === OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO &&
    !hasOperationsStageWaitElapsed(
      stageEnteredAt,
      OPERATIONS_WEEK_TWO_WAIT_MS,
      nowMs,
    )
  );
}

export function formatOperationsStageEnteredAt(
  enteredAt?: string | null,
): string | null {
  if (!enteredAt) return null;
  return new Date(enteredAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getOperationsFollowUpStageLabel(
  stage: OperationsFollowUpStage,
): string {
  switch (stage) {
    case OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE:
      return "1 Week follow-up";
    case OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO:
      return "2 Week follow-up";
    case OPERATIONS_FOLLOW_UP_STAGE.JUNK:
      return "Junk";
    default:
      return "Initial follow-up";
  }
}
