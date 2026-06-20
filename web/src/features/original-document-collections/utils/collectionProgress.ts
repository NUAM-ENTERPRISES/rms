import { buildDefaultChecklistItems } from "../components/OriginalDocumentChecklist";
import type { CumulativeReceivedItem } from "../types";

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
) {
  const receivedMap = new Map(
    (cumulativeReceived ?? []).map((item) => [item.docType, item.isReceived]),
  );

  const allDocuments = buildDefaultChecklistItems().map((item) => ({
    docType: item.docType,
    isReceived: receivedMap.get(item.docType) ?? false,
  }));

  const receivedCount = allDocuments.filter((item) => item.isReceived).length;
  const totalCount = allDocuments.length;
  const percent =
    totalCount > 0 ? Math.round((receivedCount / totalCount) * 100) : 0;

  return {
    allDocuments,
    receivedCount,
    totalCount,
    percent,
    isComplete: receivedCount === totalCount && totalCount > 0,
  };
}
