import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BulkResumeCandidateService } from '../bulk-resume-candidate.service';
import { BulkResumeTempFileStore } from '../bulk-resume-temp-file.store';

describe('BulkResumeCandidateService', () => {
  const buildService = () => {
    const tempStore = new BulkResumeTempFileStore();
    return new BulkResumeCandidateService(
      tempStore,
      { create: jest.fn() } as any,
      { uploadResume: jest.fn() } as any,
      { professionType: { findFirst: jest.fn() } } as any,
    );
  };

  it('throws forbidden when bulk permission is missing', () => {
    const service = buildService();
    expect(() =>
      service.assertBulkPermissions({ permissions: ['write:candidates'] }),
    ).toThrow(ForbiddenException);
  });

  it('rejects parse with empty files list', async () => {
    const service = buildService();
    await expect(
      service.parseResumes([], {}, { permissions: ['*'] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns failure when draft phone is missing', async () => {
    const candidatesService = { create: jest.fn() };
    const uploadService = { uploadResume: jest.fn() };
    const prisma = { professionType: { findFirst: jest.fn() } };
    const service = new BulkResumeCandidateService(
      new BulkResumeTempFileStore(),
      candidatesService as any,
      uploadService as any,
      prisma as any,
    );

    const response = await service.createFromDrafts(
      {
        source: 'manual',
        professionTypeId: 'pt_nurse_seed001',
        drafts: [
          {
            draftId: 'draft-1',
            firstName: 'John',
            lastName: 'Doe',
            countryCode: '',
            mobileNumber: '',
          },
        ],
      },
      { id: 'user-1', permissions: ['write:candidates', 'write:candidates_bulk_resume'] },
    );

    expect(response.created).toHaveLength(0);
    expect(response.failed).toHaveLength(1);
    expect(candidatesService.create).not.toHaveBeenCalled();
  });

  it('reports partial failure when resume upload fails after candidate creation', async () => {
    const tempStore = new BulkResumeTempFileStore();
    const file = {
      originalname: 'resume.pdf',
      mimetype: 'application/pdf',
      size: 120,
      buffer: Buffer.from('pdf'),
    } as Express.Multer.File;
    tempStore.set('draft-1', { file, fileName: 'resume.pdf' });

    const candidatesService = {
      create: jest.fn().mockResolvedValue({
        id: 'cand-1',
        firstName: 'John',
        lastName: 'Doe',
      }),
    };
    const uploadService = {
      uploadResume: jest.fn().mockRejectedValue(new Error('upload failed')),
    };
    const prisma = { professionType: { findFirst: jest.fn() } };
    const service = new BulkResumeCandidateService(
      tempStore,
      candidatesService as any,
      uploadService as any,
      prisma as any,
    );

    const response = await service.createFromDrafts(
      {
        source: 'manual',
        professionTypeId: 'pt_nurse_seed001',
        drafts: [
          {
            draftId: 'draft-1',
            firstName: 'John',
            lastName: 'Doe',
            countryCode: '+91',
            mobileNumber: '9876543210',
          },
        ],
      },
      { id: 'user-1', permissions: ['write:candidates', 'write:candidates_bulk_resume'] },
    );

    expect(response.created).toHaveLength(1);
    expect(response.failed).toHaveLength(1);
    expect(uploadService.uploadResume).toHaveBeenCalled();
  });

  it('extracts name, education and experience from structured resume text', () => {
    const service = buildService();
    const parsed = (service as any).parseDraftFromText(`
ANURAG P
Full Stack Developer
EXPERIENCE
Software Engineer Retyn 10/2025 - Present
Software Engineer Rexav 12/2023 - 10/2025
EDUCATION
Bachelor of Science in Computer Science 06/2019 - 04/2022
SKILLS
React Node
    `) as any;

    expect(parsed.firstName).toBe('ANURAG');
    expect(parsed.lastName).toBe('P');
    expect(parsed.educations.length).toBeGreaterThan(0);
    expect(parsed.workExperiences.length).toBeGreaterThan(0);
  });
});
