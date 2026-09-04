import React from "react";
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { useNav } from "@/hooks/useNav";
import authReducer from "@/features/auth/authSlice";

const createMockStore = (roles: string[], permissions: string[]) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          id: "1",
          name: "Test User",
          email: "test@example.com",
          roles,
          permissions,
        },
        accessToken: "token",
        refreshToken: null,
        isAuthenticated: true,
        isLoading: false,
        status: "authenticated" as const,
        sessionAccountStatus: null,
      },
    },
  });

const createWrapper =
  (store: ReturnType<typeof createMockStore>): React.FC<{ children: React.ReactNode }> =>
  ({ children }) => <Provider store={store}>{children}</Provider>;

const topLevelDashboardLabels = (items: ReturnType<typeof useNav>) =>
  items.filter((item) => item.label === "Dashboard").map((item) => item.id);

describe("useNav dashboard homes", () => {
  it("shows a single Dashboard for a custom role with wildcard permissions", () => {
    const store = createMockStore(["Custom Role"], ["*"]);

    const { result } = renderHook(() => useNav(), {
      wrapper: createWrapper(store),
    });

    expect(topLevelDashboardLabels(result.current)).toEqual(["admin-dashboard"]);
  });

  it("shows a single Dashboard for leadership with wildcard permissions", () => {
    const store = createMockStore(["Manager"], ["*"]);

    const { result } = renderHook(() => useNav(), {
      wrapper: createWrapper(store),
    });

    expect(topLevelDashboardLabels(result.current)).toEqual(["admin-dashboard"]);
  });

  it("shows the recruiter home for Recruiter, not every specialist Dashboard", () => {
    const store = createMockStore(["Recruitment Executive"], ["read:candidates", "read:projects"]);

    const { result } = renderHook(() => useNav(), {
      wrapper: createWrapper(store),
    });

    expect(topLevelDashboardLabels(result.current)).toEqual(["recruiter-dashboard"]);
  });

  it("hides unchecked feature modules for a custom role", () => {
    const store = createMockStore(["Regional Recruiter Lead"], ["read:candidates"]);

    const { result } = renderHook(() => useNav(), {
      wrapper: createWrapper(store),
    });

    const labels = result.current.map((item) => item.id);
    expect(labels).toContain("candidates");
    expect(labels).not.toContain("agents");
    expect(labels).not.toContain("analytics");
    expect(labels).not.toContain("admin");
    expect(labels).not.toContain("clients");
    expect(labels).not.toContain("interviews");
  });
});
