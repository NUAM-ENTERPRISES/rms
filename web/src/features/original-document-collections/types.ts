import type { CollectionType } from "./constants";

export interface CollectionItem {
  id?: string;
  docType: string;
  isReceived: boolean;
  remarks?: string | null;
}

export interface CollectionUserRef {
  id: string;
  name: string;
  email?: string;
}

export interface CollectionMergedDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  docType?: string;
}

export interface EventMergeScanEntry {
  eventId: string;
  eventNumber: number;
  collectedAt: string;
  document: CollectionMergedDocument;
}

export interface OriginalDocumentCollectionEvent {
  id: string;
  collectionId: string;
  collectionType: CollectionType;
  collectedByUserId: string;
  collectedAt: string;
  mergedDocumentId?: string | null;
  mergedDocument?: CollectionMergedDocument | null;
  directOffice?: string | null;
  directOfficeOther?: string | null;
  interviewVenue?: string | null;
  agentId?: string | null;
  agentNameManual?: string | null;
  courierPartner?: string | null;
  trackingNumber?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  collectedBy: CollectionUserRef;
  createdBy: CollectionUserRef;
  agent?: { id: string; name: string } | null;
  items: CollectionItem[];
}

export interface CumulativeReceivedItem {
  docType: string;
  isReceived: boolean;
  remarks?: string | null;
}

export interface OriginalDocumentCollection {
  id: string;
  candidateId: string;
  mergedDocumentId?: string | null;
  lockerFileNumber?: string | null;
  lockerSubmittedAt?: string | null;
  lockerSubmittedByUserId?: string | null;
  status: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  eventCount: number;
  cumulativeReceivedCount: number;
  cumulativeReceived: CumulativeReceivedItem[];
  latestEventAt?: string | null;
  latestEvent?: OriginalDocumentCollectionEvent | null;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    candidateCode?: string | null;
    lockerFileNumber?: string | null;
    email?: string | null;
    countryCode?: string | null;
    mobileNumber?: string | null;
    contact?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    profileImage?: string | null;
    professionType?: { id: string; name: string; label: string } | null;
    currentStatus?: { id: number; statusName: string } | null;
    recruiterAssignments?: Array<{
      recruiter?: { id: string; name: string; email: string } | null;
    }>;
  };
  lockerSubmittedBy?: CollectionUserRef | null;
  completedBy?: CollectionUserRef | null;
  createdBy: CollectionUserRef;
  mergedDocument?: CollectionMergedDocument | null;
  events: OriginalDocumentCollectionEvent[];
}

export interface ListCollectionsParams {
  search?: string;
  candidateId?: string;
  collectionType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  pendingOnly?: boolean;
  lockerSubmittedOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateEventPayload {
  collectionType: CollectionType;
  collectedByUserId: string;
  collectedAt: string;
  directOffice?: string;
  directOfficeOther?: string;
  interviewVenue?: string;
  agentId?: string;
  agentNameManual?: string;
  courierPartner?: string;
  trackingNumber?: string;
  remarks?: string;
  items?: Array<{
    docType: string;
    isReceived: boolean;
    remarks?: string;
  }>;
}

export interface CreateCollectionPayload extends CreateEventPayload {
  candidateId: string;
}
