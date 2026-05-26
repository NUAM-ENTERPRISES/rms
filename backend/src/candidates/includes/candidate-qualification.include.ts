export const candidateQualificationCountryInclude = {
  country: {
    select: {
      code: true,
      name: true,
    },
  },
} as const;

export const candidateQualificationReadInclude = {
  candidate: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  qualification: {
    select: {
      id: true,
      name: true,
      shortName: true,
      level: true,
      field: true,
    },
  },
  ...candidateQualificationCountryInclude,
} as const;
