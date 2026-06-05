import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CandidateScreeningWorkflowPage from "./CandidateScreeningWorkflowPage";

vi.mock("@/features/candidates/api", () => ({
  useGetCandidateScreeningWorkflowQuery: vi.fn(),
  useGetStatusConfigQuery: vi.fn(),
}));

import {
  useGetCandidateScreeningWorkflowQuery,
  useGetStatusConfigQuery,
} from "@/features/candidates/api";

describe("CandidateScreeningWorkflowPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useGetStatusConfigQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        data: {
          subStatuses: [
            { id: "ss-1", name: "screening_assigned", label: "Screening Assigned" },
            { id: "ss-2", name: "training_assigned", label: "Training Assigned" },
            { id: "ss-3", name: "interview_scheduled", label: "Interview Scheduled" },
          ],
        },
      },
    });
  });

  it("renders screening workflow header and project screening data", async () => {
    (useGetCandidateScreeningWorkflowQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        candidate: {
          id: "c1",
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
        },
        projects: [
          {
            id: "cp-1",
            projectId: "p-1",
            updatedAt: new Date().toISOString(),
            project: { title: "ICU Nurse UAE", client: { name: "Aster" } },
            roleNeeded: { designation: "Staff Nurse" },
            subStatus: { name: "screening_scheduled", label: "Screening Scheduled" },
            screenings: [
              {
                id: "s-1",
                interviewer: "Coordinator",
                status: "scheduled",
                scheduledTime: new Date().toISOString(),
              },
            ],
            trainingAssignments: [
              {
                id: "t-1",
                status: "assigned",
                priority: "high",
                focusAreas: ["Communication"],
                trainer: { name: "Trainer One" },
              },
            ],
          },
        ],
        subStatusCounts: [{ subStatusId: "ss-1", count: 1 }],
        totalAll: 1,
        pagination: { total: 1, page: 1, totalPages: 1 },
      },
      isLoading: false,
      error: undefined,
    });

    render(
      <MemoryRouter initialEntries={["/candidates/c1/screening-workflow"]}>
        <Routes>
          <Route path="/candidates/:id/screening-workflow" element={<CandidateScreeningWorkflowPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Screening workflow")).toBeInTheDocument();
    expect(screen.getByText("ICU Nurse UAE")).toBeInTheDocument();

    fireEvent.click(screen.getByText("ICU Nurse UAE"));

    expect(await screen.findByText("Internal Screenings")).toBeInTheDocument();
    expect(screen.getByText("Training Assignments")).toBeInTheDocument();
    expect(screen.getByText("Trainer One")).toBeInTheDocument();
  });
});
