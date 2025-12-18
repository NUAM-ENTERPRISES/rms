import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import ScreeningsDashboardPage from "../views/ScreeningsDashboardPage";

// Mock navigation
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

// mock user lookup hook so we don't require RTK store for users in tests
vi.mock("@/shared/hooks/useUsersLookup", () => ({
  useUsersLookup: () => ({ users: [], getUsersByRole: () => [] }),
}));

// mock the templates hooks so RTK store is not required in tests
vi.mock("@/features/screening-coordination/templates/data", () => ({
  useGetTemplatesQuery: () => ({ data: { data: [] }, isLoading: false }),
  useGetTemplatesByRoleQuery: () => ({ data: { data: [] }, isLoading: false }),
}));

// Mock the scheduled screenings hook to return empty list
vi.mock("../data", () => ({
  useGetScreeningsQuery: () => ({ data: { data: [] }, isLoading: false }),
  useGetAssignedScreeningsQuery: () => ({
    data: {
      data: {
        items: [
          {
            id: "ckx7p1abcde",
            candidate: { id: "cand123", firstName: "Amina", lastName: "Khan", email: "amina@example.com" },
            project: { id: "proj456", title: "Nursing - Night Shift" },
            roleNeeded: { id: "role789", designation: "Registered Nurse" },
            recruiter: { id: "rec001", name: "Sam Recruiter", email: "sam@example.com" },
            mainStatus: { id: "m_int", name: "interview", label: "Interview", color: "purple" },
            subStatus: { id: "s_mia", name: "screening_assigned", label: "Screening Assigned", color: "purple" },
            assignedAt: "2025-11-25T09:42:00.000Z",
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
    },
    isLoading: false,
  }),
  useGetUpcomingScreeningsQuery: () => ({ data: { data: [] }, isLoading: false }),
  useCreateScreeningMutation: () => [() => Promise.resolve({}), { isLoading: false }],
}));

describe("ScreeningsDashboardPage — assigned upcoming list", () => {
  it("shows assigned candidate entry in Upcoming Interviews", async () => {
    render(<ScreeningsDashboardPage />);

    // Candidate full name should be visible in upcoming list
    expect(await screen.findByText(/Amina Khan/)).toBeInTheDocument();
    // Role should be visible
    expect(screen.getByText(/Registered Nurse/)).toBeInTheDocument();
    // Should display a schedule action for assigned items
    expect(screen.getByRole('button', { name: /Schedule Screening/i })).toBeInTheDocument();
  });
});
