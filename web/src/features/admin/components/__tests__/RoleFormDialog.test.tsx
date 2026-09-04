import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

function clickAppArea(name: RegExp) {
  const nav = screen.getByRole("navigation", { name: /app areas/i });
  return within(nav).getByRole("button", { name });
}

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
    await user.click(clickAppArea(/candidates/i));
    await user.click(screen.getByRole("checkbox", { name: /^view candidates$/i }));
    await user.click(screen.getByRole("button", { name: /create role/i }));
    await user.click(screen.getByRole("button", { name: /confirm & create role/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Regional Lead",
        permissionKeys: ["read:candidates"],
      }),
    );
  });

  it("hides technical permission keys from the picker", () => {
    render(
      <RoleFormDialog
        open
        onOpenChange={() => {}}
        mode="create"
        permissions={permissions}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByText("read:candidates")).not.toBeInTheDocument();
    expect(screen.queryByText("read:users")).not.toBeInTheDocument();
    expect(screen.getAllByText("Staff accounts").length).toBeGreaterThan(0);
  });

  it("renders view mode as read-only without a save button", () => {
    render(
      <RoleFormDialog
        open
        onOpenChange={() => {}}
        mode="view"
        role={{
          id: "role-1",
          name: "Manager",
          description: "System role",
          isSystem: true,
          permissions: ["read:users"],
        }}
        permissions={permissions}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("Manager")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /save changes|create role/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /close/i }).length).toBeGreaterThan(0);
  });

  it("does not reset user edits when the same role is refetched", async () => {
    const user = userEvent.setup();
    const baseRole = {
      id: "role-2",
      name: "Regional Lead",
      description: "Custom regional lead",
      isSystem: false,
      permissions: ["read:candidates"],
    };

    const { rerender } = render(
      <RoleFormDialog
        open
        onOpenChange={() => {}}
        mode="edit"
        role={baseRole}
        permissions={permissions}
        onSubmit={vi.fn()}
      />,
    );

    await user.click(clickAppArea(/candidates/i));
    await user.click(
      screen.getByRole("checkbox", { name: /^edit candidates$/i }),
    );

    rerender(
      <RoleFormDialog
        open
        onOpenChange={() => {}}
        mode="edit"
        role={{
          ...baseRole,
          permissions: ["read:candidates", "read:users"],
        }}
        permissions={permissions}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: /^edit candidates$/i }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /^view candidates$/i }),
    ).toBeChecked();
    await user.click(clickAppArea(/staff accounts/i));
    expect(
      screen.getByRole("checkbox", { name: /^see staff accounts$/i }),
    ).not.toBeChecked();
  });

  it("submits edited permissions in edit mode", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <RoleFormDialog
        open
        onOpenChange={() => {}}
        mode="edit"
        role={{
          id: "role-2",
          name: "Regional Lead",
          description: "Custom regional lead",
          isSystem: false,
          permissions: ["read:candidates"],
        }}
        permissions={permissions}
        onSubmit={onSubmit}
      />,
    );

    await user.click(clickAppArea(/candidates/i));
    await user.click(
      screen.getByRole("checkbox", { name: /^edit candidates$/i }),
    );
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Regional Lead",
        permissionKeys: expect.arrayContaining([
          "read:candidates",
          "write:candidates",
        ]),
      }),
    );
  });

  it("re-hydrates when switching to a different role while open", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <RoleFormDialog
        open
        onOpenChange={() => {}}
        mode="edit"
        role={{
          id: "role-2",
          name: "Regional Lead",
          description: "Custom regional lead",
          isSystem: false,
          permissions: ["read:candidates"],
        }}
        permissions={permissions}
        onSubmit={vi.fn()}
      />,
    );

    await user.click(clickAppArea(/candidates/i));
    await user.click(
      screen.getByRole("checkbox", { name: /^edit candidates$/i }),
    );

    rerender(
      <RoleFormDialog
        open
        onOpenChange={() => {}}
        mode="edit"
        role={{
          id: "role-3",
          name: "Ops Lead",
          description: "Operations lead",
          isSystem: false,
          permissions: ["read:users"],
        }}
        permissions={permissions}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("Ops Lead")).toBeInTheDocument();
    await user.click(clickAppArea(/staff accounts/i));
    expect(
      screen.getByRole("checkbox", { name: /^see staff accounts$/i }),
    ).toBeChecked();
    await user.click(clickAppArea(/candidates/i));
    expect(
      screen.getByRole("checkbox", { name: /^edit candidates$/i }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /^view candidates$/i }),
    ).not.toBeChecked();
  });
});
