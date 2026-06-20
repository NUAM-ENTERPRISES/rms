import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import CourierRegisterPage from "../views/CourierRegisterPage";
import { baseApi } from "@/app/api/baseApi";

vi.mock("@/hooks/useCan", () => ({
  useCan: () => true,
}));

vi.mock("@/app/hooks", () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      auth: {
        user: {
          name: "Aparna DCE",
          roles: ["Documents Control Executive"],
        },
      },
    }),
}));

vi.mock("../api", () => ({
  useGetCourierShipmentStatsQuery: () => ({
    data: {
      data: {
        totalCandidates: 1,
        totalLegs: 5,
        candidatesInTransit: 2,
        candidatesReceived: 3,
        candidatesCourier: 4,
        candidatesDirect: 1,
        candidatesReturn: 1,
      },
    },
  }),
  useGetCourierCandidateGroupsQuery: () => ({
    data: {
      data: {
        groups: [
          {
            candidateId: "c1",
            candidate: {
              firstName: "Abhijith",
              lastName: "Kumar",
              candidateCode: "ABH-001",
            },
            legCount: 5,
            matchingLegCount: 1,
            inTransitCount: 1,
            receivedCount: 0,
            draftCount: 0,
            currentLocationHint: null,
            latestLeg: {
              id: "s1",
              legNumber: 1,
              purposeType: "internal",
              deliveryMode: "courier",
              status: "in_transit",
              fromAddressType: "kochi",
              toAddressType: "delhi",
              fromAddressLabel: "Kochi Office",
              toAddressLabel: "Delhi Office",
              trackingId: "TRK001",
              courierPartner: "Blue Dart",
              sentAt: "2026-06-10T10:00:00.000Z",
              createdAt: "2026-06-10T10:00:00.000Z",
              candidateId: "c1",
              documents: [],
            },
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
    },
    isLoading: false,
    isFetching: false,
  }),
  useLazyExportCourierShipmentsQuery: () => [vi.fn(), { isFetching: false }],
}));

function renderPage() {
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <CourierRegisterPage />
      </MemoryRouter>
    </Provider>,
  );
}

describe("CourierRegisterPage", () => {
  it("renders stat tiles and candidates courier table", () => {
    renderPage();
    expect(screen.getByText("Total Candidates")).toBeInTheDocument();
    expect(screen.queryByText("Total Legs")).not.toBeInTheDocument();
    expect(screen.getByText("Candidates Courier")).toBeInTheDocument();
    expect(screen.getByText("Abhijith Kumar")).toBeInTheDocument();
    expect(screen.getByText(/TRK001/)).toBeInTheDocument();
    expect(screen.queryByText("View pipeline")).not.toBeInTheDocument();
    expect(screen.queryByText("This Month")).not.toBeInTheDocument();
    expect(screen.queryByText("Courier Legs")).not.toBeInTheDocument();
  });

  it("filters list when in transit tile clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    const tiles = screen.getAllByRole("button", { name: /In Transit/i });
    await user.click(tiles[0]);
    expect(screen.getByText("Candidates Courier")).toBeInTheDocument();
  });
});
