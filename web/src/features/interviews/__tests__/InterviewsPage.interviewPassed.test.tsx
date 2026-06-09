import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import InterviewsPage from "../views/InterviewsPage";

const passedInterview = {
  id: "int-passed-1",
  outcome: "passed",
  mode: "video",
  completedAt: "2026-06-01T10:00:00.000Z",
  readyForProcessingAt: null,
  isOfferLetterUploaded: false,
  candidateProjectMap: {
    candidate: {
      id: "cand-1",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      mobileNumber: "9999999999",
      countryCode: "+91",
    },
    project: { id: "proj-1", title: "ICU Project" },
    roleNeeded: {
      designation: "ICU Nurse",
      roleCatalog: { id: "rc-1", label: "ICU Nurse" },
    },
    recruiter: { name: "Recruiter One" },
    subStatus: { name: "interview_passed", label: "Interview Passed" },
  },
};

const passedInterviewSent = {
  ...passedInterview,
  id: "int-passed-2",
  readyForProcessingAt: "2026-06-02T10:00:00.000Z",
  candidateProjectMap: {
    ...passedInterview.candidateProjectMap,
    candidate: {
      ...passedInterview.candidateProjectMap.candidate,
      id: "cand-sent",
      firstName: "John",
      lastName: "Sent",
    },
  },
};

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/app/hooks", () => ({
  useAppSelector: () => ({
    user: { roles: ["Interview Coordinator"] },
  }),
}));

const interviewPassedMocks = vi.hoisted(() => ({
  isCoordinator: true,
  passedInterviews: [] as any[],
}));

vi.mock("@/hooks/useCan", () => ({
  useCan: () => true,
  useHasRole: (role: string) =>
    role === "Interview Coordinator" ? interviewPassedMocks.isCoordinator : false,
}));

vi.mock("@/components/molecules/DashboardWelcomeHeader", () => ({
  default: () => <div data-testid="welcome-header" />,
}));

