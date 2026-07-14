import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OfficeAddressesSettingsCard } from "../OfficeAddressesSettingsCard";

const mockRefetch = vi.fn();
const mockUpdate = vi.fn();

const sampleData = {
  kochi: {
    label: "Kochi Office",
    address: "Affiniks Kochi Office, MG Road, Kochi",
    addressCountryCode: "IN",
    addressStateId: null,
    pincode: "682016",
    phone: "+91 484 000 0000",
    altPhone: "+91 484 000 0001",
  },
  delhi: {
    label: "Delhi Office",
    address: "Affiniks Delhi Office, Connaught Place, New Delhi",
    addressCountryCode: "IN",
    addressStateId: null,
    pincode: "110001",
    phone: "+91 11 0000 0000",
    altPhone: "+91 11 0000 0001",
  },
};

vi.mock("@/hooks/useCan", () => ({
  useCan: vi.fn(),
}));

vi.mock("@/features/admin/api", () => ({
  useGetOfficeAddressesQuery: vi.fn(),
  useUpdateOfficeAddressesMutation: vi.fn(),
}));

import { useCan } from "@/hooks/useCan";
import {
  useGetOfficeAddressesQuery,
  useUpdateOfficeAddressesMutation,
} from "@/features/admin/api";

describe("OfficeAddressesSettingsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGetOfficeAddressesQuery).mockReturnValue({
      data: { data: sampleData },
      isLoading: false,
      refetch: mockRefetch,
      isFetching: false,
    } as never);

    vi.mocked(useUpdateOfficeAddressesMutation).mockReturnValue([
      mockUpdate,
      { isLoading: false },
    ] as never);
  });

  it("hides Edit button for view-only users", () => {
    vi.mocked(useCan).mockReturnValue(false);

    render(<OfficeAddressesSettingsCard />);

    expect(
      screen.queryByRole("button", { name: /edit addresses/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/view-only access to office addresses/i),
    ).toBeInTheDocument();
  });

  it("shows Edit button for users with manage:office_addresses", () => {
    vi.mocked(useCan).mockReturnValue(true);

    render(<OfficeAddressesSettingsCard />);

    expect(
      screen.getByRole("button", { name: /edit addresses/i }),
    ).toBeInTheDocument();
  });

  it("shows validation message when required fields are cleared", async () => {
    const user = userEvent.setup();
    vi.mocked(useCan).mockReturnValue(true);

    render(<OfficeAddressesSettingsCard />);

    await user.click(screen.getByRole("button", { name: /edit addresses/i }));
    await user.click(
      screen.getByRole("button", { name: /enable editing/i }),
    );

    const kochiNameInput = screen.getAllByLabelText(/office name/i)[0];
    await user.clear(kochiNameInput);
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/office name is required/i)).toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
