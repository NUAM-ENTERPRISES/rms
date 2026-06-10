import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectStatusUpdateModal } from "./ProjectStatusUpdateModal";

const createRequest = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));

vi.mock("@/features/candidates/api", () => ({
  useCreateCandidateProjectStatusChangeRequestMutation: () => [
    createRequest,
    { isLoading: false },
  ],
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ProjectStatusUpdateModal", () => {
  it("shows apply status for managers with direct apply", () => {
    render(
      <ProjectStatusUpdateModal
        open
        onOpenChange={vi.fn()}
        candidateProjectMapId="map1"
        candidateId="c1"
        projectId="p1"
        candidateName="Jane Doe"
        projectName="Project A"
        canDirectApply
      />,
    );

    expect(screen.getByRole("button", { name: /apply status/i })).toBeInTheDocument();
    expect(screen.getByText(/change will apply immediately/i)).toBeInTheDocument();
  });

  it("requires remarks before submit", async () => {
    render(
      <ProjectStatusUpdateModal
        open
        onOpenChange={vi.fn()}
        candidateProjectMapId="map1"
        candidateId="c1"
        projectId="p1"
        candidateName="Jane Doe"
        projectName="Project A"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /submit request/i }));
    expect(await screen.findByText(/at least 10 characters/i)).toBeInTheDocument();
    expect(createRequest).not.toHaveBeenCalled();
  });
});
