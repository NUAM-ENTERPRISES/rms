import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import SubmittedCandidatesSection from "../components/SubmittedCandidatesSection";

// Mock react-router navigate
vi.mock("react-router-dom", async () => ({
  useNavigate: () => vi.fn(),
}));

// Mock the project API hooks
vi.mock("../api", () => {
  const useGetNominatedCandidatesQuery = vi.fn(() => ({
    data: {
      data: {
        candidates: [
          {
            id: "cmi9wyx0p0001q4xwpr6l73ca",
            candidateId: "cmi6y41q20001q4gv4ttndpzh",
            firstName: "Kenyon",
            lastName: "Garrett",
            email: "fiva@mailinator.com",
            countryCode: "+91",
            mobileNumber: "7865565445",
            experience: 4,
            skills: [],
            expectedSalary: null,
            team: null,
            currentStatus: {
              id: 1,
              statusName: "Untouched",
            },
            projectMainStatus: {
              id: "cmi8q5uz90000q4j0zyx5h5ch",
              name: "nominated",
              label: "Nominated",
            },
            projectSubStatus: {
              id: "cmi8q5uzi000aq4j0tbkb145k",
              name: "nominated_initial",
              label: "Nominated",
            },
            recruiter: { id: "cmhx4cmc900dnq4ef89hirvxy", name: "Emma Recruiter" },
            nominatedAt: "2025-11-22T06:34:24.553Z",
            assignedAt: "2025-11-22T06:34:24.552Z",
          },
          {
            id: "c-verif",
            candidateId: "c-verif-cand",
            firstName: "Verif",
            lastName: "InProgress",
            currentStatus: { id: 1, statusName: "Untouched" },
            projectMainStatus: { id: "main1", name: "documents", label: "Documents" },
            projectSubStatus: { id: "sub1", name: "verification_in_progress_document", label: "Verification In Progress" },
          },
        ],
        pagination: { page: 1, limit: 5, total: 2, totalPages: 1 },
      },
    },
    isLoading: false,
  }));

  return {
    useGetNominatedCandidatesQuery,
    useGetProjectQuery: () => ({ data: { data: { id: "project-1", title: "Project 1" } } }),
    useGetCandidateProjectStatusesQuery: () => ({ data: { data: { statuses: [] } } }),
    useSendForVerificationMutation: () => [vi.fn(), { isLoading: false }],
  };
});


// Mock app selector to provide a user
vi.mock("@/app/hooks", () => ({
  useAppSelector: () => ({ user: { id: "cmhx4cmc900dnq4ef89hirvxy" } }),
}));

describe("SubmittedCandidatesSection", () => {
  it("shows sub-status on candidate card and not the overall candidate status when project status exists", () => {
    render(<SubmittedCandidatesSection projectId="project-1" />);

    // Candidate name should render
    expect(screen.getByText(/Kenyon Garrett/)).toBeInTheDocument();

    // We expect the project sub-status label to be shown on the candidate card
    const card = screen.getByLabelText("View candidate Kenyon Garrett");
    expect(within(card).getByText("Nominated")).toBeInTheDocument();

    // The candidate's overall status should not render on the same card when project status exists
    expect(within(card).queryByText("Untouched")).not.toBeInTheDocument();
  });

  it("does not show Send for Verification for candidates in verification in progress", () => {
    render(<SubmittedCandidatesSection projectId="project-1" />);

    // Sub-status label should be visible for the verification candidate on its card
    const verifCard = screen.getByLabelText("View candidate Verif InProgress");
    expect(within(verifCard).getByText("Verification In Progress")).toBeInTheDocument();

    // The verification candidate's card should NOT show the Send for Verification button
    expect(within(verifCard).queryByText(/Send for Verification/i)).not.toBeInTheDocument();
  });

  it("sends subStatus name when initialSelectedStatus maps to an underscore-style sub-status name", async () => {
    // override the statuses returned by the statuses hook for this test
    const api = await import("../api");

    api.useGetCandidateProjectStatusesQuery = () => ({
      data: { data: { statuses: [ { id: "s1", name: "nominated_initial", label: "Nominated" } ] } },
    });

    // reset and reconfigure the spy to ensure it captures this render
    api.useGetNominatedCandidatesQuery.mockReset();
    api.useGetNominatedCandidatesQuery.mockImplementation(() => ({
      data: {
        data: { candidates: [], pagination: { page: 1, limit: 5, total: 0, totalPages: 1 } },
      },
      isLoading: false,
    }));

    render(<SubmittedCandidatesSection projectId="project-1" initialSelectedStatus="s1" />);

    expect(api.useGetNominatedCandidatesQuery).toHaveBeenCalled();
    const calledWith = api.useGetNominatedCandidatesQuery.mock.calls[0][0];
    // name includes an underscore which represents a sub-status in our heuristics
    expect(calledWith.subStatus).toBe("nominated_initial");
    expect(calledWith.subStatusId).toBeUndefined();
  });

  it("sends status name when initialSelectedStatus maps to a main status name", async () => {
    const api = await import("../api");

    api.useGetCandidateProjectStatusesQuery = () => ({
      data: { data: { statuses: [ { id: "sMain", name: "nominated", label: "Nominated" } ] } },
    });

    api.useGetNominatedCandidatesQuery.mockReset();
    api.useGetNominatedCandidatesQuery.mockImplementation(() => ({
      data: {
        data: { candidates: [], pagination: { page: 1, limit: 5, total: 0, totalPages: 1 } },
      },
      isLoading: false,
    }));

    render(<SubmittedCandidatesSection projectId="project-1" initialSelectedStatus="sMain" />);

    expect(api.useGetNominatedCandidatesQuery).toHaveBeenCalled();
    const calledWith = api.useGetNominatedCandidatesQuery.mock.calls[0][0];
    expect(calledWith.status).toBe("nominated");
    expect(calledWith.statusId).toBeUndefined();
  });
});
