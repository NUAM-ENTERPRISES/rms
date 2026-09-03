import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfessionTypePickerModal } from "../ProfessionTypePickerModal";

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

function ControlledModal({
  onOpenChange,
  onSelect,
}: {
  onOpenChange: (open: boolean) => void;
  onSelect: (profession: {
    id?: string;
    label: string;
    name?: string;
    sector: "HEALTHCARE" | "NON_HEALTH_CARE";
    focusesAllProfessions?: boolean;
  }) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <ProfessionTypePickerModal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange(next);
      }}
      onSelect={onSelect}
    />
  );
}

describe("ProfessionTypePickerModal", () => {
  const onOpenChange = vi.fn();
  const onSelect = vi.fn();

  beforeEach(() => {
    onOpenChange.mockClear();
    onSelect.mockClear();
  });

  it("progresses sector → profession and selects a profession type", async () => {
    const user = userEvent.setup();

    render(<ControlledModal onOpenChange={onOpenChange} onSelect={onSelect} />);

    expect(
      screen.getByRole("listbox", { name: /select sector/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 2/i)).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: /^Healthcare/ }));

    const professionList = await screen.findByRole("listbox", {
      name: /select profession type/i,
    });
    expect(within(professionList).getByText("Nursing")).toBeInTheDocument();
    expect(
      within(professionList).queryByText("Administration"),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("listbox", { name: /job titles/i })).toBeNull();

    await user.click(screen.getByRole("option", { name: /^Nursing$/ }));

    expect(onSelect).toHaveBeenCalledWith({
      id: "pt-nurse",
      label: "Nursing",
      name: "nurse",
      sector: "HEALTHCARE",
      focusesAllProfessions: false,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("selects Any profession for the chosen sector without picking a list item", async () => {
    const user = userEvent.setup();

    render(<ControlledModal onOpenChange={onOpenChange} onSelect={onSelect} />);

    await user.click(screen.getByRole("option", { name: /^Healthcare/ }));

    expect(
      await screen.findByText(
        /this candidate focuses on all current and future healthcare professions/i,
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: /any profession/i }));

    expect(onSelect).toHaveBeenCalledWith({
      label: "Any · Healthcare",
      sector: "HEALTHCARE",
      focusesAllProfessions: true,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("filters profession types by sector after going back", async () => {
    const user = userEvent.setup();

    render(<ControlledModal onOpenChange={onOpenChange} onSelect={onSelect} />);

    await user.click(screen.getByRole("option", { name: /^Healthcare/ }));
    expect(
      await screen.findByRole("option", { name: /^Nursing$/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));
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

  it("shows Add profession on the profession step", async () => {
    const user = userEvent.setup();

    render(<ControlledModal onOpenChange={onOpenChange} onSelect={onSelect} />);

    expect(
      screen.queryByRole("button", { name: /add profession/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: /^Healthcare/ }));

    await user.click(
      screen.getByRole("button", { name: /add profession/i }),
    );

    expect(screen.getByText("Close profession form")).toBeInTheDocument();
  });
});
