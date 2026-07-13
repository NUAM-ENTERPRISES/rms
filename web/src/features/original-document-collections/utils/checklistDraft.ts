import { ORIGINAL_DOCUMENT_CHECKLIST } from "../constants";
import type { ChecklistDraftItem } from "../types";

export function buildDefaultDraftChecklist(): ChecklistDraftItem[] {
  return ORIGINAL_DOCUMENT_CHECKLIST.map((docType, sortOrder) => ({
    docType,
    mandatory: true,
    sortOrder,
  }));
}

export function draftChecklistEquals(
  left: ChecklistDraftItem[],
  right: ChecklistDraftItem[],
): boolean {
  if (left.length !== right.length) return false;
  const rightMap = new Map(right.map((item) => [item.docType, item]));
  return left.every((item) => {
    const other = rightMap.get(item.docType);
    return other?.mandatory === item.mandatory;
  });
}

type ChecklistMutation = {
  unwrap: () => Promise<unknown>;
};

export async function syncDraftChecklistToServer(
  collectionId: string,
  draft: ChecklistDraftItem[],
  mutations: {
    addItem: (args: {
      collectionId: string;
      docType: string;
      mandatory: boolean;
    }) => ChecklistMutation;
    updateItem: (args: {
      collectionId: string;
      docType: string;
      mandatory: boolean;
    }) => ChecklistMutation;
    removeItem: (args: {
      collectionId: string;
      docType: string;
    }) => ChecklistMutation;
  },
) {
  const defaultDraft = buildDefaultDraftChecklist();
  if (draftChecklistEquals(draft, defaultDraft)) {
    return;
  }

  const draftMap = new Map(draft.map((item) => [item.docType, item]));
  const defaultTypes = new Set(
    defaultDraft.map((item) => item.docType),
  );

  for (const defaultItem of defaultDraft) {
    const configured = draftMap.get(defaultItem.docType);
    if (!configured) {
      await mutations
        .removeItem({
          collectionId,
          docType: defaultItem.docType,
        })
        .unwrap();
      continue;
    }
    if (configured.mandatory !== defaultItem.mandatory) {
      await mutations
        .updateItem({
          collectionId,
          docType: configured.docType,
          mandatory: configured.mandatory,
        })
        .unwrap();
    }
  }

  for (const item of draft) {
    if (!defaultTypes.has(item.docType)) {
      await mutations
        .addItem({
          collectionId,
          docType: item.docType,
          mandatory: item.mandatory,
        })
        .unwrap();
    }
  }
}
