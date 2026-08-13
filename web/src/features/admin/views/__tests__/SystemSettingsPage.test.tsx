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

describe("SystemSettingsPage", () => {
  beforeEach(() => {
    vi.mocked(useCan).mockReturnValue(true);
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
  });
});
