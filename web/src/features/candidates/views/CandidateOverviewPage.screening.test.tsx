import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CandidateOverviewPage from "./CandidateOverviewPage";

const mockNavigate = vi.fn();

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

vi.mock("framer-motion", () => ({
  motion: {
    button: ({ children, ...props }: React.ComponentProps<"button">) => (
      <button {...props}>{children}</button>
    ),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/app/hooks", () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      auth: {
        user: {
          id: "rec-1",
          name: "Test Recruiter",
          roles: ["Recruiter"],
        },
      },
    }),
}));

vi.mock("@/features/candidates/api", () => ({
  useGetCandidateOverviewStatsQuery: vi.fn(),
  useGetCandidateOverviewQuery: vi.fn(),
  useTransferCandidateMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useBulkTransferCandidatesMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
}));

vi.mock("@/components/molecules/DashboardWelcomeHeader", () => ({
  default: () => <div data-testid="welcome-header" />,
}));

vi.mock("../components/RecruiterPerformanceRatingSection", () => ({
  default: () => null,
}));

vi.mock("../components/BulkTransferCandidateDialog", () => ({
  BulkTransferCandidateDialog: () => null,
}));

vi.mock("../components/TransferCandidateDialog", () => ({
  TransferCandidateDialog: () => null,
}));

vi.mock("../components/AdvancedFiltersSheet", () => ({
  AdvancedFiltersSheet: () => null,
}));

vi.mock("../components/UserSelect", () => ({
  UserSelect: () => null,
}));

vi.mock("@/components/molecules", () => ({
  ImageViewer: () => null,
}));

import {
  useGetCandidateOverviewStatsQuery,
  useGetCandidateOverviewQuery,
} from "@/features/candidates/api";

describe("CandidateOverviewPage screening tile", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useGetCandidateOverviewStatsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        stats: {
          total: 10,
          positive: 4,
          untouched: 2,
          negative: 1,
          nominated: 3,
          profileShortlisting: 3,
          registered: 2,
          screening: 5,
          interview: 4,
          processing: 1,
          interviewAssigned: 4,
          documentReceived: 0,
          medical: 0,
          visa: 0,
          deployed: 0,
          registeredSubStatus: { tiles: [] },
          screeningSubStatus: {
            tiles: [
              { key: "assigned", subStatusName: "screening_assigned", label: "Assigned", count: 2 },
            ],
          },
          interviewSubStatus: { tiles: [] },
          processingSubStatus: { tiles: [] },
        },
      },
    });
    (useGetCandidateOverviewQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        data: [
          {
            id: "cand-1",
            firstName: "Alex",
            lastName: "Smith",
            _count: { projects: 2 },
          },
        ],
        pagination: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it("shows Screening tile and navigates to screening-workflow when project button clicked", async () => {
    render(
      <MemoryRouter>
        <CandidateOverviewPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Screening")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Screening/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Screening/i }));

    const projectButton = await screen.findByRole("button", { name: /2 Projects/i });
    fireEvent.click(projectButton);

    expect(mockNavigate).toHaveBeenCalledWith("/candidates/cand-1/screening-workflow");
  });
});
