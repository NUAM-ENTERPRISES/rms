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
  recruiter?: { id?: string; name?: string };
  recruiterId?: string;
  isActive?: boolean;
};

export function getPrimaryRecruiterName(
  assignments?: OperationsFollowUpAssignment[],
): string {
  const primary = assignments?.find(
    (assignment) =>
      assignment.isActive !== false &&
      assignment.assignmentType != null &&
      !OPERATIONS_HANDLER_ASSIGNMENT_TYPES.includes(
        assignment.assignmentType as (typeof OPERATIONS_HANDLER_ASSIGNMENT_TYPES)[number],
      ),
  );

  return primary?.recruiter?.name || "Unassigned";
}

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

export function canOpenOperationsCallModal(
  _stage: OperationsFollowUpStage,
): boolean {
  return true;
}

/** Whether a no-answer call can be logged (excludes initial 3/3 waiting period). */
export function canLogNoAnswerOperationsCall(
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

export function canLogOperationsCall(
  stage: OperationsFollowUpStage,
  attempts: number,
): boolean {
  return canLogNoAnswerOperationsCall(stage, attempts);
}

export function isPrematureWeekOneAssignment(
  assignment?: OperationsFollowUpAssignment,
): boolean {
  const stage = getOperationsFollowUpStage(assignment);
  if (stage !== OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE) {
    return false;
  }
  const attempts = assignment?.operationsCallAttempts ?? 0;
  if (attempts > 0) {
    return false;
  }
  const lastCallAt = assignment?.operationsLastCallAt;
  const enteredAt = assignment?.operationsStageEnteredAt;
  if (!lastCallAt || !enteredAt) {
    return false;
  }
  const gapMs =
    new Date(enteredAt).getTime() - new Date(lastCallAt).getTime();
  return gapMs < OPERATIONS_WEEK_ONE_WAIT_MS;
}

export function isEligibleForWeekOneDashboardBucket(
  assignment?: OperationsFollowUpAssignment,
): boolean {
  const stage = getOperationsFollowUpStage(assignment);
  if (stage !== OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE) {
    return false;
  }
  return !isPrematureWeekOneAssignment(assignment);
}

export function isAssignedUntouchedDashboardBucket(
  assignment?: OperationsFollowUpAssignment,
): boolean {
  const stage = getOperationsFollowUpStage(assignment);
  if (stage === OPERATIONS_FOLLOW_UP_STAGE.INITIAL) {
    return true;
  }
  return isPrematureWeekOneAssignment(assignment);
}

export function getDashboardOperationsFollowUpStage(
  assignment?: OperationsFollowUpAssignment,
): OperationsFollowUpStage {
  if (isPrematureWeekOneAssignment(assignment)) {
    return OPERATIONS_FOLLOW_UP_STAGE.INITIAL;
  }
  return getOperationsFollowUpStage(assignment);
}

export function getDashboardOperationsCallAttempts(
  assignment?: OperationsFollowUpAssignment,
): number {
  if (isPrematureWeekOneAssignment(assignment)) {
    return OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE;
  }
  return getOperationsCallAttempts(assignment);
}

export function isWaitingToAdvanceToWeekOne(
  stage: OperationsFollowUpStage,
  attempts: number,
  stageEnteredAt?: string | null,
  nowMs = Date.now(),
): boolean {
  return (
    stage === OPERATIONS_FOLLOW_UP_STAGE.INITIAL &&
    attempts >= OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE &&
    Boolean(stageEnteredAt) &&
    !hasOperationsStageWaitElapsed(
      stageEnteredAt,
      OPERATIONS_WEEK_ONE_WAIT_MS,
      nowMs,
    )
  );
}

export function isWaitingBeforeWeekOneBucket(
  assignment?: OperationsFollowUpAssignment,
  nowMs = Date.now(),
): boolean {
  if (isPrematureWeekOneAssignment(assignment)) {
    return true;
  }
  const stage = getOperationsFollowUpStage(assignment);
  const attempts = getOperationsCallAttempts(assignment);
  return isWaitingToAdvanceToWeekOne(
    stage,
    attempts,
    assignment?.operationsStageEnteredAt,
    nowMs,
  );
}

export function getOperationsCallPillClassName(
  stage: OperationsFollowUpStage,
  displayedCallAttempts: number,
): string {
  if (stage === OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (stage === OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  if (displayedCallAttempts > 0) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-blue-200 bg-blue-50 text-blue-700";
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

export function getOperationsWeekOneFollowUpAt(
  stageEnteredAt?: string | null,
): Date | null {
  if (!stageEnteredAt) {
    return null;
  }
  return new Date(
    new Date(stageEnteredAt).getTime() + OPERATIONS_WEEK_ONE_WAIT_MS,
  );
}

export function formatOperationsWeekOneFollowUpAt(
  stageEnteredAt?: string | null,
): string | null {
  const followUpAt = getOperationsWeekOneFollowUpAt(stageEnteredAt);
  if (!followUpAt) {
    return null;
  }
  return followUpAt.toLocaleDateString("en-GB", {
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
