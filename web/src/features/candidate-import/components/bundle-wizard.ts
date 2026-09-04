import { getDocumentTypeConfig } from "@/constants/document-types";
import type {
  BundleProfileSuggestions,
  BundleResumeRoleSuggestion,
  BundleSegment,
} from "../data/document-bundle.dto";

/** Order recruiters walk through after AI analysis. Missing types are omitted. */
export const WIZARD_TYPE_ORDER = [
  "resume",
  "degree_certificate",
  "passport_photo",
  "passport_copy",
  "aadhaar",
  "registration_certificate",
  "experience_certificate",
] as const;

export type WizardDocType = (typeof WIZARD_TYPE_ORDER)[number];

const WIZARD_TYPE_SET = new Set<string>(WIZARD_TYPE_ORDER);

const GROUPED_TYPES = new Set<WizardDocType>(["resume", "experience_certificate"]);

export interface WizardStep {
  id: string;
  kind: WizardDocType;
  label: string;
  shortLabel: string;
  segments: BundleSegment[];
}

export function isWizardDocType(docType: string): docType is WizardDocType {
  return WIZARD_TYPE_SET.has(docType);
}

export function buildWizardSteps(segments: BundleSegment[]): WizardStep[] {
  const byType = new Map<WizardDocType, BundleSegment[]>();
  for (const segment of segments) {
    if (!isWizardDocType(segment.docType)) continue;
    if (segment.status === "applied") continue;
    const list = byType.get(segment.docType) ?? [];
    list.push(segment);
    byType.set(segment.docType, list);
  }

  const steps: WizardStep[] = [];
  for (const kind of WIZARD_TYPE_ORDER) {
    const list = byType.get(kind);
    if (!list?.length) continue;

    const config = getDocumentTypeConfig(kind);
    const shortLabel = config?.displayName ?? kind;

    if (GROUPED_TYPES.has(kind) || list.length === 1) {
      steps.push({
        id: `${kind}:${list.map((segment) => segment.id).join(",")}`,
        kind,
        label: shortLabel,
        shortLabel,
        segments: list,
      });
      continue;
    }

    list.forEach((segment, index) => {
      steps.push({
        id: segment.id,
        kind,
        label: `${shortLabel} ${index + 1} of ${list.length}`,
        shortLabel: `${shortLabel} ${index + 1}`,
        segments: [segment],
      });
    });
  }

  return steps;
}

export function hasResumeRole(
  role: BundleResumeRoleSuggestion | null | undefined,
): boolean {
  if (!role) return false;
  const hasDepartment =
    Boolean(role.departmentId) ||
    Boolean(role.proposedDepartment?.name?.trim());
  const hasRole =
    Boolean(role.roleCatalogId) || Boolean(role.proposedRole?.label?.trim());
  return hasDepartment && hasRole;
}

export function fillMissingPassportFields(
  extracted: BundleSegment["extracted"] | undefined,
  identity: BundleProfileSuggestions["identity"],
): NonNullable<BundleSegment["extracted"]> {
  return {
    ...(extracted ?? {}),
    documentNumber:
      extracted?.documentNumber?.trim() ||
      identity?.passportNumber?.trim() ||
      null,
    expiryDate:
      extracted?.expiryDate?.trim() ||
      identity?.passportExpiry?.trim() ||
      null,
  };
}

export function validateWizardAdvance(
  step: WizardStep,
  profile: BundleProfileSuggestions,
): string | null {
  if (step.kind === "resume" && !hasResumeRole(profile.resumeRole)) {
    return "Choose a department and role for the resume.";
  }

  if (step.kind === "passport_copy") {
    const extracted = fillMissingPassportFields(
      step.segments[0]?.extracted,
      profile.identity,
    );
    if (!extracted.documentNumber?.trim()) {
      return "Passport number is required.";
    }
  }

  return null;
}

export function pageRangeLabel(startPage: number, endPage: number): string {
  return startPage === endPage
    ? `Page ${startPage}`
    : `Pages ${startPage}–${endPage}`;
}

export function stepPageRange(step: WizardStep): {
  startPage: number;
  endPage: number;
} {
  return {
    startPage: Math.min(...step.segments.map((segment) => segment.startPage)),
    endPage: Math.max(...step.segments.map((segment) => segment.endPage)),
  };
}
