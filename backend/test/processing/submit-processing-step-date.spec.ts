import { Test } from '@nestjs/testing';
import { ProcessingService } from '../../src/processing/processing.service';
import { PrismaService } from '../../src/database/prisma.service';
import { OutboxService } from '../../src/notifications/outbox.service';

describe('ProcessingService - submitProcessingStepDate', () => {
  let service: ProcessingService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ProcessingService, PrismaService, OutboxService],
    }).compile();

    service = moduleRef.get(ProcessingService);
    prisma = moduleRef.get(PrismaService);
  });

  it('throws when step not found', async () => {
    jest.spyOn(prisma.processingStep, 'findUnique' as any).mockResolvedValue(null);
    await expect(service.submitProcessingStepDate('nonexistent', {}, 'user1')).rejects.toThrow();
  });
});
