import { render, screen } from "@testing-library/react";
import { vi, beforeEach, describe, expect, it } from "vitest";
import { SendForVerificationDocumentsChecklist } from "./SendForVerificationDocumentsChecklist";

const mockUseGetCandidateProjectRequirementsQuery = vi.fn();

vi.mock("../api", () => ({
  useGetCandidateProjectRequirementsQuery: (...args: unknown[]) =>
    mockUseGetCandidateProjectRequirementsQuery(...args),
}));

describe("SendForVerificationDocumentsChecklist", () => {
  beforeEach(() => {
    mockUseGetCandidateProjectRequirementsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
    });
  });

  it("renders uploaded and not uploaded rows from preloaded data", () => {
    render(
      <SendForVerificationDocumentsChecklist
        candidateId="c1"
        projectId="p1"
        isActive
        preloadedData={{
          requirements: [
            { id: "1", docType: "resume", mandatory: true },
            { id: "2", docType: "degree_certificate", mandatory: true },
          ],
          verifications: [
            {
              status: "pending",
              document: { docType: "resume", fileName: "cv.pdf" },
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Document checklist")).toBeInTheDocument();
    expect(screen.getByText("Uploaded")).toBeInTheDocument();
    expect(screen.getByText("Not uploaded")).toBeInTheDocument();
    expect(screen.getByText("cv.pdf")).toBeInTheDocument();
    expect(
      screen.getByText(/Some required documents are not uploaded/i),
    ).toBeInTheDocument();
  });

  it("fetches requirements when active without preloaded data", () => {
    mockUseGetCandidateProjectRequirementsQuery.mockReturnValue({
      data: {
        data: {
          requirements: [{ id: "1", docType: "resume", mandatory: false }],
          verifications: [],
          introductionVideoRequired: false,
        },
      },
      isLoading: false,
      isFetching: false,
    });

    render(
      <SendForVerificationDocumentsChecklist
        candidateId="c1"
        projectId="p1"
        isActive
      />,
    );

    expect(mockUseGetCandidateProjectRequirementsQuery).toHaveBeenCalledWith(
      { candidateId: "c1", projectId: "p1" },
      { skip: false },
    );
    expect(screen.getByText("Not uploaded")).toBeInTheDocument();
  });

  it("shows empty state when no requirements are configured", () => {
    render(
      <SendForVerificationDocumentsChecklist
        candidateId="c1"
        projectId="p1"
        isActive
        preloadedData={{
          requirements: [],
          verifications: [],
        }}
      />,
    );

    expect(
      screen.getByText(/No project document requirements configured/i),
    ).toBeInTheDocument();
  });
});
