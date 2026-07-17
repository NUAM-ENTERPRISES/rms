import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CountryCoverageDetailPage from "../CountryCoverageDetailPage";

vi.mock("@/hooks/useCan", () => ({
  useCan: vi.fn(),
}));

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: string) => value,
}));

vi.mock("@/hooks/useSystemConfig", () => ({
  getRoleBadgeVariant: () => "outline" as const,
}));

vi.mock("../../api/countryCoverageApi", () => ({
  useGetCountryCoverageUsersQuery: vi.fn(),
}));

import { useCan } from "@/hooks/useCan";
import { useGetCountryCoverageUsersQuery } from "../../api/countryCoverageApi";

describe("CountryCoverageDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCan).mockReturnValue(true);
  });

  it("lists users covering the country", () => {
    vi.mocked(useGetCountryCoverageUsersQuery).mockReturnValue({
      data: {
        success: true,
        data: {
          country: { code: "SA", name: "Saudi Arabia" },
          summary: {
            userCount: 1,
            healthcareCount: 1,
            nonHealthcareCount: 0,
          },
          users: [
            {
              id: "u1",
              name: "Jane Recruiter",
              email: "jane@example.com",
              profileImage: null,
              mobileNumber: "9876543210",
              phoneCountryCode: "+91",
              accountStatus: "ACTIVE",
              roles: ["Recruiter"],
              sectorScopes: ["HEALTHCARE"],
            },
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
        message: "ok",
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    } as never);

    render(
      <MemoryRouter initialEntries={["/admin/country-coverage/SA"]}>
        <Routes>
          <Route
            path="/admin/country-coverage/:countryCode"
            element={<CountryCoverageDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: /saudi arabia/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /show all users covering this country/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /filter healthcare users/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Jane Recruiter")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("+91 9876543210")).toBeInTheDocument();
    expect(screen.getAllByText("Healthcare").length).toBeGreaterThan(0);
  });

  it("filters single-country users when a sector tile is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useGetCountryCoverageUsersQuery).mockReturnValue({
      data: {
        success: true,
        data: {
          country: { code: "IE", name: "Ireland" },
          summary: {
            userCount: 2,
            healthcareCount: 1,
            nonHealthcareCount: 1,
          },
          users: [
            {
              id: "u1",
              name: "Jane Recruiter",
              email: "jane@example.com",
              profileImage: null,
              mobileNumber: "111",
              phoneCountryCode: "+353",
              accountStatus: "ACTIVE",
              roles: ["Recruiter"],
              sectorScopes: ["HEALTHCARE"],
            },
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
        message: "ok",
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    } as never);

    render(
      <MemoryRouter initialEntries={["/admin/country-coverage/IE"]}>
        <Routes>
          <Route
            path="/admin/country-coverage/:countryCode"
            element={<CountryCoverageDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: /filter healthcare users/i }),
    );

    expect(useGetCountryCoverageUsersQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        countryCode: "IE",
        sector: "HEALTHCARE",
      }),
      expect.anything(),
    );
  });

  it("filters GCC users on the same page when a country tile is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useGetCountryCoverageUsersQuery).mockReturnValue({
      data: {
        success: true,
        data: {
          country: { code: "GCC", name: "GCC" },
          countryBreakdown: [
            { code: "KW", name: "Kuwait", userCount: 1 },
            { code: "OM", name: "Oman", userCount: 1 },
            { code: "QA", name: "Qatar", userCount: 0 },
          ],
          uniqueUserCount: 1,
          users: [
            {
              id: "u1",
              name: "Jane Recruiter",
              email: "jane@example.com",
              profileImage: null,
              mobileNumber: "111",
              phoneCountryCode: "+965",
              accountStatus: "ACTIVE",
              roles: ["Recruiter"],
              sectorScopes: ["HEALTHCARE"],
              coveredCountryCodes: ["KW", "OM"],
            },
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
        message: "ok",
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    } as never);

    render(
      <MemoryRouter initialEntries={["/admin/country-coverage/GCC"]}>
        <Routes>
          <Route
            path="/admin/country-coverage/:countryCode"
            element={<CountryCoverageDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("button", { name: /show all gcc users/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /filter users covering kuwait/i }),
    );

    expect(useGetCountryCoverageUsersQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        countryCode: "GCC",
        coveredCountry: "KW",
      }),
      expect.anything(),
    );
    expect(screen.getByRole("heading", { name: /kuwait/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /kuwait/i }).textContent,
    ).toMatch(/KW/);

    await user.click(screen.getByRole("button", { name: /show all gcc users/i }));

    expect(useGetCountryCoverageUsersQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        countryCode: "GCC",
        coveredCountry: undefined,
      }),
      expect.anything(),
    );
  });
});
