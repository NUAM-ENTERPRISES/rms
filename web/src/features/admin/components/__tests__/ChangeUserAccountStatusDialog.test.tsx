import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangeUserAccountStatusDialog } from "../ChangeUserAccountStatusDialog";

describe("ChangeUserAccountStatusDialog", () => {
  it("rejects whitespace-only remarks", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ChangeUserAccountStatusDialog
        open
        onOpenChange={() => {}}
        targetStatus="ACTIVE"
        userName="Jane Doe"
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByLabelText(/remarks/i), "   ");
    await user.click(screen.getByRole("button", { name: /mark as active/i }));

    expect(
      await screen.findByText(
        /remarks are required and must be at least 3 characters/i,
      ),
    ).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("requires remarks before submit", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ChangeUserAccountStatusDialog
        open
        onOpenChange={() => {}}
        targetStatus="BLOCKED"
        userName="Jane Doe"
        onConfirm={onConfirm}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /block user/i }),
    );

    expect(
      await screen.findByText(
        /remarks are required and must be at least 3 characters/i,
      ),
    ).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("submits trimmed remarks", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <ChangeUserAccountStatusDialog
        open
        onOpenChange={() => {}}
        targetStatus="INACTIVE"
        userName="Jane Doe"
        onConfirm={onConfirm}
      />,
    );

    await user.type(
      screen.getByLabelText(/remarks/i),
      "  On extended leave  ",
    );
    await user.click(
      screen.getByRole("button", { name: /mark as inactive/i }),
    );

    expect(onConfirm).toHaveBeenCalledWith("On extended leave");
  });
});
