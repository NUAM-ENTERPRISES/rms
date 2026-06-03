import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InterviewPassedProjectsBadges } from "../InterviewPassedProjectsBadges";

describe("InterviewPassedProjectsBadges", () => {
  it("shows count label for multiple passed projects", () => {
    render(
      <InterviewPassedProjectsBadges
        interviewPassedCount={3}
        interviewPassedProjects={[
          { projectId: "p1", projectTitle: "Hospital A", passedAt: "2026-01-01T00:00:00.000Z" },
          { projectId: "p2", projectTitle: "Clinic B", passedAt: "2026-01-02T00:00:00.000Z" },
          { projectId: "p3", projectTitle: "Nursing Home C", passedAt: "2026-01-03T00:00:00.000Z" },
        ]}
      />,
    );

    expect(screen.getByText("3 projects passed")).toBeInTheDocument();
  });

  it("shows singular label for one passed project", () => {
    render(
      <InterviewPassedProjectsBadges
        interviewPassedCount={1}
        interviewPassedProjects={[
          { projectId: "p1", projectTitle: "Hospital A", passedAt: "2026-01-01T00:00:00.000Z" },
        ]}
      />,
    );

    expect(screen.getByText("1 project passed")).toBeInTheDocument();
  });
});
