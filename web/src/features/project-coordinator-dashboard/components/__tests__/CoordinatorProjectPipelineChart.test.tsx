import { ProjectStatus } from "@/entities/project/constants";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CoordinatorProjectPipelineChart from "../CoordinatorProjectPipelineChart";

vi.mock("../../api/projectCoordinatorDashboardApi", () => ({
  useGetCoordinatorMyProjectsQuery: () => ({
    data: {
      data: {
        projects: [
          {
            projectId: "p1",
            projectName: "ICU Nurses",
            clientName: "City Hospital",
            status: ProjectStatus.IN_PROGRESS,
          },
        ],
        pagination: { total: 1, totalPages: 1, page: 1, limit: 10 },
      },
    },
    isLoading: false,
    isError: false,
  }),
  useGetCoordinatorProjectPipelineQuery: () => ({
    data: {
      data: {
        project: {
          projectId: "p1",
          projectName: "ICU Nurses",
          clientName: "City Hospital",
          status: ProjectStatus.IN_PROGRESS,
        },
        pipeline: {
          total: 12,
          nominated: 3,
          documents: 2,
          interview: 4,
          processing: 2,
          deployed: 1,
        },
        stages: [
          { key: "nominated", label: "Nominated", count: 3, color: "indigo" },
          { key: "documents", label: "Documents", count: 2, color: "amber" },
          { key: "interview", label: "Interview", count: 4, color: "purple" },
          { key: "processing", label: "Processing", count: 2, color: "orange" },
          { key: "deployed", label: "Deployed", count: 1, color: "emerald" },
        ],
      },
    },
    isLoading: false,
    isError: false,
  }),
}));

describe("CoordinatorProjectPipelineChart", () => {
  it("renders pipeline stage labels and counts for selected project", () => {
    render(<CoordinatorProjectPipelineChart />);

    expect(screen.getByText("Project Candidate Pipeline")).toBeInTheDocument();
    expect(screen.getAllByText("ICU Nurses").length).toBeGreaterThan(0);
    expect(screen.getByText("City Hospital")).toBeInTheDocument();
    expect(screen.getByText("Nominated")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Interview")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("Deployed")).toBeInTheDocument();
    expect(screen.getByText("12 candidates in pipeline")).toBeInTheDocument();
  });
});
