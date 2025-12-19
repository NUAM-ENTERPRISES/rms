import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import ProjectCandidatesBoard from "../components/ProjectCandidatesBoard";

// Mock react-router navigate (not used here but consistent)
vi.mock("react-router-dom", async () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/features/projects", () => ({
  useGetEligibleCandidatesQuery: () => ({ data: { data: [] }, isLoading: false }),
  useGetProjectCandidatesByRoleQuery: () => ({ data: { data: [] } }),
}));

vi.mock("@/features/candidates", () => ({
  useGetRecruiterMyCandidatesQuery: () => ({ data: { data: [] }, isLoading: false }),
  useGetCandidatesQuery: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock("@/features/projects", async () => (await vi.importActual("@/features/projects")));

describe("ProjectCandidatesBoard - skip document verification", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("hides Send for Verification and shows alert icon for All Candidates when project marks skip", async () => {
    vi.doMock("@/app/hooks", () => ({ useAppSelector: () => ({ user: { id: "u1", roles: ["Manager"] } }) }));
    const candidate = {
      id: "c-skip",
      firstName: "Skip",
      lastName: "User",
      email: "skip@mailinator.com",
      projects: [
        {
          projectId: "proj-skip",
          isSendedForDocumentVerification: false,
          mainStatus: { name: "screening" },
          subStatus: { name: "screening_assigned" },
        },
      ],
    };

    vi.doMock("@/features/candidates", () => ({
      useGetRecruiterMyCandidatesQuery: () => ({ data: { data: [] }, isLoading: false }),
      useGetCandidatesQuery: () => ({ data: { data: [candidate] }, isLoading: false }),
    }));
    vi.doMock("@/features/projects", () => ({
      useGetEligibleCandidatesQuery: () => ({ data: { data: [] }, isLoading: false }),
      useGetProjectCandidatesByRoleQuery: () => ({ data: { data: [] } }),
      useGetProjectQuery: () => ({ data: { data: { id: "proj-skip", title: "Test" } } }),
      useSendForVerificationMutation: () => [() => {}, { isLoading: false }],
    }));

    const { default: ProjectCandidatesBoardLocal } = await import("../components/ProjectCandidatesBoard");

    render(
      <ProjectCandidatesBoardLocal
        projectId="proj-skip"
        nominatedCandidates={[]}
        isLoadingNominated={false}
        searchTerm=""
        selectedStatus="all"
        onSearchChange={() => {}}
        onStatusChange={() => {}}
        statuses={[]}
        onViewCandidate={() => {}}
        onAssignCandidate={() => {}}
        onVerifyCandidate={() => {}}
      />
    );

    const card = screen.getByText(/Skip User/).closest(".group");
    expect(card).toBeTruthy();

    // The Send for Verification button should NOT be present
    expect(within(card as Element).queryByText(/Send for Verification/i)).not.toBeInTheDocument();

    // The alert button (aria-label) should be present
    expect(within(card as Element).getByLabelText(/Skip document verification info/i)).toBeInTheDocument();
  });

  it("hides Send for Verification and shows alert icon for My Candidates when project marks skip", async () => {
    vi.doMock("@/app/hooks", () => ({ useAppSelector: () => ({ user: { id: "r1", roles: ["Recruiter"] } }) }));
    const candidate = {
      id: "c-skip-2",
      firstName: "Skip",
      lastName: "Recruiter",
      email: "skip2@mailinator.com",
      projects: [
        {
          projectId: "proj-skip-2",
          isSendedForDocumentVerification: false,
          mainStatus: { name: "screening" },
          subStatus: { name: "screening_assigned" },
        },
      ],
    };

    vi.doMock("@/features/candidates", () => ({
      useGetRecruiterMyCandidatesQuery: () => ({ data: { data: [candidate] }, isLoading: false }),
      useGetCandidatesQuery: () => ({ data: { data: [] }, isLoading: false }),
    }));
    vi.doMock("@/features/projects", () => ({
      useGetEligibleCandidatesQuery: () => ({ data: { data: [] }, isLoading: false }),
      useGetProjectCandidatesByRoleQuery: () => ({ data: { data: [] } }),
      useGetProjectQuery: () => ({ data: { data: { id: "proj-skip-2", title: "Test" } } }),
      useSendForVerificationMutation: () => [() => {}, { isLoading: false }],
    }));

    const { default: ProjectCandidatesBoardLocal } = await import("../components/ProjectCandidatesBoard");

    render(
      <ProjectCandidatesBoardLocal
        projectId="proj-skip-2"
        nominatedCandidates={[]}
        isLoadingNominated={false}
        searchTerm=""
        selectedStatus="all"
        onSearchChange={() => {}}
        onStatusChange={() => {}}
        statuses={[]}
        onViewCandidate={() => {}}
        onAssignCandidate={() => {}}
        onVerifyCandidate={() => {}}
      />
    );

    const card = screen.getByText(/Skip Recruiter/).closest(".group");
    expect(card).toBeTruthy();

    // The Send for Verification button should NOT be present
    expect(within(card as Element).queryByText(/Send for Verification/i)).not.toBeInTheDocument();

    // The alert button (aria-label) should be present
    expect(within(card as Element).getByLabelText(/Skip document verification info/i)).toBeInTheDocument();
  });

  it("shows Send for Verification for nominated candidate even if isSendedForDocumentVerification is false (All Candidates)", async () => {
    vi.doMock("@/app/hooks", () => ({ useAppSelector: () => ({ user: { id: "u1", roles: ["Manager"] } }) }));
    const candidate = {
      id: "c-nom",
      firstName: "Nom",
      lastName: "User",
      email: "nom@mailinator.com",
      projects: [
        {
          projectId: "proj-nom",
          isSendedForDocumentVerification: false,
          mainStatus: { name: "nominated" },
          subStatus: { name: "nominated_initial" },
        },
      ],
    };

    vi.doMock("@/features/candidates", () => ({
      useGetRecruiterMyCandidatesQuery: () => ({ data: { data: [] }, isLoading: false }),
      useGetCandidatesQuery: () => ({ data: { data: [candidate] }, isLoading: false }),
    }));
    vi.doMock("@/features/projects", () => ({
      useGetEligibleCandidatesQuery: () => ({ data: { data: [] }, isLoading: false }),
      useGetProjectCandidatesByRoleQuery: () => ({ data: { data: [] } }),
      useGetProjectQuery: () => ({ data: { data: { id: "proj-nom", title: "Test" } } }),
      useSendForVerificationMutation: () => [() => {}, { isLoading: false }],
    }));

    const { default: ProjectCandidatesBoardLocal } = await import("../components/ProjectCandidatesBoard");

    render(
      <ProjectCandidatesBoardLocal
        projectId="proj-nom"
        nominatedCandidates={[]}
        isLoadingNominated={false}
        searchTerm=""
        selectedStatus="all"
        onSearchChange={() => {}}
        onStatusChange={() => {}}
        statuses={[]}
        onViewCandidate={() => {}}
        onAssignCandidate={() => {}}
        onVerifyCandidate={() => {}}
      />
    );

    const card = screen.getByText(/Nom User/).closest(".group");
    expect(card).toBeTruthy();

    // The Send for Verification button SHOULD be present for nominated
    expect(within(card as Element).getByText(/Send for Verification/i)).toBeInTheDocument();
    // The alert for skipping should NOT be present
    expect(within(card as Element).queryByLabelText(/Skip document verification info/i)).not.toBeInTheDocument();
  });

  it("shows Send for Verification for nominated candidate even if isSendedForDocumentVerification is false (My Candidates)", async () => {
    vi.doMock("@/app/hooks", () => ({ useAppSelector: () => ({ user: { id: "r1", roles: ["Recruiter"] } }) }));
    const candidate = {
      id: "c-nom-2",
      firstName: "Nom",
      lastName: "Recruiter",
      email: "nom2@mailinator.com",
      projects: [
        {
          projectId: "proj-nom-2",
          isSendedForDocumentVerification: false,
          mainStatus: { name: "nominated" },
          subStatus: { name: "nominated_initial" },
        },
      ],
    };

    vi.doMock("@/features/candidates", () => ({
      useGetRecruiterMyCandidatesQuery: () => ({ data: { data: [candidate] }, isLoading: false }),
      useGetCandidatesQuery: () => ({ data: { data: [] }, isLoading: false }),
    }));
    vi.doMock("@/features/projects", () => ({
      useGetEligibleCandidatesQuery: () => ({ data: { data: [] }, isLoading: false }),
      useGetProjectCandidatesByRoleQuery: () => ({ data: { data: [] } }),
      useGetProjectQuery: () => ({ data: { data: { id: "proj-nom-2", title: "Test" } } }),
      useSendForVerificationMutation: () => [() => {}, { isLoading: false }],
    }));

    const { default: ProjectCandidatesBoardLocal } = await import("../components/ProjectCandidatesBoard");

    render(
      <ProjectCandidatesBoardLocal
        projectId="proj-nom-2"
        nominatedCandidates={[]}
        isLoadingNominated={false}
        searchTerm=""
        selectedStatus="all"
        onSearchChange={() => {}}
        onStatusChange={() => {}}
        statuses={[]}
        onViewCandidate={() => {}}
        onAssignCandidate={() => {}}
        onVerifyCandidate={() => {}}
      />
    );

    const card = screen.getByText(/Nom Recruiter/).closest(".group");
    expect(card).toBeTruthy();

    // The Send for Verification button SHOULD be present for nominated
    expect(within(card as Element).getByText(/Send for Verification/i)).toBeInTheDocument();
    // The alert for skipping should NOT be present
    expect(within(card as Element).queryByLabelText(/Skip document verification info/i)).not.toBeInTheDocument();
  });
});
