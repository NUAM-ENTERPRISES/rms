import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import CandidateCard from "../components/CandidateCard";

describe("CandidateCard - interview button", () => {
  it("calls onSendForInterview when button is clicked", async () => {
    const onSend = vi.fn();

    render(
      <CandidateCard
        candidate={{ id: "c1", firstName: "Test", lastName: "User" }}
        showInterviewButton
        onSendForInterview={onSend}
      />
    );

    const btn = screen.getByRole("button", { name: /send for interview/i });
    await userEvent.click(btn);

    expect(onSend).toHaveBeenCalledWith("c1");
  });
});
