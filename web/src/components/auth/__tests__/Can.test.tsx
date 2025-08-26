import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { Can } from "@/components/auth/Can";
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
  ({ children }) =>
    <Provider store={store}>{children}</Provider>;

describe("Can Component", () => {
  it("should render children when user has required permissions", () => {
    const store = createMockStore({
      user: {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        roles: ["Manager"],
        permissions: ["manage:users"],
      },
      accessToken: "token",
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    render(
      <Can anyOf={["manage:users"]}>
        <div>Admin Panel</div>
      </Can>,
      { wrapper: createWrapper(store) }
    );

    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
  });

  it("should not render children when user lacks required permissions", () => {
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

    render(
      <Can anyOf={["manage:users"]}>
        <div>Admin Panel</div>
      </Can>,
      { wrapper: createWrapper(store) }
    );

    expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
  });

  it("should render fallback when user lacks permissions", () => {
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

    render(
      <Can anyOf={["manage:users"]} fallback={<div>No access</div>}>
        <div>Admin Panel</div>
      </Can>,
      { wrapper: createWrapper(store) }
    );

    expect(screen.getByText("No access")).toBeInTheDocument();
    expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
  });

  it("should render children when user has required roles", () => {
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

    render(
      <Can roles={["Manager", "Director"]}>
        <div>Management Panel</div>
      </Can>,
      { wrapper: createWrapper(store) }
    );

    expect(screen.getByText("Management Panel")).toBeInTheDocument();
  });

  it("should require all permissions when using allOf", () => {
    const store = createMockStore({
      user: {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        roles: ["Manager"],
        permissions: ["read:users"], // Missing write:users
      },
      accessToken: "token",
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    render(
      <Can allOf={["read:users", "write:users"]}>
        <div>User Editor</div>
      </Can>,
      { wrapper: createWrapper(store) }
    );

    expect(screen.queryByText("User Editor")).not.toBeInTheDocument();
  });

  it("should render when user has all required permissions", () => {
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

    render(
      <Can allOf={["read:users", "write:users"]}>
        <div>User Editor</div>
      </Can>,
      { wrapper: createWrapper(store) }
    );

    expect(screen.getByText("User Editor")).toBeInTheDocument();
  });

  it("should render children when no permissions or roles are specified", () => {
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

    render(
      <Can>
        <div>Public Content</div>
      </Can>,
      { wrapper: createWrapper(store) }
    );

    expect(screen.getByText("Public Content")).toBeInTheDocument();
  });

  it("should handle wildcard permission", () => {
    const store = createMockStore({
      user: {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        roles: ["CEO"],
        permissions: ["*"],
      },
      accessToken: "token",
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
    });

    render(
      <Can anyOf={["manage:users", "manage:projects"]}>
        <div>Super Admin Panel</div>
      </Can>,
      { wrapper: createWrapper(store) }
    );

    expect(screen.getByText("Super Admin Panel")).toBeInTheDocument();
  });
});
