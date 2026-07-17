/** GCC country codes — aligned with recruiter capabilities form and employment timeline. */
export const GCC_COUNTRY_CODES = [
  'SA',
  'AE',
  'QA',
  'OM',
  'BH',
  'KW',
] as const;

export type GccCountryCode = (typeof GCC_COUNTRY_CODES)[number];
