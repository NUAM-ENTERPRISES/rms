import { render, fireEvent, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { vi, beforeEach } from "vitest";
import { store } from "@/app/store";
import { setCredentials, clearCredentials } from "@/features/auth/authSlice";
import IdleUsersNotification from "@/features/admin/components/IdleUsersNotification";

// we want to mock toast to avoid real popup
vi.mock("sonner", () => {
  const toastFn = Object.assign(vi.fn(), {
    success: vi.fn(),
    info: vi.fn(),
  });
  return { toast: toastFn };
});

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasRole: (roles: string | string[]) => {
      const r = Array.isArray(roles) ? roles : [roles];
      return r.includes("Manager") || r.includes("System Admin");
    },
  }),
}));

vi.mock("@/features/admin/api", async () => {
  const actual = await vi.importActual<typeof import("@/features/admin/api")>(
    "@/features/admin/api"
  );
  return {
    ...actual,
    useGetAdminIdleSessionsSummaryQuery: () => ({
      data: {
        success: true,
        data: {
          idleCount: 2,
          sessions: [
            {
              id: "s1",
              userId: "u1",
              userName: "Idle One",
              userEmail: "idle1@example.com",
              roles: ["Recruiter"],
              ipAddress: "127.0.0.1",
              browser: "Chrome",
              os: "macOS",
              deviceType: "desktop",
              loginAt: new Date().toISOString(),
              lastActivityAt: new Date().toISOString(),
              isActive: true,
              isIdle: true,
            },
            {
              id: "s2",
              userId: "u2",
              userName: "Idle Two",
              userEmail: "idle2@example.com",
              roles: ["Recruiter"],
              ipAddress: "127.0.0.1",
              browser: "Safari",
              os: "macOS",
              deviceType: "desktop",
              loginAt: new Date().toISOString(),
              lastActivityAt: new Date().toISOString(),
              isActive: true,
              isIdle: true,
            },
          ],
        },
        message: "ok",
      },
      isFetching: false,
    }),
  };
});

describe("NotificationsBell", () => {
  beforeEach(() => {
    localStorage.clear();
    store.dispatch(clearCredentials());
    store.dispatch(
      setCredentials({
        user: {
          id: "test-admin",
          name: "Admin",
          email: "admin@test.com",
          roles: ["Manager"],
          permissions: ["read:users"],
        },
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it("shows idle users notification icon for manager/admin", () => {
    render(
      <Provider store={store}>
        <IdleUsersNotification />
      </Provider>
    );

    expect(screen.getByLabelText(/idle users/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/idle users/i));
    expect(screen.getByText(/idle users/i)).toBeInTheDocument();
    expect(screen.getByText("2 Idle")).toBeInTheDocument();
    expect(screen.getByText("Idle One")).toBeInTheDocument();
  });

  it("marks a single idle row as read", () => {
    render(
      <Provider store={store}>
        <IdleUsersNotification />
      </Provider>
    );

    fireEvent.click(screen.getByLabelText(/idle users/i));
    fireEvent.click(screen.getByLabelText(/Mark Idle One as read/i));

    expect(screen.queryByText("Idle One")).not.toBeInTheDocument();
    expect(screen.getByText("Idle Two")).toBeInTheDocument();
    expect(screen.getByText("1 Idle")).toBeInTheDocument();
  });

  it("marks all idle rows as read", () => {
    render(
      <Provider store={store}>
        <IdleUsersNotification />
      </Provider>
    );

    fireEvent.click(screen.getByLabelText(/idle users/i));
    fireEvent.click(screen.getByLabelText(/Mark all idle users as read/i));

    expect(screen.queryByText("Idle One")).not.toBeInTheDocument();
    expect(screen.getByText(/All idle alerts marked as read/i)).toBeInTheDocument();
    expect(screen.getByText("0 Idle")).toBeInTheDocument();
  });
});