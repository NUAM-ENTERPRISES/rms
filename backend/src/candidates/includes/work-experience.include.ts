export const workExperienceCountryInclude = {
  country: {
    select: {
      code: true,
      name: true,
    },
  },
} as const;

export const workExperienceReadInclude = {
  candidate: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  roleCatalog: {
    select: {
      id: true,
      name: true,
      label: true,
      shortName: true,
    },
  },
  ...workExperienceCountryInclude,
} as const;
