import { buildInterviewListSearchOrConditions } from '../candidate-search.util';

describe('buildInterviewListSearchOrConditions', () => {
  it('matches single-token search against individual fields', () => {
    const conditions = buildInterviewListSearchOrConditions('Abhi');

    expect(conditions).toEqual(
      expect.arrayContaining([
        {
          candidateProjectMap: {
            candidate: {
              firstName: { contains: 'Abhi', mode: 'insensitive' },
            },
          },
        },
      ]),
    );
    expect(conditions.some((condition) => 'AND' in condition)).toBe(false);
  });

  it('matches multi-word names by requiring each token on first or last name', () => {
    const conditions = buildInterviewListSearchOrConditions('Abhi Stewart');

    expect(conditions[0]).toEqual({
      AND: [
        {
          OR: [
            {
              candidateProjectMap: {
                candidate: {
                  firstName: { contains: 'Abhi', mode: 'insensitive' },
                },
              },
            },
            {
              candidateProjectMap: {
                candidate: {
                  lastName: { contains: 'Abhi', mode: 'insensitive' },
                },
              },
            },
          ],
        },
        {
          OR: [
            {
              candidateProjectMap: {
                candidate: {
                  firstName: { contains: 'Stewart', mode: 'insensitive' },
                },
              },
            },
            {
              candidateProjectMap: {
                candidate: {
                  lastName: { contains: 'Stewart', mode: 'insensitive' },
                },
              },
            },
          ],
        },
      ],
    });
  });
});
