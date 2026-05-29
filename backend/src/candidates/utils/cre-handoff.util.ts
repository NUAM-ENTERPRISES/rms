import { CRE_REASSIGN_RECRUITER_RETURN_REASON } from '../../common/constants/candidate-constants';

export type CreHandoffStatusHistoryEntry = {
  statusId: number;
  statusNameSnapshot: string;
  reason: string | null;
  statusUpdatedAt: Date;
  status?: { id: number; statusName: string };
};

export type CreReassignedAssignmentHandoff = {
  creStatus?: { id: number; statusName: string } | null;
  creStatusId?: number | null;
  creStatusNote?: string | null;
};

export function resolveCreHandoffStatus(
  reassignedAssignment: CreReassignedAssignmentHandoff | undefined,
  statusHistories: CreHandoffStatusHistoryEntry[],
): { id: number; statusName: string } | null {
  if (reassignedAssignment?.creStatus) {
    return reassignedAssignment.creStatus;
  }

  const handoffHistory = statusHistories.find(
    (entry) =>
      entry.reason?.trim() &&
      !entry.reason.startsWith(CRE_REASSIGN_RECRUITER_RETURN_REASON),
  );

  if (handoffHistory) {
    return (
      handoffHistory.status ?? {
        id: handoffHistory.statusId,
        statusName: handoffHistory.statusNameSnapshot,
      }
    );
  }

  return null;
}

export function resolveCreHandoffNote(
  reassignedAssignment: CreReassignedAssignmentHandoff | undefined,
  statusHistories: Array<{ reason: string | null; statusUpdatedAt: Date }>,
): string | null {
  const fromAssignment = reassignedAssignment?.creStatusNote?.trim();
  if (fromAssignment) {
    return fromAssignment;
  }

  const handoffHistory = statusHistories.find(
    (entry) =>
      entry.reason?.trim() &&
      !entry.reason.startsWith(CRE_REASSIGN_RECRUITER_RETURN_REASON),
  );

  return handoffHistory?.reason?.trim() ?? null;
}
