import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PreviousProcessingProjectsModal } from "./PreviousProcessingProjectsModal";

const navigateMock = vi.fn();
const useGetProjectsMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/features/processing/data/processing.endpoints", () => ({
  useGetCandidateProcessingProjectsQuery: (...args: unknown[]) =>
    useGetProjectsMock(...args),
}));

const baseProjectsResponse = {
  data: {
    data: {
      items: [
        {
          id: "pc-current",
          processingStatus: "in_progress",
          joinedAt: "2025-06-01T00:00:00.000Z",
          isCurrent: true,
          project: {
            id: "proj-current",
            title: "Riyadh Hospital Project",
            countryCode: "SA",
            country: { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", flagName: "🇸🇦 Saudi Arabia" },
          },
          role: { id: "role-1", designation: "Lab Tech", roleCatalog: { name: "Laboratory Technician" } },
        },
        {
          id: "pc-old",
          processingStatus: "completed",
          joinedAt: "2024-01-01T00:00:00.000Z",
          isCurrent: false,
          project: {
            id: "proj-old",
            title: "Older Project",
            countryCode: "US",
            country: { code: "US", name: "United States", flag: "🇺🇸", flagName: "🇺🇸 United States" },
          },
          role: { id: "role-2", designation: "Nurse", roleCatalog: { name: "Registered Nurse" } },
        },
      ],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      summary: {
        totalProjects: 2,
        previousProjectsCount: 1,
        hasPreviousProcessing: true,
      },
    },
  },
  isLoading: false,
  isFetching: false,
  error: undefined,
  refetch: vi.fn(),
};

describe("PreviousProcessingProjectsModal", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useGetProjectsMock.mockReset();
    useGetProjectsMock.mockReturnValue(baseProjectsResponse);
  });

  it("renders current and previous project sections with status badges", async () => {
    render(
      <MemoryRouter>
        <PreviousProcessingProjectsModal
          open
          onOpenChange={() => undefined}
          candidateId="cand-1"
          currentProcessingId="pc-current"
          candidateName="Jane Doe"
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Previous Projects Processing")).toBeInTheDocument();
    expect(screen.getByText("Processing nominations for Jane Doe")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Current Project" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Previous Projects" })).toBeInTheDocument();
    expect(screen.getByText("Riyadh Hospital Project")).toBeInTheDocument();
    expect(screen.getByText("Older Project")).toBeInTheDocument();
    expect(screen.getByText("Viewing now")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Lab Tech")).toBeInTheDocument();
    expect(screen.getByText("Nurse")).toBeInTheDocument();
  });

  it("shows empty previous-projects state when candidate has only the current record", async () => {
    useGetProjectsMock.mockReturnValue({
      ...baseProjectsResponse,
      data: {
        data: {
          items: [
            {
              id: "pc-current",
              processingStatus: "assigned",
              joinedAt: "2025-06-01T00:00:00.000Z",
              isCurrent: true,
              project: { id: "proj-current", title: "Only Project", countryCode: null, country: null },
              role: { id: "role-1", designation: "Nurse", roleCatalog: null },
            },
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          summary: {
            totalProjects: 1,
            previousProjectsCount: 0,
            hasPreviousProcessing: false,
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <PreviousProcessingProjectsModal
          open
          onOpenChange={() => undefined}
          candidateId="cand-1"
          currentProcessingId="pc-current"
        />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("No previous processing projects for this candidate."),
    ).toBeInTheDocument();
    expect(screen.getByText("Ready for Processing")).toBeInTheDocument();
  });

  it("navigates to another processing details page when eye button is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <MemoryRouter>
        <PreviousProcessingProjectsModal
          open
          onOpenChange={onOpenChange}
          candidateId="cand-1"
          currentProcessingId="pc-current"
        />
      </MemoryRouter>,
    );

    await user.click(
      await screen.findByRole("button", {
        name: /view processing details for older project/i,
      }),
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(navigateMock).toHaveBeenCalledWith("/processingCandidateDetails/pc-old");
  });
});
