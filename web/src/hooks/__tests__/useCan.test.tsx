import React from "react";
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { useCan, useCanAny, useHasRole, useHasAllRoles } from "@/hooks/useCan";
import authReducer from "@/features/auth/authSlice";

// Factory to create a test store
const createMockStore = (initialAuthState: any) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: initialAuthState },
  });

// Curried wrapper: the returned component only takes { children }
const createWrapper =
  (store: any): React.FC<{ children: React.ReactNode }> =>
  ({ children }) => (
    <Provider store={store}>{children}</Provider>
  );

describe("useCan", () => {
  it("should return true when user has wildcard permission", () => {
    const store = createMockStore({
      user: {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        roles: ["Recruiter"],
        permissions: ["*"],
      },
      accessToken: "token",
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    const { result } = renderHook(() => useCan(["manage:users"]), {
      wrapper: createWrapper(store),
    });

    expect(result.current).toBe(true);
  });

  it("should return true when user has all required permissions", () => {
    const store = createMockStore({
      user: {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        roles: ["Manager"],
        permissions: ["read:users", "write:users"],
      },
      accessToken: "token",
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    const { result } = renderHook(() => useCan(["read:users", "write:users"]), {
      wrapper: createWrapper(store),
    });

    expect(result.current).toBe(true);
  });

  it("should return false when user lacks required permissions", () => {
    const store = createMockStore({
      user: {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        roles: ["Recruiter"],
        permissions: ["read:candidates"],
      },
      accessToken: "token",
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    const { result } = renderHook(() => useCan(["manage:users"]), {
      wrapper: createWrapper(store),
    });

    expect(result.current).toBe(false);
  });

  it("should return false when user is not authenticated", () => {
    const store = createMockStore({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      status: "anonymous",
    });

    const { result } = renderHook(() => useCan(["read:users"]), {
      wrapper: createWrapper(store),
    });

    expect(result.current).toBe(false);
  });
});

describe("useCanAny", () => {
  it("should return true when user has any of the required permissions", () => {
    const store = createMockStore({
      user: {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        roles: ["Manager"],
        permissions: ["read:users"],
      },
      accessToken: "token",
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    const { result } = renderHook(
      () => useCanAny(["read:users", "write:users"]),
      {
        wrapper: createWrapper(store),
      }
    );

    expect(result.current).toBe(true);
  });

  it("should return false when user has none of the required permissions", () => {
    const store = createMockStore({
      user: {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        roles: ["Recruiter"],
        permissions: ["read:candidates"],
      },
      accessToken: "token",
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    const { result } = renderHook(
      () => useCanAny(["manage:users", "manage:projects"]),
      {
        wrapper: createWrapper(store),
      }
    );

    expect(result.current).toBe(false);
  });
});

describe("useHasRole", () => {
  it("should return true when user has any of the required roles", () => {
    const store = createMockStore({
      user: {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        roles: ["Manager"],
        permissions: ["read:users"],
      },
      accessToken: "token",
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    const { result } = renderHook(() => useHasRole(["Manager", "Director"]), {
      wrapper: createWrapper(store),
    });

    expect(result.current).toBe(true);
  });

  it("should return false when user has none of the required roles", () => {
    const store = createMockStore({
      user: {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        roles: ["Recruiter"],
        permissions: ["read:candidates"],
      },
      accessToken: "token",
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    const { result } = renderHook(() => useHasRole(["Manager", "Director"]), {
      wrapper: createWrapper(store),
    });

    expect(result.current).toBe(false);
  });
});

describe("useHasAllRoles", () => {
  it("should return true when user has all required roles", () => {
    const store = createMockStore({
      user: {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        roles: ["Manager", "Team Lead"],
        permissions: ["read:users"],
      },
      accessToken: "token",
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    const { result } = renderHook(
      () => useHasAllRoles(["Manager", "Team Lead"]),
      {
        wrapper: createWrapper(store),
      }
    );

    expect(result.current).toBe(true);
  });

  it("should return false when user lacks some required roles", () => {
    const store = createMockStore({
      user: {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        roles: ["Manager"],
        permissions: ["read:users"],
      },
      accessToken: "token",
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    const { result } = renderHook(
      () => useHasAllRoles(["Manager", "Director"]),
      {
        wrapper: createWrapper(store),
      }
    );

    expect(result.current).toBe(false);
  });
});
