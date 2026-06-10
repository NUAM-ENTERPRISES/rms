import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OperationsCallFollowUpIndicators } from "../OperationsCallFollowUpIndicators";

describe("OperationsCallFollowUpIndicators", () => {
  it("renders call count pill and view history action", async () => {
    const user = userEvent.setup();
    const onViewHistory = vi.fn();

    render(
      <OperationsCallFollowUpIndicators
        assignment={{
          operationsFollowUpStage: "initial",
          operationsCallAttempts: 2,
        }}
        onViewHistory={onViewHistory}
      />,
    );

    expect(screen.getByText("2/3 calls")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View history" }));
    expect(onViewHistory).toHaveBeenCalledTimes(1);
  });

  it("renders log call button when enabled", async () => {
    const user = userEvent.setup();
    const onLogCall = vi.fn();

    render(
      <OperationsCallFollowUpIndicators
        assignment={{
          operationsFollowUpStage: "initial",
          operationsCallAttempts: 0,
        }}
        canLogCall
        showLogCallButton
        onLogCall={onLogCall}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Log Call" }));
    expect(onLogCall).toHaveBeenCalledTimes(1);
  });
});
