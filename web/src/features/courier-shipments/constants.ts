export const SHIPMENT_PURPOSE = {
  INTERNAL: "internal",
  RETURN: "return",
} as const;

export type ShipmentPurpose =
  (typeof SHIPMENT_PURPOSE)[keyof typeof SHIPMENT_PURPOSE];

export const SHIPMENT_PURPOSE_LABELS: Record<ShipmentPurpose, string> = {
  internal: "Internal",
  return: "Return",
};

export const DELIVERY_MODE = {
  COURIER: "courier",
  DIRECT: "direct",
} as const;

export type DeliveryMode = (typeof DELIVERY_MODE)[keyof typeof DELIVERY_MODE];

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  courier: "Courier",
  direct: "Direct Handover",
};

export const SHIPMENT_STATUS = {
  DRAFT: "draft",
  IN_TRANSIT: "in_transit",
  RECEIVED: "received",
} as const;

export type ShipmentStatus =
  (typeof SHIPMENT_STATUS)[keyof typeof SHIPMENT_STATUS];

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  draft: "Draft",
  in_transit: "In Transit",
  received: "Received",
};

export const ADDRESS_TYPE = {
  KOCHI: "kochi",
  DELHI: "delhi",
  CLIENT: "client",
  CANDIDATE: "candidate",
  OTHER: "other",
} as const;

export type AddressType = (typeof ADDRESS_TYPE)[keyof typeof ADDRESS_TYPE];

export const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  kochi: "Kochi Office",
  delhi: "Delhi Office",
  client: "Client",
  candidate: "Candidate",
  other: "Other",
};

export const OFFICE_ADDRESS_TYPES: AddressType[] = [
  ADDRESS_TYPE.KOCHI,
  ADDRESS_TYPE.DELHI,
];

export const COURIER_PARTNERS = [
  "Blue Dart",
  "DTDC",
  "Delhivery",
  "India Post",
  "FedEx",
  "DHL",
  "Other",
] as const;

export const WIZARD_STEPS = [
  { id: "candidate", label: "Candidate" },
  { id: "documents", label: "Documents" },
  { id: "route", label: "Route" },
  { id: "dispatch", label: "Dispatch" },
] as const;
