import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BulkResumeCandidateService } from '../bulk-resume-candidate.service';
import { BulkResumeTempFileStore } from '../bulk-resume-temp-file.store';
import { parseResumeText } from '../resume-field-parser';

jest.mock('../resume-pdf-text-extractor', () => ({
  extractTextFromPdfBuffer: jest.fn(),
}));

jest.mock('../resume-field-parser', () => ({
  parseResumeText: jest.fn(),
}));

import { extractTextFromPdfBuffer } from '../resume-pdf-text-extractor';

describe('BulkResumeCandidateService', () => {
  const candidatesService = {
    create: jest.fn(),
  };
  const uploadService = {
    uploadResume: jest.fn(),
  };
  const prisma = {
    professionType: { findFirst: jest.fn() },
    roleCatalog: { findUnique: jest.fn() },
    qualification: { findMany: jest.fn() },
  };
  const rbacUtil = {
    hasPermission: jest.fn(),
  };
  let tempFileStore: BulkResumeTempFileStore;
  let service: BulkResumeCandidateService;

  beforeEach(() => {
    jest.clearAllMocks();
    tempFileStore = new BulkResumeTempFileStore();
    service = new BulkResumeCandidateService(
      candidatesService as never,
      uploadService as never,
      prisma as never,
      rbacUtil as never,
      tempFileStore,
    );
    rbacUtil.hasPermission.mockResolvedValue(true);
    prisma.professionType.findFirst.mockResolvedValue({ id: 'pt1' });
    prisma.qualification.findMany.mockResolvedValue([
      {
        id: 'q-bsc',
        name: 'Bachelor of Science in Nursing (BSc Nursing)',
        shortName: 'BSc Nursing',
        field: 'Nursing',
        aliases: [],
      },
    ]);
  });

  afterEach(() => {
    tempFileStore.onModuleDestroy();
  });

  function pdfFile(name: string): Express.Multer.File {
    return {
      originalname: name,
      mimetype: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 mock'),
      size: 12,
      fieldname: 'files',
      encoding: '7bit',
      destination: '',
      filename: name,
      path: '',
      stream: undefined as never,
    };
  }

  it('rejects when permissions are missing', async () => {
    rbacUtil.hasPermission.mockImplementation(
      async (_userId: string, required: string[]) => {
        if (required.includes('write:candidates_bulk_resume')) {
          return false;
        }
        return true;
      },
    );

    await expect(
      service.parseResumes(
        [pdfFile('a.pdf')],
        { professionTypeId: 'pt1' },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects empty file list', async () => {
    await expect(
      service.parseResumes([], { professionTypeId: 'pt1' }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects more than 10 files per parse request', async () => {
    const files = Array.from({ length: 11 }, (_, i) => pdfFile(`f${i}.pdf`));
    await expect(
      service.parseResumes(files, { professionTypeId: 'pt1' }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('parseResumes returns drafts without creating candidates', async () => {
    (extractTextFromPdfBuffer as jest.Mock).mockResolvedValue(
      'enough text content here for resume one',
    );
    (parseResumeText as jest.Mock).mockReturnValue({
      firstName: 'Priya',
      lastName: 'Sharma',
      countryCode: '+91',
      mobileNumber: '9876543210',
      email: 'priya@example.com',
      educations: [
        {
          rawDegree: 'BSc Nursing',
          university: 'University of Calicut',
          graduationYear: 2018,
        },
      ],
      workExperiences: [],
    });

    const result = await service.parseResumes(
      [pdfFile('good.pdf')],
      { professionTypeId: 'pt1', source: 'direct_application' },
      'user-1',
    );

    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0].firstName).toBe('Priya');
    expect(result.drafts[0].educations[0].qualificationId).toBe('q-bsc');
    expect(result.drafts[0].draftId).toBeTruthy();
    expect(candidatesService.create).not.toHaveBeenCalled();
  });

  it('parseResumes includes drafts missing phone with warnings', async () => {
    (extractTextFromPdfBuffer as jest.Mock).mockResolvedValue(
      'enough text content here for resume',
    );
    (parseResumeText as jest.Mock).mockReturnValue({
      firstName: 'No',
      lastName: 'Phone',
      email: 'nophone@example.com',
      educations: [],
      workExperiences: [],
    });

    const result = await service.parseResumes(
      [pdfFile('nophone.pdf')],
      { professionTypeId: 'pt1' },
      'user-1',
    );

    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0].parseWarnings).toEqual(
      expect.arrayContaining([
        'Phone number missing or incomplete',
        'No education detected',
        'No work experience detected',
      ]),
    );
    expect(candidatesService.create).not.toHaveBeenCalled();
  });

  it('createFromDrafts creates candidates with quals and work experiences', async () => {
    (extractTextFromPdfBuffer as jest.Mock).mockResolvedValue(
      'enough text content here for resume one',
    );
    (parseResumeText as jest.Mock).mockReturnValue({
      firstName: 'Priya',
      lastName: 'Sharma',
      countryCode: '+91',
      mobileNumber: '9876543210',
      email: 'priya@example.com',
      educations: [
        {
          rawDegree: 'BSc Nursing',
          university: 'University of Calicut',
          graduationYear: 2018,
        },
      ],
      workExperiences: [
        {
          jobTitle: 'Staff Nurse',
          companyName: 'City Hospital',
          startDate: '2020-01-01',
          isCurrent: true,
        },
      ],
    });

    const parsed = await service.parseResumes(
      [pdfFile('good.pdf')],
      { professionTypeId: 'pt1' },
      'user-1',
    );

    candidatesService.create.mockResolvedValue({
      id: 'cand-1',
      firstName: 'Priya',
      lastName: 'Sharma',
    });
    uploadService.uploadResume.mockResolvedValue({ fileUrl: 'https://x' });

    const draft = parsed.drafts[0];
    const result = await service.createFromDrafts(
      {
        professionTypeId: 'pt1',
        source: 'direct_application',
        drafts: [
          {
            draftId: draft.draftId,
            fileName: draft.fileName,
            firstName: 'Priya',
            lastName: 'Edited',
            email: 'priya@example.com',
            countryCode: '+91',
            mobileNumber: '9876543210',
            educations: [
              {
                qualificationId: 'q-bsc',
                university: 'University of Calicut',
                graduationYear: 2018,
              },
            ],
            workExperiences: [
              {
                jobTitle: 'Staff Nurse',
                companyName: 'City Hospital',
                startDate: '2020-01-01',
                isCurrent: true,
              },
            ],
          },
        ],
      },
      'user-1',
    );

    expect(result.created).toHaveLength(1);
    expect(result.created[0].qualificationCount).toBe(1);
    expect(result.created[0].workExperienceCount).toBe(1);
    expect(candidatesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        lastName: 'Edited',
        qualifications: [
          expect.objectContaining({
            qualificationId: 'q-bsc',
          }),
        ],
        workExperiences: [
          expect.objectContaining({
            jobTitle: 'Staff Nurse',
            companyName: 'City Hospital',
          }),
        ],
      }),
      'user-1',
    );
    expect(uploadService.uploadResume).toHaveBeenCalled();
  });

  it('createFromDrafts fails when phone missing', async () => {
    const draftId = tempFileStore.put('user-1', pdfFile('x.pdf'));
    const result = await service.createFromDrafts(
      {
        professionTypeId: 'pt1',
        drafts: [
          {
            draftId,
            fileName: 'x.pdf',
            firstName: 'A',
            lastName: 'B',
          },
        ],
      },
      'user-1',
    );
    expect(result.created).toHaveLength(0);
    expect(result.failed[0].reason).toMatch(/phone/i);
  });
});
