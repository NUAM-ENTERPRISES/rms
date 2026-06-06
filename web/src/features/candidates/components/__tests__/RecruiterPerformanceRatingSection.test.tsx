import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecruiterPerformanceRatingSection from "../RecruiterPerformanceRatingSection";

const mockUseGetRecruiterPerformanceRatingQuery = vi.fn();

vi.mock("@/services/recruiterAnalyticsApi", () => ({
  useGetRecruiterPerformanceRatingQuery: (...args: unknown[]) =>
    mockUseGetRecruiterPerformanceRatingQuery(...args),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Cell: () => null,
}));

const sampleStageCounts = {
  positiveCandidate: 10,
  documentVerified: 8,
  interviewShortlisted: 7,
  interviewPassed: 5,
  processing: 3,
  deployed: 2,
};

const sampleResponse = {
  data: {
    data: {
      monthly: {
        score: 113,
        rating: "Platinum",
        stageCounts: sampleStageCounts,
        period: { year: 2026, month: 6 },
      },
      yearly: {
        score: 200,
        rating: "Elite",
        stageCounts: {
          ...sampleStageCounts,
          deployed: 5,
        },
        period: { year: 2026 },
      },
    },
  },
  isLoading: false,
  isError: false,
};

describe("RecruiterPerformanceRatingSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetRecruiterPerformanceRatingQuery.mockReturnValue(sampleResponse);
  });

  it("renders hero score and pipeline chart without stage breakdown list", () => {
    render(<RecruiterPerformanceRatingSection />);

    expect(screen.getByRole("heading", { name: /Recruiter Performance Rating/i })).toBeInTheDocument();
    expect(screen.getAllByText("113").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Platinum").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("img", { name: /5 stars for Platinum rating/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Overall rating/i)).toBeInTheDocument();
    expect(screen.getByText(/How your score was built/i)).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /Stage breakdown/i })).not.toBeInTheDocument();
  });

  it("shows monthly and yearly snapshot controls", () => {
    render(<RecruiterPerformanceRatingSection />);
    expect(screen.getAllByRole("button", { name: /monthly/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /yearly/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("200").length).toBeGreaterThan(0);
  });

  it("switches active period when yearly toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<RecruiterPerformanceRatingSection />);

    const yearlyButtons = screen.getAllByRole("button", { name: /yearly/i });
    await user.click(yearlyButtons[0]);

    expect(screen.getAllByText("200").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Elite").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Top Tier").length).toBeGreaterThan(0);
  });

  it("shows overall rating context and next step helper", () => {
    render(<RecruiterPerformanceRatingSection />);
    expect(screen.getByText(/requires 101–150 points/i)).toBeInTheDocument();
    expect(screen.getByText(/points to Elite/i)).toBeInTheDocument();
    expect(screen.queryByText(/Tier progress/i)).not.toBeInTheDocument();
  });

  it("shows empty state when all stage counts are zero", () => {
    mockUseGetRecruiterPerformanceRatingQuery.mockReturnValue({
      data: {
        data: {
          monthly: {
            score: 0,
            rating: "Bronze",
            stageCounts: {
              positiveCandidate: 0,
              documentVerified: 0,
              interviewShortlisted: 0,
              interviewPassed: 0,
              processing: 0,
              deployed: 0,
            },
            period: { year: 2026, month: 6 },
          },
          yearly: {
            score: 0,
            rating: "Bronze",
            stageCounts: {
              positiveCandidate: 0,
              documentVerified: 0,
              interviewShortlisted: 0,
              interviewPassed: 0,
              processing: 0,
              deployed: 0,
            },
            period: { year: 2026 },
          },
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<RecruiterPerformanceRatingSection />);

    expect(screen.getByText(/No stage progress in this period yet/i)).toBeInTheDocument();
  });

  it("shows loading skeleton", () => {
    mockUseGetRecruiterPerformanceRatingQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = render(<RecruiterPerformanceRatingSection />);

    expect(screen.getByRole("heading", { name: /Recruiter Performance Rating/i })).toBeInTheDocument();
    expect(container.querySelector("[aria-busy='true']")).toBeInTheDocument();
  });
});
