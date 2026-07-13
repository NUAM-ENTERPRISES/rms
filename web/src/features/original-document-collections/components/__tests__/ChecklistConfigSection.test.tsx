import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ChecklistConfigSection } from "../ChecklistConfigSection";

const addItem = vi.fn();
const updateItem = vi.fn();
const removeItem = vi.fn();

beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock("../../api", () => ({
  useAddOriginalDocumentChecklistItemMutation: () => [
    addItem,
    { isLoading: false },
  ],
  useUpdateOriginalDocumentChecklistItemMutation: () => [
    updateItem,
    { isLoading: false },
  ],
  useRemoveOriginalDocumentChecklistItemMutation: () => [
    removeItem,
    { isLoading: false },
  ],
}));

const checklistItems = [
  {
    id: "check-passport",
    collectionId: "col-1",
    docType: "passport_original",
    mandatory: true,
    sortOrder: 0,
    createdAt: "2026-07-13T10:00:00.000Z",
    updatedAt: "2026-07-13T10:00:00.000Z",
  },
  {
    id: "check-offer",
    collectionId: "col-1",
    docType: "offer_letter_original",
    mandatory: false,
    sortOrder: 1,
    createdAt: "2026-07-13T10:00:00.000Z",
    updatedAt: "2026-07-13T10:00:00.000Z",
  },
];

async function openChecklistModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: /configure checklist/i }),
  );
}

describe("ChecklistConfigSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addItem.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    updateItem.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    removeItem.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it("renders a configure checklist trigger with summary", () => {
    render(
      <ChecklistConfigSection
        collectionId="col-1"
        checklistItems={checklistItems}
        receivedDocTypes={[]}
      />,
    );

    expect(
      screen.getByRole("button", { name: /configure checklist/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 required · 1 optional")).toBeInTheDocument();
  });

  it("opens a modal with mandatory and optional checklist items", async () => {
    const user = userEvent.setup();
    render(
      <ChecklistConfigSection
        collectionId="col-1"
        checklistItems={checklistItems}
        receivedDocTypes={[]}
      />,
    );

    await openChecklistModal(user);

    expect(
      screen.getByRole("dialog", { name: /configure candidate checklist/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Original Passport (presented)")).toBeInTheDocument();
    expect(screen.getByText("Offer Letter (Original)")).toBeInTheDocument();
    expect(screen.getAllByText("Mandatory").length).toBeGreaterThan(0);
    expect(screen.getByText("Optional")).toBeInTheDocument();
  });

  it("toggles a checklist item between mandatory and optional", async () => {
    const user = userEvent.setup();
    render(
      <ChecklistConfigSection
        collectionId="col-1"
        checklistItems={checklistItems}
        receivedDocTypes={[]}
      />,
    );

    await openChecklistModal(user);
    await user.click(
      screen.getByRole("switch", {
        name: "Mark Original Passport (presented) mandatory",
      }),
    );

    expect(updateItem).toHaveBeenCalledWith({
      collectionId: "col-1",
      docType: "passport_original",
      mandatory: false,
    });
  });

  it("adds a selected document as mandatory", async () => {
    const user = userEvent.setup();
    render(
      <ChecklistConfigSection
        collectionId="col-1"
        checklistItems={checklistItems}
        receivedDocTypes={[]}
      />,
    );

    await openChecklistModal(user);
    await user.click(screen.getByRole("combobox", { name: "Document type" }));
    await user.click(
      await screen.findByRole("option", {
        name: "Birth Certificate (Original)",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Add document" }));

    expect(addItem).toHaveBeenCalledWith({
      collectionId: "col-1",
      docType: "birth_certificate_original",
      mandatory: true,
    });
  });

  it("removes an unreceived document and protects a received document", async () => {
    const user = userEvent.setup();
    render(
      <ChecklistConfigSection
        collectionId="col-1"
        checklistItems={checklistItems}
        receivedDocTypes={["passport_original"]}
      />,
    );

    await openChecklistModal(user);

    expect(
      screen.getByRole("button", {
        name: "Remove Original Passport (presented)",
      }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "Remove Offer Letter (Original)" }),
    );
    expect(removeItem).toHaveBeenCalledWith({
      collectionId: "col-1",
      docType: "offer_letter_original",
    });
  });
});
