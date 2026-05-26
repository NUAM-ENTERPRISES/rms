import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { DocumentsService } from '../documents.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { ProcessingService } from '../../processing/processing.service';
import { UploadService } from '../../upload/upload.service';
import { GoogleDriveService } from '../../google-drive/google-drive.service';

describe('DocumentsService - passport document validation', () => {
  let service: DocumentsService;
  let prisma: any;
  let outbox: OutboxService;

  const futureExpiry = new Date();
  futureExpiry.setFullYear(futureExpiry.getFullYear() + 2);

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        PrismaService,
        OutboxService,
        { provide: 'ProcessingService', useValue: {} },
        { provide: ProcessingService, useValue: {} },
        { provide: UploadService, useValue: {} },
        { provide: GoogleDriveService, useValue: {} },
        { provide: getQueueToken('document-forward'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(DocumentsService);
    prisma = moduleRef.get(PrismaService);
    outbox = moduleRef.get(OutboxService);

    jest.spyOn(outbox, 'publishDataSync').mockResolvedValue(undefined as never);
  });

  it('create rejects passport_copy without documentNumber', async () => {
    jest.spyOn(prisma.candidate, 'findUnique' as any).mockResolvedValue({
      id: 'cand-1',
    });

    await expect(
      service.create(
        {
          candidateId: 'cand-1',
          docType: 'passport_copy',
          fileName: 'passport.pdf',
          fileUrl: 'https://example.com/passport.pdf',
          expiryDate: futureExpiry.toISOString(),
        } as any,
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('create accepts passport_copy with documentNumber and future expiry', async () => {
    jest.spyOn(prisma.candidate, 'findUnique' as any).mockResolvedValue({
      id: 'cand-1',
    });
    jest.spyOn(prisma.document, 'create' as any).mockResolvedValue({
      id: 'doc-1',
      candidateId: 'cand-1',
      docType: 'passport_copy',
      documentNumber: 'A1234567',
      expiryDate: futureExpiry,
      candidate: {},
      roleCatalog: null,
      verifications: [],
    });

    const result = await service.create(
      {
        candidateId: 'cand-1',
        docType: 'passport_copy',
        fileName: 'passport.pdf',
        fileUrl: 'https://example.com/passport.pdf',
        documentNumber: 'A1234567',
        expiryDate: futureExpiry.toISOString(),
      } as any,
      'user-1',
    );

    expect(result.id).toBe('doc-1');
    expect(prisma.document.create).toHaveBeenCalled();
  });

  it('update rejects clearing passport number on passport document', async () => {
    jest.spyOn(prisma.document, 'findUnique' as any).mockResolvedValue({
      id: 'doc-1',
      docType: 'passport_copy',
      documentNumber: 'A1234567',
      expiryDate: futureExpiry,
    });

    await expect(
      service.update('doc-1', { documentNumber: '' } as any),
    ).rejects.toThrow(BadRequestException);
  });
});
