import {
  resolveCreHandoffNote,
  resolveCreHandoffStatus,
} from '../cre-handoff.util';
import { CRE_REASSIGN_RECRUITER_RETURN_REASON } from '../../../common/constants/candidate-constants';

describe('cre-handoff.util', () => {
  const histories = [
    {
      statusId: 1,
      statusNameSnapshot: 'Untouched',
      reason: CRE_REASSIGN_RECRUITER_RETURN_REASON,
      statusUpdatedAt: new Date('2026-05-28T12:00:00Z'),
      status: { id: 1, statusName: 'Untouched' },
    },
    {
      statusId: 2,
      statusNameSnapshot: 'Interested',
      reason: 'Candidate is interested after CRE follow-up',
      statusUpdatedAt: new Date('2026-05-28T11:00:00Z'),
      status: { id: 2, statusName: 'Interested' },
    },
  ];

  it('resolveCreHandoffNote prefers assignment note', () => {
    expect(
      resolveCreHandoffNote(
        { creStatusNote: '  From assignment  ' },
        histories,
      ),
    ).toBe('From assignment');
  });

  it('resolveCreHandoffNote falls back to handoff history', () => {
    expect(resolveCreHandoffNote({ creStatusNote: null }, histories)).toBe(
      'Candidate is interested after CRE follow-up',
    );
  });

  it('resolveCreHandoffStatus falls back to handoff history', () => {
    expect(resolveCreHandoffStatus({ creStatus: null }, histories)).toEqual({
      id: 2,
      statusName: 'Interested',
    });
  });
});
