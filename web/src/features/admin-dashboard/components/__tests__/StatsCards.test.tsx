import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StatsCards from "../StatsCards";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/features/admin/api/adminDashboardApi", () => ({
  useGetAdminDashboardStatsQuery: () => ({
    data: {
      data: {
        totalCandidates: 18,
        activeClients: 0,
        openJobs: 5,
        candidatesPlaced: 0,
      },
    },
    isLoading: false,
  }),
}));

describe("StatsCards", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("navigates to candidates, clients, projects, and deployed filter", async () => {
    const user = userEvent.setup();
    render(<StatsCards />);

    await user.click(screen.getByRole("button", { name: /total candidates/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/candidates");

    await user.click(screen.getByRole("button", { name: /active clients/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/clients");

    await user.click(screen.getByRole("button", { name: /active projects/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/projects?status=in_progress");

    await user.click(screen.getByRole("button", { name: /candidates deployed/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/candidates?status=deployed");
  });
});
