import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectAssignmentClosedBanner } from "./ProjectAssignmentClosedBanner";

describe("ProjectAssignmentClosedBanner", () => {
  it("renders highlighted deadline closure copy", () => {
    render(
      <ProjectAssignmentClosedBanner
        project={{ status: "active", deadline: "2026-05-30" }}
      />
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Deadline passed")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Project deadline has passed. New candidate assignments are disabled."
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Deadline was 30 May 2026/i)).toBeInTheDocument();
    expect(screen.getByText("Assignments closed")).toBeInTheDocument();
  });

  it("renders nothing when assignments are open", () => {
    const { container } = render(
      <ProjectAssignmentClosedBanner
        project={{ status: "active", deadline: "2030-01-01" }}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
