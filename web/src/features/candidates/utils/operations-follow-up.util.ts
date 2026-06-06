export const OPERATIONS_FOLLOW_UP_STAGE = {
  INITIAL: "initial",
  WEEK_ONE: "week_one",
  WEEK_TWO: "week_two",
  JUNK: "junk",
} as const;

export type OperationsFollowUpStage =
  (typeof OPERATIONS_FOLLOW_UP_STAGE)[keyof typeof OPERATIONS_FOLLOW_UP_STAGE];

export const OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE = 3;

export type OperationsFollowUpAssignment = {
  operationsFollowUpStage?: string | null;
  operationsCallAttempts?: number | null;
  operationsLastCallAt?: string | null;
  operationsStageEnteredAt?: string | null;
  recruiter?: { id?: string };
  isActive?: boolean;
};

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

export function canLogOperationsCall(stage: OperationsFollowUpStage): boolean {
  return stage === OPERATIONS_FOLLOW_UP_STAGE.INITIAL;
}

export function canMoveToWeekOne(
  stage: OperationsFollowUpStage,
  attempts: number,
): boolean {
  return (
    stage === OPERATIONS_FOLLOW_UP_STAGE.INITIAL &&
    attempts >= OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE
  );
}

export function canMoveToWeekTwo(stage: OperationsFollowUpStage): boolean {
  return stage === OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE;
}

export function canMarkOperationsJunk(stage: OperationsFollowUpStage): boolean {
  return stage === OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO;
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
