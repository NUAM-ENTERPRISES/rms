import { render, screen } from '@testing-library/react';
import CandidateProjectPipeline from './CandidateProjectPipeline';

describe('CandidateProjectPipeline', () => {
  it('renders progress for interview_assigned history', () => {
    const now = new Date().toISOString();
    const history = [
      { id: 'h1', subStatus: { name: 'nominated_initial', label: 'Nominated' }, statusChangedAt: new Date(Date.now() - 1000).toISOString() },
      { id: 'h2', subStatus: { name: 'interview_assigned', label: 'Interview Assigned' }, statusChangedAt: now }
    ];

    render(<CandidateProjectPipeline history={history} />);

    // Should show a percentage value somewhere in the component
    const percentageRegex = /\d+% Complete/;
    expect(screen.getByText(percentageRegex)).toBeInTheDocument();
  });
});
