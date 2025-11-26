import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import ProjectCandidatesBoard from "../components/ProjectCandidatesBoard";

// Mock app selector
vi.mock("@/app/hooks", () => ({
  useAppSelector: () => ({ user: { id: "u1", roles: ["Admin"] } }),
}));

// Mock project hooks
vi.mock("@/features/projects", () => ({
  useGetEligibleCandidatesQuery: () => ({ data: { data: [] }, isLoading: false }),
  useGetProjectCandidatesByRoleQuery: () => ({ data: [] }),
}));

// Mock candidates hooks to return a candidate with documents_verified sub-status
vi.mock("@/features/candidates", () => ({
  useGetRecruiterMyCandidatesQuery: () => ({ data: { data: [] } }),
  useGetCandidatesQuery: () => ({
    data: [
      {
        id: "cand-1",
        firstName: "Dana",
        lastName: "Lee",
        projectSubStatus: { name: "documents_verified", label: "Documents Verified" },
      },
    ],
    isLoading: false,
  }),
}));

describe("ProjectCandidatesBoard - send for interview flow", () => {
  it("shows Send for Interview button when sub-status is documents_verified and calls handler", async () => {
    const onSendHandler = vi.fn();

    render(
      <ProjectCandidatesBoard
        projectId="proj1"
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
        onSendForInterview={onSendHandler}
      />
    );

    const btn = screen.getByRole("button", { name: /send for interview/i });
    expect(btn).toBeInTheDocument();
    // clicking should call parent handler
    await (await import("@testing-library/user-event")).default.click(btn);
    expect(onSendHandler).toHaveBeenCalled();
  });
});
