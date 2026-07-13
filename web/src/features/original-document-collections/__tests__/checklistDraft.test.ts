import { describe, expect, it, vi } from "vitest";
import {
  buildDefaultDraftChecklist,
  draftChecklistEquals,
  syncDraftChecklistToServer,
} from "../utils/checklistDraft";

describe("checklistDraft", () => {
  it("builds the default mandatory checklist", () => {
    expect(buildDefaultDraftChecklist()).toHaveLength(8);
    expect(buildDefaultDraftChecklist()[0]).toMatchObject({
      docType: "passport_original",
      mandatory: true,
      sortOrder: 0,
    });
  });

  it("compares draft checklists by doc type and mandatory flag", () => {
    const left = buildDefaultDraftChecklist();
    const right = buildDefaultDraftChecklist().map((item, index) =>
      index === 1 ? { ...item, mandatory: false } : item,
    );

    expect(draftChecklistEquals(left, left)).toBe(true);
    expect(draftChecklistEquals(left, right)).toBe(false);
  });

  it("syncs draft changes to the server after create", async () => {
    const addItem = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
    const updateItem = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
    const removeItem = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));

    const draft = buildDefaultDraftChecklist().filter(
      (item) => item.docType !== "pcc_original",
    );
    draft.push({
      docType: "birth_certificate_original",
      mandatory: true,
      sortOrder: draft.length,
    });

    await syncDraftChecklistToServer("col-1", draft, {
      addItem,
      updateItem,
      removeItem,
    });

    expect(removeItem).toHaveBeenCalledWith({
      collectionId: "col-1",
      docType: "pcc_original",
    });
    expect(addItem).toHaveBeenCalledWith({
      collectionId: "col-1",
      docType: "birth_certificate_original",
      mandatory: true,
    });
    expect(updateItem).not.toHaveBeenCalled();
  });
});
