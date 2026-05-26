import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { CandidatesIntroductionVideos } from "../components/CandidatesIntroductionVideos";

vi.mock("@/components/molecules/ProjectRoleFilter", () => ({
  ProjectRoleFilter: () => <div data-testid="project-role-filter" />,
}));

vi.mock("@/features/introduction-videos/api", () => ({
  useGetCandidateIntroductionVideosQuery: () => ({
    data: {
      data: [
        {
          projectId: "p1",
          projectTitle: "Saudi MOH",
          roleLabel: "Staff Nurse",
          introductionVideoRequired: true,
          candidateProjectMapId: "map1",
          video: {
            verificationId: "ver1",
            documentId: "doc1",
            fileUrl: "https://example.com/intro.mp4",
            fileName: "abhijith_aster_intro_video.mp4",
            mimeType: "video/mp4",
            status: "pending",
            uploadedAt: "2026-01-01T00:00:00.000Z",
            remarks: "Project intro note",
          },
        },
      ],
      library: [
        {
          documentId: "doc-lib1",
          fileName: "abhijith_intro_video.mp4",
          fileUrl: "https://example.com/library.mp4",
          status: "pending",
          uploadedAt: "2026-01-02T00:00:00.000Z",
          remarks: "Library note",
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    },
    isLoading: false,
    isFetching: false,
  }),
  useUploadCandidateIntroductionVideoMutation: () => [vi.fn(), { isLoading: false }],
}));

describe("CandidatesIntroductionVideos", () => {
  it("renders project-wise introduction video rows with filters", () => {
    render(<CandidatesIntroductionVideos candidateId="c1" />);

    expect(screen.getByText("Introduction Videos")).toBeInTheDocument();
    expect(screen.getByText("Upload Video")).toBeInTheDocument();
    expect(screen.getByText("Candidate Video Library")).toBeInTheDocument();
    expect(screen.getByText("abhijith_intro_video.mp4")).toBeInTheDocument();
    expect(screen.getByText("Library note")).toBeInTheDocument();
    expect(screen.getByText("Project intro note")).toBeInTheDocument();
    expect(screen.getByTestId("project-role-filter")).toBeInTheDocument();
    expect(screen.getByText("Saudi MOH")).toBeInTheDocument();
    expect(screen.getByText("Staff Nurse")).toBeInTheDocument();
    expect(screen.getByText("abhijith_aster_intro_video.mp4")).toBeInTheDocument();
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
  });
});
