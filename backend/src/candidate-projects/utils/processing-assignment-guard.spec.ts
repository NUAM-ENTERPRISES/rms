import {
  findActiveSendForProcessingLock,
  findActiveSendForProcessingLocksByCandidateIds,
} from './processing-assignment-guard';
import { PrismaService } from '../../database/prisma.service';

describe('processing-assignment-guard send-for-processing lock', () => {
  const prisma = {
    interview: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('findActiveSendForProcessingLock returns active sent interview lock', async () => {
    (prisma.interview.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'int-a',
        readyForProcessingAt: new Date('2026-06-07T00:00:00.000Z'),
        project: { id: 'proj-a', title: 'Project A' },
        candidateProjectMap: {
          project: { id: 'proj-a', title: 'Project A' },
          subStatus: { name: 'processing_in_progress' },
        },
      },
    ]);

    const lock = await findActiveSendForProcessingLock(prisma, 'cand-1', 'int-b');

    expect(lock).toEqual({
      projectId: 'proj-a',
      projectTitle: 'Project A',
      sentAt: new Date('2026-06-07T00:00:00.000Z'),
    });
  });

  it('findActiveSendForProcessingLock ignores released processing_hold sends', async () => {
    (prisma.interview.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'int-a',
        readyForProcessingAt: new Date('2026-06-07T00:00:00.000Z'),
        project: { id: 'proj-a', title: 'Project A' },
        candidateProjectMap: {
          project: { id: 'proj-a', title: 'Project A' },
          subStatus: { name: 'processing_hold' },
        },
      },
    ]);

    const lock = await findActiveSendForProcessingLock(prisma, 'cand-1', 'int-b');
    expect(lock).toBeNull();
  });

  it('findActiveSendForProcessingLock ignores released processing_cancelled sends', async () => {
    (prisma.interview.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'int-a',
        readyForProcessingAt: new Date('2026-06-07T00:00:00.000Z'),
        project: { id: 'proj-a', title: 'Project A' },
        candidateProjectMap: {
          project: { id: 'proj-a', title: 'Project A' },
          subStatus: { name: 'processing_cancelled' },
        },
      },
    ]);

    const lock = await findActiveSendForProcessingLock(prisma, 'cand-1', 'int-b');
    expect(lock).toBeNull();
  });

  it('findActiveSendForProcessingLock ignores released processing on_hold status', async () => {
    (prisma.interview.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'int-a',
        readyForProcessingAt: new Date('2026-06-07T00:00:00.000Z'),
        project: { id: 'proj-a', title: 'Project A' },
        candidateProjectMap: {
          project: { id: 'proj-a', title: 'Project A' },
          subStatus: { name: 'processing_in_progress' },
          processing: { processingStatus: 'on_hold' },
        },
      },
    ]);

    const lock = await findActiveSendForProcessingLock(prisma, 'cand-1', 'int-b');
    expect(lock).toBeNull();
  });

  it('findActiveSendForProcessingLocksByCandidateIds omits released sends', async () => {
    (prisma.interview.findMany as jest.Mock).mockResolvedValue([
      {
        readyForProcessingAt: new Date('2026-06-07T00:00:00.000Z'),
        project: { title: 'Project A' },
        candidateProjectMap: {
          candidateId: 'cand-1',
          project: { title: 'Project A' },
          subStatus: { name: 'processing_cancelled' },
        },
      },
      {
        readyForProcessingAt: new Date('2026-06-06T00:00:00.000Z'),
        project: { title: 'Project B' },
        candidateProjectMap: {
          candidateId: 'cand-2',
          project: { title: 'Project B' },
          subStatus: { name: 'processing_in_progress' },
        },
      },
    ]);

    const map = await findActiveSendForProcessingLocksByCandidateIds(prisma, [
      'cand-1',
      'cand-2',
    ]);

    expect(map.has('cand-1')).toBe(false);
    expect(map.get('cand-2')).toEqual({
      sentAt: new Date('2026-06-06T00:00:00.000Z'),
      projectTitle: 'Project B',
    });
  });
});
