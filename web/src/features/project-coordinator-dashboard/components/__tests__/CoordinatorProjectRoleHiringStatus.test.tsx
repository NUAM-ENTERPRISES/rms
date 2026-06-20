import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CoordinatorProjectRoleHiringStatus from "../CoordinatorProjectRoleHiringStatus";

vi.mock("../../api/projectCoordinatorDashboardApi", () => ({
  useGetCoordinatorProjectRoleHiringStatusQuery: () => ({
    data: {
      data: {
        projectRoles: [
          {
            projectId: "p1",
            projectName: "ICU Nurses",
            roles: [{ role: "Nurse", required: 10, filled: 4 }],
          },
        ],
        pagination: { total: 1, totalPages: 1, page: 1, limit: 10 },
      },
    },
    isLoading: false,
    isError: false,
  }),
}));

describe("CoordinatorProjectRoleHiringStatus", () => {
  it("renders scoped project role hiring status", () => {
    render(<CoordinatorProjectRoleHiringStatus />);

    expect(screen.getByText("Project Role Hiring Status")).toBeInTheDocument();
    expect(screen.getByText("ICU Nurses")).toBeInTheDocument();
    expect(screen.getByText("Nurse")).toBeInTheDocument();
    expect(screen.getAllByText("40%").length).toBeGreaterThan(0);
  });
});
