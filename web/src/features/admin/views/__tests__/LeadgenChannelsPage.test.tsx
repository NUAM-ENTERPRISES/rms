import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LeadgenChannelsPage from "../LeadgenChannelsPage";

vi.mock("@/hooks/useCan", () => ({
  useCan: vi.fn(),
  useHasRole: vi.fn(),
}));

vi.mock("@/features/admin/components", () => ({
  LeadgenChannelsSettingsCard: () => <div>Leadgen settings card</div>,
}));

import { useCan, useHasRole } from "@/hooks/useCan";

describe("LeadgenChannelsPage", () => {
  beforeEach(() => {
    vi.mocked(useCan).mockReturnValue(true);
    vi.mocked(useHasRole).mockReturnValue(false);
  });

  it("renders hero and leadgen settings card when permitted", () => {
    render(<LeadgenChannelsPage />);

    expect(screen.getByText("Leadgen Channels")).toBeInTheDocument();
    expect(
      screen.getByText(
        /enable or disable inbound meta channels: whatsapp, instagram, messenger, and lead ads forms/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/leadgen settings card/i)).toBeInTheDocument();
  });

  it("shows access denied without leadgen channel permission or admin role", () => {
    vi.mocked(useCan).mockReturnValue(false);
    vi.mocked(useHasRole).mockReturnValue(false);

    render(<LeadgenChannelsPage />);

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(
      screen.queryByText(/leadgen settings card/i),
    ).not.toBeInTheDocument();
  });

  it("allows admin roles without leadgen permission keys", () => {
    vi.mocked(useCan).mockReturnValue(false);
    vi.mocked(useHasRole).mockReturnValue(true);

    render(<LeadgenChannelsPage />);

    expect(screen.getByText(/leadgen settings card/i)).toBeInTheDocument();
  });
});
