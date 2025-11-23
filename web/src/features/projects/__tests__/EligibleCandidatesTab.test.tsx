import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import EligibleCandidatesTab from "../components/EligibleCandidatesTab";

// Mock react-router navigate
vi.mock("react-router-dom", async () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/features/projects", () => ({
  useGetEligibleCandidatesQuery: () => ({
    data: { data: [
      {
        id: "c1",
        firstName: "Macon",
        lastName: "Carroll",
        email: "zuze@mailinator.com",
        projects: [
          {
            projectId: "proj1",
            mainStatus: { name: "documents", label: "Documents" },
            subStatus: { name: "verification_in_progress_document", label: "Verification In Progress" },
            currentProjectStatus: { statusName: "documents" },
          },
        ],
        matchScore: 90,
      },
      {
        id: "c2",
        firstName: "Kenyon",
        lastName: "Garrett",
        email: "fiva@mailinator.com",
        projects: [
          {
            projectId: "proj1",
            mainStatus: { name: "nominated", label: "Nominated" },
            subStatus: { name: "nominated_initial", label: "Nominated" },
            currentProjectStatus: { statusName: "nominated" },
          },
        ],
        matchScore: 95,
      },
      {
        id: "c3",
        firstName: "NotInProject",
        lastName: "User",
        email: "notin@mailinator.com",
        projects: [],
        matchScore: 70,
      },
    ] },
    isLoading: false,
  }),
  useGetProjectCandidatesByRoleQuery: () => ({ data: { data: [] } }),
  useSendForVerificationMutation: () => [vi.fn(), { isLoading: false }],
  useGetProjectQuery: () => ({ data: { data: { id: "proj1", title: "Test Project" } } }),
}));

vi.mock("@/features/candidates", () => ({
  useAssignToProjectMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@/app/hooks", () => ({
  useAppSelector: () => ({ user: { id: "r1", roles: ["Manager"] } }),
}));

describe("EligibleCandidatesTab", () => {
  it("does not show Send for Verification on verification-in-progress candidate", () => {
    render(<EligibleCandidatesTab projectId="proj1" />);

    // Macon is in verification in progress
    const maconCard = screen.getByText(/Macon Carroll/).closest(".group");
    expect(maconCard).toBeTruthy();
    expect(within(maconCard as Element).queryByText(/Send for Verification/i)).not.toBeInTheDocument();
  });

  it("shows Send for Verification on nominated and not-in-project candidates", () => {
    render(<EligibleCandidatesTab projectId="proj1" />);

    // Kenyon nominated - should get button
    const kenCard = screen.getByText(/Kenyon Garrett/).closest(".group");
    expect(kenCard).toBeTruthy();
    expect(within(kenCard as Element).getByText(/Send for Verification/i)).toBeInTheDocument();

    // NotInProject - not assigned, should also show button
    const notInCard = screen.getByText(/NotInProject User/).closest(".group");
    expect(notInCard).toBeTruthy();
    expect(within(notInCard as Element).getByText(/Send for Verification/i)).toBeInTheDocument();
  });
});
