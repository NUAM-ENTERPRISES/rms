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
  "mental_health_facility",
  "any_type"
] as const;

export const SECTOR_TYPES = {
  ANY_PREFERENCE: "any_preference",
  PRIVATE: "private",
  GOVERNMENT: "government",
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

export const CANDIDATE_SOURCES = [
  { id: 'manual', value: 'manual', label: 'Manual' },
  { id: 'meta', value: 'meta', label: 'Meta' },
  { id: 'agent', value: 'agent', label: 'Agent' },
  { id: 'referral', value: 'referral', label: 'Referral' },
  { id: 'direct_enquiry', value: 'direct_enquiry', label: 'Direct Enquiry' },
  { id: 'hospital_visit', value: 'hospital_visit', label: 'Hospital Visit' },
  { id: 'paid_ads', value: 'paid_ads', label: 'Paid Ads' },
  { id: 'expo_event', value: 'expo_event', label: 'Expo/Event' },
  { id: 'job_board', value: 'job_board', label: 'Job Board' },
  { id: 'social_media', value: 'social_media', label: 'Social Media' },
  { id: 'direct_application', value: 'direct_application', label: 'Direct Application' },
  { id: 'internal', value: 'internal', label: 'Internal' }
] as const;

export const COMMON_SKILLS = [
  "Communication",
  "Teamwork",
  "Problem Solving",
  "Customer Service",
  "Leadership",
  "Time Management",
  "Adaptability",
  "Attention to Detail",
  "Critical Thinking",
  "Conflict Resolution",
] as const;