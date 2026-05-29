import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CandidatePipeline, type StatusPipelineStage } from "./CandidatePipeline";

function buildPipeline(count: number): StatusPipelineStage[] {
  return Array.from({ length: count }, (_, i) => ({
    step: i + 1,
    statusId: i + 1,
    statusName: i === count - 1 ? "interested" : "untouched",
    enteredAt: new Date(2024, 0, i + 1).toISOString(),
    exitedAt: i < count - 1 ? new Date(2024, 0, i + 2).toISOString() : null,
  }));
}

describe("CandidatePipeline", () => {
  it("renders current status and route map for a long pipeline", () => {
    const pipeline = buildPipeline(12);

    const { container } = render(<CandidatePipeline pipeline={pipeline} />);

    expect(screen.getByText(/Current Status: interested/i)).toBeInTheDocument();
    expect(screen.getByText("YOU ARE HERE")).toBeInTheDocument();
    expect(screen.getByText("12 status changes")).toBeInTheDocument();
    expect(container.querySelector(".lucide-thumbs-up")).toBeInTheDocument();
  });

  it("shows route map expanded by default", () => {
    const pipeline = buildPipeline(5);

    render(<CandidatePipeline pipeline={pipeline} />);

    expect(
      screen.getByRole("button", { name: /Status Journey Route Map/i })
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("YOU ARE HERE")).toBeInTheDocument();
  });

  it("hides route map milestones when collapsed", async () => {
    const user = userEvent.setup();
    const pipeline = buildPipeline(3);

    render(<CandidatePipeline pipeline={pipeline} />);

    expect(screen.getByText("YOU ARE HERE")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Status Journey Route Map/i })
    );

    expect(
      screen.getByRole("button", { name: /Status Journey Route Map/i })
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("YOU ARE HERE")).not.toBeInTheDocument();
  });
});
