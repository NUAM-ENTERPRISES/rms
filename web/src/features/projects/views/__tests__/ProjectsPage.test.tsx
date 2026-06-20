import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import ProjectsPage from "../ProjectsPage";
import authReducer from "@/features/auth/authSlice";

vi.mock("@/features/projects", async () => {
  const actual = await vi.importActual<typeof import("@/features/projects")>(
    "@/features/projects"
  );
  return {
    ...actual,
    useGetProjectsQuery: () => ({
      data: {
        success: true,
        data: {
          projects: [],
          pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
        },
      },
      isLoading: false,
      error: undefined,
    }),
    useGetProjectStatsQuery: () => ({
      data: {
        success: true,
        data: {
          totalProjects: 0,
          inProgressProjects: 0,
          completedProjects: 0,
          onHoldProjects: 0,
          cancelledProjects: 0,
          projectsByStatus: { IN_PROGRESS: 0, COMPLETED: 0, ON_HOLD: 0, CANCELLED: 0 },
          projectsByClient: {},
          urgentProjectsCount: 0,
        },
      },
      isLoading: false,
      error: undefined,
    }),
  };
});

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createStore = (permissions: string[]) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          id: "u1",
          name: "Test",
          email: "t@test.com",
          roles: ["Manager"],
          permissions,
        },
        accessToken: "a",
        refreshToken: "r",
        isAuthenticated: true,
        isLoading: false,
        status: "authenticated" as const,
      },
    },
  });

const renderPage = (permissions: string[]) =>
  render(
    <Provider store={createStore(permissions)}>
      <BrowserRouter>
        <ProjectsPage />
      </BrowserRouter>
    </Provider>
  );

describe("ProjectsPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("shows Add Project when user can manage or write projects", async () => {
    renderPage(["read:projects", "manage:projects"]);

    expect(
      await screen.findByRole("button", { name: /create new project/i })
    ).toBeInTheDocument();
  });

  it("shows Add Project for write:projects (with read:projects)", async () => {
    renderPage(["read:projects", "write:projects"]);

    expect(
      await screen.findByRole("button", { name: /create new project/i })
    ).toBeInTheDocument();
  });

  it("navigates to /projects/create when Add Project is clicked", async () => {
    const user = userEvent.setup();
    renderPage(["read:projects", "*"]);

    await user.click(
      await screen.findByRole("button", { name: /create new project/i })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/projects/create");
  });

  it("hides Add Project without manage or write permission", () => {
    renderPage(["read:projects"]);

    expect(
      screen.queryByRole("button", { name: /create new project/i })
    ).not.toBeInTheDocument();
  });
});
