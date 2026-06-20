import { DELIVERY_MODE, SHIPMENT_STATUS } from "../constants";
import type { CandidateCourierGroup } from "../components/CandidateCourierCard";
import type { CourierShipment } from "../types";

export type CandidateCourierStatusFilter =
  | "all"
  | "in_transit"
  | "received"
  | "courier"
  | "direct"
  | "return";

export function groupShipmentsByCandidate(
  shipments: CourierShipment[],
  statusFilter: CandidateCourierStatusFilter = "all",
): CandidateCourierGroup[] {
  const map = new Map<string, CourierShipment[]>();

  for (const shipment of shipments) {
    const existing = map.get(shipment.candidateId);
    if (existing) {
      existing.push(shipment);
    } else {
      map.set(shipment.candidateId, [shipment]);
    }
  }

  const groups: CandidateCourierGroup[] = [];

  map.forEach((legs, candidateId) => {
    const sortedByLeg = [...legs].sort((a, b) => b.legNumber - a.legNumber);

    const matchingLegs = (() => {
      switch (statusFilter) {
        case "in_transit":
          return legs.filter((l) => l.status === SHIPMENT_STATUS.IN_TRANSIT);
        case "received":
          return legs.filter((l) => l.status === SHIPMENT_STATUS.RECEIVED);
        case "courier":
          return legs.filter((l) => l.deliveryMode === DELIVERY_MODE.COURIER);
        case "direct":
          return legs.filter((l) => l.deliveryMode === DELIVERY_MODE.DIRECT);
        case "return":
          return legs.filter((l) => l.purposeType === "return");
        default:
          return legs;
      }
    })();

    const latestLeg =
      [...matchingLegs].sort((a, b) => b.legNumber - a.legNumber)[0] ??
      sortedByLeg[0];

    const inTransitCount = legs.filter(
      (l) => l.status === SHIPMENT_STATUS.IN_TRANSIT,
    ).length;
    const receivedCount = legs.filter(
      (l) => l.status === SHIPMENT_STATUS.RECEIVED,
    ).length;
    const draftCount = legs.filter(
      (l) => l.status === SHIPMENT_STATUS.DRAFT,
    ).length;

    const lastReceived = [...legs]
      .filter((l) => l.status === SHIPMENT_STATUS.RECEIVED && l.receivedAt)
      .sort(
        (a, b) =>
          new Date(b.receivedAt!).getTime() - new Date(a.receivedAt!).getTime(),
      )[0];
    const currentLocationHint = lastReceived?.toAddressLabel ?? null;

    groups.push({
      candidate: latestLeg.candidate,
      candidateId,
      legCount: legs.length,
      latestLeg,
      inTransitCount,
      receivedCount,
      draftCount,
      currentLocationHint,
    });
  });

  return groups.sort((a, b) => {
    if (a.inTransitCount > 0 && b.inTransitCount === 0) return -1;
    if (b.inTransitCount > 0 && a.inTransitCount === 0) return 1;
    const aDate = a.latestLeg.sentAt ?? a.latestLeg.createdAt;
    const bDate = b.latestLeg.sentAt ?? b.latestLeg.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
}

export function filterCandidateCourierGroups(
  groups: CandidateCourierGroup[],
  statusFilter: CandidateCourierStatusFilter,
): CandidateCourierGroup[] {
  switch (statusFilter) {
    case "in_transit":
      return groups.filter((g) => g.inTransitCount > 0);
    case "received":
      return groups.filter((g) => g.receivedCount > 0);
    case "courier":
      return groups.filter(
        (g) => g.latestLeg.deliveryMode === DELIVERY_MODE.COURIER,
      );
    case "direct":
      return groups.filter(
        (g) => g.latestLeg.deliveryMode === DELIVERY_MODE.DIRECT,
      );
    case "return":
      return groups.filter((g) => g.latestLeg.purposeType === "return");
    default:
      return groups;
  }
}
