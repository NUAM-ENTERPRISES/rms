import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { SelectAgent } from "../SelectAgent";

vi.mock("@/features/agents/api", () => ({
  useGetAgentsQuery: (_params: unknown, opts?: { skip?: boolean }) => ({
    data:
      opts?.skip !== true
        ? {
            success: true,
            data: [
              {
                id: "a1",
                name: "Partner One",
                companyName: "Acme Ltd",
                isActive: true,
              },
            ],
            meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
          }
        : undefined,
    isLoading: false,
    isFetching: false,
  }),
  useGetAgentQuery: () => ({
    data: undefined,
    isLoading: false,
  }),
}));

describe("SelectAgent", () => {
  it("loads agents when opened and selects an agent", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <SelectAgent
        value=""
        onValueChange={onValueChange}
        placeholder="Pick agent"
      />,
    );

    await user.click(screen.getByRole("combobox"));

    expect(await screen.findByText(/Partner One/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Partner One \(Acme Ltd\)/i }));

    expect(onValueChange).toHaveBeenCalledWith("a1");
  });
});
