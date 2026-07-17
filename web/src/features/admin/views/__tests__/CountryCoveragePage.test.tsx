import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CountryCoveragePage from "../CountryCoveragePage";

vi.mock("@/hooks/useCan", () => ({
  useCan: vi.fn(),
}));

vi.mock("@/components/molecules", () => ({
  CountrySelect: ({
    value,
    onValueChange,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <select
      aria-label="Country"
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      <option value="">All</option>
      <option value="SA">Saudi Arabia</option>
      <option value="IN">India</option>
    </select>
  ),
}));

vi.mock("../../api/countryCoverageApi", () => ({
  COUNTRY_COVERAGE_PAGE_SIZE: 15,
  useGetCountryCoverageSummaryQuery: vi.fn(),
}));

import { useCan } from "@/hooks/useCan";
import { useGetCountryCoverageSummaryQuery } from "../../api/countryCoverageApi";

describe("CountryCoveragePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCan).mockReturnValue(true);
    vi.mocked(useGetCountryCoverageSummaryQuery).mockReturnValue({
      data: {
        success: true,
        data: {
          gcc: {
            code: "GCC",
            name: "GCC",
            userCount: 1,
            healthcareCount: 1,
            nonHealthcareCount: 0,
            countryCodes: ["SA", "AE", "QA", "OM", "BH", "KW"],
          },
          countries: [
            {
              code: "IN",
              name: "India",
              userCount: 2,
              healthcareCount: 1,
              nonHealthcareCount: 1,
              isGcc: false,
            },
          ],
          pagination: { page: 1, limit: 15, total: 1, totalPages: 1 },
        },
        message: "ok",
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    } as never);
  });

  it("renders one GCC card in the grid and only non-GCC country cards", () => {
    render(
      <MemoryRouter>
        <CountryCoveragePage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Country Coverage")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view users covering gcc/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view users covering india/i }),
    ).toBeInTheDocument();
    expect(useGetCountryCoverageSummaryQuery).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 15 }),
      expect.anything(),
    );
  });

  it("requests countryCode when country dropdown changes", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CountryCoveragePage />
      </MemoryRouter>,
    );

    await user.selectOptions(screen.getByLabelText("Country"), "SA");

    expect(useGetCountryCoverageSummaryQuery).toHaveBeenCalledWith(
      expect.objectContaining({ countryCode: "SA", page: 1, limit: 15 }),
      expect.anything(),
    );
  });
});
