import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecruiterDocsDetailPage from "./RecruiterDocsDetailPage";

const mockUseGetDocumentsQuery = vi.fn();

vi.mock("@/features/documents/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/documents/api")>();
  return {
    ...actual,
    useGetDocumentsQuery: (...args: unknown[]) => mockUseGetDocumentsQuery(...args),
    useGetCandidateProjectRequirementsQuery: () => ({
      data: {
        data: {
          requirements: [],
          verifications: [],
          candidateProject: { id: "cpm-1", subStatus: { name: "pending_documents" } },
          summary: {
            totalRequired: 0,
            totalVerified: 0,
            totalRejected: 0,
            isSendedForDocumentVerification: false,
          },
        },
      },
      isLoading: false,
      refetch: vi.fn(),
    }),
    useCreateDocumentMutation: () => [vi.fn(), { isLoading: false }],
    useUpdateDocumentMutation: () => [vi.fn()],
    useReuseDocumentMutation: () => [vi.fn(), { isLoading: false }],
    useReuploadRecruiterDocumentMutation: () => [vi.fn()],
  };
});

vi.mock("@/features/projects/api", () => ({
  useGetProjectQuery: () => ({
    data: {
      data: {
        id: "proj-1",
        title: "Test Project",
        status: "in_progress",
        deadline: "2026-12-31",
        client: { name: "Client" },
        creator: { name: "Creator" },
        rolesNeeded: [],
        introductionVideoRequired: false,
      },
    },
    isLoading: false,
    error: undefined,
  }),
  useSendForVerificationMutation: () => [vi.fn(), { isLoading: false }],
  useCheckBulkCandidateEligibilityQuery: () => ({ data: undefined }),
}));

vi.mock("@/features/candidates/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/candidates/api")>();
  return {
    ...actual,
    useGetCandidateByIdQuery: () => ({
      data: {
        firstName: "Jane",
        lastName: "Doe",
        qualifications: [],
        workExperiences: [],
      },
      isLoading: false,
    }),
    useUploadDocumentMutation: () => [vi.fn(), { isLoading: false }],
    useGetCandidateProjectsQuery: () => ({
      data: { data: [] },
      isLoading: false,
    }),
    useGetOfferLetterUploadRequestsQuery: () => ({ data: { data: [] } }),
  };
});

vi.mock("@/features/interviews/api", () => ({
  useGetInterviewsQuery: () => ({
    data: { data: { interviews: [] } },
    isLoading: false,
  }),
}));

vi.mock("@/features/introduction-videos/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/introduction-videos/api")>();
  return {
    ...actual,
    useUploadIntroductionVideoMutation: () => [vi.fn(), { isLoading: false }],
    useReuseIntroductionVideoMutation: () => [vi.fn(), { isLoading: false }],
    useReuploadIntroductionVideoMutation: () => [vi.fn(), { isLoading: false }],
    useGetReusableIntroductionVideosQuery: () => ({
      data: undefined,
      isLoading: false,
      isFetching: false,
    }),
  };
});

vi.mock("@/app/hooks", () => ({
  useAppSelector: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useCan", () => ({
  useCan: () => true,
  useHasRole: () => false,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useParams: () => ({ projectId: "proj-1", candidateId: "cand-1" }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock("../components/CandidateUploadDocumentModal", () => ({
  default: () => null,
}));

vi.mock("@/features/candidates/components/CandidateOfferLetterCard", () => ({
  CandidateOfferLetterCard: () => null,
}));

const documentsQueryResult = {
  data: { data: { documents: [], pagination: { totalPages: 1 } } },
  isLoading: false,
  refetch: vi.fn(),
};

describe("RecruiterDocsDetailPage API usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetDocumentsQuery.mockReturnValue(documentsQueryResult);
  });

  it("skips candidate documents query until Candidate Documents tab is active", async () => {
    const user = userEvent.setup();

    render(<RecruiterDocsDetailPage />);

    expect(mockUseGetDocumentsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateId: "cand-1",
        page: 1,
        limit: 10,
      }),
      expect.objectContaining({ skip: true }),
    );

    await user.click(screen.getByRole("tab", { name: /Candidate Documents/i }));

    expect(mockUseGetDocumentsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateId: "cand-1",
      }),
      expect.objectContaining({ skip: false }),
    );
  });
});
