import { MetaOutboundProcessor } from '../../jobs/meta-outbound.processor';
import { MetaChannelAdapter } from '../channels/channel-adapter';
import { MetaOutboundJobData } from '../meta-outbound.types';
import { MetaOutboundService } from '../meta-outbound.service';
import { WhatsAppNotificationService } from '../../notifications/whatsapp-notification.service';
import { WHATSAPP_TEMPLATE_TYPES } from '../../common/constants/whatsapp-templates';

describe('MetaOutboundProcessor', () => {
  const whatsappAdapter: MetaChannelAdapter = {
    channel: 'whatsapp',
    send: jest.fn(),
  };

  const facebookAdapter: MetaChannelAdapter = {
    channel: 'facebook',
    send: jest.fn(),
  };

  const instagramAdapter: MetaChannelAdapter = {
    channel: 'instagram',
    send: jest.fn(),
  };

  let processor: MetaOutboundProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new MetaOutboundProcessor([
      whatsappAdapter,
      facebookAdapter,
      instagramAdapter,
    ]);
  });

  it('dispatches to the WhatsApp adapter for whatsapp channel jobs', async () => {
    (whatsappAdapter.send as jest.Mock).mockResolvedValue({
      success: true,
      messageId: 'wamid.1',
    });

    const jobData: MetaOutboundJobData = {
      channel: 'whatsapp',
      kind: 'template',
      to: '919876543210',
      payload: { templateName: 'candidate_status_qualified' },
      idempotencyKey: 'wa-status:cand-1:interested',
    };

    const result = await processor.process({
      id: 'job-1',
      data: jobData,
    } as any);

    expect(whatsappAdapter.send).toHaveBeenCalledWith(jobData);
    expect(facebookAdapter.send).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      messageId: 'wamid.1',
      channel: 'whatsapp',
      kind: 'template',
    });
  });

  it('dispatches to the Facebook adapter for facebook channel jobs', async () => {
    (facebookAdapter.send as jest.Mock).mockResolvedValue({ success: true });

    const jobData: MetaOutboundJobData = {
      channel: 'facebook',
      kind: 'text',
      to: 'fb-user-1',
      payload: { text: 'Hello' },
      idempotencyKey: 'fb-text:fb-user-1',
    };

    await processor.process({ id: 'job-2', data: jobData } as any);

    expect(facebookAdapter.send).toHaveBeenCalledWith(jobData);
    expect(whatsappAdapter.send).not.toHaveBeenCalled();
  });

  it('throws when channel adapter is missing so BullMQ can retry', async () => {
    const emptyProcessor = new MetaOutboundProcessor([]);

    await expect(
      emptyProcessor.process({
        id: 'job-3',
        data: {
          channel: 'whatsapp',
          kind: 'text',
          to: '919876543210',
          payload: { text: 'x' },
          idempotencyKey: 'missing',
        },
      } as any),
    ).rejects.toThrow('No channel adapter registered for: whatsapp');
  });

  it('rethrows adapter failures for retry', async () => {
    (whatsappAdapter.send as jest.Mock).mockRejectedValue(
      new Error('Meta rate limit'),
    );

    await expect(
      processor.process({
        id: 'job-4',
        data: {
          channel: 'whatsapp',
          kind: 'template',
          to: '919876543210',
          payload: { templateName: 'candidate_status_qualified' },
          idempotencyKey: 'wa-fail',
        },
      } as any),
    ).rejects.toThrow('Meta rate limit');
  });
});

describe('MetaOutboundService', () => {
  it('enqueues jobs with sanitized jobId and retry defaults', async () => {
    const add = jest.fn().mockResolvedValue({ id: 'safe_job_id' });
    const queue = { add } as any;
    const service = new MetaOutboundService(queue);

    const result = await service.enqueue({
      channel: 'whatsapp',
      kind: 'template',
      to: '919876543210',
      payload: { templateName: 'candidate_status_qualified' },
      idempotencyKey: 'wa-status:cand-1:interested:2026-07-25T09:16',
    });

    expect(result).toEqual({ jobId: 'safe_job_id' });
    expect(add).toHaveBeenCalledWith(
      'whatsapp:template',
      expect.objectContaining({
        channel: 'whatsapp',
        kind: 'template',
        to: '919876543210',
        idempotencyKey: 'wa-status:cand-1:interested:2026-07-25T09:16',
      }),
      expect.objectContaining({
        jobId: 'wa-status_cand-1_interested_2026-07-25T09_16',
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
      }),
    );
  });
});

describe('WhatsAppNotificationService enqueue', () => {
  const metaOutboundService = {
    enqueue: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };

  const headerImageUrl = 'https://cdn.example.com/affiniks-header.jpg';

  let service: WhatsAppNotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    metaOutboundService.enqueue.mockResolvedValue({ jobId: 'job-wa-1' });
    configService.get.mockImplementation((key: string) => {
      if (
        key === 'whatsapp.templateHeaderImageUrl' ||
        key === 'WHATSAPP_TEMPLATE_HEADER_IMAGE_URL'
      ) {
        return headerImageUrl;
      }
      return undefined;
    });
    service = new WhatsAppNotificationService(
      metaOutboundService as any,
      configService as any,
    );
  });

  it('enqueues candidate status updates on whatsapp template channel', async () => {
    const result = await service.sendCandidateStatusUpdate(
      'Jane Doe',
      '919876543210',
      'Qualified',
      undefined,
      { candidateId: 'cand-1' },
    );

    expect(result.success).toBe(true);
    expect(result.jobId).toBe('job-wa-1');
    expect(metaOutboundService.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'whatsapp',
        kind: 'template',
        to: '919876543210',
        payload: expect.objectContaining({
          templateName: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_QUALIFIED,
          bodyParameters: ['Jane'],
          headerImageLink: headerImageUrl,
        }),
        idempotencyKey: expect.stringContaining('wa-status:cand-1:qualified:'),
      }),
    );
  });

  it('skips enqueue when status is not configured for WhatsApp', async () => {
    const result = await service.sendCandidateStatusUpdate(
      'Jane Doe',
      '919876543210',
      'Untouched',
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe('Status not configured for WhatsApp');
    expect(metaOutboundService.enqueue).not.toHaveBeenCalled();
  });

  it('skips enqueue when header image URL is missing', async () => {
    configService.get.mockReturnValue(undefined);

    const result = await service.sendCandidateStatusUpdate(
      'Jane Doe',
      '919876543210',
      'Qualified',
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      'WhatsApp template header image URL is not configured',
    );
    expect(metaOutboundService.enqueue).not.toHaveBeenCalled();
  });

  it('enqueues screening scheduled notifications', async () => {
    const result = await service.sendScreeningScheduled(
      'Jane Doe',
      '919876543210',
      'Project A',
      'Nurse',
      'Monday, July 25, 2026 at 10:00 AM',
      { eventId: 'evt-1', candidateProjectMapId: 'cpm-1' },
    );

    expect(result.success).toBe(true);
    expect(metaOutboundService.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'whatsapp',
        kind: 'template',
        to: '919876543210',
        payload: expect.objectContaining({
          templateName: WHATSAPP_TEMPLATE_TYPES.SCREENING_SCHEDULED,
          bodyParameters: [
            'Jane',
            'Project A',
            'Nurse',
            'Monday, July 25, 2026 at 10:00 AM',
          ],
        }),
        idempotencyKey: expect.stringContaining('wa-screening:evt-1:'),
      }),
    );
  });
});
