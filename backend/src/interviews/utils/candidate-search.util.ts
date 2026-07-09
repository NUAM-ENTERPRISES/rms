type InsensitiveContains = {
  contains: string;
  mode: 'insensitive';
};

function insensitiveContains(value: string): InsensitiveContains {
  return { contains: value, mode: 'insensitive' };
}

function interviewCandidateField(
  field: string,
  value: string,
): Record<string, unknown> {
  return {
    candidateProjectMap: {
      candidate: {
        [field]: insensitiveContains(value),
      },
    },
  };
}

/**
 * Prisma OR conditions for interview list search (findAll).
 * Supports multi-word candidate names such as "Abhi Stewart".
 */
export function buildInterviewListSearchOrConditions(
  search: string,
): Array<Record<string, unknown>> {
  const trimmed = search.trim();
  if (!trimmed) return [];

  const tokens = trimmed.split(/\s+/).filter(Boolean);

  const conditions: Array<Record<string, unknown>> = [
    interviewCandidateField('firstName', trimmed),
    interviewCandidateField('lastName', trimmed),
    interviewCandidateField('candidateCode', trimmed),
    interviewCandidateField('email', trimmed),
    {
      candidateProjectMap: {
        project: {
          title: insensitiveContains(trimmed),
        },
      },
    },
  ];

  if (tokens.length > 1) {
    conditions.unshift({
      AND: tokens.map((token) => ({
        OR: [
          interviewCandidateField('firstName', token),
          interviewCandidateField('lastName', token),
        ],
      })),
    });
  }

  return conditions;
}
