import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VerificationDocumentActions } from "../VerificationDocumentActions";

const verification = {
  id: "ver-1",
  status: "pending",
  document: { id: "doc-1", fileName: "passport.pdf" },
};

describe("VerificationDocumentActions", () => {
  it("shows only Verify when reject permission is missing", () => {
    render(
      <VerificationDocumentActions
        verification={verification}
        displayedStatus="pending"
        canVerifyDocuments
        canRejectDocuments={false}
        canRequestResubmission={false}
        onVerify={vi.fn()}
        onReject={vi.fn()}
        onRequestResubmission={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /verify/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reject/i })).not.toBeInTheDocument();
  });

  it("shows only Reject when verify permission is missing", () => {
    render(
      <VerificationDocumentActions
        verification={verification}
        displayedStatus="pending"
        canVerifyDocuments={false}
        canRejectDocuments
        canRequestResubmission={false}
        onVerify={vi.fn()}
        onReject={vi.fn()}
        onRequestResubmission={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /verify/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
  });

  it("shows a no-permission badge when verify and reject are both missing", () => {
    render(
      <VerificationDocumentActions
        verification={verification}
        displayedStatus="pending"
        canVerifyDocuments={false}
        canRejectDocuments={false}
        canRequestResubmission={false}
        onVerify={vi.fn()}
        onReject={vi.fn()}
        onRequestResubmission={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/no permission to verify or reject documents/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /verify/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reject/i })).not.toBeInTheDocument();
  });

  it("calls onReject when reject is clicked", async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();

    render(
      <VerificationDocumentActions
        verification={verification}
        displayedStatus="pending"
        canVerifyDocuments={false}
        canRejectDocuments
        canRequestResubmission={false}
        onVerify={vi.fn()}
        onReject={onReject}
        onRequestResubmission={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /reject/i }));
    expect(onReject).toHaveBeenCalledWith(verification);
  });
});
