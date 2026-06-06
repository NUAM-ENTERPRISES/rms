import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CoordinatorStatsCards from "../CoordinatorStatsCards";

vi.mock("../../api/projectCoordinatorDashboardApi", () => ({
  useGetCoordinatorDashboardStatsQuery: () => ({
    data: {
      data: {
        myClients: 5,
        activeProjects: 8,
        completedProjects: 2,
        candidatesFilled: 34,
      },
    },
    isLoading: false,
    isError: false,
  }),
}));

describe("CoordinatorStatsCards", () => {
  it("renders API stat values", () => {
    render(<CoordinatorStatsCards />);

    expect(screen.getByText("My Clients")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("34")).toBeInTheDocument();
  });
});
