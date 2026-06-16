import { describe, expect, it, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useEffect } from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import CreateShipmentPage from "../CreateShipmentPage";
import { baseApi } from "@/app/api/baseApi";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/useCan", () => ({
  useCan: () => true,
}));

vi.mock("@/components/molecules", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "@/components/molecules",
  );
  return {
    ...actual,
    SelectCandidate: ({
      value,
      onValueChange,
    }: {
      value: string;
      onValueChange: (v: string) => void;
      label: string;
      required?: boolean;
    }) => (
      <button
        type="button"
        onClick={() => onValueChange(value || "cand-1")}
        aria-label="Pick candidate"
      >
        Pick candidate
      </button>
    ),
  };
});

vi.mock("@/features/candidates/components/UserSelect", () => ({
  UserSelect: ({ onChange }: { value: string; onChange: (v: string) => void }) => (
    <button type="button" onClick={() => onChange("user-1")}>
      Select user
    </button>
  ),
}));

vi.mock("../../components/CourierCollectionSummary", () => ({
  CourierCollectionSummary: () => null,
}));

vi.mock("../../components/CourierAddressFields", () => ({
  CourierAddressFields: () => null,
}));

vi.mock("@/features/original-document-collections/components/SelectedCandidateSummary", () => ({
  SelectedCandidateSummary: () => null,
}));

vi.mock("../../components/DocumentSelectionChecklist", () => ({
  DocumentSelectionChecklist: ({
    availableDocTypes,
    selected,
    onChange,
  }: {
    availableDocTypes: string[];
    selected: string[];
    onChange: (v: string[]) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(selected.length ? [] : [availableDocTypes[0]])}
    >
      Toggle doc
    </button>
  ),
}));

vi.mock("../../components/DispatchAnimationScene", () => ({
  DispatchAnimationScene: ({
    phase,
    onThrowComplete,
    onDriveComplete,
  }: {
    phase: "throw" | "drive" | "success";
    onThrowComplete: () => void;
    onDriveComplete: () => void;
  }) => {
    useEffect(() => {
      if (phase === "throw") onThrowComplete();
    }, [phase, onThrowComplete]);

    useEffect(() => {
      if (phase === "drive") onDriveComplete();
    }, [phase, onDriveComplete]);

    return <div>ANIMATION</div>;
  },
}));

vi.mock("../../api", () => {
  const createShipment = vi.fn().mockReturnValue({
    unwrap: () => Promise.resolve({ data: { id: "ship-1" } }),
  });
  const dispatchShipment = vi.fn().mockReturnValue({
    unwrap: () => Promise.resolve({ data: {} }),
  });
  const handoverShipment = vi.fn().mockReturnValue({
    unwrap: () => Promise.resolve({ data: {} }),
  });

  return {
    useCreateCourierShipmentMutation: () => [createShipment, { isLoading: false }],
    useDispatchCourierShipmentMutation: () => [dispatchShipment, { isLoading: false }],
    useHandoverCourierShipmentMutation: () => [handoverShipment, { isLoading: false }],
    useGetCourierCollectionDocsQuery: () => ({
      data: { data: { cumulativeReceived: [{ docType: "passport" }] } },
    }),
    useGetCourierOfficeAddressesQuery: () => ({ data: { data: {} } }),
  };
});

vi.mock("@/features/candidates/api", () => ({
  useGetCandidateByIdQuery: () => ({
    data: {
      data: {
        id: "cand-1",
        firstName: "A",
        lastName: "B",
        candidateCode: "C-1",
      },
    },
  }),
}));

describe("CreateShipmentPage dispatch animation", () => {
  it("auto-closes the confirm modal after dispatch animation completes", async () => {
    const user = userEvent.setup();

    const store = configureStore({
      reducer: { [baseApi.reducerPath]: baseApi.reducer },
      middleware: (gDM) => gDM().concat(baseApi.middleware),
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/courier-management/new?candidateId=cand-1"]}>
          <CreateShipmentPage />
        </MemoryRouter>
      </Provider>,
    );

    await user.click(screen.getByRole("button", { name: /Continue/i }));
    await user.click(screen.getByRole("button", { name: /Toggle doc/i }));
    await user.click(screen.getByRole("button", { name: /Continue/i }));
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    await user.type(screen.getByLabelText(/Tracking ID/i), "TRK-1");
    await user.click(screen.getAllByRole("button", { name: /Select user/i })[0]);
    await user.click(screen.getAllByRole("button", { name: /Select user/i })[1]);

    await user.click(screen.getByRole("button", { name: /Dispatch Courier/i }));
    expect(screen.getByText(/Confirm courier dispatch/i)).toBeInTheDocument();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: /^Dispatch$/i }));
    expect(screen.getByText("ANIMATION")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(10_050);
    });

    expect(screen.queryByText(/Confirm courier dispatch/i)).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});

