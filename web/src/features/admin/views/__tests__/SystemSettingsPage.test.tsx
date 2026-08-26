import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SystemSettingsPage from "../SystemSettingsPage";

vi.mock("@/hooks/useCan", () => ({
  useCan: vi.fn(),
}));

vi.mock("../../components", () => ({
  RNRSettingsCard: () => <div>RNR settings</div>,
  HRDSettingsCard: () => <div>HRD settings</div>,
  LeadgenChannelsSettingsCard: () => <div>Leadgen settings</div>,
  OfficeAddressesSettingsCard: () => <div>Office settings</div>,
  CatalogSettingsCard: () => <div>Catalog settings</div>,
}));

import { useCan } from "@/hooks/useCan";

function mockPermissions(allowed: string[]) {
  vi.mocked(useCan).mockImplementation((required) => {
    const list = Array.isArray(required) ? required : [required];
    return list.some((key) => allowed.includes(key));
  });
}

describe("SystemSettingsPage", () => {
  beforeEach(() => {
    mockPermissions([
      "read:rnr_settings",
      "read:hrd_settings",
      "read:leadgen_channels",
      "read:office_addresses",
      "read:master_catalog",
      "read:qualifications",
      "manage:rnr_settings",
      "manage:hrd_settings",
      "manage:leadgen_channels",
      "manage:office_addresses",
      "manage:master_catalog",
      "manage:qualifications",
    ]);
  });

  it("uses horizontal side scroll for settings section nav", () => {
    render(<SystemSettingsPage />);

    const nav = screen.getByRole("navigation", { name: /settings sections/i });
    expect(nav.className).toContain("overflow-x-auto");
    expect(
      screen.getByRole("button", { name: /master catalog/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/professions, departments, roles & qualifications/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /leadgen channels/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/whatsapp, instagram, messenger & lead ads/i),
    ).toBeInTheDocument();
  });

  it("shows only tabs the user can access", () => {
    mockPermissions(["read:office_addresses", "manage:office_addresses"]);

    render(<SystemSettingsPage />);

    expect(
      screen.getByRole("button", { name: /office addresses/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /rnr settings/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /hrd settings/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /leadgen channels/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /master catalog/i }),
    ).not.toBeInTheDocument();
  });

  it("denies access without any system settings permission", () => {
    mockPermissions([]);

    render(<SystemSettingsPage />);

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });
});