vi.mock("@/components/molecules/ReviewInterviewModal", () => ({
  default: () => null,
}));
vi.mock("@/components/molecules/CompleteInterviewModal", () => ({
  default: () => null,
}));
vi.mock("@/components/molecules/ProjectDetailsModal", () => ({
  default: () => null,
}));
vi.mock("@/components/molecules/ProjectRoleFilter", () => ({
  default: () => <div />,
}));
vi.mock("@/components/molecules/ImageViewer", () => ({
  ImageViewer: () => <div />,
}));
vi.mock("../components/ScheduleInterviewDialog", () => ({
  default: () => null,
}));
vi.mock("../components/EditInterviewDialog", () => ({
  default: () => null,
}));
vi.mock("../components/ClientDecisionModal", () => ({
  ClientDecisionModal: () => null,
}));
vi.mock("../components/BulkClientDecisionModal", () => ({
  BulkClientDecisionModal: () => null,
}));
vi.mock("../components/BulkScheduleInterviewModal", () => ({
  BulkScheduleInterviewModal: () => null,
}));
vi.mock("@/features/documents/components/OfferLetterUploadModal", () => ({
  OfferLetterUploadModal: () => null,
}));
vi.mock("@/components/molecules/PDFViewer", () => ({
  PDFViewer: () => null,
}));
vi.mock("../components/SendForProcessingModal", () => ({
  SendForProcessingModal: ({
    isOpen,
    onConfirm,
    candidates,
  }: {
    isOpen: boolean;
    onConfirm: (selectedInterviewIds: string[]) => void;
    candidates: Array<{ candidateName: string; interviewId: string }>;
  }) =>
    isOpen ? (
      <div data-testid="send-for-processing-modal">
        <p>Confirm send for {candidates[0]?.candidateName}</p>
        <button
          type="button"
          onClick={() => onConfirm(candidates.map((candidate) => candidate.interviewId))}
        >
          Confirm Send for Processing
        </button>
      </div>
    ) : null,
  mapInterviewToSendForProcessingCandidate: (item: {
    id: string;
    candidateProjectMap?: {
      candidate?: { id?: string; firstName?: string; lastName?: string };
      project?: { id?: string; title?: string };
      roleNeeded?: { designation?: string; roleCatalog?: { id?: string } };
      recruiter?: { name?: string };
    };
  }) => ({
    interviewId: item.id,
    candidateId: item.candidateProjectMap?.candidate?.id || "",
    candidateName: item.candidateProjectMap?.candidate
      ? `${item.candidateProjectMap.candidate.firstName} ${item.candidateProjectMap.candidate.lastName}`
      : "Unknown",
    projectId: item.candidateProjectMap?.project?.id || "",
    projectTitle: item.candidateProjectMap?.project?.title || "Project",
    roleCatalogId: item.candidateProjectMap?.roleNeeded?.roleCatalog?.id || "",
    roleDesignation: item.candidateProjectMap?.roleNeeded?.designation || "Role",
    recruiterName: item.candidateProjectMap?.recruiter?.name || null,
    hasOfferLetter: false,
  }),
}));
vi.mock("@/features/screening-coordination/interviews/data", () => ({
  useGetScreeningsQuery: () => ({ data: { data: { items: [] } }, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/features/projects/api", () => ({
  useGetProjectQuery: () => ({ data: null }),
}));

vi.mock("../api", () => ({
  useGetInterviewsQuery: () => ({
    data: {
      data: {
        interviews: interviewPassedMocks.passedInterviews,
        pagination: {
          page: 1,
          limit: 10,
          total: interviewPassedMocks.passedInterviews.length,
          totalPages: 1,
        },
      },
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useGetSummaryStatsQuery: () => ({
    data: {
      data: {
        shortlistPending: 0,
        shortlisted: 0,
        shortlistRejected: 0,
        interviewScheduled: 0,
        interviewPassed: 2,
        interviewRejected: 0,
        interviewBackout: 0,
        screeningAssigned: 0,
        screeningScheduled: 0,
        screeningPassed: 0,
        screeningRejected: 0,
        onHold: 0,
        screeningTraining: 0,
        interviewCompleted: 0,
        passRate: 0,
      },
    },
    refetch: vi.fn(),
  }),
  useGetShortlistPendingQuery: () => ({ data: null, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() }),
  useGetShortlistedQuery: () => ({ data: null, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() }),
  useGetNotShortlistedQuery: () => ({ data: null, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() }),
  useGetAssignedScreeningsQuery: () => ({ data: null, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() }),
  useGetUpcomingScreeningsQuery: () => ({ data: null, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() }),
  useUpdateClientDecisionMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateBulkClientDecisionMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateBulkInterviewStatusMutation: () => [vi.fn(), { isLoading: false }],
  useCreateBulkInterviewsMutation: () => [vi.fn(), { isLoading: false }],
  useSendForProcessingMutation: () => [vi.fn(), { isLoading: false }],
  useSendBulkForProcessingMutation: () => [vi.fn(), { isLoading: false }],
}));

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

async function openInterviewPassedTable(user: ReturnType<typeof userEvent.setup>) {
  render(<InterviewsPage />);
  const tile = await screen.findByRole("button", { name: /Interview Passed/i });
  await user.click(tile);
  await screen.findByText("Jane Doe");
}

const setPassedInterviews = (...interviews: any[]) => {
  interviewPassedMocks.passedInterviews.splice(
    0,
    interviewPassedMocks.passedInterviews.length,
    ...interviews,
  );
};

describe("InterviewsPage — interview passed actions", () => {
  beforeEach(() => {
    interviewPassedMocks.isCoordinator = true;
    setPassedInterviews(passedInterview, passedInterviewSent);
  });

  it("shows Send for Processing for Interview Coordinator on unsent rows", async () => {
    const user = userEvent.setup();
    await openInterviewPassedTable(user);

    expect(screen.getAllByRole("button", { name: /Send for Processing/i }).length).toBeGreaterThan(0);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("opens send for processing modal when row action is clicked", async () => {
    const user = userEvent.setup();
    await openInterviewPassedTable(user);

    const sendButtons = screen.getAllByRole("button", { name: /Send for Processing/i });
    await user.click(sendButtons[0]);

    expect(screen.getByTestId("send-for-processing-modal")).toBeInTheDocument();
    expect(screen.getByText("Confirm send for Jane Doe")).toBeInTheDocument();
  });

  it("hides Send for Processing when candidate already sent", async () => {
    const user = userEvent.setup();
    await openInterviewPassedTable(user);

    const johnRow = screen.getByText("John Sent").closest("tr");
    expect(johnRow).toBeTruthy();
    expect(within(johnRow!).queryByRole("button", { name: /Send for Processing/i })).not.toBeInTheDocument();
    expect(within(johnRow!).getByText("Sent")).toBeInTheDocument();
  });

  it("hides Send for Processing for non-coordinator users", async () => {
    interviewPassedMocks.isCoordinator = false;
    const user = userEvent.setup();
    await openInterviewPassedTable(user);

    expect(screen.queryByRole("button", { name: /Send for Processing/i })).not.toBeInTheDocument();
  });

});
