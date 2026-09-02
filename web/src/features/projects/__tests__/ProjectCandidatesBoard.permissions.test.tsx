import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import ProjectCandidatesBoard from "../components/ProjectCandidatesBoard";

const authState = vi.hoisted(() => ({
  user: {
    id: "m1",
    roles: ["Manager"],
    permissions: ["*"],
  } as { id: string; roles: string[]; permissions: string[] },
}));

const eligibleState = vi.hoisted(() => ({
  candidates: [
    {
      id: "cand-eli",
      candidateId: "cand-eli",
      firstName: "Eli",
      lastName: "Gible",
      email: "eli@example.com",
    },
  ] as Array<Record<string, unknown>>,
}));

vi.mock("react-router-dom", async () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/app/hooks", () => ({
  useAppSelector: () => ({ user: authState.user }),
}));

vi.mock("@/features/projects", () => ({
  useGetEligibleCandidatesQuery: () => ({
    data: { data: eligibleState.candidates },
    isLoading: false,
  }),
  useCheckBulkCandidateEligibilityQuery: () => ({
    data: { data: [] },
    isLoading: false,
  }),
}));

vi.mock("@/features/candidates", () => ({
  useGetConsolidatedCandidatesQuery: () => ({
    data: { data: { candidates: [] } },
    isLoading: false,
  }),
}));

const openProject = {
  id: "proj-open",
  title: "Open Project",
  status: "ACTIVE",
  deadline: "2030-01-01",
  rolesNeeded: [],
};

const nominatedCandidate = {
  id: "cp-nom",
  candidateId: "cand-nom",
  firstName: "Nom",
  lastName: "Inated",
  email: "nom@example.com",
  projectSubStatus: { name: "nominated_initial", label: "Nominated" },
  isSendedForDocumentVerification: false,
  matchScore: 85,
};

function renderBoard(
  onAssignCandidate: (candidateId: string, candidateName: string) => void = vi.fn(),
) {
  return render(
    <ProjectCandidatesBoard
      projectId="proj-open"
      project={openProject}
      nominatedCandidates={[nominatedCandidate]}
      isLoadingNominated={false}
      searchTerm=""
      selectedRole="all"
      onSearchChange={() => {}}
      onRoleChange={() => {}}
      roles={[]}
      onViewCandidate={() => {}}
      onAssignCandidate={onAssignCandidate}
      onVerifyCandidate={() => {}}
    />,
  );
}

describe("ProjectCandidatesBoard - pipeline action permissions", () => {
  beforeEach(() => {
    authState.user = {
      id: "m1",
      roles: ["Manager"],
      permissions: ["*"],
    };
  });

  it("lets a Manager with * assign and drop onto Nominated", () => {
    const onAssignCandidate = vi.fn();
    renderBoard(onAssignCandidate);

    const eligibleCard = screen.getByText(/Eli Gible/).closest(".group");
    expect(eligibleCard).toBeTruthy();
    expect(within(eligibleCard as Element).getByRole("button", { name: /^Assign$/i })).toBeInTheDocument();

    const nominatedCard = screen.getByText(/Nom Inated/).closest(".group");
    expect(nominatedCard).toBeTruthy();
    expect(within(nominatedCard as Element).getByRole("button", { name: /^Verify$/i })).toBeInTheDocument();

    const nominatedList = screen.getByRole("list", { name: "Nominated candidates column" });
    const nominatedColumn = nominatedList.closest("[aria-labelledby]") ?? nominatedList;
    fireEvent.dragOver(nominatedColumn, {
      dataTransfer: { dropEffect: "copy" },
    });
    fireEvent.drop(nominatedColumn, {
      dataTransfer: {
        getData: (key: string) => (key === "candidateId" ? "cand-eli" : ""),
      },
    });

    expect(onAssignCandidate).toHaveBeenCalledWith("cand-eli", "Eli Gible");
  });

  it("lets a Recruiter with nominate:candidates assign", () => {
    authState.user = {
      id: "r1",
      roles: ["Recruitment Executive"],
      permissions: ["nominate:candidates", "send:verification"],
    };
    renderBoard();

    const eligibleCard = screen.getByText(/Eli Gible/).closest(".group");
    expect(within(eligibleCard as Element).getByRole("button", { name: /^Assign$/i })).toBeInTheDocument();
  });

  it("hides assign and drop for a custom role without nominate:candidates", () => {
    authState.user = {
      id: "c1",
      roles: ["Custom Role"],
      permissions: ["read:projects"],
    };
    const onAssignCandidate = vi.fn();
    renderBoard(onAssignCandidate);

    const eligibleCard = screen.getByText(/Eli Gible/).closest(".group");
    expect(eligibleCard).toBeTruthy();
    expect(within(eligibleCard as Element).queryByRole("button", { name: /^Assign$/i })).not.toBeInTheDocument();

    fireEvent.drop(screen.getByRole("list", { name: "Nominated candidates column" }).closest("[aria-labelledby]") ?? screen.getByRole("list", { name: "Nominated candidates column" }), {
      dataTransfer: {
        getData: () => "cand-eli",
      },
    });
    expect(onAssignCandidate).not.toHaveBeenCalled();
  });

  it("hides Send for Verification without send:verification", () => {
    authState.user = {
      id: "r2",
      roles: ["Recruitment Executive"],
      permissions: ["nominate:candidates"],
    };
    renderBoard();

    const nominatedCard = screen.getByText(/Nom Inated/).closest(".group");
    expect(nominatedCard).toBeTruthy();
    expect(within(nominatedCard as Element).queryByRole("button", { name: /^Verify$/i })).not.toBeInTheDocument();
    expect(
      within(nominatedCard as Element).queryByText(/Send for Verification/i),
    ).not.toBeInTheDocument();
  });
});
