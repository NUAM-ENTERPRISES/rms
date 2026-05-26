import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IntroductionVideosService } from '../introduction-videos.service';
import { PrismaService } from '../../database/prisma.service';
import { UploadService } from '../../upload/upload.service';
import { DocumentsService } from '../../documents/documents.service';
import { OutboxService } from '../../notifications/outbox.service';
import { DOCUMENT_TYPE } from '../../common/constants/document-types';

describe('IntroductionVideosService', () => {
  let service: IntroductionVideosService;
  const prisma = {
    project: { findUnique: jest.fn() },
    candidate: { findUnique: jest.fn() },
    candidateProjects: { findFirst: jest.fn(), findMany: jest.fn() },
    candidateProjectDocumentVerification: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    document: { findUnique: jest.fn(), create: jest.fn() },
    documentVerificationHistory: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const uploadService = {
    uploadIntroductionVideo: jest.fn(),
  };

  const documentsService = {
    reuploadRecruiter: jest.fn(),
  };

  const outboxService = {
    publishDataSync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntroductionVideosService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadService, useValue: uploadService },
        { provide: DocumentsService, useValue: documentsService },
        { provide: OutboxService, useValue: outboxService },
      ],
    }).compile();

    service = module.get(IntroductionVideosService);
  });

  it('rejects upload when project does not require introduction video', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'p1',
      title: 'Saudi MOH',
      introductionVideoRequired: false,
    });

    await expect(
      service.uploadIntroductionVideo(
        'c1',
        'p1',
        { originalname: 'intro.mp4' } as Express.Multer.File,
        'u1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('composite upload creates document and verification', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'p1',
      title: 'Saudi MOH',
      introductionVideoRequired: true,
    });
    prisma.candidate.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.candidateProjects.findFirst.mockResolvedValue({
      id: 'map1',
      roleNeeded: { roleCatalogId: 'rc1' },
    });
    prisma.candidateProjectDocumentVerification.findMany.mockResolvedValue([]);
    uploadService.uploadIntroductionVideo.mockResolvedValue({
      fileName: 'intro.mp4',
      fileUrl: 'https://example.com/intro.mp4',
      fileSize: 1000,
      mimeType: 'video/mp4',
    });

    prisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        document: {
          create: jest.fn().mockResolvedValue({
            id: 'doc1',
            docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
            fileName: 'intro.mp4',
            fileUrl: 'https://example.com/intro.mp4',
            mimeType: 'video/mp4',
            status: 'pending',
            createdAt: new Date(),
          }),
        },
        candidateProjectDocumentVerification: {
          create: jest.fn().mockResolvedValue({
            id: 'ver1',
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        documentVerificationHistory: { create: jest.fn() },
      }),
    );

    const result = await service.uploadIntroductionVideo(
      'c1',
      'p1',
      { originalname: 'intro.mp4' } as Express.Multer.File,
      'u1',
    );

    expect(uploadService.uploadIntroductionVideo).toHaveBeenCalled();
    expect(result.introductionVideo?.document?.docType).toBe(
      DOCUMENT_TYPE.INTRODUCTION_VIDEO,
    );
    expect(outboxService.publishDataSync).toHaveBeenCalled();
  });

  it('lists candidate introduction videos project-wise', async () => {
    prisma.candidate.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.candidateProjects.findMany.mockResolvedValue([
      {
        id: 'map1',
        project: {
          id: 'p1',
          title: 'Saudi MOH',
          introductionVideoRequired: true,
        },
      },
    ]);
    prisma.candidateProjectDocumentVerification.findMany.mockResolvedValue([
      {
        id: 'ver1',
        status: 'pending',
        document: {
          id: 'doc1',
          fileUrl: 'https://example.com/intro.mp4',
          fileName: 'intro.mp4',
          mimeType: 'video/mp4',
          createdAt: new Date('2026-01-01'),
        },
      },
    ]);

    const result = await service.listCandidateIntroductionVideos('c1');

    expect(result).toHaveLength(1);
    expect(result[0].projectTitle).toBe('Saudi MOH');
    expect(result[0].video?.documentId).toBe('doc1');
  });

  it('reuse links existing introduction video document', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'p2',
      title: 'Oman MOH',
      introductionVideoRequired: true,
    });
    prisma.candidateProjects.findFirst.mockResolvedValue({
      id: 'map2',
      roleNeeded: { roleCatalogId: null },
    });
    prisma.candidateProjectDocumentVerification.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'ver2',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          document: {
            id: 'doc1',
            docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
            fileName: 'intro.mp4',
            fileUrl: 'https://example.com/intro.mp4',
            mimeType: 'video/mp4',
            status: 'pending',
            createdAt: new Date(),
          },
        },
      ]);
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1',
      candidateId: 'c1',
      docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
    });
    prisma.candidateProjectDocumentVerification.create.mockResolvedValue({
      id: 'ver2',
    });

    const result = await service.reuseIntroductionVideo(
      'c1',
      'p2',
      'doc1',
      'u1',
    );

    expect(prisma.candidateProjectDocumentVerification.create).toHaveBeenCalled();
    expect(result.introductionVideo?.document?.id).toBe('doc1');
  });

  it('throws when candidate not found for listing', async () => {
    prisma.candidate.findUnique.mockResolvedValue(null);

    await expect(
      service.listCandidateIntroductionVideos('missing'),
    ).rejects.toThrow(NotFoundException);
  });
});
