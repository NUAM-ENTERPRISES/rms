import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import OperationsDashboardPage from "./OperationsDashboardPage";

const mockNavigate = vi.fn();
const mockRefetch = vi.fn();
const mockRefetchSummary = vi.fn();

const baseCandidate = {
  id: "candidate-1",
  firstName: "Jane",
  lastName: "Doe",
  countryCode: "+971",
  mobileNumber: "501234567",
  currentStatus: { statusName: "untouched" },
  recruiterAssignments: [
    {
      isActive: true,
      recruiter: { id: "ops-1", name: "Ops User" },
      assignedAt: "2026-06-01T00:00:00.000Z",
      assignmentType: "cre_auto",
      operationsFollowUpStage: "initial",
      operationsCallAttempts: 0,
    },
  ],
};

const weekOneCandidate = {
  ...baseCandidate,
  id: "candidate-2",
  recruiterAssignments: [
    {
      ...baseCandidate.recruiterAssignments[0],
      operationsFollowUpStage: "week_one",
      operationsCallAttempts: 2,
      operationsStageEnteredAt: "2026-06-01T00:00:00.000Z",
    },
  ],
};

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/operations-dashboard" }),
}));

vi.mock("@/app/hooks", () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      auth: {
        user: { id: "ops-1", name: "Ops User", roles: ["Operations"] },
      },
    }),
}));

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: string) => value,
}));

let assignedCandidates = [baseCandidate];

vi.mock("@/services/candidatesApi", () => ({
  useGetMyAssignedCandidatesQuery: () => ({
    data: {
      data: assignedCandidates,
      total: assignedCandidates.length,
      totalPages: 1,
    },
    isLoading: false,
    refetch: mockRefetch,
  }),
  useGetOperationsReassignedCandidatesQuery: () => ({
    data: { data: [], total: 0, totalPages: 0 },
    isLoading: false,
    refetch: mockRefetch,
  }),
  useGetUserCandidatesQuery: () => ({
    data: { data: [], total: 0, totalPages: 0 },
    isLoading: false,
    refetch: mockRefetch,
  }),
  useGetOperationsAssignedSummaryQuery: () => ({
    data: {
      total: 1,
      roleCounters: {
        junk: 0,
        weekOne: 1,
        weekTwo: 1,
        reassigned: 0,
        created: 0,
      },
    },
    refetch: mockRefetchSummary,
  }),
  useGetCandidateStatusesQuery: () => ({ data: { data: [] }, isLoading: false }),
  useMarkCandidateConvertedMutation: () => [vi.fn(), { isLoading: false }],
  useTransferCandidateToRecruiterMutation: () => [vi.fn(), { isLoading: false }],
  useLogOperationsCallMutation: () => [vi.fn(), { isLoading: false }],
  useGetOperationsCallHistoryQuery: () => ({
    data: { data: [] },
    isLoading: false,
  }),
}));

describe("OperationsDashboardPage follow-up workflow", () => {
  beforeEach(() => {
    assignedCandidates = [baseCandidate];
  });

  it("renders 1 Week and 2 Week tiles with counts", () => {
    render(<OperationsDashboardPage />);

    expect(screen.getByText("1 Week Follow-up")).toBeInTheDocument();
    expect(screen.getByText("2 Week Follow-up")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });

  it("shows Log Call button for initial-stage candidates", () => {
    render(<OperationsDashboardPage />);

    expect(screen.getByRole("button", { name: "Log Call" })).toBeInTheDocument();
    expect(screen.getByText("0/3 calls")).toBeInTheDocument();
  });

  it("switches to week_one filter when 1 Week tile is clicked", () => {
    render(<OperationsDashboardPage />);

    fireEvent.click(screen.getByText("1 Week Follow-up"));
    expect(screen.getByText("1 Week Follow-up Candidates")).toBeInTheDocument();
  });

  it("shows Log Call for week_one candidates", () => {
    assignedCandidates = [weekOneCandidate];
    render(<OperationsDashboardPage />);

    fireEvent.click(screen.getByText("1 Week Follow-up"));
    expect(screen.getByRole("button", { name: "Log Call" })).toBeInTheDocument();
    expect(screen.getByText("2 calls")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move to 1 Week" })).not.toBeInTheDocument();
  });
});
