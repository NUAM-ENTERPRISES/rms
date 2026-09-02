import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import RolesPage from "../RolesPage";

vi.mock("@/hooks/useCan", () => ({
  useCan: vi.fn(),
}));

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: string) => value,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/features/admin/api/roles", () => ({
  useGetRolesQuery: vi.fn(),
  useGetRoleByIdQuery: vi.fn(),
  useGetPermissionsCatalogQuery: vi.fn(),
  useCreateRoleMutation: vi.fn(),
  useUpdateRoleMutation: vi.fn(),
  useDeleteRoleMutation: vi.fn(),
}));

vi.mock("@/features/admin/components/RoleFormDialog", () => ({
  RoleFormDialog: () => null,
}));

import { useCan } from "@/hooks/useCan";
import {
  useGetRolesQuery,
  useGetRoleByIdQuery,
  useGetPermissionsCatalogQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} from "@/features/admin/api/roles";

const mockRoles = [
  {
    id: "role-1",
    name: "Manager",
    description: "System manager",
    isSystem: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    createdBy: null,
    permissions: ["read:users", "manage:users"],
  },
  {
    id: "role-2",
    name: "Regional Lead",
    description: "Custom regional lead",
    isSystem: false,
    createdAt: "2026-02-01T00:00:00.000Z",
    createdBy: { id: "u1", name: "Ada Manager" },
    permissions: ["read:candidates"],
  },
];

function mockRolesQuery(
  overrides?: Partial<{
    roles: typeof mockRoles;
    total: number;
    totalPages: number;
    page: number;
  }>,
) {
  const total = overrides?.total ?? overrides?.roles?.length ?? mockRoles.length;
  const totalPages = overrides?.totalPages ?? 1;
  return {
    data: {
      success: true,
      data: {
        roles: overrides?.roles ?? mockRoles,
        pagination: {
          page: overrides?.page ?? 1,
          limit: 10,
          total,
          totalPages,
        },
        counts: { all: total, system: 1, custom: Math.max(0, total - 1) },
      },
      message: "ok",
    },
    isLoading: false,
    isFetching: false,
    isError: false,
  } as never;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <RolesPage />
    </MemoryRouter>,
  );
}

describe("RolesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetRoleByIdQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as never);
    vi.mocked(useGetPermissionsCatalogQuery).mockReturnValue({
      data: { success: true, data: [], message: "" },
      isLoading: false,
    } as never);
    vi.mocked(useCreateRoleMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ] as never);
    vi.mocked(useUpdateRoleMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ] as never);
    vi.mocked(useDeleteRoleMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ] as never);
  });

  it("shows access denied without read:roles", () => {
    vi.mocked(useCan).mockReturnValue(false);
    vi.mocked(useGetRolesQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: false,
    } as never);

    renderPage();

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });

  it("renders system and custom roles with type badges", () => {
    vi.mocked(useCan).mockImplementation((permission) => {
      if (permission === "read:roles") return true;
      if (permission === "manage:roles") return true;
      return false;
    });
    vi.mocked(useGetRolesQuery).mockReturnValue(mockRolesQuery());

    renderPage();

    expect(screen.getByRole("heading", { name: /roles directory/i })).toBeInTheDocument();
    expect(screen.getByText("Manager")).toBeInTheDocument();
    expect(screen.getByText("Regional Lead")).toBeInTheDocument();
    expect(screen.getAllByText("System").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Custom").length).toBeGreaterThan(0);
    expect(screen.getByText("Ada Manager")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create role/i }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/next page/i)).not.toBeInTheDocument();
  });

  it("shows pagination only when totalPages exceeds 1", () => {
    vi.mocked(useCan).mockReturnValue(true);
    vi.mocked(useGetRolesQuery).mockReturnValue(
      mockRolesQuery({ total: 25, totalPages: 3, page: 1 }),
    );

    renderPage();

    expect(screen.getByLabelText(/next page/i)).toBeInTheDocument();
    expect(screen.getByText(/of/i).textContent).toMatch(/25/);
  });

  it("hides create role without manage:roles", () => {
    vi.mocked(useCan).mockImplementation((permission) => permission === "read:roles");
    vi.mocked(useGetRolesQuery).mockReturnValue(mockRolesQuery());

    renderPage();

    expect(
      screen.queryByRole("button", { name: /create role/i }),
    ).not.toBeInTheDocument();
  });
});
