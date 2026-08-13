import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ProfessionTypeMultiSelect } from "../ProfessionTypeMultiSelect";

vi.mock("@/features/candidates/api", () => ({
  useGetProfessionTypesQuery: (params?: { sector?: string }) => {
    const all = [
      {
        id: "pt-any-hc",
        name: "any_healthcare",
        label: "Any",
        sector: "HEALTHCARE",
      },
      {
        id: "pt-nurse",
        name: "nurse",
        label: "Nurse",
        sector: "HEALTHCARE",
      },
      {
        id: "pt-any-nh",
        name: "any_non_health_care",
        label: "Any",
        sector: "NON_HEALTH_CARE",
      },
    ];
    const professionTypes = params?.sector
      ? all.filter((t) => t.sector === params.sector)
      : all;
    return { data: { professionTypes }, isLoading: false };
  },
}));

describe("ProfessionTypeMultiSelect", () => {
  it("shows Any for NON_HEALTH_CARE sector coverage", async () => {
    const user = userEvent.setup();
    render(
      <ProfessionTypeMultiSelect
        sector="NON_HEALTH_CARE"
        value={[]}
        onValueChange={() => undefined}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByText(/Any · Non-healthcare/i)).toBeInTheDocument();
  });

  it("includes Any among HEALTHCARE options", async () => {
    const user = userEvent.setup();
    render(
      <ProfessionTypeMultiSelect
        sector="HEALTHCARE"
        value={[]}
        onValueChange={() => undefined}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByText(/Any · Healthcare/i)).toBeInTheDocument();
    expect(screen.getByText(/Nurse · Healthcare/i)).toBeInTheDocument();
  });
});
