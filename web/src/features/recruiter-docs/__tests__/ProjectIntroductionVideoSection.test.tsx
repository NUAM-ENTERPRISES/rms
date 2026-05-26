import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import ProjectIntroductionVideoSection from "../components/ProjectIntroductionVideoSection";

vi.mock("@/features/introduction-videos/api", () => ({
  useUploadIntroductionVideoMutation: () => [vi.fn(), { isLoading: false }],
  useReuseIntroductionVideoMutation: () => [vi.fn(), { isLoading: false }],
  useReuploadIntroductionVideoMutation: () => [vi.fn(), { isLoading: false }],
}));

describe("ProjectIntroductionVideoSection", () => {
  it("shows upload actions when no video is linked", () => {
    render(
      <ProjectIntroductionVideoSection
        candidateId="c1"
        projectId="p1"
        introductionVideo={null}
        existingDocuments={[]}
      />
    );

    expect(screen.getByText("Project Introduction Video")).toBeInTheDocument();
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("Not Submitted")).toBeInTheDocument();
  });

  it("shows linked video details when provided", () => {
    render(
      <ProjectIntroductionVideoSection
        candidateId="c1"
        projectId="p1"
        introductionVideo={{
          id: "ver1",
          status: "verified",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          document: {
            id: "doc1",
            docType: "introduction_video",
            fileName: "candidate-intro.mp4",
            fileUrl: "https://example.com/candidate-intro.mp4",
            mimeType: "video/mp4",
            status: "verified",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        }}
      />
    );

    expect(screen.getByText("candidate-intro.mp4")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("shows rejection reason and re-upload when resubmission is required", () => {
    render(
      <ProjectIntroductionVideoSection
        candidateId="c1"
        projectId="p1"
        isVerificationSent
        introductionVideo={{
          id: "ver1",
          status: "resubmission_required",
          rejectionReason: "Audio is unclear",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          document: {
            id: "doc1",
            docType: "introduction_video",
            fileName: "candidate-intro.mp4",
            fileUrl: "https://example.com/candidate-intro.mp4",
            mimeType: "video/mp4",
            status: "resubmission_required",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        }}
      />
    );

    expect(screen.getByText("Resubmission Needed")).toBeInTheDocument();
    expect(screen.getByText(/Reason: Audio is unclear/)).toBeInTheDocument();
    expect(screen.getByTitle("Re-upload (Requested)")).toBeInTheDocument();
  });

  it("shows waiting message when rejected after verification was sent", () => {
    render(
      <ProjectIntroductionVideoSection
        candidateId="c1"
        projectId="p1"
        isVerificationSent
        introductionVideo={{
          id: "ver1",
          status: "rejected",
          rejectionReason: "Background noise",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          document: {
            id: "doc1",
            docType: "introduction_video",
            fileName: "candidate-intro.mp4",
            fileUrl: "https://example.com/candidate-intro.mp4",
            mimeType: "video/mp4",
            status: "rejected",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        }}
      />
    );

    expect(
      screen.getByText("Waiting for documentation resubmission request")
    ).toBeInTheDocument();
  });
});
