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
    document: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    documentVerificationHistory: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const uploadService = {
    uploadIntroductionVideo: jest.fn(),
    getIntroductionVideoFolder: jest.fn(
      (candidateId: string) =>
        `candidates/introduction-videos/${candidateId}`,
    ),
    getIntroductionVideoStorageKey: jest.fn(
      (candidateId: string, fileName: string) =>
        `candidates/introduction-videos/${candidateId}/${fileName}`,
    ),
    getPublicUrlForKey: jest.fn(
      (key: string) => `https://example.com/${key}`,
    ),
    createPresignedPutUrl: jest.fn(),
    headObject: jest.fn(),
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

  it('composite upload creates document and verification with unique storage key', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'p1',
      title: 'Saudi MOH',
      introductionVideoRequired: true,
    });
    prisma.candidate.findUnique.mockResolvedValue({ id: 'c1', firstName: 'Abhijith' });
    prisma.candidateProjects.findFirst.mockResolvedValue({
      id: 'map1',
      roleNeeded: { roleCatalogId: 'rc1' },
    });
    prisma.candidateProjectDocumentVerification.findFirst.mockResolvedValue(null);
    uploadService.uploadIntroductionVideo.mockResolvedValue({
      fileName: 'abhijith_saudi_moh_intro_video_123_abc.mp4',
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
            fileName: 'abhijith_saudi_moh_intro_video.mp4',
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
      { originalname: 'long-generated-name.mp4' } as Express.Multer.File,
      'u1',
    );

    expect(uploadService.uploadIntroductionVideo).toHaveBeenCalledWith(
      expect.anything(),
      'c1',
      expect.stringMatching(/^abhijith_saudi_moh_intro_video_\d+_[a-f0-9]{8}\.mp4$/),
    );
    expect(result.introductionVideo?.document?.docType).toBe(
      DOCUMENT_TYPE.INTRODUCTION_VIDEO,
    );
    expect(outboxService.publishDataSync).toHaveBeenCalled();
  });

  it('lists candidate introduction videos with pagination', async () => {
    prisma.candidate.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.candidateProjectDocumentVerification.findMany.mockResolvedValue([
      {
        id: 'ver1',
        candidateProjectMapId: 'map1',
        status: 'pending',
        rejectionReason: null,
        document: {
          id: 'doc1',
          fileUrl: 'https://example.com/intro.mp4',
          fileName: 'abhijith_saudi_moh_intro_video.mp4',
          mimeType: 'video/mp4',
          notes: 'Project intro note',
          createdAt: new Date('2026-01-01'),
        },
        candidateProjectMap: {
          id: 'map1',
          project: {
            id: 'p1',
            title: 'Saudi MOH',
            introductionVideoRequired: true,
          },
          roleNeeded: {
            roleCatalogId: 'rc1',
            roleCatalog: { id: 'rc1', label: 'Staff Nurse', name: 'staff_nurse' },
          },
        },
      },
    ]);
    prisma.document.findMany.mockResolvedValue([]);
    prisma.document.count.mockResolvedValue(0);

    const result = await service.listCandidateIntroductionVideos('c1', {
      page: 1,
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].projectTitle).toBe('Saudi MOH');
    expect(result.items[0].roleLabel).toBe('Staff Nurse');
    expect(result.items[0].video?.documentId).toBe('doc1');
    expect(result.library).toEqual([]);
    expect(result.libraryPagination).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('excludes project rows without an uploaded introduction video', async () => {
    prisma.candidate.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.candidateProjectDocumentVerification.findMany.mockResolvedValue([]);
    prisma.document.findMany.mockResolvedValue([]);
    prisma.document.count.mockResolvedValue(0);

    const result = await service.listCandidateIntroductionVideos('c1', {
      page: 1,
      limit: 10,
    });

    expect(result.items).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });

  it('filters list by projectId and roleCatalogId', async () => {
    prisma.candidate.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.candidateProjectDocumentVerification.findMany.mockResolvedValue([]);
    prisma.document.findMany.mockResolvedValue([]);
    prisma.document.count.mockResolvedValue(0);

    await service.listCandidateIntroductionVideos('c1', {
      page: 1,
      limit: 10,
      projectId: 'p1',
      roleCatalogId: 'rc1',
    });

    expect(
      prisma.candidateProjectDocumentVerification.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          candidateProjectMap: {
            candidateId: 'c1',
            projectId: 'p1',
            roleNeeded: { roleCatalogId: 'rc1' },
          },
        }),
      }),
    );
  });

  it('reuse links existing introduction video document', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'p2',
      title: 'Oman MOH',
      introductionVideoRequired: true,
    });
    prisma.candidate.findUnique.mockResolvedValue({ id: 'c1', firstName: 'Abhijith' });
    prisma.candidateProjects.findFirst.mockResolvedValue({
      id: 'map2',
      roleNeeded: { roleCatalogId: null },
    });
    prisma.candidateProjectDocumentVerification.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'ver2',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        document: {
          id: 'doc1',
          docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
          fileName: 'abhijith_oman_moh_intro_video.mp4',
          fileUrl: 'https://example.com/intro.mp4',
          mimeType: 'video/mp4',
          status: 'pending',
          createdAt: new Date(),
        },
      });
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1',
      candidateId: 'c1',
      docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
      fileName: 'old_name.mp4',
    });
    prisma.document.update.mockResolvedValue({});
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
    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'doc1' },
      data: { fileName: 'abhijith_oman_moh_intro_video.mp4' },
    });
    expect(result.introductionVideo?.document?.id).toBe('doc1');
  });

  it('uploads candidate introduction video without project linkage', async () => {
    prisma.candidate.findUnique.mockResolvedValue({
      id: 'c1',
      firstName: 'Abhijith',
    });
    uploadService.uploadIntroductionVideo.mockResolvedValue({
      fileName: 'abhijith_intro_video_123_abc.mp4',
      fileUrl: 'https://example.com/abhijith_intro_video.mp4',
      fileSize: 1000,
      mimeType: 'video/mp4',
    });
    prisma.document.create.mockResolvedValue({
      id: 'doc-lib1',
      docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
      fileName: 'abhijith_intro_video.mp4',
      fileUrl: 'https://example.com/abhijith_intro_video.mp4',
      mimeType: 'video/mp4',
      fileSize: 1000,
      status: 'pending',
      uploadedBy: 'u1',
      createdAt: new Date('2026-01-01'),
    });

    const result = await service.uploadCandidateIntroductionVideo(
      'c1',
      { originalname: 'my-long-video-name.mp4' } as Express.Multer.File,
      'u1',
      'Recorded in studio',
    );

    expect(uploadService.uploadIntroductionVideo).toHaveBeenCalledWith(
      expect.anything(),
      'c1',
      expect.stringMatching(/^abhijith_intro_video_\d+_[a-f0-9]{8}\.mp4$/),
    );
    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          candidateId: 'c1',
          docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
          fileName: 'abhijith_intro_video.mp4',
          notes: 'Recorded in studio',
        }),
      }),
    );
    expect(result.document.id).toBe('doc-lib1');
    expect(outboxService.publishDataSync).toHaveBeenCalled();
  });

  it('lists unlinked introduction videos in library with pagination', async () => {
    prisma.candidate.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.candidateProjectDocumentVerification.findMany.mockResolvedValue([]);
    prisma.document.findMany.mockResolvedValue([
      {
        id: 'doc-lib1',
        fileName: 'abhijith_intro_video.mp4',
        fileUrl: 'https://example.com/abhijith_intro_video.mp4',
        mimeType: 'video/mp4',
        fileSize: 1000,
        status: 'pending',
        notes: 'Library note',
        createdAt: new Date('2026-01-02'),
      },
    ]);
    prisma.document.count.mockResolvedValue(1);

    const result = await service.listCandidateIntroductionVideos('c1', {
      page: 1,
      limit: 10,
      libraryPage: 1,
      libraryLimit: 10,
    });

    expect(result.library).toHaveLength(1);
    expect(result.library[0].documentId).toBe('doc-lib1');
    expect(result.library[0].fileName).toBe('abhijith_intro_video.mp4');
    expect(result.library[0].remarks).toBe('Library note');
    expect(result.libraryPagination.total).toBe(1);
  });

  it('initiates presigned upload for candidate library video', async () => {
    prisma.candidate.findUnique.mockResolvedValue({
      id: 'c1',
      firstName: 'Abhijith',
    });
    uploadService.createPresignedPutUrl.mockResolvedValue(
      'https://spaces.example.com/presigned',
    );

    const result = await service.initiateIntroductionVideoUpload(
      'c1',
      {
        fileName: 'intro.mp4',
        mimeType: 'video/mp4',
        fileSize: 1000,
      },
      'u1',
    );

    expect(uploadService.createPresignedPutUrl).toHaveBeenCalled();
    expect(result.uploadUrl).toBe('https://spaces.example.com/presigned');
    expect(result.storageKey).toMatch(
      /^candidates\/introduction-videos\/c1\/abhijith_intro_video_\d+_[a-f0-9]{8}\.mp4$/,
    );
    expect(result.fileName).toBe('abhijith_intro_video.mp4');
  });

  it('confirms presigned upload after head object verification', async () => {
    uploadService.headObject.mockResolvedValue({ contentLength: 1000 });
    prisma.document.create.mockResolvedValue({
      id: 'doc-lib1',
      docType: DOCUMENT_TYPE.INTRODUCTION_VIDEO,
      fileName: 'abhijith_intro_video.mp4',
      fileUrl:
        'https://example.com/candidates/introduction-videos/c1/abhijith_intro_video_123.mp4',
      mimeType: 'video/mp4',
      fileSize: 1000,
      status: 'pending',
      uploadedBy: 'u1',
      createdAt: new Date('2026-01-01'),
      notes: 'Recorded in studio',
    });

    const result = await service.confirmIntroductionVideoUpload(
      'c1',
      {
        storageKey:
          'candidates/introduction-videos/c1/abhijith_intro_video_123.mp4',
        fileName: 'abhijith_intro_video.mp4',
        mimeType: 'video/mp4',
        fileSize: 1000,
        remarks: 'Recorded in studio',
      },
      'u1',
    );

    expect(uploadService.headObject).toHaveBeenCalledWith(
      'candidates/introduction-videos/c1/abhijith_intro_video_123.mp4',
    );
    expect(prisma.document.create).toHaveBeenCalled();
    expect(result.document?.id).toBe('doc-lib1');
    expect(outboxService.publishDataSync).toHaveBeenCalled();
  });

  it('lists reusable introduction videos with search and pagination', async () => {
    prisma.candidate.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.document.findMany.mockResolvedValue([
      {
        id: 'doc-lib1',
        fileName: 'abhijith_intro_video.mp4',
        fileUrl: 'https://example.com/lib.mp4',
        mimeType: 'video/mp4',
        fileSize: 1000,
        status: 'pending',
        notes: 'Library note',
        createdAt: new Date('2026-01-02'),
        verifications: [],
      },
      {
        id: 'doc2',
        fileName: 'abhijith_saudi_moh_intro_video.mp4',
        fileUrl: 'https://example.com/project.mp4',
        mimeType: 'video/mp4',
        fileSize: 1000,
        status: 'verified',
        notes: 'Project note',
        createdAt: new Date('2026-01-01'),
        verifications: [
          {
            candidateProjectMap: {
              project: { id: 'p2', title: 'Oman MOH' },
            },
          },
        ],
      },
    ]);
    prisma.document.count.mockResolvedValue(2);

    const result = await service.listReusableIntroductionVideos('c1', {
      page: 1,
      limit: 10,
      search: 'note',
      excludeProjectId: 'p1',
    });

    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          candidateId: 'c1',
          NOT: expect.any(Object),
          AND: expect.any(Array),
        }),
      }),
    );
    expect(result.items).toHaveLength(2);
    expect(result.items[0].isLibrary).toBe(true);
    expect(result.items[0].remarks).toBe('Library note');
    expect(result.items[1].linkedProjects[0].projectTitle).toBe('Oman MOH');
    expect(result.pagination.total).toBe(2);
  });

  it('throws when candidate not found for listing', async () => {
    prisma.candidate.findUnique.mockResolvedValue(null);

    await expect(
      service.listCandidateIntroductionVideos('missing'),
    ).rejects.toThrow(NotFoundException);
  });
});
