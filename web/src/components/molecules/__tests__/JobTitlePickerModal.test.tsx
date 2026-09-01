import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { JobTitlePickerModal } from "../JobTitlePickerModal";

vi.mock("@/features/candidates/api", () => ({
  useGetProfessionTypesQuery: (
    params?: { sector?: string; page?: number; limit?: number },
    opts?: { skip?: boolean },
  ) => {
    if (opts?.skip) {
      return { data: undefined, isLoading: false, isFetching: false };
    }
    if (params?.sector === "HEALTHCARE") {
      const page = params.page ?? 1;
      const pageOneTypes = [
        {
          id: "pt-nurse",
          name: "nurse",
          label: "Nursing",
          sector: "HEALTHCARE",
        },
      ];
      const pageTwoTypes = [
        {
          id: "pt-doctor",
          name: "doctor",
          label: "Doctor",
          sector: "HEALTHCARE",
        },
      ];
      return {
        data: {
          professionTypes: page === 1 ? pageOneTypes : pageTwoTypes,
          pagination: {
            page,
            limit: 10,
            total: 11,
            totalPages: 2,
          },
        },
        isLoading: false,
        isFetching: false,
      };
    }
    if (params?.sector === "NON_HEALTH_CARE") {
      return {
        data: {
          professionTypes: [
            {
              id: "pt-admin",
              name: "admin",
              label: "Administration",
              sector: "NON_HEALTH_CARE",
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
          },
        },
        isLoading: false,
        isFetching: false,
      };
    }
    return { data: undefined, isLoading: false, isFetching: false };
  },
}));

vi.mock("@/features/admin/api/catalogSettingsApi", () => ({
  useGetAdminRoleCatalogQuery: (
    params?: { professionTypeId?: string; sector?: string } | undefined,
    opts?: { skip?: boolean },
  ) => {
    if (opts?.skip || params === undefined) {
      return { data: undefined, isLoading: false, isFetching: false };
    }
    if (params.professionTypeId === "pt-nurse") {
      return {
        data: {
          roles: [
            {
              id: "role-rn",
              name: "registered_nurse",
              label: "Registered Nurse",
              professionTypeId: "pt-nurse",
              isActive: true,
            },
            {
              id: "role-cn",
              name: "charge_nurse",
              label: "Charge Nurse",
              professionTypeId: "pt-nurse",
              isActive: true,
            },
          ],
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        },
        isLoading: false,
        isFetching: false,
      };
    }
    if (params.professionTypeId === "pt-admin") {
      return {
        data: {
          roles: [
            {
              id: "role-oa",
              name: "office_admin",
              label: "Office Administrator",
              professionTypeId: "pt-admin",
              roleDepartmentId: null,
              isActive: true,
            },
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
        isLoading: false,
        isFetching: false,
      };
    }
    return {
      data: { roles: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } },
      isLoading: false,
      isFetching: false,
    };
  },
}));

vi.mock("@/features/admin/components/ProfessionTypeFormDialog", () => ({
  ProfessionTypeFormDialog: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="Create profession type">
        <button type="button" onClick={() => onOpenChange(false)}>
          Close profession form
        </button>
      </div>
    ) : null,
}));

vi.mock("@/features/admin/components/RoleCatalogFormDialog", () => ({
  RoleCatalogFormDialog: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div>
        <button type="button" onClick={() => onOpenChange(false)}>
          Close role catalog form
        </button>
      </div>
    ) : null,
}));

function ControlledModal({
  onOpenChange,
  onSelect,
}: {
  onOpenChange: (open: boolean) => void;
  onSelect: (role: { id: string; name: string; label?: string }) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <JobTitlePickerModal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange(next);
      }}
      onSelect={onSelect}
    />
  );
}

