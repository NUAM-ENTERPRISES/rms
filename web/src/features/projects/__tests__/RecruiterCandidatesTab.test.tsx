import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import RecruiterCandidatesTab from "../components/RecruiterCandidatesTab";

// Mock react-router navigate
vi.mock("react-router-dom", async () => ({
  useNavigate: () => vi.fn(),
}));

// Mock projects and candidates hooks
vi.mock("@/features/projects", () => ({
  useGetProjectCandidatesByRoleQuery: () => ({ data: { data: [] } }),
  useSendForVerificationMutation: () => [vi.fn(), { isLoading: false }],
  useGetProjectQuery: () => ({ data: { data: { id: "proj1", title: "Test Project" } } }),
}));

vi.mock("@/features/candidates", () => ({
  useGetRecruiterMyCandidatesQuery: () => ({
    data: {
      data: [
        {
          id: "c1",
          firstName: "Macon",
          lastName: "Carroll",
          email: "zuze@mailinator.com",
          currentStatus: { statusName: "Untouched" },
          projects: [
            {
              projectId: "proj1",
              mainStatus: { name: "documents", label: "Documents" },
              subStatus: { name: "verification_in_progress_document", label: "Verification In Progress" },
              currentProjectStatus: { statusName: "documents" },
            },
          ],
        },
        {
          id: "c2",
          firstName: "Kenyon",
          lastName: "Garrett",
          email: "fiva@mailinator.com",
          currentStatus: { statusName: "Untouched" },
          projects: [
            {
              projectId: "proj1",
              mainStatus: { name: "nominated", label: "Nominated" },
              subStatus: { name: "nominated_initial", label: "Nominated" },
              currentProjectStatus: { statusName: "nominated" },
            },
          ],
        },
      ],
      pagination: { page: 1, limit: 10, totalCount: 2, totalPages: 1 },
    },
    isLoading: false,
  }),
  useGetCandidatesQuery: () => ({ data: { data: [] }, isLoading: false }),
  useAssignToProjectMutation: () => [vi.fn(), { isLoading: false }],
}));

// Mock app selector to provide a recruiter user
vi.mock("@/app/hooks", () => ({
  useAppSelector: () => ({ user: { id: "r1", roles: ["Recruiter"] } }),
}));

describe("RecruiterCandidatesTab", () => {
  it("shows project sub-status on candidate card when present", () => {
    render(<RecruiterCandidatesTab projectId="proj1" />);

    // Candidate name should render
    expect(screen.getByText(/Macon Carroll/)).toBeInTheDocument();

    // Project sub-status label should be visible on the card
    expect(screen.getByText("Verification In Progress")).toBeInTheDocument();

    // Candidate overall status should not be shown as project status on card
    expect(screen.queryByText("Untouched")).not.toBeInTheDocument();

    // The Send for Verification button should NOT be visible in the
    // Macon Carroll card that is in 'Verification In Progress'
    const maconCard = screen.getByText(/Macon Carroll/).closest(".group");
    expect(maconCard).toBeTruthy();
    expect(within(maconCard as Element).queryByText(/Send for Verification/i)).not.toBeInTheDocument();
  });

  it("shows Send for Verification button when candidate is nominated or not in project", () => {
    // Use the already-mocked candidates (includes a nominated candidate)
    render(<RecruiterCandidatesTab projectId="proj1" />);

    // Nominated project status label should be visible
    expect(screen.getByText("Nominated")).toBeInTheDocument();

    // The Send for Verification button should be visible for the nominated candidate
    const kenCard = screen.getByText(/Kenyon Garrett/).closest(".group");
    expect(kenCard).toBeTruthy();
    expect(within(kenCard as Element).getByText(/Send for Verification/i)).toBeInTheDocument();

    // The verification-in-progress candidate must still not show the button
    const maconCard = screen.getByText(/Macon Carroll/).closest(".group");
    expect(maconCard).toBeTruthy();
    expect(within(maconCard as Element).queryByText(/Send for Verification/i)).not.toBeInTheDocument();
  });
});
