import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { IntroductionVideoReuseModal } from "./IntroductionVideoReuseModal";

vi.mock("@/features/introduction-videos/api", () => ({
  useGetReusableIntroductionVideosQuery: () => ({
    data: {
      data: [
        {
          documentId: "doc1",
          fileName: "abhijith_intro_video.mp4",
          fileUrl: "https://example.com/intro.mp4",
          status: "pending",
          remarks: "Studio recording",
          uploadedAt: "2026-01-01T00:00:00.000Z",
          isLibrary: true,
          linkedProjects: [],
        },
        {
          documentId: "doc2",
          fileName: "abhijith_saudi_moh_intro_video.mp4",
          fileUrl: "https://example.com/project.mp4",
          status: "verified",
          remarks: null,
          uploadedAt: "2026-01-02T00:00:00.000Z",
          isLibrary: false,
          linkedProjects: [{ projectId: "p2", projectTitle: "Saudi MOH" }],
        },
      ],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    },
    isLoading: false,
    isFetching: false,
  }),
}));

describe("IntroductionVideoReuseModal", () => {
  it("renders reusable videos with remarks and linked project labels", () => {
    render(
      <IntroductionVideoReuseModal
        isOpen
        onClose={vi.fn()}
        candidateId="c1"
        excludeProjectId="p1"
        onReuse={vi.fn()}
      />
    );

    expect(screen.getByText("Reuse Introduction Video")).toBeInTheDocument();
    expect(screen.getByText("Studio recording")).toBeInTheDocument();
    expect(screen.getByText("Candidate library")).toBeInTheDocument();
    expect(screen.getByText("Saudi MOH")).toBeInTheDocument();
  });
});
