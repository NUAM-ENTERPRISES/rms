import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { RequestMissingDocumentModal } from "./RequestMissingDocumentModal";

const requestMissingUploadMock = vi.fn();

vi.mock("../api", () => ({
  useRequestMissingDocumentUploadMutation: () => [
    requestMissingUploadMock,
    { isLoading: false },
  ],
}));

describe("RequestMissingDocumentModal", () => {
  beforeEach(() => {
    requestMissingUploadMock.mockReset();
    requestMissingUploadMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ success: true }),
    });
  });

  it("requires a note with minimum length before submitting", async () => {
    const user = userEvent.setup();

    render(
      <RequestMissingDocumentModal
        isOpen
        onOpenChange={vi.fn()}
        candidateProjectMapId="cpm-1"
        docType="resume"
        documentLabel="Resume"
      />,
    );

    await user.click(screen.getByRole("button", { name: /Send Request/i }));

    expect(
      await screen.findByText(/at least 10 characters/i),
    ).toBeInTheDocument();
    expect(requestMissingUploadMock).not.toHaveBeenCalled();
  });

  it("submits request when note is valid", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(
      <RequestMissingDocumentModal
        isOpen
        onOpenChange={vi.fn()}
        candidateProjectMapId="cpm-1"
        docType="resume"
        documentLabel="Resume"
        onSuccess={onSuccess}
      />,
    );

    await user.type(
      screen.getByLabelText(/Note for recruiter/i),
      "Resume is missing. Please upload the latest copy.",
    );
    await user.click(screen.getByRole("button", { name: /Send Request/i }));

    expect(requestMissingUploadMock).toHaveBeenCalledWith({
      candidateProjectMapId: "cpm-1",
      docType: "resume",
      reason: "Resume is missing. Please upload the latest copy.",
      roleCatalogId: undefined,
    });
  });
});
