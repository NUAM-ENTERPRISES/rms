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

// mock lottie players used in the component to avoid DOM API (IntersectionObserver) issues in test env
vi.mock('@lottiefiles/dotlottie-react', () => ({
  DotLottieReact: () => <div data-testid="dot-lottie" />
}));

vi.mock('@lottiefiles/react-lottie-player', () => ({
  Player: () => <div data-testid="lottie-player" />
}));

import { useGetCandidateProjectPipelineQuery } from '@/features/candidates/api';

describe('CandidateProjectDetailsPage integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows canonical progress and next step when latest status is documents_verified', async () => {
    const now = new Date().toISOString();
    const pipelineResponse = {
      success: true,
      data: {
        history: [
          { id: '1', subStatus: { name: 'documents_submitted', label: 'Documents Submitted' }, statusChangedAt: new Date(Date.now() - 10000).toISOString() },
          { id: '2', subStatus: { name: 'documents_verified', label: 'Verified Documents' }, statusChangedAt: now }
        ],
        candidate: { firstName: 'Max', lastName: 'Tester' },
        project: { title: 'Test Project' }
      }
    };

    (useGetCandidateProjectPipelineQuery as any).mockReturnValue({ data: pipelineResponse, isLoading: false, error: undefined });

    render(<CandidateProjectDetailsPage />);

    // progress badge text should contain the percent (based on PROGRESS_ORDER index of documents_verified -> index 4 => 42%)
    expect(await screen.findByText(/% Complete/)).toBeInTheDocument();

    // Next Step header and the next step label should be present
    expect(await screen.findByText('Next Step')).toBeInTheDocument();
    expect(await screen.findByText('Approved')).toBeInTheDocument();
  });
});
