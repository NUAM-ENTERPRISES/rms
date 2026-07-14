import { ADDRESS_TYPE_LABELS, SHIPMENT_STATUS } from "../constants";
import type { AddressType } from "../constants";
import type { CourierShipment } from "../types";

export type DocMovementStatus = {
  status: "in_transit" | "received";
  toAddressLabel: string;
  legNumber: number;
};

function legDocTypes(leg: CourierShipment): string[] {
  if (leg.docTypes?.length) return leg.docTypes;
  return leg.documents?.map((d) => d.docType) ?? [];
}

function destinationLabel(leg: CourierShipment): string {
  if (leg.toAddressLabel?.trim()) return leg.toAddressLabel.trim();
  const type = leg.toAddressType as AddressType;
  return ADDRESS_TYPE_LABELS[type] ?? leg.toAddressType;
}

/**
 * For each doc type, pick the latest non-draft courier leg that includes it
 * (highest legNumber). Used to show In transit / Arrived destination badges.
 */
export function buildDocumentMovementMap(
  legs: CourierShipment[],
): Record<string, DocMovementStatus> {
  const byDocType = new Map<string, DocMovementStatus>();

  const sorted = [...legs].sort((a, b) => a.legNumber - b.legNumber);

  for (const leg of sorted) {
    if (
      leg.status !== SHIPMENT_STATUS.IN_TRANSIT &&
      leg.status !== SHIPMENT_STATUS.RECEIVED
    ) {
      continue;
    }

    const movement: DocMovementStatus = {
      status: leg.status,
      toAddressLabel: destinationLabel(leg),
      legNumber: leg.legNumber,
    };

    for (const docType of legDocTypes(leg)) {
      const existing = byDocType.get(docType);
      if (!existing || leg.legNumber >= existing.legNumber) {
        byDocType.set(docType, movement);
      }
    }
  }

  return Object.fromEntries(byDocType);
}

export function countShippedDocuments(
  movements: Record<string, DocMovementStatus>,
): number {
  return Object.keys(movements).length;
}

export function formatMovementSummary(movement: DocMovementStatus): string {
  if (movement.status === SHIPMENT_STATUS.IN_TRANSIT) {
    return `Leg ${movement.legNumber} · In transit to ${movement.toAddressLabel}`;
  }
  return `Leg ${movement.legNumber} · Arrived at ${movement.toAddressLabel}`;
}
