type CreatedByUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
} | null | undefined;

export function getCandidateCreatedByDisplay(
  candidate: {
    createdBy?: CreatedByUser;
    createdByUser?: CreatedByUser;
  },
  activeAssignment?: {
    createdByUser?: CreatedByUser;
    assignedByUser?: CreatedByUser;
  } | null,
): CreatedByUser {
  const createdBy =
    candidate.createdBy ||
    candidate.createdByUser ||
    activeAssignment?.createdByUser ||
    activeAssignment?.assignedByUser ||
    null;

  if (!createdBy?.name) {
    return null;
  }

  return createdBy;
}
