import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CandidateOfferLetterCard } from "./CandidateOfferLetterCard";

const mockUseGetCandidateProjectsQuery = vi.fn();
const mockUseGetDocumentsQuery = vi.fn();
const mockUseGetOfferLetterUploadRequestsQuery = vi.fn();
const mockUseGetInterviewsQuery = vi.fn();
const mockUseCan = vi.fn();
const mockUseHasRole = vi.fn();

vi.mock("../api", () => ({
  useGetCandidateProjectsQuery: (...args: unknown[]) =>
    mockUseGetCandidateProjectsQuery(...args),
  useGetDocumentsQuery: (...args: unknown[]) => mockUseGetDocumentsQuery(...args),
  useGetOfferLetterUploadRequestsQuery: (...args: unknown[]) =>
    mockUseGetOfferLetterUploadRequestsQuery(...args),
}));

vi.mock("@/features/interviews/api", () => ({
  useGetInterviewsQuery: (...args: unknown[]) => mockUseGetInterviewsQuery(...args),
}));

vi.mock("@/hooks/useCan", () => ({
  useCan: (permission: string) => mockUseCan(permission),
  useHasRole: (role: string) => mockUseHasRole(role),
}));

vi.mock("@/components/molecules/PDFViewer", () => ({
  PDFViewer: () => null,
}));

vi.mock("@/features/documents/components/OfferLetterUploadModal", () => ({
  OfferLetterUploadModal: () => null,
}));

vi.mock("@/features/documents/components/RequestOfferLetterUploadModal", () => ({
  RequestOfferLetterUploadModal: () => null,
}));

const emptyQueryResult = {
  data: { data: [] },
  isLoading: false,
};

const emptyDocsResult = {
  data: { data: { documents: [] } },
  isLoading: false,
};

const emptyInterviewsResult = {
  data: { data: { interviews: [] } },
  isLoading: false,
};

describe("CandidateOfferLetterCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCan.mockReturnValue(false);
    mockUseHasRole.mockReturnValue(false);
    mockUseGetCandidateProjectsQuery.mockReturnValue(emptyQueryResult);
    mockUseGetDocumentsQuery.mockReturnValue(emptyDocsResult);
    mockUseGetOfferLetterUploadRequestsQuery.mockReturnValue({
      data: { data: [] },
    });
    mockUseGetInterviewsQuery.mockReturnValue(emptyInterviewsResult);
  });

  it("loads all nominations when projectId is not provided", () => {
    render(
      <CandidateOfferLetterCard candidateId="cand-1" candidateName="Jane Doe" />,
    );

    expect(mockUseGetCandidateProjectsQuery).toHaveBeenCalledWith(
      { candidateId: "cand-1", page: 1, limit: 50 },
      { skip: false },
    );
    expect(mockUseGetInterviewsQuery).toHaveBeenCalledWith(
      { candidateId: "cand-1", status: "passed", page: 1, limit: 50 },
      { skip: true },
    );
    expect(screen.getByText(/No project nominations yet/i)).toBeInTheDocument();
  });

  it("scopes nomination queries and skips interviews when projectId is provided", () => {
    render(
      <CandidateOfferLetterCard
        candidateId="cand-1"
        candidateName="Jane Doe"
        projectId="proj-1"
        candidateProjectMapId="cpm-1"
      />,
    );

    expect(mockUseGetCandidateProjectsQuery).toHaveBeenCalledWith(
      { candidateId: "cand-1", projectId: "proj-1", page: 1, limit: 1 },
      { skip: false },
    );
    expect(mockUseGetInterviewsQuery).toHaveBeenCalledWith(
      {
        candidateId: "cand-1",
        status: "passed",
        page: 1,
        limit: 50,
        projectId: "proj-1",
      },
      { skip: true },
    );
  });

  it("fetches interviews when user has read:interviews and card is not project-scoped", () => {
    mockUseCan.mockImplementation(
      (permission: string) => permission === "read:interviews",
    );

    render(
      <CandidateOfferLetterCard candidateId="cand-1" candidateName="Jane Doe" />,
    );

    expect(mockUseGetInterviewsQuery).toHaveBeenCalledWith(
      { candidateId: "cand-1", status: "passed", page: 1, limit: 50 },
      { skip: false },
    );
  });

  it("allows upload from nomination sub-status when interviews are not fetched", () => {
    mockUseCan.mockImplementation((permission: string) =>
      ["write:documents"].includes(permission),
    );
    mockUseHasRole.mockImplementation((role: string) => role === "Recruiter");
    mockUseGetCandidateProjectsQuery.mockReturnValue({
      data: {
        data: [
          {
            id: "cpm-1",
            project: { id: "proj-1", title: "Hospital Project" },
            roleNeeded: {
              designation: "Staff Nurse",
              roleCatalogId: "role-1",
            },
            subStatus: { name: "interview_passed" },
          },
        ],
      },
      isLoading: false,
    });

    render(
      <CandidateOfferLetterCard
        candidateId="cand-1"
        candidateName="Jane Doe"
        projectId="proj-1"
        candidateProjectMapId="cpm-1"
      />,
    );

    expect(mockUseGetInterviewsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ candidateId: "cand-1", projectId: "proj-1" }),
      { skip: true },
    );
    expect(screen.getByRole("button", { name: /upload/i })).toBeInTheDocument();
    expect(screen.queryByText(/awaiting interview pass/i)).not.toBeInTheDocument();
  });
});
