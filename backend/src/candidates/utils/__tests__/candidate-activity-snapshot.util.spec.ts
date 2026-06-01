import { computeCandidateActivitySnapshot } from '../candidate-activity-snapshot.util';

describe('computeCandidateActivitySnapshot', () => {
  it('counts project stages and verified documents', () => {
    const snapshot = computeCandidateActivitySnapshot({
      projects: [
        { currentProjectStatus: { statusName: 'documents_verified' } },
        { currentProjectStatus: { statusName: 'interview_scheduled' } },
        { currentProjectStatus: { statusName: 'processing_medical' } },
      ],
      documents: [{ status: 'verified' }, { status: 'pending' }],
      pipelineSteps: 5,
      profileCompletion: 82,
    });

    expect(snapshot).toEqual({
      projectsAssigned: 3,
      inDocumentation: 1,
      inInterview: 1,
      processingOrDeployed: 1,
      offersInPipeline: 0,
      placements: 0,
      verifiedDocuments: 1,
      pendingDocuments: 1,
      profileCompletion: 82,
      pipelineUpdates: 5,
    });
  });

  it('returns zeros when candidate has no projects or documents', () => {
    const snapshot = computeCandidateActivitySnapshot({
      projects: [],
      documents: [],
      pipelineSteps: 0,
      profileCompletion: 0,
    });

    expect(snapshot.projectsAssigned).toBe(0);
    expect(snapshot.inDocumentation).toBe(0);
    expect(snapshot.verifiedDocuments).toBe(0);
    expect(snapshot.pipelineUpdates).toBe(0);
  });
});
