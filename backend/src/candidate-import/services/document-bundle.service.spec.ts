import { BadRequestException } from '@nestjs/common';
import { DOCUMENT_TYPE } from '../../common/constants/document-types';
import { SEGMENT_STATUS } from '../constants/candidate-import.constants';
import { DocumentBundleService } from './document-bundle.service';

jest.mock('../utils/pdf-pages.util', () => ({
  extractPdfPages: jest.fn(),
  renderPdfPagesToJpeg: jest.fn().mockResolvedValue(Buffer.from('jpeg-bytes')),
}));

jest.mock('pdf-lib', () => ({
  PDFDocument: {
    load: jest.fn().mockResolvedValue({
      getPageCount: () => 3,
      copyPages: jest.fn().mockResolvedValue([{}]),
    }),
    create: jest.fn().mockResolvedValue({
      copyPages: jest.fn().mockResolvedValue([{}]),
      addPage: jest.fn(),
      save: jest.fn().mockResolvedValue(Uint8Array.from([1, 2, 3])),
    }),
  },
}));

describe('DocumentBundleService.applyBundle', () => {
  const candidate = {
    id: 'cand_1',
    firstName: 'Laya',
    lastName: 'Nair',
    email: null,
    dateOfBirth: null,
    passportNumber: null,
  };

  function buildService(overrides: {
    segments: Array<Record<string, unknown>>;
    profileSuggestions?: Record<string, unknown>;
  }) {
    const prisma = {
      candidateDocumentBundle: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'bundle_1',
          candidateId: 'cand_1',
          fileUrl: 's3://bundle.pdf',
          fileName: 'bundle.pdf',
          profileSuggestions: overrides.profileSuggestions ?? {
            qualifications: [],
            workExperiences: [],
            resumeRole: {
              departmentId: 'd_icu',
              roleCatalogId: 'r_staff',
            },
            identity: {
              dateOfBirth: '1998-04-12',
              email: 'laya@example.com',
              passportNumber: 'P1234567',
            },
          },
          segments: overrides.segments,
          candidate,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      candidateDocumentBundleSegment: {
        update: jest.fn().mockResolvedValue({}),
      },
      candidate: {
        findUnique: jest.fn().mockResolvedValue(candidate),
        update: jest.fn().mockResolvedValue({}),
      },
      candidateRolePreference: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'pref_1' }),
      },
    };

    const uploadService = {
      getFile: jest.fn().mockResolvedValue(Buffer.from('pdf')),
      uploadFile: jest.fn().mockImplementation(async (file: Express.Multer.File) => ({
        fileUrl: `s3://${file.originalname}`,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      })),
    };

    const documentsService = {
      create: jest.fn().mockImplementation(async (dto: { docType: string }) => ({
        id: `doc_${dto.docType}`,
      })),
    };

    const compression = {
      prepareFile: jest.fn().mockImplementation(async (file: Express.Multer.File) => file),
    };

    const workExperiences = {
      create: jest.fn().mockResolvedValue({ id: 'work_1' }),
    };

    const candidateQualifications = {
      create: jest.fn().mockResolvedValue({}),
    };

    const service = new DocumentBundleService(
      prisma as never,
      uploadService as never,
      documentsService as never,
      {} as never,
      {} as never,
      {} as never,
      candidateQualifications as never,
      workExperiences as never,
      compression as never,
      {} as never,
    );

    return { service, prisma, uploadService, documentsService, workExperiences };
  }

  it('does not save a confirmed type outside the allow-list', async () => {
    const { service, documentsService } = buildService({
      segments: [
        {
          id: 'seg_pcc',
          status: SEGMENT_STATUS.CONFIRMED,
          docType: 'pcc',
          startPage: 1,
          endPage: 1,
          extracted: {},
          docName: null,
        },
      ],
      profileSuggestions: {
        qualifications: [
          {
            id: 'q1',
            rawLabel: 'BSc',
            qualificationId: 'q_bsc',
            included: true,
          },
        ],
        workExperiences: [],
      },
    });

    await service.applyBundle('bundle_1', 'user_1');

    expect(documentsService.create).not.toHaveBeenCalled();
  });

  it('stores a passport photo as JPEG at or under 1 MB', async () => {
    const { service, documentsService, uploadService } = buildService({
      segments: [
        {
          id: 'seg_photo',
          status: SEGMENT_STATUS.CONFIRMED,
          docType: DOCUMENT_TYPE.PASSPORT_PHOTO,
          startPage: 2,
          endPage: 2,
          extracted: {},
          docName: null,
        },
      ],
    });

    await service.applyBundle('bundle_1', 'user_1');

    expect(uploadService.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        mimetype: 'image/jpeg',
        originalname: expect.stringMatching(/\.jpg$/),
      }),
      expect.any(String),
      expect.arrayContaining(['image/jpeg']),
      1,
    );
    expect(documentsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: 'image/jpeg',
        docType: DOCUMENT_TYPE.PASSPORT_PHOTO,
      }),
      'user_1',
    );
  });

  it('attaches an experience certificate to the created work experience', async () => {
    const { service, documentsService, workExperiences } = buildService({
      segments: [
        {
          id: 'seg_exp',
          status: SEGMENT_STATUS.CONFIRMED,
          docType: DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE,
          startPage: 3,
          endPage: 3,
          extracted: {},
          docName: null,
        },
      ],
      profileSuggestions: {
        qualifications: [],
        workExperiences: [
          {
            id: 'job_1',
            departmentRaw: 'ICU',
            jobTitleRaw: 'Staff Nurse',
            roleDepartmentId: 'd_icu',
            roleCatalogId: 'r_staff',
            startDate: '2023-01-01',
            isCurrent: true,
            linkedSegmentIds: ['seg_exp'],
            included: true,
          },
        ],
      },
    });

    await service.applyBundle('bundle_1', 'user_1');

    expect(workExperiences.create).toHaveBeenCalled();
    expect(documentsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workExperienceId: 'work_1',
        docType: DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE,
      }),
      'user_1',
    );
  });

  it('rejects a confirmed resume without department and role', async () => {
    const { service } = buildService({
      segments: [
        {
          id: 'seg_resume',
          status: SEGMENT_STATUS.CONFIRMED,
          docType: DOCUMENT_TYPE.RESUME,
          startPage: 1,
          endPage: 1,
          extracted: {},
          docName: null,
        },
      ],
      profileSuggestions: {
        qualifications: [],
        workExperiences: [],
        resumeRole: null,
      },
    });

    await expect(service.applyBundle('bundle_1', 'user_1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('saves suggested degree, photo, and passport copy without requiring Next on each', async () => {
    const { service, documentsService } = buildService({
      segments: [
        {
          id: 'seg_degree',
          status: SEGMENT_STATUS.SUGGESTED,
          docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE,
          startPage: 1,
          endPage: 1,
          extracted: {},
          docName: null,
        },
        {
          id: 'seg_photo',
          status: SEGMENT_STATUS.SUGGESTED,
          docType: DOCUMENT_TYPE.PASSPORT_PHOTO,
          startPage: 2,
          endPage: 2,
          extracted: {},
          docName: null,
        },
        {
          id: 'seg_pass',
          status: SEGMENT_STATUS.SUGGESTED,
          docType: DOCUMENT_TYPE.PASSPORT_COPY,
          startPage: 3,
          endPage: 3,
          extracted: {},
          docName: null,
        },
      ],
    });

    const result = await service.applyBundle('bundle_1', 'user_1');

    expect(result.applied).toBe(3);
    expect(documentsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE }),
      'user_1',
    );
    expect(documentsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ docType: DOCUMENT_TYPE.PASSPORT_PHOTO }),
      'user_1',
    );
    expect(documentsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        docType: DOCUMENT_TYPE.PASSPORT_COPY,
        documentNumber: 'P1234567',
      }),
      'user_1',
    );
  });

  it('does not save a skipped passport copy', async () => {
    const { service, documentsService } = buildService({
      segments: [
        {
          id: 'seg_pass',
          status: SEGMENT_STATUS.REJECTED,
          docType: DOCUMENT_TYPE.PASSPORT_COPY,
          startPage: 3,
          endPage: 3,
          extracted: { documentNumber: 'Y4403682' },
          docName: null,
        },
      ],
      profileSuggestions: {
        qualifications: [
          {
            id: 'q1',
            rawLabel: 'BSc',
            qualificationId: 'q_bsc',
            included: true,
          },
        ],
        workExperiences: [],
      },
    });

    await service.applyBundle('bundle_1', 'user_1');

    expect(documentsService.create).not.toHaveBeenCalled();
  });
});

describe('DocumentBundleService.previewPages', () => {
  function buildPreviewService() {
    const prisma = {
      candidateDocumentBundle: {
        findUnique: jest.fn().mockResolvedValue({
          fileUrl: 's3://bundle.pdf',
          fileName: 'bundle.pdf',
          candidate: { firstName: 'Laya', lastName: 'Nair' },
        }),
      },
    };
    const uploadService = {
      getFile: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    };
    const service = new DocumentBundleService(
      prisma as never,
      uploadService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, prisma };
  }

  it('returns a split PDF for the requested page range', async () => {
    const { service } = buildPreviewService();
    const result = await service.previewPages('bundle_1', 2, 3);
    expect(result.fileName).toBe('Laya_Nair_preview_p2.pdf');
    expect(result.buffer).toEqual(Buffer.from([1, 2, 3]));
  });

  it('rejects a range that starts after it ends', async () => {
    const { service } = buildPreviewService();
    await expect(service.previewPages('bundle_1', 3, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
