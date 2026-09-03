import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CandidateQualificationSelect from "../CandidateQualificationSelect";

vi.mock("@/shared/hooks/useQualificationsLookup", () => ({
  useGetQualificationsQuery: () => ({
    data: {
      data: {
        qualifications: [
          {
            id: "q-bsc",
            name: "BSc Nursing",
            shortName: "BScN",
            level: "BACHELOR",
            field: "Nursing",
            isActive: true,
            createdAt: "",
            updatedAt: "",
          },
        ],
        pagination: { page: 1, limit: 15, total: 1, totalPages: 1 },
      },
    },
    isLoading: false,
  }),
}));

vi.mock("../CountrySelect", () => ({
  default: () => null,
}));

vi.mock("@/features/admin/components/QualificationFormDialog", () => ({
  QualificationFormDialog: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="Create qualification">
        <button type="button" onClick={() => onOpenChange(false)}>
          Close qualification form
        </button>
      </div>
    ) : null,
}));

describe("CandidateQualificationSelect", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it("shows the qualification list when Select Qualification is opened", async () => {
    const user = userEvent.setup();

    render(
      <CandidateQualificationSelect value={[]} onChange={onChange} />,
    );

    await user.click(
      screen.getByRole("combobox", { name: /select qualification/i }),
    );

    expect(
      await screen.findByRole("option", { name: /bsc nursing/i }),
    ).toBeInTheDocument();
  });

  it("shows Add qualification inside the droplist and opens the form", async () => {
    const user = userEvent.setup();

    render(
      <CandidateQualificationSelect value={[]} onChange={onChange} />,
    );

    await user.click(
      screen.getByRole("combobox", { name: /select qualification/i }),
    );

    await user.click(
      await screen.findByRole("button", { name: /add qualification/i }),
    );

    expect(screen.getByText("Close qualification form")).toBeInTheDocument();
  });
});
