import { Suspense } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, vi } from "vitest";
import authReducer from "@/features/auth/authSlice";
import { RoleBasedRedirect } from "@/app/router/RoleBasedRedirect";
import { ROLE_NAMES } from "@/config/role-names";

vi.mock("@/layout/AppLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

describe("RoleBasedRedirect — Project Coordinator", () => {
  it("renders project coordinator dashboard at /", async () => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: {
          user: {
            id: "u1",
            name: "Sam Project Coordinator",
            email: "projectcoordinator@nuam.com",
            roles: [ROLE_NAMES.PROJECT_COORDINATOR],
            permissions: ["read:clients", "read:projects", "read:candidates"],
          },
          accessToken: "a",
          refreshToken: "r",
          isAuthenticated: true,
          isLoading: false,
          status: "authenticated",
        },
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/"]}>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<RoleBasedRedirect />} />
            </Routes>
          </Suspense>
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(
        screen.getByText("Your clients, projects, and candidate fill overview")
      ).toBeInTheDocument();
    });
  });
});
