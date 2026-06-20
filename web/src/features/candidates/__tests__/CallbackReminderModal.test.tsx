import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import {
  CallbackReminderModal,
  getCallbackReminderNote,
} from "../components/CallbackReminderModal";
import type { CallbackReminder } from "@/services/callbackRemindersApi";

vi.mock("@/services/candidatesApi", () => ({
  useGetCandidateStatusHistoryQuery: vi.fn(() => ({
    data: undefined,
    isFetching: false,
  })),
}));

const reminder: CallbackReminder = {
  id: "rem-1",
  candidateId: "cand-1",
  scheduledFor: new Date("2026-06-02T15:00:00Z").toISOString(),
  sentAt: new Date().toISOString(),
  status: "sent",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  candidate: {
    id: "cand-1",
    firstName: "Jane",
    lastName: "Smith",
    countryCode: "+91",
    mobileNumber: "9876543210",
    currentStatus: { id: 11, statusName: "Call Back" },
  },
  statusHistory: {
    statusUpdatedAt: new Date().toISOString(),
    reason: "Call in 10 minutes",
  },
};

describe("getCallbackReminderNote", () => {
  it("prefers status history linked to the reminder", () => {
    const note = getCallbackReminderNote(
      {
        ...reminder,
        statusHistory: { statusUpdatedAt: reminder.statusHistory.statusUpdatedAt },
        statusHistoryId: "hist-2",
      },
      [
        {
          id: "hist-1",
          statusNameSnapshot: "Call Back",
          reason: "Older note",
        },
        {
          id: "hist-2",
          statusNameSnapshot: "Call Back",
          reason: "Linked note",
        },
      ],
    );
    expect(note).toBe("Linked note");
  });
});

describe("CallbackReminderModal", () => {
  it("renders candidate info and actions", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <CallbackReminderModal
          isOpen
          onClose={onClose}
          reminder={reminder}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Time to call back")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Recent note")).toBeInTheDocument();
    expect(screen.getByText(/Call in 10 minutes/)).toBeInTheDocument();
    expect(screen.getByText("Call now")).toBeInTheDocument();
    expect(screen.getByText("View profile")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Dismiss"));
    expect(onClose).toHaveBeenCalled();
  });
});
