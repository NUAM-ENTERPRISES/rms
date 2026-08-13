import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import authReducer from "@/features/auth/authSlice";
import UserMenu from "@/components/organisms/UserMenu";

const mockUseGetProfileQuery = vi.fn();

vi.mock("@/features/profile/api", () => ({
  useGetProfileQuery: (...args: unknown[]) => mockUseGetProfileQuery(...args),
}));

vi.mock("@/hooks/useCan", () => ({
  useHasRole: vi.fn(() => false),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-slot="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    <img src={src} alt={alt} />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span data-slot="avatar-fallback">{children}</span>
  ),
}));

const authUser = {
  id: "1",
  name: "Jane Doe",
  email: "jane@example.com",
  roles: ["Recruiter"],
  permissions: ["read:candidates"],
};

function renderUserMenu() {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: authUser,
        accessToken: "token",
        refreshToken: null,
        isAuthenticated: true,
        isLoading: false,
        status: "authenticated" as const,
        sessionAccountStatus: null,
      },
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    </Provider>,
  );
}

describe("UserMenu header avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the uploaded profile photo in the header avatar", () => {
    const profileImage = "https://cdn.example.com/users/profiles/1/photo.jpg";
    mockUseGetProfileQuery.mockReturnValue({
      data: {
        data: {
          employeeCode: "EMP-001",
          profileImage,
        },
      },
    });

    renderUserMenu();

    const avatar = screen.getByAltText("Jane Doe");
    expect(avatar).toHaveAttribute("src", profileImage);
    expect(avatar).not.toHaveAttribute("src", "");
  });

  it("shows initials fallback when no profile photo is uploaded", () => {
    mockUseGetProfileQuery.mockReturnValue({
      data: {
        data: {
          employeeCode: "EMP-001",
          profileImage: undefined,
        },
      },
    });

    renderUserMenu();

    expect(screen.queryByRole("img", { name: "Jane Doe" })).not.toBeInTheDocument();
    expect(screen.getByText("JD")).toBeInTheDocument();
  });
});
