import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("react-router-dom", async () => ({
  useNavigate: () => vi.fn(),
}));

describe("ProjectCandidatesBoard - search by qualification", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("shows candidate when search term matches qualification (shortName/name)", async () => {
    vi.doMock("@/app/hooks", () => ({ useAppSelector: () => ({ user: { id: "m1", roles: ["Manager"] } }) }));

    const candidate = {
      id: "c-q1",
      firstName: "Alice",
      lastName: "Qualified",
      email: "alice@example.com",
      qualifications: [
        {
          id: "q1",
          qualification: {
            id: "qual-bsc",
            name: "Bachelor of Science",
            shortName: "BSc",
            field: "Computer Science",
            level: "bachelor",
          },
          university: "XYZ University",
          graduationYear: 2018,
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
      useCheckBulkCandidateEligibilityQuery: () => ({ data: { data: [] }, isLoading: false }),
    }));

    const { default: ProjectCandidatesBoardLocal } = await import("../components/ProjectCandidatesBoard");

    // searchTerm 'bsc' should match the candidate's qualification shortName
    render(
      <ProjectCandidatesBoardLocal
        projectId="proj-1"
        nominatedCandidates={[]}
        isLoadingNominated={false}
        searchTerm="bsc"
        selectedRole="all"
        onSearchChange={() => {}}
        onRoleChange={() => {}}
        roles={[]}
        onViewCandidate={() => {}}
        onAssignCandidate={() => {}}
        onVerifyCandidate={() => {}}
      />
    );

    expect(screen.getByText(/Alice Qualified/)).toBeInTheDocument();
    // matching qualification pill should be visible
    expect(screen.getByText(/BSc/)).toBeInTheDocument();

    // contact buttons should be visible in the `All` column cards
    expect(screen.getByTestId("candidate-whatsapp-btn")).toBeInTheDocument();
    expect(screen.getByTestId("candidate-call-btn")).toBeInTheDocument();
  });

  it("does not show candidate when search term does not match", async () => {
    vi.doMock("@/app/hooks", () => ({ useAppSelector: () => ({ user: { id: "m1", roles: ["Manager"] } }) }));

    const candidate = {
      id: "c-q2",
      firstName: "Bob",
      lastName: "NoMatch",
      email: "bob@example.com",
      qualifications: [
        {
          id: "q2",
          qualification: { id: "qual-xyz", name: "Diploma of Arts", shortName: "DA", field: "Arts" },
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
      useCheckBulkCandidateEligibilityQuery: () => ({ data: { data: [] }, isLoading: false }),
    }));

    const { default: ProjectCandidatesBoardLocal } = await import("../components/ProjectCandidatesBoard");

    render(
      <ProjectCandidatesBoardLocal
        projectId="proj-1"
        nominatedCandidates={[]}
        isLoadingNominated={false}
        searchTerm="bsc"
        selectedRole="all"
        onSearchChange={() => {}}
        onRoleChange={() => {}}
        roles={[]}
        onViewCandidate={() => {}}
        onAssignCandidate={() => {}}
        onVerifyCandidate={() => {}}
      />
    );

    expect(screen.queryByText(/Bob NoMatch/)).not.toBeInTheDocument();
  });

  it("shows matching qualification pill for candidates in Nominated and Eligible columns when searching", async () => {
    vi.doMock("@/app/hooks", () => ({ useAppSelector: () => ({ user: { id: "m1", roles: ["Manager"] } }) }));

    // Each candidate intentionally contains duplicate BSc qualification entries
    // (both shapes / duplicate records) — UI should dedupe and show only one BSc pill per card.
    const nominatedCandidate = {
      id: "c-nom",
      firstName: "Nomi",
      lastName: "Nated",
      email: "nomi@example.com",
      // duplicate entries: one direct and one nested
      qualifications: [
        { id: "q-n1", name: "Bachelor of Science", field: "Computer Science", level: "bachelor", qualification: { shortName: "BSc" } },
        { id: "q-n2", qualification: { id: "qual-bsc", name: "Bachelor of Science", shortName: "BSc", field: "Computer Science" }, university: "XYZ University" },
      ],
    };

    const eligibleCandidate = {
      id: "c-elig",
      firstName: "Eli",
      lastName: "Gible",
      email: "eli@example.com",
      // duplicate entries across both `qualifications` and `candidateQualifications` shapes
      qualifications: [
        { id: "q-e1", qualification: { id: "qual-bsc", name: "Bachelor of Science", shortName: "BSc", field: "Computer Science" }, university: "XYZ University" },
        { id: "q-e2", name: "Bachelor of Science", field: "Computer Science", level: "bachelor", qualification: { shortName: "BSc" } },
      ],
      candidateQualifications: [
        { id: "cq-e1", name: "Bachelor of Science", level: "bachelor", field: "Computer Science", university: "XYZ University" },
      ],
    };

    // All candidates list empty for this test; we only assert nominated & eligible
    vi.doMock("@/features/candidates", () => ({
      useGetRecruiterMyCandidatesQuery: () => ({ data: { data: [] }, isLoading: false }),
      useGetCandidatesQuery: () => ({ data: { data: [] }, isLoading: false }),
    }));

    vi.doMock("@/features/projects", () => ({
      useGetEligibleCandidatesQuery: () => ({ data: { data: [eligibleCandidate] }, isLoading: false }),
      useGetProjectCandidatesByRoleQuery: () => ({ data: { data: [] } }),
      useCheckBulkCandidateEligibilityQuery: () => ({ data: { data: [] }, isLoading: false }),
    }));

    const { default: ProjectCandidatesBoardLocal } = await import("../components/ProjectCandidatesBoard");

    render(
      <ProjectCandidatesBoardLocal
        projectId="proj-1"
        nominatedCandidates={[nominatedCandidate]}
        isLoadingNominated={false}
        searchTerm="bsc"
        selectedRole="all"
        onSearchChange={() => {}}
        onRoleChange={() => {}}
        roles={[]}
        onViewCandidate={() => {}}
        onAssignCandidate={() => {}}
        onVerifyCandidate={() => {}}
      />
    );

    // Both nominated and eligible matching qualifications should be visible
    expect(screen.getByText(/Nomi Nated/)).toBeInTheDocument();
    expect(screen.getByText(/Eli Gible/)).toBeInTheDocument();

    // Each candidate has duplicate BSc entries in their payload but the UI should
    // show exactly one BSc pill per candidate -> total BSc pills should be 2.
    const bscPills = screen.getAllByText(/BSc/);
    expect(bscPills.length).toBe(2);

    // Eligible candidate should show contact buttons (eligible column)
    const eligibleWaBtns = screen.getAllByTestId("candidate-whatsapp-btn");
    const eligibleCallBtns = screen.getAllByTestId("candidate-call-btn");
    expect(eligibleWaBtns.length).toBeGreaterThanOrEqual(1);
    expect(eligibleCallBtns.length).toBeGreaterThanOrEqual(1);

    // Nominated candidate should NOT show contact buttons (they are only for Eligible/All)
    const nominatedCard = screen.getByText(/Nomi Nated/).closest('article') || screen.getByText(/Nomi Nated/).closest('div');
    if (nominatedCard) {
      expect(nominatedCard.querySelector('[data-testid="candidate-whatsapp-btn"]')).toBeNull();
      expect(nominatedCard.querySelector('[data-testid="candidate-call-btn"]')).toBeNull();
    }
  });
});
