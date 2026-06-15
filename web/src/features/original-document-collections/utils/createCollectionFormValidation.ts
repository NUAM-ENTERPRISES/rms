import type { FieldErrors } from "react-hook-form";
import { ORIGINAL_DOCUMENT_CHECKLIST } from "../constants";
import type { CreateCollectionFormValues } from "../schemas/collection-form.schema";

export type CreateCollectionFormSection =
  | "candidate"
  | "collectionSource"
  | "checklist";

export const COLLECTION_SOURCE_FIELDS = [
  "collectionType",
  "collectedByUserId",
  "collectedAt",
  "directOffice",
  "directOfficeOther",
  "interviewVenue",
  "agentId",
  "agentNameManual",
  "courierPartner",
  "trackingNumber",
] as const satisfies readonly (keyof CreateCollectionFormValues)[];

export function validateChecklistItemsForVisit(
  items: Array<{ docType: string; isReceived: boolean }> | undefined,
  previouslyReceivedDocTypes: string[],
): string | null {
  const lockedSet = new Set(previouslyReceivedDocTypes);
  const unlockedCount = ORIGINAL_DOCUMENT_CHECKLIST.length - lockedSet.size;
  if (unlockedCount === 0) return null;

  const newReceivedCount =
    items?.filter(
      (item) => item.isReceived && !lockedSet.has(item.docType),
    ).length ?? 0;

  if (newReceivedCount === 0) {
    return "Mark at least one document as received for this visit";
  }

  return null;
}

export function getFirstInvalidSection(
  errors: FieldErrors<CreateCollectionFormValues>,
): CreateCollectionFormSection | null {
  if (errors.candidateId) return "candidate";

  if (
    COLLECTION_SOURCE_FIELDS.some((field) => Boolean(errors[field]?.message))
  ) {
    return "collectionSource";
  }

  if (errors.items?.message) return "checklist";

  return null;
}

export function getCollectionSourceErrorMessage(
  errors: FieldErrors<CreateCollectionFormValues>,
): string | undefined {
  for (const field of COLLECTION_SOURCE_FIELDS) {
    const message = errors[field]?.message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return undefined;
}

export function sectionHasError(
  section: CreateCollectionFormSection,
  errors: FieldErrors<CreateCollectionFormValues>,
): boolean {
  return getFirstInvalidSection(errors) === section;
}
