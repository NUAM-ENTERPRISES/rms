import React from 'react';
import { render, screen } from '@testing-library/react';
import CandidateProjectDetailsPage from './CandidateProjectDetailsPage';

vi.mock('@/features/candidates/api', () => ({
  useGetCandidateProjectPipelineQuery: vi.fn(),
  useCreateCandidateProjectStatusChangeRequestMutation: () => [vi.fn(), { isLoading: false }],
  useApproveCandidateProjectStatusChangeRequestMutation: () => [vi.fn(), { isLoading: false }],
  useRejectCandidateProjectStatusChangeRequestMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ candidateId: 'c1', projectId: 'p1' }),
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams()],
  };
});

vi.mock('@/shared/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasRole: (roles: string | string[]) => {
      const list = Array.isArray(roles) ? roles : [roles];
      return list.includes('Manager');
    },
  }),
}));

vi.mock('@/hooks/useCan', () => ({
  useCan: (permission: string) => permission === 'manage:candidates',
}));

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
    expect(await screen.findByText('Interview Scheduled')).toBeInTheDocument();
  });

  it('shows pipeline blocked banner and hides next step when blocked', async () => {
    const pipelineResponse = {
      success: true,
      data: {
        candidateProjectMapId: 'map1',
        isPipelineBlocked: true,
        pipelineBlockedReason: "This candidate's project is currently On Hold. Pipeline actions are disabled.",
        currentStatus: { mainStatus: { name: 'on_hold', label: 'On Hold' } },
        history: [
          { id: '1', subStatus: { name: 'on_hold', label: 'On Hold' }, statusChangedAt: new Date().toISOString() },
        ],
        candidate: { firstName: 'Max', lastName: 'Tester' },
        project: { title: 'Test Project' },
      },
    };

    (useGetCandidateProjectPipelineQuery as any).mockReturnValue({ data: pipelineResponse, isLoading: false, error: undefined });

    render(<CandidateProjectDetailsPage />);

    expect(await screen.findByText(/Pipeline actions disabled/i)).toBeInTheDocument();
    expect(screen.queryByText('Next Step')).not.toBeInTheDocument();
  });

  it('shows Project Updates button when user can manage candidates', async () => {
    const pipelineResponse = {
      success: true,
      data: {
        candidateProjectMapId: 'map1',
        history: [],
        candidate: { firstName: 'Max', lastName: 'Tester' },
        project: { title: 'Test Project' },
      },
    };

    (useGetCandidateProjectPipelineQuery as any).mockReturnValue({ data: pipelineResponse, isLoading: false, error: undefined });

    render(<CandidateProjectDetailsPage />);

    expect(await screen.findByRole('button', { name: /project updates/i })).toBeInTheDocument();
  });

  it('shows pending approval banner with review button for managers', async () => {
    const pipelineResponse = {
      success: true,
      data: {
        candidateProjectMapId: 'map1',
        pendingStatusChangeRequest: {
          id: 'req1',
          requestedStatus: 'withdrawn',
          reason: 'Candidate no longer interested',
          createdAt: new Date().toISOString(),
          requester: { id: 'other-user', name: 'Recruiter One' },
        },
        history: [],
        candidate: { firstName: 'Max', lastName: 'Tester' },
        project: { title: 'Test Project' },
      },
    };

    (useGetCandidateProjectPipelineQuery as any).mockReturnValue({ data: pipelineResponse, isLoading: false, error: undefined });

    render(<CandidateProjectDetailsPage />);

    expect(await screen.findByText(/Pending Withdrawn request from Recruiter One/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /review request/i })).toBeInTheDocument();
  });

  it('shows reviewed rejected banner and request history button after rejection', async () => {
    const pipelineResponse = {
      success: true,
      data: {
        candidateProjectMapId: 'map1',
        latestReviewedStatusChangeRequest: {
          id: 'req1',
          requestedStatus: 'withdrawn',
          reason: 'Candidate no longer interested',
          status: 'rejected',
          createdAt: new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
          reviewNotes: 'Please retry later',
          requester: { id: 'test-user-id', name: 'Test User' },
          reviewer: { id: 'mgr-1', name: 'Manager One' },
        },
        history: [],
        candidate: { firstName: 'Max', lastName: 'Tester' },
        project: { title: 'Test Project' },
      },
    };

    (useGetCandidateProjectPipelineQuery as any).mockReturnValue({ data: pipelineResponse, isLoading: false, error: undefined });

    render(<CandidateProjectDetailsPage />);

    expect(await screen.findByText(/Withdrawn Request Rejected/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /request history/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /project updates/i })).toBeInTheDocument();
  });

  it('shows requester banner when current user is the requester', async () => {
    const pipelineResponse = {
      success: true,
      data: {
        candidateProjectMapId: 'map1',
        pendingStatusChangeRequest: {
          id: 'req1',
          requestedStatus: 'withdrawn',
          reason: 'Candidate no longer interested',
          createdAt: new Date().toISOString(),
          requester: { id: 'test-user-id', name: 'Test User' },
        },
        history: [],
        candidate: { firstName: 'Max', lastName: 'Tester' },
        project: { title: 'Test Project' },
      },
    };

    (useGetCandidateProjectPipelineQuery as any).mockReturnValue({ data: pipelineResponse, isLoading: false, error: undefined });

    render(<CandidateProjectDetailsPage />);

    expect(await screen.findByText(/Withdrawn Request Submitted/i)).toBeInTheDocument();
    expect(await screen.findByText(/Awaiting Approval/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /review request/i })).not.toBeInTheDocument();
  });
});
