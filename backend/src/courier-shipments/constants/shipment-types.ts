export const SHIPMENT_PURPOSE = {
  INTERNAL: 'internal',
  RETURN: 'return',
} as const;

export const SHIPMENT_PURPOSES = Object.values(SHIPMENT_PURPOSE);

export const DELIVERY_MODE = {
  COURIER: 'courier',
  DIRECT: 'direct',
} as const;

export const DELIVERY_MODES = Object.values(DELIVERY_MODE);

export const SHIPMENT_STATUS = {
  DRAFT: 'draft',
  IN_TRANSIT: 'in_transit',
  RECEIVED: 'received',
} as const;

export const SHIPMENT_STATUSES = Object.values(SHIPMENT_STATUS);

export const ADDRESS_TYPE = {
  KOCHI: 'kochi',
  DELHI: 'delhi',
  CLIENT: 'client',
  CANDIDATE: 'candidate',
  OTHER: 'other',
} as const;

export const ADDRESS_TYPES = Object.values(ADDRESS_TYPE);

export const OFFICE_ADDRESS_TYPES = [ADDRESS_TYPE.KOCHI, ADDRESS_TYPE.DELHI] as const;

export const COURIER_PARTNERS = [
  'Blue Dart',
  'DTDC',
  'Delhivery',
  'India Post',
  'FedEx',
  'DHL',
  'Other',
] as const;

export const AFFINIKS_OFFICE_ADDRESSES_KEY = 'AFFINIKS_OFFICE_ADDRESSES';

export const ADDRESS_TYPE_LABELS: Record<string, string> = {
  kochi: 'Kochi Office',
  delhi: 'Delhi Office',
  client: 'Client',
  candidate: 'Candidate',
  other: 'Other',
};
