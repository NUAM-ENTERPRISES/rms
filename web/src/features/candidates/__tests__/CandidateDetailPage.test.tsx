import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import CandidateDetailPage from "../views/CandidateDetailPage";

// Mock react-router hooks
vi.mock("react-router-dom", async () => ({
  useParams: () => ({ id: "c1" }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null, pathname: "/candidates/c1", key: "test" }),
}));

// Mock candidate hooks
vi.mock("@/features/candidates", () => ({
  useGetCandidateByIdQuery: () => ({
    data: {
      id: "c1",
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      dateOfBirth: "1990-05-15",
      currentStatus: { statusName: "Untouched" },
      createdAt: "2020-01-01",
      updatedAt: "2025-01-01",
      activitySnapshot: {
        projectsAssigned: 0,
        inDocumentation: 0,
        inInterview: 0,
        processingOrDeployed: 0,
        offersInPipeline: 0,
        placements: 0,
        verifiedDocuments: 0,
        pendingDocuments: 0,
        profileCompletion: 0,
        pipelineUpdates: 0,
      },
    },
    isLoading: false,
    isFetching: false,
    error: null,
  }),
  useGetDocumentsQuery: () => ({ data: { data: { documents: [], pagination: { total: 0 } } } }),
  useDeleteWorkExperienceMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteCandidateQualificationMutation: () => [vi.fn(), { isLoading: false }],
  useUploadDocumentMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@/features/documents/api", () => ({
  useCreateDocumentMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateDocumentMutation: () => [vi.fn()],
}));

vi.mock("../components/tabs/CandidateOverview", () => ({
  CandidateOverview: () => <div data-testid="candidate-overview">Overview</div>,
}));
vi.mock("../components/tabs/CandidateProjects", () => ({
  CandidateProjects: () => null,
}));
vi.mock("../components/tabs/CandidateDocuments", () => ({
  CandidateDocuments: () => null,
}));
vi.mock("../components/tabs/CandidateHistory", () => ({
  CandidateHistory: () => null,
}));
vi.mock("../components/tabs/CandidateMetrics", () => ({
  CandidateMetrics: () => null,
}));
vi.mock("../components/CandidateProfileCompletion", () => ({
  CandidateProfileCompletion: () => null,
}));
vi.mock("@/components/molecules", () => ({
  ImageViewer: () => null,
  DeleteConfirmationDialog: () => null,
}));

// Mock pipeline hook
vi.mock("@/services/candidatesApi", () => ({
  useGetCandidateStatusPipelineQuery: () => ({
    data: {
      data: {
        pipeline: [
          {
            step: 1,
            statusId: 1,
            statusName: "interested",
            enteredAt: "2026-01-01T00:00:00.000Z",
            exitedAt: null,
          },
        ],
      },
    },
    isLoading: false,
  }),
}));

vi.mock("../components/CandidatePipeline", () => ({
  CandidatePipeline: () => <div data-testid="candidate-pipeline">Pipeline</div>,
}));

vi.mock("../components/CandidatesIntroductionVideos", () => ({
  CandidatesIntroductionVideos: () => (
    <div data-testid="introduction-videos">Introduction Videos</div>
  ),
}));

vi.mock("../components/tabs/CandidateDocuments", () => ({
  CandidateDocuments: () => (
    <div data-testid="candidate-documents">
      Documents
      <div data-testid="introduction-videos">Introduction Videos</div>
    </div>
  ),
}));

// Mock status config hook
vi.mock("../hooks/useStatusConfig", () => ({
  useStatusConfig: () => ({
    statusConfig: {
      Untouched: { label: "Untouched", badgeClass: "bg-gray-100", icon: "User", description: "" },
    },
  }),
}));

// Mock app selector to provide a user (used by useCan)
vi.mock("@/app/hooks", () => ({
  useAppSelector: () => ({ user: { id: "u1", permissions: ["write:candidates"], roles: ["Admin"] } }),
}));

vi.mock("@/hooks/useCan", () => ({
  useCan: () => true,
}));

// Stub additional modal components that call RTK hooks
vi.mock("@/components/molecules/QualificationWorkExperienceModal", () => ({
  default: () => null,
}));
vi.mock("../components/UpdateJobPreferenceModal", () => ({
  UpdateJobPreferenceModal: () => null,
}));
vi.mock("../components/UpdatePersonalInfoModal", () => ({
  UpdatePersonalInfoModal: () => null,
}));
vi.mock("../components/UpdatePhysicalInfoModal", () => ({
  UpdatePhysicalInfoModal: () => null,
}));
vi.mock("../components/UpdateLicensingModal", () => ({
  UpdateLicensingModal: () => null,
}));
vi.mock("../components/StatusUpdateModal", () => ({
  StatusUpdateModal: () => null,
}));
vi.mock("../components/StatusBadge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

describe("CandidateDetailPage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows candidate name in header", () => {
    render(<CandidateDetailPage />);

    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("shows candidate pipeline on overview without introduction videos", () => {
    vi.setSystemTime(new Date("2025-12-22T00:00:00.000Z"));

    render(<CandidateDetailPage />);

    expect(screen.getByText("Candidate Pipeline")).toBeInTheDocument();
    expect(screen.getByTestId("candidate-pipeline")).toBeInTheDocument();
    expect(screen.queryByTestId("introduction-videos")).not.toBeInTheDocument();
  });
});
