import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import CandidateDetailPage from "../views/CandidateDetailPage";

// Mock react-router hooks
vi.mock("react-router-dom", async () => ({
  useParams: () => ({ id: "c1" }),
  useNavigate: () => vi.fn(),
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
    },
    isLoading: false,
    error: null,
  }),
}));

// Mock pipeline hook
vi.mock("@/services/candidatesApi", () => ({
  useGetCandidateStatusPipelineQuery: () => ({ data: { data: null }, isLoading: false }),
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

// Stub heavy child components that rely on Redux/RTK Query
vi.mock("@/components/molecules", () => ({
  CandidateResumeList: () => null,
}));

// Stub additional modal components that call RTK hooks
vi.mock("@/components/molecules/QualificationWorkExperienceModal", () => ({
  default: () => null,
}));
vi.mock("../components/StatusUpdateModal", () => ({
  StatusUpdateModal: () => null,
  default: () => null,
}));

describe("CandidateDetailPage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows calculated age based on date of birth", () => {
    // Freeze time to a known date for deterministic age
    vi.setSystemTime(new Date("2025-12-22T00:00:00Z"));

    render(<CandidateDetailPage />);

    expect(screen.getByText(/35 years/)).toBeInTheDocument();
  });
});
