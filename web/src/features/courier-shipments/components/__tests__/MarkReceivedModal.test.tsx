import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MarkReceivedModal } from "../MarkReceivedModal";
import {
  DELIVERY_MODE,
  SHIPMENT_PURPOSE,
  SHIPMENT_STATUS,
} from "../../constants";
import type { CourierShipment } from "../../types";

const receiveMock = vi.fn();

vi.mock("@/app/hooks", () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      auth: {
        user: {
          id: "user-1",
          name: "Receiver User",
        },
      },
    }),
}));

vi.mock("../../api", () => ({
  useReceiveCourierShipmentMutation: () => [receiveMock, { isLoading: false }],
}));

function buildShipment(): CourierShipment {
  return {
    id: "ship-1",
    candidateId: "cand-1",
    collectionId: "col-1",
    legNumber: 2,
    purposeType: SHIPMENT_PURPOSE.INTERNAL,
    deliveryMode: DELIVERY_MODE.COURIER,
    status: SHIPMENT_STATUS.IN_TRANSIT,
    fromAddressType: "kochi",
    toAddressType: "delhi",
    fromAddressSnapshot: {},
    toAddressSnapshot: {},
    createdByUserId: "user-2",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    candidate: {
      id: "cand-1",
      firstName: "Jane",
      lastName: "Doe",
    },
    documents: [
      { id: "doc-1", shipmentId: "ship-1", docType: "passport" },
      {
        id: "doc-2",
        shipmentId: "ship-1",
        docType: "degree_certificate_original",
      },
    ],
    docTypes: ["passport", "degree_certificate_original"],
    fromAddressLabel: "Kochi Office",
    toAddressLabel: "Delhi Office",
  };
}

describe("MarkReceivedModal", () => {
  it("allows partial receipt when not-arrived documents have remarks", async () => {
    const user = userEvent.setup();
    receiveMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ success: true }),
    });

    render(
      <MarkReceivedModal
        open
        onOpenChange={vi.fn()}
        shipment={buildShipment()}
      />,
    );

    const confirmButton = screen.getByRole("button", {
      name: /Confirm receipt/i,
    });
    expect(confirmButton).toBeDisabled();

    await user.click(screen.getByLabelText(/Mark Passport as arrived/i));
    await user.type(
      screen.getByLabelText(/Remarks for Degree Certificate \(Original\)/i),
      "Not arrived, please check Kochi office",
    );

    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);

    expect(receiveMock).toHaveBeenCalledWith({
      id: "ship-1",
      body: expect.objectContaining({
        receivedByUserId: "user-1",
        verifiedDocuments: [
          { docType: "passport", isReceived: true },
          {
            docType: "degree_certificate_original",
            isReceived: false,
            remarks: "Not arrived, please check Kochi office",
          },
        ],
      }),
    });
  });

  it("shows tooltip when not-arrived documents are missing remarks", async () => {
    const user = userEvent.setup();

    render(
      <MarkReceivedModal
        open
        onOpenChange={vi.fn()}
        shipment={buildShipment()}
      />,
    );

    const confirmButton = screen.getByRole("button", {
      name: /Confirm receipt/i,
    });
    const tooltipTrigger = confirmButton.parentElement;

    await user.hover(tooltipTrigger!);

    expect(
      await screen.findByRole("tooltip", {
        name: /Add remarks for 2 documents that did not arrive/i,
      }),
    ).toBeInTheDocument();
  });
});
