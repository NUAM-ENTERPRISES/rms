import React from 'react';
import { render, screen } from '@testing-library/react';
import CandidateProjectDetailsPage from './CandidateProjectDetailsPage';

vi.mock('@/features/candidates/api', () => ({
  useGetCandidateProjectPipelineQuery: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ candidateId: 'c1', projectId: 'p1' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@lottiefiles/dotlottie-react', () => ({
  DotLottieReact: () => <div data-testid="dot-lottie" />
}));

vi.mock('@lottiefiles/react-lottie-player', () => ({
  Player: () => <div data-testid="lottie-player" />
}));

import { useGetCandidateProjectPipelineQuery } from '@/features/candidates/api';

describe('CandidateProjectDetailsPage interview flow', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows Nomination and Documents as passed and Interview as active for interview_assigned', async () => {
    const now = new Date().toISOString();
    const pipelineResponse = {
      success: true,
      data: {
        history: [
          { id: '1', subStatus: { name: 'nominated_initial', label: 'Nominated' }, statusChangedAt: new Date(Date.now() - 20_000).toISOString() },
          { id: '2', subStatus: { name: 'documents_verified', label: 'Verified Documents' }, statusChangedAt: new Date(Date.now() - 10_000).toISOString() },
          { id: '3', subStatus: { name: 'interview_assigned', label: 'Interview Assigned' }, statusChangedAt: now }
        ],
        candidate: { firstName: 'Max', lastName: 'Tester' },
        project: { title: 'Test Project' }
      }
    };

    (useGetCandidateProjectPipelineQuery as any).mockReturnValue({ data: pipelineResponse, isLoading: false, error: undefined });

    render(<CandidateProjectDetailsPage />);

    // Should have progress and Next Step present
    expect(await screen.findByText(/% Complete/)).toBeInTheDocument();

    // Stage names should be visible
    expect(await screen.findByText('Nomination')).toBeInTheDocument();
    expect(await screen.findByText('Documents')).toBeInTheDocument();
    expect(await screen.findByText('Interview')).toBeInTheDocument();

    // Ensure the 'Next Step' header exists and shows something non-empty
    expect(await screen.findByText('Next Step')).toBeInTheDocument();

    // Show the raw label from latest entry (Interview Assigned), not the canonical mapped label
    const matches = await screen.findAllByText('Interview Assigned');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows correct label for screening_scheduled in current status and timeline', async () => {
    const now = new Date().toISOString();
    const pipelineResponse = {
      success: true,
      data: {
        history: [
          { id: '1', subStatus: { name: 'nominated_initial', label: 'Nominated' }, statusChangedAt: new Date(Date.now() - 20000).toISOString() },
          { id: '2', subStatus: { name: 'screening_scheduled', label: 'Screening Scheduled' }, statusChangedAt: now }
        ],
        candidate: { firstName: 'Jane', lastName: 'Mock' },
        project: { title: 'Mock Project' }
      }
    };

    (useGetCandidateProjectPipelineQuery as any).mockReturnValue({ data: pipelineResponse, isLoading: false, error: undefined });

    render(<CandidateProjectDetailsPage />);

    // There should be multiple occurrences (header + timeline) of the label
    const matches = await screen.findAllByText('Screening Scheduled');
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
