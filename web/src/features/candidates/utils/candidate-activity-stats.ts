import type {
  CandidateActivitySnapshot,
  CandidateProjectItem,
  Document,
} from "../api";

export type { CandidateActivitySnapshot };

type ComputeCandidateActivityStatsInput = {
  projects: CandidateProjectItem[];
  projectsTotal: number;
  documents: Document[];
  documentsTotal: number;
  pipelineSteps: number;
  profileCompletion: number;
};

const normalizeStatus = (item: CandidateProjectItem): string => {
  const raw =
    item.currentProjectStatus?.statusName ??
    item.currentProjectStatus?.name ??
    item.currentProjectStatus?.label ??
    "";
  return String(raw).toLowerCase().replace(/[\s-]+/g, "_");
};

const isDocumentationStage = (status: string): boolean => {
  if (!status) return false;
  if (/reject|withdraw|hold|backout/.test(status)) return false;
  return (
    status.includes("nominated") ||
    status.includes("document") ||
    status.includes("verification") ||
    status.includes("submitted") ||
    status.includes("registered")
  );
};

const isInterviewStage = (status: string): boolean => {
  if (!status) return false;
  return (
    status.includes("interview") ||
    status.includes("screening") ||
    status.includes("training") ||
    status.includes("approved")
  );
};

const isOfferStage = (status: string): boolean => {
  if (!status) return false;
  return status.includes("offer") || status.includes("selected");
};

const isPlacementStage = (status: string): boolean => {
  if (!status) return false;
  return (
    status.includes("deploy") ||
    status.includes("hired") ||
    status.includes("travel")
  );
};

const isProcessingOrDeployedStage = (status: string): boolean => {
  if (!status) return false;
  return (
    status.includes("processing") ||
    status.includes("medical") ||
    status.includes("visa") ||
    isOfferStage(status) ||
    isPlacementStage(status)
  );
};

export function computeCandidateActivityStats(
  input: ComputeCandidateActivityStatsInput
): CandidateActivitySnapshot {
  const { projects, projectsTotal, documents, documentsTotal, pipelineSteps, profileCompletion } =
    input;

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
    (doc) => doc.status?.toLowerCase() === "verified"
  ).length;
  const pendingDocuments = documents.filter((doc) => {
    const s = doc.status?.toLowerCase() ?? "";
    return s === "pending" || s === "uploaded" || s === "resubmission_required";
  }).length;

  return {
    projectsAssigned: projectsTotal,
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