describe("JobTitlePickerModal", () => {
  const onOpenChange = vi.fn();
  const onSelect = vi.fn();

  beforeEach(() => {
    onOpenChange.mockClear();
    onSelect.mockClear();
  });

  it("progresses sector → profession → job title and selects a role", async () => {
    const user = userEvent.setup();

    render(<ControlledModal onOpenChange={onOpenChange} onSelect={onSelect} />);

    expect(
      screen.getByRole("listbox", { name: /select sector/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: /^Healthcare/ }));

    const professionList = await screen.findByRole("listbox", {
      name: /select profession type/i,
    });
    expect(within(professionList).getByText("Nursing")).toBeInTheDocument();
    expect(
      within(professionList).queryByText("Administration"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: /^Nursing$/ }));

    expect(
      await screen.findByRole("listbox", { name: /job titles/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Registered Nurse")).toBeInTheDocument();
    expect(screen.getByText("Charge Nurse")).toBeInTheDocument();

    await user.click(
      screen.getByRole("option", { name: /^Registered Nurse$/ }),
    );

    expect(onSelect).toHaveBeenCalledWith({
      id: "role-rn",
      name: "Registered Nurse",
      label: "Registered Nurse",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows non-healthcare job titles even without a department", async () => {
    const user = userEvent.setup();

    render(<ControlledModal onOpenChange={onOpenChange} onSelect={onSelect} />);

    await user.click(screen.getByRole("option", { name: /^Non-healthcare/ }));
    await user.click(
      await screen.findByRole("option", { name: /^Administration$/ }),
    );

    expect(
      await screen.findByRole("listbox", { name: /job titles/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Office Administrator")).toBeInTheDocument();

    await user.click(
      screen.getByRole("option", { name: /^Office Administrator$/ }),
    );

    expect(onSelect).toHaveBeenCalledWith({
      id: "role-oa",
      name: "Office Administrator",
      label: "Office Administrator",
    });
  });

  it("clears profession selection when going back to sector and choosing again", async () => {
    const user = userEvent.setup();

    render(<ControlledModal onOpenChange={onOpenChange} onSelect={onSelect} />);

    await user.click(screen.getByRole("option", { name: /^Healthcare/ }));
    expect(
      await screen.findByRole("option", { name: /^Nursing$/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(
      screen.getByRole("listbox", { name: /select sector/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: /^Non-healthcare/ }));

    const professionList = await screen.findByRole("listbox", {
      name: /select profession type/i,
    });
    expect(
      within(professionList).getByText("Administration"),
    ).toBeInTheDocument();
    expect(
      within(professionList).queryByText("Nursing"),
    ).not.toBeInTheDocument();
  });

  it("paginates profession types 10 per page with next/prev controls", async () => {
    const user = userEvent.setup();

    render(<ControlledModal onOpenChange={onOpenChange} onSelect={onSelect} />);

    await user.click(screen.getByRole("option", { name: /^Healthcare/ }));

    expect(
      await screen.findByRole("option", { name: /^Nursing$/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/11 total/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /next profession page/i }),
    ).toBeEnabled();

    await user.click(
      screen.getByRole("button", { name: /next profession page/i }),
    );

    expect(
      await screen.findByRole("option", { name: /^Doctor$/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /^Nursing$/ }),
    ).not.toBeInTheDocument();
  });

  it("opens the create profession form from Pick a profession", async () => {
    const user = userEvent.setup();

    render(<ControlledModal onOpenChange={onOpenChange} onSelect={onSelect} />);

    await user.click(screen.getByRole("option", { name: /^Healthcare/ }));

    expect(
      await screen.findByRole("heading", { name: /pick a profession/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /add profession/i }),
    );

    expect(screen.getByText("Close profession form")).toBeInTheDocument();
  });

  it("opens the create job title form from Select job title", async () => {
    const user = userEvent.setup();

    render(<ControlledModal onOpenChange={onOpenChange} onSelect={onSelect} />);

    await user.click(screen.getByRole("option", { name: /^Healthcare/ }));
    await user.click(await screen.findByRole("option", { name: /^Nursing$/ }));

    await user.click(
      await screen.findByRole("button", { name: /add job title/i }),
    );

    expect(
      screen.getByText("Close role catalog form", { hidden: true }),
    ).toBeInTheDocument();
  });
});
