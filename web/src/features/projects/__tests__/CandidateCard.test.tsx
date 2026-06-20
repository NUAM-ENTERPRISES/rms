import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => ({ useNavigate: () => mockNavigate }));

import CandidateCard from "../components/CandidateCard";

describe("CandidateCard", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  const hoverDocumentStatusTooltip = async (fullName = "Intro Tester") => {
    const card = screen.getByRole("button", { name: `View candidate ${fullName}` });
    const fileIcon = card.querySelector(".lucide-file-text");
    expect(fileIcon).toBeTruthy();
    await userEvent.hover(fileIcon!.closest("div")!);
    await screen.findAllByText("Project Documents");
  };
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

  it("hides email/phone pills when hideContactInfo prop is true", () => {
    render(
      <CandidateCard
        candidate={{ id: "c5", firstName: "Hide", lastName: "Tester", email: "foo@bar.com", countryCode: "+91", mobileNumber: "1234567890" }}
        hideContactInfo
      />
    );

    expect(screen.queryByText("foo@bar.com")).not.toBeInTheDocument();
    expect(screen.queryByText("+91 1234567890")).not.toBeInTheDocument();
  });

  it("shows agent name when showAgentName is true and candidate has agent", () => {
    render(
      <CandidateCard
        candidate={{
          id: "c6",
          firstName: "Agent",
          lastName: "Channel",
          agent: { id: "a1", name: "Sony Partner" },
        }}
        showAgentName
      />
    );

    expect(screen.getByText("Sony Partner")).toBeInTheDocument();
  });

  it("does not show agent name when showAgentName is false", () => {
    render(
      <CandidateCard
        candidate={{
          id: "c7",
          firstName: "No",
          lastName: "Label",
          agent: { id: "a1", name: "Hidden Agent" },
        }}
      />
    );

    expect(screen.queryByText("Hidden Agent")).not.toBeInTheDocument();
  });

  it("shows introduction video as pending when required and not uploaded", async () => {
    render(
      <CandidateCard
        candidate={{
          id: "c-intro",
          candidateId: "c-intro",
          firstName: "Intro",
          lastName: "Tester",
          project: { id: "proj-1", introductionVideoRequired: true },
        }}
        projectId="proj-1"
      />,
    );

    await hoverDocumentStatusTooltip();

    expect((await screen.findAllByText("Introduction Video")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("Missing")).length).toBeGreaterThan(0);
  });

  it("shows introduction video verification status when uploaded", async () => {
    render(
      <CandidateCard
        candidate={{
          id: "c-intro-up",
          candidateId: "c-intro-up",
          firstName: "Intro",
          lastName: "Uploaded",
          project: { id: "proj-1", introductionVideoRequired: true },
          documentVerifications: [
            {
              id: "v1",
              status: "verified",
              document: {
                id: "d1",
                docType: "introduction_video",
                fileName: "intro.mp4",
                fileUrl: "https://example.com/intro.mp4",
                status: "verified",
              },
            },
          ],
        }}
        projectId="proj-1"
      />,
    );

    const card = screen.getByRole("button", { name: "View candidate Intro Uploaded" });
    const checkIcon = card.querySelector(".lucide-circle-check-big, .lucide-check-circle");
    expect(checkIcon).toBeTruthy();
    await userEvent.hover(checkIcon!.closest("div")!);
    await screen.findAllByText("Project Documents");

    expect((await screen.findAllByText("Introduction Video")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("Uploaded")).length).toBeGreaterThan(0);
  });

  it("navigates to recruiter docs when recruiter clicks upload documents", async () => {
    render(
      <CandidateCard
        candidate={{
          id: "c-intro-upload",
          candidateId: "c-intro-upload",
          firstName: "Intro",
          lastName: "Uploader",
          project: { id: "proj-1", introductionVideoRequired: true },
        }}
        projectId="proj-1"
        isRecruiter
      />,
    );

    await hoverDocumentStatusTooltip("Intro Uploader");

    const uploadButtons = await screen.findAllByRole("button", { name: /Upload Documents/i });
    await userEvent.click(uploadButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/recruiter-docs/proj-1/c-intro-upload");
  });
});
