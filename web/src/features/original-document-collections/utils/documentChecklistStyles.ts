import { cn } from "@/lib/utils";

/** Colorful pill styles per original-document checklist item (matches locker UI). */
const ORIGINAL_DOCUMENT_CHECKLIST_COLORS: Record<
  string,
  { received: string; pending: string }
> = {
  passport_original: {
    received: "border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm shadow-emerald-100",
    pending: "border-emerald-200/70 bg-emerald-50/40 text-emerald-800/70",
  },
  degree_certificate_original: {
    received: "border-blue-300 bg-blue-50 text-blue-900 shadow-sm shadow-blue-100",
    pending: "border-blue-200/70 bg-blue-50/40 text-blue-800/70",
  },
  registration_certificate_original: {
    received:
      "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-900 shadow-sm shadow-fuchsia-100",
    pending: "border-fuchsia-200/70 bg-fuchsia-50/40 text-fuchsia-800/70",
  },
  experience_certificate_original: {
    received:
      "border-orange-300 bg-orange-50 text-orange-900 shadow-sm shadow-orange-100",
    pending: "border-orange-200/70 bg-orange-50/40 text-orange-800/70",
  },
  sslc_certificate_original: {
    received:
      "border-indigo-300 bg-indigo-50 text-indigo-900 shadow-sm shadow-indigo-100",
    pending: "border-indigo-200/70 bg-indigo-50/40 text-indigo-800/70",
  },
  plus_two_certificate_original: {
    received: "border-rose-300 bg-rose-50 text-rose-900 shadow-sm shadow-rose-100",
    pending: "border-rose-200/70 bg-rose-50/40 text-rose-800/70",
  },
  transcript_original: {
    received: "border-cyan-300 bg-cyan-50 text-cyan-900 shadow-sm shadow-cyan-100",
    pending: "border-cyan-200/70 bg-cyan-50/40 text-cyan-800/70",
  },
  pcc_original: {
    received:
      "border-violet-300 bg-violet-50 text-violet-900 shadow-sm shadow-violet-100",
    pending: "border-violet-200/70 bg-violet-50/40 text-violet-800/70",
  },
};

const DEFAULT_COLORS = {
  received: "border-slate-300 bg-slate-50 text-slate-900 shadow-sm",
  pending: "border-slate-200/70 bg-slate-50/40 text-slate-600",
};

export function getOriginalDocumentChecklistClasses(
  docType: string,
  isReceived: boolean,
): string {
  const colors =
    ORIGINAL_DOCUMENT_CHECKLIST_COLORS[docType] ?? DEFAULT_COLORS;
  return cn(
    colors[isReceived ? "received" : "pending"],
    !isReceived && "border-dashed",
  );
}
