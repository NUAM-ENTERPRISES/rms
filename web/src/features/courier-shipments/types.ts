import type {
  AddressType,
  DeliveryMode,
  ShipmentPurpose,
  ShipmentStatus,
} from "./constants";

export interface AddressSnapshot {
  label?: string;
  address?: string;
  addressCountryCode?: string;
  addressStateId?: string;
  pincode?: string;
  phone?: string;
  altPhone?: string;
}

export interface CourierShipmentDocument {
  id: string;
  shipmentId: string;
  docType: string;
}

export interface CourierShipmentUser {
  id: string;
  name: string;
  email?: string;
}

export interface CourierShipmentCandidate {
  id: string;
  firstName: string;
  lastName: string;
  candidateCode?: string | null;
  lockerFileNumber?: string | null;
  profileImage?: string | null;
  email?: string | null;
  address?: string | null;
  addressPincode?: string | null;
  addressCountryCode?: string | null;
  addressStateId?: string | null;
  countryCode?: string | null;
  mobileNumber?: string | null;
  alternatePhone?: string | null;
  addressCountry?: { code: string; name: string } | null;
  addressState?: { id: string; name: string } | null;
}

export interface CourierShipment {
  id: string;
  candidateId: string;
  collectionId: string;
  projectId?: string | null;
  legNumber: number;
  purposeType: ShipmentPurpose;
  deliveryMode: DeliveryMode;
  status: ShipmentStatus;
  trackingId?: string | null;
  courierPartner?: string | null;
  sentAt?: string | null;
  sentByUserId?: string | null;
  approvedByUserId?: string | null;
  fromAddressType: AddressType;
  toAddressType: AddressType;
  fromAddressSnapshot: AddressSnapshot;
  toAddressSnapshot: AddressSnapshot;
  receivedAt?: string | null;
  receivedByUserId?: string | null;
  receivedByName?: string | null;
  lockerFileNumber?: string | null;
  mergedDocumentId?: string | null;
  remarks?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  candidate: CourierShipmentCandidate;
  collection?: {
    id: string;
    status: string;
    lockerFileNumber?: string | null;
    mergedDocumentId?: string | null;
  };
  project?: {
    id: string;
    title: string;
    client?: {
      id: string;
      name: string;
      address?: string | null;
      phone?: string | null;
      addressCountryCode?: string | null;
      addressStateId?: string | null;
      addressCountry?: { code: string; name: string } | null;
      addressState?: { id: string; name: string } | null;
    } | null;
  } | null;
  mergedDocument?: {
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType?: string | null;
  } | null;
  sentBy?: CourierShipmentUser | null;
  approvedBy?: CourierShipmentUser | null;
  receivedBy?: CourierShipmentUser | null;
  createdBy?: CourierShipmentUser;
  documents: CourierShipmentDocument[];
  fromAddressLabel?: string;
  toAddressLabel?: string;
  docTypes?: string[];
}

export interface CourierShipmentStats {
  totalCandidates: number;
  totalLegs: number;
  candidatesInTransit: number;
  candidatesReceived: number;
  candidatesCourier: number;
  candidatesDirect: number;
  candidatesReturn: number;
}

export interface CourierCandidateGroup {
  candidateId: string;
  candidate: CourierShipmentCandidate;
  legCount: number;
  matchingLegCount: number;
  inTransitCount: number;
  receivedCount: number;
  draftCount: number;
  currentLocationHint: string | null;
  latestLeg: CourierShipment;
}

export interface ListShipmentsParams {
  search?: string;
  candidateId?: string;
  status?: string;
  deliveryMode?: string;
  purposeType?: string;
  dateFrom?: string;
  page?: number;
  limit?: number;
}

export interface CreateShipmentPayload {
  candidateId: string;
  projectId?: string;
  purposeType: ShipmentPurpose;
  deliveryMode: DeliveryMode;
  fromAddressType: AddressType;
  toAddressType: AddressType;
  fromAddressSnapshot?: AddressSnapshot;
  toAddressSnapshot?: AddressSnapshot;
  docTypes: string[];
  remarks?: string;
}

export interface DispatchShipmentPayload {
  trackingId: string;
  courierPartner: string;
  sentAt: string;
  sentByUserId: string;
  approvedByUserId: string;
}

export interface MarkHandoverPayload {
  sentAt: string;
  sentByUserId: string;
  approvedByUserId: string;
}

export interface MarkReceivedPayload {
  receivedAt: string;
  receivedByUserId?: string;
}

export interface CollectionDocsResponse {
  collectionId: string;
  lockerFileNumber?: string | null;
  mergedDocumentId?: string | null;
  cumulativeReceived: Array<{
    docType: string;
    isReceived: boolean;
    remarks?: string | null;
  }>;
}

export interface PipelineSummary {
  legs: CourierShipment[];
  receivedLegs: number;
  totalLegs: number;
  currentLocationHint: string | null;
}
