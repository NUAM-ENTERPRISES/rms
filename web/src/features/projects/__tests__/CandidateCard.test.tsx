import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("react-router-dom", async () => ({ useNavigate: () => vi.fn() }));

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

  it("shows concise eligible role tooltip when matchScore is object", async () => {
    render(
      <CandidateCard
        candidate={{
          id: "c2",
          firstName: "Role",
          lastName: "Tester",
          matchScore: { roleName: "Emergency Staff Nurse", score: 100 },
        }}
        showMatchScore
      />
    );

    const badge = screen.getByText("100%");
    await userEvent.hover(badge);

    // Tooltip content is rendered twice by the tooltip implementation for
    // accessibility (one visible, one for aria), so use the "AllBy" queries
    // and assert at least one match is present.
    const eligibleTexts = await screen.findAllByText(/This candidate is eligible for/i);
    expect(eligibleTexts.length).toBeGreaterThan(0);
    // There may be multiple DOM nodes (visible + sr-only + aria copy), so assert at least one exists
    expect((await screen.findAllByText(/Emergency Staff Nurse/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/100%/i)).length).toBeGreaterThan(0);
  });

  it("shows a colorful score circle and progress bar in tooltip", async () => {
    render(
      <CandidateCard
        candidate={{
          id: "c3",
          firstName: "Pretty",
          lastName: "Tooltip",
          matchScore: { roleName: "Emergency Staff Nurse", score: 88, roleDepartmentLabel: "Emergency Department" },
        }}
        showMatchScore
      />
    );

    const badge = screen.getByText("88%");
    await userEvent.hover(badge);

    // Ensure the progress text exists (may be rendered twice for accessibility)
    const progressText = await screen.findAllByText(/88% match/i);
    expect(progressText.length).toBeGreaterThan(0);
    // Ensure role is visible (may be duplicated for accessibility)
    expect((await screen.findAllByText(/Emergency Staff Nurse/i)).length).toBeGreaterThan(0);
    // Ensure department is visible
    expect((await screen.findAllByText(/Emergency Department/i)).length).toBeGreaterThan(0);
  });

  it("renders WhatsApp and Call buttons when showContactButtons is true and does not trigger card onView", async () => {
    const onView = vi.fn();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <CandidateCard
        candidate={{ id: "c4", firstName: "Contact", lastName: "Tester", countryCode: "+91", mobileNumber: "9876543210" }}
        showContactButtons
        onView={onView}
      />
    );

    const waBtn = screen.getByTestId("candidate-whatsapp-btn");
    const callBtn = screen.getByTestId("candidate-call-btn");

    expect(waBtn).toBeInTheDocument();
    expect(callBtn).toBeInTheDocument();

    await userEvent.click(waBtn);
    expect(openSpy).toHaveBeenCalled();

    await userEvent.click(callBtn);
    // clicking contact buttons should not call the card onView handler
    expect(onView).not.toHaveBeenCalled();

    openSpy.mockRestore();
  });
});
