/**
 * Candidate related constants
 */

export const FACILITY_TYPES = [
  "general_hospital",
  "multi_specialty_hospital",
  "specialty_hospital",
  "clinic",
  "home_care",
  "nursing_home",
  "rehabilitation_center",
  "long_term_care_facility",
  "dialysis_center",
  "mental_health_facility"
] as const;

export const SECTOR_TYPES = {
  PRIVATE: "private",
  GOVERNMENT: "government",
  NO_PREFERENCE: "no_preference",
} as const;

export const VISA_TYPES = {
  EMPLOYMENT: "employment",
  WORK: "work",
  RESIDENCE: "residence",
  VISIT: "visit",
  FAMILY: "family",
  DEPENDENT: "dependent",
  TRANSFERABLE: "transferable",
  NON_TRANSFERABLE: "non_transferable",
  NOT_APPLICABLE: "not_applicable",
} as const;

export const LICENSING_EXAMS = {
  PROMETRIC: "prometric",
  DHA: "dha",
  HAAD: "haad",
  MOH: "moh",
  SCFHS: "scfhs",
  QCHP: "qchp",
  OMSB: "omsb",
  NHRA: "nhra",
  NMC_UK: "nmc_uk",
  CBT: "cbt",
  OET: "oet",
  IELTS: "ielts",
  USMLE: "usmle",
  NCLEX_RN: "nclex_rn",
} as const;

// Values used in dropdowns for candidate profile
export const SKIN_TONES = [
  "Fair",
  "Wheatish",
  "Medium",
  "Olive",
  "Brown",
  "Dark",
] as const;

export const SMARTNESS_LEVELS = [
  "Excellent",
  "Good",
  "Average",
  "Below Average",
] as const;
