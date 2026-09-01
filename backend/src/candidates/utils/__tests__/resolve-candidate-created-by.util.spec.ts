import { resolveCandidateCreatedBy } from '../resolve-candidate-created-by.util';

describe('resolveCandidateCreatedBy', () => {
  it('prefers candidate.createdByUser even when unassigned', () => {
    const createdBy = resolveCandidateCreatedBy({
      recordCreatedByUser: { id: 'admin1', name: 'Sys Admin', email: 'admin@x.com' },
      recruiterAssignments: [],
      statusHistories: [],
    });
    expect(createdBy).toEqual({
      id: 'admin1',
      name: 'Sys Admin',
      email: 'admin@x.com',
    });
  });

  it('prefers first assignment createdByUser', () => {
    const createdBy = resolveCandidateCreatedBy({
      recruiterAssignments: [
        {
          createdByUser: { id: 'u1', name: 'Mike Manager', email: 'm@x.com' },
          assignedByUser: { id: 'u2', name: 'Other', email: 'o@x.com' },
        },
      ],
    });
    expect(createdBy?.name).toBe('Mike Manager');
  });

  it('uses earliest status history when there is no assignment', () => {
    const createdBy = resolveCandidateCreatedBy({
      recruiterAssignments: [],
      statusHistories: [
        {
          statusUpdatedAt: '2026-09-01T12:00:00.000Z',
          changedByName: 'Later',
          changedBy: { id: 'u9', name: 'Later', email: 'l@x.com' },
        },
        {
          statusUpdatedAt: '2026-09-01T11:04:16.076Z',
          changedById: 'admin1',
          changedByName: 'Sys Admin',
          changedBy: { id: 'admin1', name: 'Sys Admin', email: 'admin@x.com' },
        },
      ],
    });
    expect(createdBy).toEqual({
      id: 'admin1',
      name: 'Sys Admin',
      email: 'admin@x.com',
    });
  });

  it('returns null when creator cannot be resolved', () => {
    expect(resolveCandidateCreatedBy({ recruiterAssignments: [], statusHistories: [] })).toBeNull();
  });
});
