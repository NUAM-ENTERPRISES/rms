/**
 * Candidate pipeline activity counts for GET /candidates/:id.
 * Keep stage matchers aligned with web/src/features/candidates/utils/candidate-activity-stats.ts
 */

export interface CandidateActivitySnapshotPayload {
  projectsAssigned: number;
  inDocumentation: number;
  inInterview: number;
  processingOrDeployed: number;
  offersInPipeline: number;
  placements: number;
  verifiedDocuments: number;
  pendingDocuments: number;
  profileCompletion: number;
  pipelineUpdates: number;
}

export type ProjectStatusRow = {
  currentProjectStatus?: {
    statusName?: string | null;
    name?: string | null;
    label?: string | null;
  } | null;
};

export type DocumentStatusRow = {
  status?: string | null;
};

export type ComputeCandidateActivitySnapshotInput = {
  projects: ProjectStatusRow[];
  documents: DocumentStatusRow[];
  pipelineSteps: number;
  profileCompletion: number;
};

const normalizeStatus = (project: ProjectStatusRow): string => {
  const raw =
    project.currentProjectStatus?.statusName ??
    project.currentProjectStatus?.name ??
    project.currentProjectStatus?.label ??
    '';
  return String(raw).toLowerCase().replace(/[\s-]+/g, '_');
};

const isDocumentationStage = (status: string): boolean => {
  if (!status) return false;
  if (/reject|withdraw|hold|backout/.test(status)) return false;
  return (
    status.includes('nominated') ||
    status.includes('document') ||
    status.includes('verification') ||
    status.includes('submitted') ||
    status.includes('registered')
  );
};

const isInterviewStage = (status: string): boolean => {
  if (!status) return false;
  return (
    status.includes('interview') ||
    status.includes('screening') ||
    status.includes('training') ||
    status.includes('approved')
  );
};

const isOfferStage = (status: string): boolean => {
  if (!status) return false;
  return status.includes('offer') || status.includes('selected');
};

const isPlacementStage = (status: string): boolean => {
  if (!status) return false;
  return (
    status.includes('deploy') ||
    status.includes('hired') ||
    status.includes('travel')
  );
};

const isProcessingOrDeployedStage = (status: string): boolean => {
  if (!status) return false;
  return (
    status.includes('processing') ||
    status.includes('medical') ||
    status.includes('visa') ||
    isOfferStage(status) ||
    isPlacementStage(status)
  );
};

export function computeCandidateActivitySnapshot(
  input: ComputeCandidateActivitySnapshotInput,
): CandidateActivitySnapshotPayload {
  const { projects, documents, pipelineSteps, profileCompletion } = input;

  let inDocumentation = 0;
  let inInterview = 0;
  let processingOrDeployed = 0;
  let offersInPipeline = 0;
  let placements = 0;

  for (const project of projects) {
    const status = normalizeStatus(project);
    if (isPlacementStage(status)) {
      placements += 1;
      processingOrDeployed += 1;
    } else if (isOfferStage(status)) {
      offersInPipeline += 1;
      processingOrDeployed += 1;
    } else if (isProcessingOrDeployedStage(status)) {
      processingOrDeployed += 1;
    } else if (isInterviewStage(status)) {
      inInterview += 1;
    } else if (isDocumentationStage(status)) {
      inDocumentation += 1;
    }
  }

  const verifiedDocuments = documents.filter(
    (doc) => doc.status?.toLowerCase() === 'verified',
  ).length;
  const pendingDocuments = documents.filter((doc) => {
    const s = doc.status?.toLowerCase() ?? '';
    return s === 'pending' || s === 'uploaded' || s === 'resubmission_required';
  }).length;

  return {
    projectsAssigned: projects.length,
    inDocumentation,
    inInterview,
    processingOrDeployed,
    offersInPipeline,
    placements,
    verifiedDocuments,
    pendingDocuments,
    profileCompletion,
    pipelineUpdates: pipelineSteps,
  };
}
