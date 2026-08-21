import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RoleDetailPage from "../RoleDetailPage";

vi.mock("@/hooks/useCan", () => ({
  useCan: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/features/admin/api/roles", () => ({
  useGetRoleByIdQuery: vi.fn(),
  useGetRoleAssignedUsersQuery: vi.fn(),
  useGetPermissionsCatalogQuery: vi.fn(),
  useUpdateRoleMutation: vi.fn(),
  useDeleteRoleMutation: vi.fn(),
}));

vi.mock("@/features/admin/components/RoleFormDialog", () => ({
  RoleFormDialog: () => null,
}));

import { useCan } from "@/hooks/useCan";
import {
  useGetRoleByIdQuery,
  useGetRoleAssignedUsersQuery,
  useGetPermissionsCatalogQuery,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} from "@/features/admin/api/roles";

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={["/admin/roles/role-2"]}>
      <Routes>
        <Route path="/admin/roles/:id" element={<RoleDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RoleDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetPermissionsCatalogQuery).mockReturnValue({
      data: { success: true, data: [], message: "" },
      isLoading: false,
    } as never);
    vi.mocked(useGetRoleAssignedUsersQuery).mockReturnValue({
      data: {
        success: true,
        data: {
          users: [
            {
              id: "u1",
              name: "Jane Doe",
              email: "jane@example.com",
              employeeCode: "EMP001",
              profileImage: null,
              accountStatus: "ACTIVE",
              createdAt: "2026-01-15T00:00:00.000Z",
            },
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
        message: "ok",
      },
      isLoading: false,
      isFetching: false,
    } as never);
    vi.mocked(useUpdateRoleMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ] as never);
    vi.mocked(useDeleteRoleMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ] as never);
  });

  it("renders role details and permissions", () => {
    vi.mocked(useCan).mockReturnValue(true);
    vi.mocked(useGetRoleByIdQuery).mockReturnValue({
      data: {
        success: true,
        data: {
          id: "role-2",
          name: "Regional Lead",
          description: "Custom regional lead",
          isSystem: false,
          createdAt: "2026-02-01T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
          createdBy: { id: "u1", name: "Ada Manager" },
          permissions: ["read:candidates", "write:candidates"],
          assignedUserCount: 3,
        },
        message: "ok",
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    } as never);

    renderDetail();

    expect(
      screen.getByRole("heading", { name: "Regional Lead" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Custom regional lead").length).toBeGreaterThan(0);
    expect(screen.getByText("Ada Manager")).toBeInTheDocument();
    expect(screen.getByText("read:candidates")).toBeInTheDocument();
    expect(screen.getByText("write:candidates")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit role/i })).toBeInTheDocument();
  });

  it("shows assigned users when Assigned Users tile is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useCan).mockReturnValue(true);
    vi.mocked(useGetRoleByIdQuery).mockReturnValue({
      data: {
        success: true,
        data: {
          id: "role-2",
          name: "Regional Lead",
          description: "Custom regional lead",
          isSystem: false,
          createdAt: "2026-02-01T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
          createdBy: { id: "u1", name: "Ada Manager" },
          permissions: ["read:candidates"],
          assignedUserCount: 1,
        },
        message: "ok",
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    } as never);

    renderDetail();

    await user.click(screen.getByRole("button", { name: /assigned users/i }));

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getAllByText("jane@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("EMP001").length).toBeGreaterThan(0);
    expect(
      screen.getByLabelText(/view profile image for jane doe/i),
    ).toBeInTheDocument();
  });

  it("hides edit actions for system roles", () => {
    vi.mocked(useCan).mockReturnValue(true);
    vi.mocked(useGetRoleByIdQuery).mockReturnValue({
      data: {
        success: true,
        data: {
          id: "role-1",
          name: "Department Head",
          description: "System manager",
          isSystem: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          createdBy: null,
          permissions: ["*"],
          assignedUserCount: 1,
        },
        message: "ok",
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    } as never);

    renderDetail();

    expect(screen.getByText(/system role is read-only/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit role/i }),
    ).not.toBeInTheDocument();
  });
});
