import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { vi } from "vitest";
import ProcessingAdminDashboardPage from "../ProcessingAdminDashboardPage";
import authReducer from "@/features/auth/authSlice";

vi.mock("@/features/processing/data/processing.endpoints", () => ({
  useGetAllProcessingCandidatesAdminQuery: () => ({
    data: {
      data: {
        candidates: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        counts: { all: 0 },
      },
    },
    isLoading: false,
    isFetching: false,
  }),
}));

vi.mock("@/components/molecules/ProjectRoleFilter", () => ({
  default: () => <div data-testid="project-role-filter" />,
}));

vi.mock("../components/ProcessingAdvancedFiltersSheet", () => ({
  ProcessingAdvancedFiltersSheet: () => null,
}));

const createStore = (roles: string[], permissions: string[]) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          id: "u1",
          name: "Testing Siva",
          email: "siva@test.com",
          roles,
          permissions,
        },
        accessToken: "a",
        refreshToken: "r",
        isAuthenticated: true,
        isLoading: false,
        status: "authenticated" as const,
        sessionAccountStatus: null,
      },
    },
  });

function renderPage(roles: string[], permissions: string[]) {
  return render(
    <Provider store={createStore(roles, permissions)}>
      <MemoryRouter>
        <ProcessingAdminDashboardPage />
      </MemoryRouter>
    </Provider>,
  );
}

describe("ProcessingAdminDashboardPage permissions", () => {
  it("shows the dashboard for a custom role with manage:processing", () => {
    renderPage(["Testing Siva"], ["manage:processing"]);

    expect(screen.queryByText("Not authorized")).not.toBeInTheDocument();
    expect(screen.getByText("Total Processing")).toBeInTheDocument();
  });

  it("hides the dashboard without manage:processing", () => {
    renderPage(["Testing Siva"], ["read:processing"]);

    expect(screen.getByText("Not authorized")).toBeInTheDocument();
    expect(screen.queryByText("Total Processing")).not.toBeInTheDocument();
  });
});
