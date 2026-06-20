import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RequestAgentCandidatesModal from "./RequestAgentCandidatesModal";

describe("RequestAgentCandidatesModal", () => {
  it("submits selected roles with requested counts", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <RequestAgentCandidatesModal
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
        projectRoles={[
          {
            id: "role-1",
            designation: "Emergency Nurse",
            quantity: 5,
            priority: "high",
            backgroundCheckRequired: true,
            drugScreeningRequired: true,
            onCallRequired: false,
            relocationAssistance: false,
            employmentType: "permanent",
            genderRequirement: "all",
          },
        ]}
      />
    );

    const checkbox = screen.getByLabelText(/select emergency nurse/i);
    fireEvent.click(checkbox);

    const countInput = screen.getByLabelText(/requested count/i);
    fireEvent.change(countInput, { target: { value: "2" } });

    fireEvent.click(screen.getByRole("button", { name: /send request/i }));

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        items: [{ roleNeededId: "role-1", requestedCount: 2 }],
        notes: undefined,
      })
    );
  });
});
