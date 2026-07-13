import { buildDefaultChecklistItems } from "../components/OriginalDocumentChecklist";
import type {
  ChecklistConfigItem,
  CumulativeReceivedItem,
} from "../types";

export const COLLECTION_STATUS_STEPS = [
  { key: "draft", label: "Draft" },
  { key: "merged_uploaded", label: "Merged" },
  { key: "locker_submitted", label: "Locker" },
  { key: "completed", label: "Done" },
] as const;

export type CollectionStatusStepKey =
  (typeof COLLECTION_STATUS_STEPS)[number]["key"];

export function getCollectionStatusStepIndex(status: string): number {
  const idx = COLLECTION_STATUS_STEPS.findIndex((step) => step.key === status);
  return idx >= 0 ? idx : 0;
}

export function getCollectionWorkflowProgress(status: string) {
  const currentIdx = getCollectionStatusStepIndex(status);
  const isComplete = status === "completed";
  const percent =
    COLLECTION_STATUS_STEPS.length > 1
      ? Math.round((currentIdx / (COLLECTION_STATUS_STEPS.length - 1)) * 100)
      : 0;
  const currentLabel =
    COLLECTION_STATUS_STEPS[currentIdx]?.label ?? "Draft";

  return {
    currentIdx,
    currentLabel,
    isComplete,
    percent: isComplete ? 100 : percent,
    stepCount: COLLECTION_STATUS_STEPS.length,
  };
}

export function getCollectionDocumentProgress(
  cumulativeReceived?: CumulativeReceivedItem[] | null,
  checklistItems?: ChecklistConfigItem[] | null,
) {
  const receivedMap = new Map(
    (cumulativeReceived ?? []).map((item) => [item.docType, item.isReceived]),
  );

  const configuredItems =
    checklistItems && checklistItems.length > 0
      ? checklistItems
      : buildDefaultChecklistItems().map((item, sortOrder) => ({
          id: item.docType,
          collectionId: "",
          docType: item.docType,
          mandatory: true,
          sortOrder,
          createdAt: "",
          updatedAt: "",
        }));
  const allDocuments = configuredItems.map((item) => ({
    docType: item.docType,
    mandatory: item.mandatory,
    isReceived: receivedMap.get(item.docType) ?? false,
  }));

  const receivedCount = allDocuments.filter((item) => item.isReceived).length;
  const totalCount = allDocuments.length;
  const mandatoryDocuments = allDocuments.filter((item) => item.mandatory);
  const mandatoryReceivedCount = mandatoryDocuments.filter(
    (item) => item.isReceived,
  ).length;
  const mandatoryTotalCount = mandatoryDocuments.length;
  const optionalCount = totalCount - mandatoryTotalCount;
  const percent =
    mandatoryTotalCount > 0
      ? Math.round((mandatoryReceivedCount / mandatoryTotalCount) * 100)
      : 100;

  return {
    allDocuments,
    receivedCount,
    totalCount,
    mandatoryReceivedCount,
    mandatoryTotalCount,
    optionalCount,
    percent,
    isComplete: mandatoryReceivedCount === mandatoryTotalCount,
  };
}
