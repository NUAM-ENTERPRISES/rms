import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { CandidatesIntroductionVideos } from "../components/CandidatesIntroductionVideos";

vi.mock("@/features/introduction-videos/api", () => ({
  useGetCandidateIntroductionVideosQuery: () => ({
    data: {
      data: [
        {
          projectId: "p1",
          projectTitle: "Saudi MOH",
          introductionVideoRequired: true,
          candidateProjectMapId: "map1",
          video: {
            verificationId: "ver1",
            documentId: "doc1",
            fileUrl: "https://example.com/intro.mp4",
            fileName: "intro.mp4",
            mimeType: "video/mp4",
            status: "pending",
            uploadedAt: "2026-01-01T00:00:00.000Z",
          },
        },
      ],
    },
    isLoading: false,
  }),
}));

describe("CandidatesIntroductionVideos", () => {
  it("renders project-wise introduction video rows", () => {
    render(<CandidatesIntroductionVideos candidateId="c1" />);

    expect(screen.getByText("Introduction Videos")).toBeInTheDocument();
    expect(screen.getByText("Saudi MOH")).toBeInTheDocument();
    expect(screen.getByText("intro.mp4")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});
