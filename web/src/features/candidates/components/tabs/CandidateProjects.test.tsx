import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CandidateProjects } from "./CandidateProjects";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("../../api", () => ({
  useGetCandidateProjectsQuery: () => ({
    data: {
      data: [
        {
          id: "cpm-1",
          project: { id: "p1", title: "Gulf Nursing", status: "in_progress" },
          roleNeeded: { designation: "Nurse", minExperience: 1, maxExperience: 3 },
          recruiter: { id: "r1", name: "Emma Recruiter", email: "emma@test.com" },
          mainStatus: { name: "documents", label: "Documents" },
          subStatus: {
            name: "verification_in_progress_document",
            label: "Verification In Progress",
          },
          assignedAt: "2026-08-13T12:00:00.000Z",
        },
      ],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    },
    isLoading: false,
  }),
}));

describe("CandidateProjects status cell", () => {
  it("renders main and sub status labels", () => {
    render(<CandidateProjects candidateId="cand-1" />);

    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Verification In Progress")).toBeInTheDocument();
  });
});
