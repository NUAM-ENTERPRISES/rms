import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import ProjectCandidatesBoard from "../components/ProjectCandidatesBoard";

vi.mock("react-router-dom", async () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/app/hooks", () => ({
  useAppSelector: () => ({ user: { id: "r1", roles: ["Recruiter"] } }),
}));

vi.mock("@/features/projects", () => ({
  useGetEligibleCandidatesQuery: () => ({ data: { data: [] }, isLoading: false }),
  useCheckBulkCandidateEligibilityQuery: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock("@/features/candidates", () => ({
  useGetConsolidatedCandidatesQuery: () => ({
    data: { data: { candidates: [] } },
    isLoading: false,
  }),
}));

describe("ProjectCandidatesBoard - closed project pipeline", () => {
  const closedProject = {
    id: "proj-closed",
    title: "Closed Project",
    status: "COMPLETED",
    deadline: "2030-01-01",
    rolesNeeded: [],
  };

  const nominatedCandidate = {
    id: "cp-1",
    candidateId: "cand-1",
    firstName: "Nom",
    lastName: "Inated",
    email: "nom@example.com",
    projectSubStatus: { name: "nominated_initial", label: "Nominated" },
    matchScore: 85,
  };

  it("shows pipeline closed banner and hides assign/verify buttons when project is completed", () => {
    render(
      <ProjectCandidatesBoard
        projectId="proj-closed"
        project={closedProject}
        nominatedCandidates={[nominatedCandidate]}
        isLoadingNominated={false}
        searchTerm=""
        selectedRole="all"
        onSearchChange={() => {}}
        onRoleChange={() => {}}
        roles={[]}
        onViewCandidate={() => {}}
        onAssignCandidate={() => {}}
        onVerifyCandidate={() => {}}
      />
    );

    expect(
      screen.getByText(/This project is completed\. The pipeline to this project is closed\./i)
    ).toBeInTheDocument();

    const card = screen.getByText(/Nom Inated/).closest(".group");
    expect(card).toBeTruthy();

    expect(within(card as Element).queryByText(/Assign to Project/i)).not.toBeInTheDocument();
    expect(within(card as Element).queryByText(/Send for Verification/i)).not.toBeInTheDocument();
  });
});
