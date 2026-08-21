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

vi.mock("../../components/TransferCountryCoverageDialog", () => ({
  TransferCountryCoverageDialog: ({
    open,
    userName,
  }: {
    open: boolean;
    userName: string;
  }) =>
    open ? (
      <div role="dialog" aria-label="Transfer country coverage">
        Transfer dialog for {userName}
      </div>
    ) : null,
}));

vi.mock("../../components/CountryCoverageTransferHistoryDialog", () => ({
  CountryCoverageTransferHistoryDialog: () => null,
}));

import { useCan } from "@/hooks/useCan";
import { useGetCountryCoverageUsersQuery } from "../../api/countryCoverageApi";

describe("CountryCoverageDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCan).mockImplementation((permission: string) => {
      if (permission === "read:country_coverage") return true;
      if (permission === "read:users") return true;
      if (permission === "manage:users") return true;
      return false;
    });
  });

  const mockUsersResponse = {
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
            roles: ["Recruitment Executive"],
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
  } as never;

  it("lists users covering the country", () => {
    vi.mocked(useGetCountryCoverageUsersQuery).mockReturnValue(mockUsersResponse);

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
    expect(screen.getByText("Jane Recruiter")).toBeInTheDocument();
  });

  it("shows Transfer action when manage:users is granted", async () => {
    const user = userEvent.setup();
    vi.mocked(useGetCountryCoverageUsersQuery).mockReturnValue(mockUsersResponse);

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

    await user.click(screen.getByRole("button", { name: /actions for jane recruiter/i }));
    expect(screen.getByText("Transfer")).toBeInTheDocument();

    await user.click(screen.getByText("Transfer"));
    expect(
      screen.getByRole("dialog", { name: /transfer country coverage/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/transfer dialog for jane recruiter/i)).toBeInTheDocument();
  });

  it("hides Transfer action when manage:users is denied", async () => {
    const user = userEvent.setup();
    vi.mocked(useCan).mockImplementation((permission: string) => {
      if (permission === "read:country_coverage") return true;
      if (permission === "read:users") return true;
      return false;
    });
    vi.mocked(useGetCountryCoverageUsersQuery).mockReturnValue(mockUsersResponse);

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

    await user.click(screen.getByRole("button", { name: /actions for jane recruiter/i }));
    expect(screen.queryByText("Transfer")).not.toBeInTheDocument();
    expect(screen.getByText("View Details")).toBeInTheDocument();
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
              roles: ["Recruitment Executive"],
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
      expect.objectContaining({
        refetchOnMountOrArgChange: true,
        refetchOnFocus: true,
      }),
    );
  });
});
