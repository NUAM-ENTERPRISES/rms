import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EditCandidateDocumentDialog } from "./EditCandidateDocumentDialog";

vi.mock("@/components/molecules", () => ({
  DepartmentSelect: () => null,
  JobTitleSelect: () => null,
}));

const certificateDoc = {
  id: "doc-1",
  docType: "degree_certificate",
  docName: "BSc Nursing",
  documentNumber: null,
  issuedAt: null,
  expiryDate: null,
  roleCatalogId: null,
  roleCatalog: null,
};

describe("EditCandidateDocumentDialog", () => {
  it("submits the current document type", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <EditCandidateDocumentDialog
        isOpen
        document={certificateDoc}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: /edit document/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        docType: "degree_certificate",
        docName: "BSc Nursing",
      }),
    );
  });
});
