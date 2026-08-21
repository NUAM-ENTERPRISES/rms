import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoleFormDialog } from "../RoleFormDialog";

const permissions = [
  {
    id: "p1",
    key: "read:candidates",
    description: "View candidates",
  },
  {
    id: "p2",
    key: "write:candidates",
    description: "Create candidates",
  },
  {
    id: "p3",
    key: "read:users",
    description: "View users",
  },
];

describe("RoleFormDialog", () => {
  it("requires a role name and at least one permission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <RoleFormDialog
        open
        onOpenChange={() => {}}
        mode="create"
        permissions={permissions}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: /create role/i }));

    expect(
      await screen.findByText(/role name must be at least 2 characters/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/select at least one permission/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits selected permissions for a valid custom role", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <RoleFormDialog
        open
        onOpenChange={() => {}}
        mode="create"
        permissions={permissions}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/role name/i), "Regional Lead");
    await user.click(screen.getByLabelText(/read:candidates/i));
    await user.click(screen.getByRole("button", { name: /create role/i }));
    await user.click(screen.getByRole("button", { name: /confirm & create role/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Regional Lead",
        permissionKeys: ["read:candidates"],
      }),
    );
  });

  it("renders view mode as read-only without a save button", () => {
    render(
      <RoleFormDialog
        open
        onOpenChange={() => {}}
        mode="view"
        role={{
          id: "role-1",
          name: "Department Head",
          description: "System role",
          isSystem: true,
          permissions: ["read:users"],
        }}
        permissions={permissions}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("Department Head")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /save changes|create role/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /close/i }).length).toBeGreaterThan(0);
  });
});
