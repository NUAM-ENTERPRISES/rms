export const CANDIDATE_CREATED_BY_USER_SELECT = {
  id: true,
  name: true,
  email: true,
} as const;

export const STATUS_HISTORY_WITH_CREATOR_SELECT = {
  statusId: true,
  statusNameSnapshot: true,
  reason: true,
  statusUpdatedAt: true,
  changedById: true,
  changedByName: true,
  changedBy: { select: CANDIDATE_CREATED_BY_USER_SELECT },
  status: { select: { id: true, statusName: true } },
} as const;

export type CandidateCreatedByUser = {
  id: string;
  name: string;
  email?: string | null;
};

type AssignmentWithCreator = {
  isActive?: boolean;
  createdByUser?: CandidateCreatedByUser | null;
  assignedByUser?: CandidateCreatedByUser | null;
};

type StatusHistoryWithCreator = {
  statusUpdatedAt?: Date | string;
  changedById?: string | null;
  changedByName?: string | null;
  changedBy?: CandidateCreatedByUser | null;
};

export function resolveCandidateCreatedBy(input: {
  recordCreatedByUser?: CandidateCreatedByUser | null;
  recruiterAssignments?: AssignmentWithCreator[] | null;
  statusHistories?: StatusHistoryWithCreator[] | null;
}): CandidateCreatedByUser | null {
  if (input.recordCreatedByUser?.name) {
    return input.recordCreatedByUser;
  }

  const assignments = input.recruiterAssignments ?? [];
  const firstAssignment = assignments[0];
  const activeAssignment = assignments.find((assignment) => assignment.isActive);

  const fromAssignment =
    firstAssignment?.createdByUser ||
    firstAssignment?.assignedByUser ||
    activeAssignment?.createdByUser ||
    activeAssignment?.assignedByUser ||
    null;

  if (fromAssignment) {
    return fromAssignment;
  }

  const histories = [...(input.statusHistories ?? [])].sort((a, b) => {
    const left = new Date(a.statusUpdatedAt ?? 0).getTime();
    const right = new Date(b.statusUpdatedAt ?? 0).getTime();
    return left - right;
  });
  const initial = histories[0];
  if (initial?.changedBy) {
    return initial.changedBy;
  }
  if (initial?.changedByName) {
    return {
      id: initial.changedById ?? '',
      name: initial.changedByName,
      email: null,
    };
  }
  return null;
}
