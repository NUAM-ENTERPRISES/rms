import { describe, expect, it } from "vitest";
import { SHIPMENT_STATUS } from "../../constants";
import type { CourierShipment } from "../../types";
import {
  buildDocumentMovementMap,
  countShippedDocuments,
  formatMovementSummary,
} from "../documentMovementStatus";

function buildLeg(
  overrides: Partial<CourierShipment> &
    Pick<CourierShipment, "id" | "legNumber" | "status">,
): CourierShipment {
  return {
    candidateId: "c1",
    collectionId: "col1",
    purposeType: "internal",
    deliveryMode: "courier",
    fromAddressType: "kochi",
    toAddressType: "delhi",
    fromAddressSnapshot: {},
    toAddressSnapshot: {},
    createdByUserId: "u1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    candidate: { id: "c1", firstName: "Jane", lastName: "Doe" },
    documents: [],
    toAddressLabel: "Delhi Office",
    ...overrides,
  };
}

describe("documentMovementStatus", () => {
  it("ignores draft legs for movement badges", () => {
    const map = buildDocumentMovementMap([
      buildLeg({
        id: "leg-1",
        legNumber: 1,
        status: SHIPMENT_STATUS.DRAFT,
        documents: [{ id: "d1", shipmentId: "leg-1", docType: "passport" }],
      }),
    ]);

    expect(map).toEqual({});
  });

  it("maps in_transit and received statuses with destination labels", () => {
    const map = buildDocumentMovementMap([
      buildLeg({
        id: "leg-1",
        legNumber: 1,
        status: SHIPMENT_STATUS.IN_TRANSIT,
        documents: [
          { id: "d1", shipmentId: "leg-1", docType: "passport" },
        ],
        toAddressLabel: "Delhi Office",
      }),
      buildLeg({
        id: "leg-2",
        legNumber: 2,
        status: SHIPMENT_STATUS.RECEIVED,
        documents: [
          {
            id: "d2",
            shipmentId: "leg-2",
            docType: "degree_certificate_original",
          },
        ],
        toAddressLabel: "Delhi Office",
      }),
    ]);

    expect(map.passport).toEqual({
      status: "in_transit",
      toAddressLabel: "Delhi Office",
      legNumber: 1,
    });
    expect(map.degree_certificate_original).toEqual({
      status: "received",
      toAddressLabel: "Delhi Office",
      legNumber: 2,
    });
  });

  it("prefers the latest leg when the same doc appears on multiple legs", () => {
    const map = buildDocumentMovementMap([
      buildLeg({
        id: "leg-1",
        legNumber: 1,
        status: SHIPMENT_STATUS.RECEIVED,
        docTypes: ["passport"],
        toAddressLabel: "Kochi Office",
        toAddressType: "kochi",
      }),
      buildLeg({
        id: "leg-2",
        legNumber: 2,
        status: SHIPMENT_STATUS.IN_TRANSIT,
        docTypes: ["passport"],
        toAddressLabel: "Delhi Office",
        toAddressType: "delhi",
      }),
    ]);

    expect(map.passport).toEqual({
      status: "in_transit",
      toAddressLabel: "Delhi Office",
      legNumber: 2,
    });
  });

  it("counts shipped documents and formats summaries", () => {
    const movements = {
      passport: {
        status: "in_transit" as const,
        toAddressLabel: "Delhi Office",
        legNumber: 1,
      },
      degree: {
        status: "received" as const,
        toAddressLabel: "Delhi Office",
        legNumber: 2,
      },
    };

    expect(countShippedDocuments(movements)).toBe(2);
    expect(formatMovementSummary(movements.passport)).toBe(
      "Leg 1 · In transit to Delhi Office",
    );
    expect(formatMovementSummary(movements.degree)).toBe(
      "Leg 2 · Arrived at Delhi Office",
    );
  });
});
