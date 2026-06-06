import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CoordinatorProjectPipelineChart from "../CoordinatorProjectPipelineChart";

vi.mock("../../api/projectCoordinatorDashboardApi", () => ({
  useGetCoordinatorMyProjectsQuery: () => ({
    data: {
      data: {
        projects: [],
        pagination: { total: 0, totalPages: 1, page: 1, limit: 10 },
      },
    },
    isLoading: false,
    isError: false,
  }),
  useGetCoordinatorProjectPipelineQuery: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
}));

describe("CoordinatorProjectPipelineChart empty state", () => {
  it("shows empty state when no projects exist", () => {
    render(<CoordinatorProjectPipelineChart />);

    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });
});
