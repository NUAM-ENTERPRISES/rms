import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PerformanceRatingMedalBadge } from "../PerformanceRatingMedalBadge";

describe("PerformanceRatingMedalBadge", () => {
  it("renders medal tier label with accessible name", () => {
    render(<PerformanceRatingMedalBadge rating="Gold" size="md" />);
    expect(screen.getByLabelText("Gold performance medal")).toBeInTheDocument();
    expect(screen.getByText("Gold")).toBeInTheDocument();
  });

  it("shows Top Tier label for Elite", () => {
    render(
      <PerformanceRatingMedalBadge rating="Elite" size="lg" showTopTierLabel />,
    );
    expect(screen.getByText("Elite")).toBeInTheDocument();
    expect(screen.getByText("Top Tier")).toBeInTheDocument();
  });
});
