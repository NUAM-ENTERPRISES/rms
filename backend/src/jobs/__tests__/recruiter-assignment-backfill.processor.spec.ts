import { RecruiterAssignmentBackfillProcessor } from '../recruiter-assignment-backfill.processor';
import { RecruiterAssignmentService } from '../../candidates/services/recruiter-assignment.service';

describe('RecruiterAssignmentBackfillProcessor', () => {
  it('delegates to RecruiterAssignmentService.backfillUnassignedRecruiterAssignments', async () => {
    const recruiterAssignmentService = {
      backfillUnassignedRecruiterAssignments: jest.fn().mockResolvedValue({
        assigned: 2,
        skipped: 0,
        failed: 0,
      }),
    };
    const processor = new RecruiterAssignmentBackfillProcessor(
      recruiterAssignmentService as unknown as RecruiterAssignmentService,
    );

    const result = await processor.process({
      id: 'job-1',
      data: { assignedByUserId: 'admin-1' },
    } as never);

    expect(
      recruiterAssignmentService.backfillUnassignedRecruiterAssignments,
    ).toHaveBeenCalledWith({
      assignedByUserId: 'admin-1',
      recruiterId: undefined,
    });
    expect(result).toEqual({ assigned: 2, skipped: 0, failed: 0 });
  });
});
