import { ORIGINAL_DOCUMENT_CHECKLIST } from "../constants";

/** Matches the original-document chip palette (one distinct color per checklist doc type). */
const DOCUMENT_TYPE_STYLES: Record<
  string,
  { row: string; chip: string; label: string }
> = {
  passport_original: {
    row: "border-emerald-200/80 bg-emerald-50/40",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800",
    label: "text-emerald-900",
  },
  degree_certificate_original: {
    row: "border-blue-200/80 bg-blue-50/40",
    chip: "border-blue-200 bg-blue-50 text-blue-800",
    label: "text-blue-900",
  },
  registration_certificate_original: {
    row: "border-fuchsia-200/80 bg-fuchsia-50/40",
    chip: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
    label: "text-fuchsia-900",
  },
  experience_certificate_original: {
    row: "border-orange-200/80 bg-orange-50/40",
    chip: "border-orange-200 bg-orange-50 text-orange-800",
    label: "text-orange-900",
  },
  sslc_certificate_original: {
    row: "border-indigo-200/80 bg-indigo-50/40",
    chip: "border-indigo-200 bg-indigo-50 text-indigo-800",
    label: "text-indigo-900",
  },
  plus_two_certificate_original: {
    row: "border-rose-200/80 bg-rose-50/40",
    chip: "border-rose-200 bg-rose-50 text-rose-800",
    label: "text-rose-900",
  },
  transcript_original: {
    row: "border-cyan-200/80 bg-cyan-50/40",
    chip: "border-cyan-200 bg-cyan-50 text-cyan-800",
    label: "text-cyan-900",
  },
  pcc_original: {
    row: "border-violet-200/80 bg-violet-50/40",
    chip: "border-violet-200 bg-violet-50 text-violet-800",
    label: "text-violet-900",
  },
};

const FALLBACK_PALETTE = [
  {
    row: "border-teal-200/80 bg-teal-50/40",
    chip: "border-teal-200 bg-teal-50 text-teal-800",
    label: "text-teal-900",
  },
  {
    row: "border-amber-200/80 bg-amber-50/40",
    chip: "border-amber-200 bg-amber-50 text-amber-800",
    label: "text-amber-900",
  },
] as const;

const CHECKLIST_INDEX = new Map(
  ORIGINAL_DOCUMENT_CHECKLIST.map((docType, index) => [docType, index]),
);

export function getDocumentChecklistStyles(docType: string) {
  if (DOCUMENT_TYPE_STYLES[docType]) {
    return DOCUMENT_TYPE_STYLES[docType];
  }

  const index = CHECKLIST_INDEX.get(docType as (typeof ORIGINAL_DOCUMENT_CHECKLIST)[number]);
  if (index !== undefined) {
    const keys = Object.keys(DOCUMENT_TYPE_STYLES);
    return DOCUMENT_TYPE_STYLES[keys[index]] ?? FALLBACK_PALETTE[0];
  }

  const hash = docType
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

export function getDocumentChecklistChipClasses(docType: string): string {
  return getDocumentChecklistStyles(docType).chip;
}
