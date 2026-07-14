import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ReceiveDocumentVerificationChecklist,
  getReceiveReviewBlockReason,
  isReceiveReviewComplete,
  toVerifiedDocumentsPayload,
  type ReceiveDocumentVerificationItem,
} from "../ReceiveDocumentVerificationChecklist";

describe("ReceiveDocumentVerificationChecklist", () => {
  const docTypes = ["passport", "degree_certificate_original"];

  it("shows empty state when no documents are on the leg", () => {
    render(
      <ReceiveDocumentVerificationChecklist
        docTypes={[]}
        items={[]}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/No documents are attached to this leg/i),
    ).toBeInTheDocument();
  });

  it("shows remarks input even when a document is unchecked", () => {
    render(
      <ReceiveDocumentVerificationChecklist
        docTypes={docTypes}
        items={docTypes.map((docType) => ({
          docType,
          isVerified: false,
          remarks: "",
        }))}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getAllByPlaceholderText(/Not arrived — add reason/i)).toHaveLength(
      2,
    );
  });

  it("keeps remarks when unchecking a document", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ReceiveDocumentVerificationChecklist
        docTypes={["passport"]}
        items={[
          {
            docType: "passport",
            isVerified: true,
            remarks: "Seal intact",
          },
        ]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByLabelText(/Mark passport as arrived/i));

    expect(onChange).toHaveBeenCalledWith([
      { docType: "passport", isVerified: false, remarks: "Seal intact" },
    ]);
  });

  it("marks all documents as arrived from the header button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ReceiveDocumentVerificationChecklist
        docTypes={docTypes}
        items={docTypes.map((docType) => ({
          docType,
          isVerified: false,
          remarks: "",
        }))}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Mark all arrived/i }));

    expect(onChange).toHaveBeenCalledWith([
      { docType: "passport", isVerified: true, remarks: "" },
      {
        docType: "degree_certificate_original",
        isVerified: true,
        remarks: "",
      },
    ]);
  });

  it("builds payload with isReceived for all documents", () => {
    const items: ReceiveDocumentVerificationItem[] = [
      { docType: "passport", isVerified: true, remarks: " Seal intact " },
      {
        docType: "degree_certificate_original",
        isVerified: false,
        remarks: "Not arrived, please check Kochi office",
      },
    ];

    expect(toVerifiedDocumentsPayload(items)).toEqual([
      { docType: "passport", isReceived: true, remarks: "Seal intact" },
      {
        docType: "degree_certificate_original",
        isReceived: false,
        remarks: "Not arrived, please check Kochi office",
      },
    ]);
  });

  it("requires remarks only for unchecked documents", () => {
    const completeItems: ReceiveDocumentVerificationItem[] = [
      { docType: "passport", isVerified: true, remarks: "" },
      {
        docType: "degree_certificate_original",
        isVerified: false,
        remarks: "Not arrived, please check Kochi office",
      },
    ];

    const incompleteItems: ReceiveDocumentVerificationItem[] = [
      { docType: "passport", isVerified: true, remarks: "" },
      { docType: "degree_certificate_original", isVerified: false, remarks: "" },
    ];

    expect(isReceiveReviewComplete(docTypes, completeItems)).toBe(true);
    expect(isReceiveReviewComplete(docTypes, incompleteItems)).toBe(false);
    expect(getReceiveReviewBlockReason(docTypes, incompleteItems)).toBe(
      "Add a remark for the document that did not arrive",
    );
  });
});
