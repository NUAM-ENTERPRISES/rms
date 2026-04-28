import { Suspense } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect } from "vitest";
import authReducer from "@/features/auth/authSlice";
import { RoleBasedRedirect } from "@/app/router/RoleBasedRedirect";

describe("RoleBasedRedirect", () => {
  it("navigates Client Coordinator from / to /agents", async () => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: {
          user: {
            id: "u1",
            name: "Agent Coord",
            email: "agentcoord@test.com",
            roles: ["Client Coordinator"],
            permissions: ["read:agents"],
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
              <Route
                path="/agents"
                element={<div data-testid="agents-landing">Agents</div>}
              />
            </Routes>
          </Suspense>
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("agents-landing")).toBeInTheDocument();
    });
  });
});
