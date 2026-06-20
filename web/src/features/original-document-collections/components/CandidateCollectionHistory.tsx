import { CandidateCollectionHistoryPanel } from "./CandidateCollectionHistoryPanel";

interface CandidateCollectionHistoryProps {
  candidateId: string;
}

/** Candidate profile tab — full history with New Collection link */
export function CandidateCollectionHistory({
  candidateId,
}: CandidateCollectionHistoryProps) {
  return (
    <CandidateCollectionHistoryPanel
      candidateId={candidateId}
      variant="full"
      showAddEventLink
    />
  );
}
