import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { DocumentsService } from '../documents.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { ProcessingService } from '../../processing/processing.service';
import { UploadService } from '../../upload/upload.service';
import { GoogleDriveService } from '../../google-drive/google-drive.service';

describe('DocumentsService - getCandidateProjectVerificationsByRole', () => {
  let service: DocumentsService;
  let prisma: any;

  const candidateProjectInclude = {
    id: 'cpm-1',
    candidateId: 'cand-1',
    projectId: 'proj-1',
    roleNeededId: null,
    project: { id: 'proj-1', title: 'Test Project' },
    candidate: { id: 'cand-1', firstName: 'Jane', lastName: 'Doe' },
    roleNeeded: null,
  };

  const verifiedVerification = {
    id: 'ver-1',
    status: 'verified',
    candidateProjectMapId: 'cpm-1',
    roleCatalogId: null,
    createdAt: new Date('2026-01-02'),
    document: {
      id: 'doc-1',
      candidateId: 'cand-1',
      docType: 'passport_copy',
      fileName: 'passport.pdf',
      fileUrl: 'https://example.com/passport.pdf',
      createdAt: new Date('2026-01-02'),
      roleCatalog: null,
    },
    roleCatalog: null,
  };

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
  });

  it('returns verifications when nomination has null roleNeededId and role-specific lookup fails', async () => {
    jest.spyOn(prisma.roleNeeded, 'findFirst' as any).mockResolvedValue({
      id: 'rn-1',
      projectId: 'proj-1',
      roleCatalogId: 'rc-wrong',
      roleCatalog: { id: 'rc-wrong', name: 'nurse' },
    });
    jest.spyOn(prisma.candidateProjects, 'findUnique' as any).mockResolvedValue(null);
    jest.spyOn(prisma.candidateProjects, 'findFirst' as any).mockResolvedValue(candidateProjectInclude);
    jest
      .spyOn(prisma.candidateProjectDocumentVerification, 'findMany' as any)
      .mockResolvedValue([verifiedVerification]);

    const result = await service.getCandidateProjectVerificationsByRole(
      'cand-1',
      'proj-1',
      'rc-wrong',
      { status: 'verified', limit: 100 },
    );

    expect(prisma.candidateProjects.findFirst).toHaveBeenCalledWith({
      where: { candidateId: 'cand-1', projectId: 'proj-1' },
      include: expect.any(Object),
    });
    expect(result.candidateProject.id).toBe('cpm-1');
    expect(result.verifications).toHaveLength(1);
    expect(result.verifications[0].status).toBe('verified');
  });

  it('returns verifications when roleCatalogId does not match nomination role but project nomination exists', async () => {
    const roleSpecificNomination = {
      ...candidateProjectInclude,
      roleNeededId: 'rn-actual',
      roleNeeded: {
        id: 'rn-actual',
        roleCatalogId: 'rc-actual',
        roleCatalog: { id: 'rc-actual', name: 'doctor' },
      },
    };

    jest.spyOn(prisma.roleNeeded, 'findFirst' as any).mockResolvedValue({
      id: 'rn-other',
      projectId: 'proj-1',
      roleCatalogId: 'rc-other',
      roleCatalog: { id: 'rc-other', name: 'nurse' },
    });
    jest.spyOn(prisma.candidateProjects, 'findUnique' as any).mockResolvedValue(null);
    jest.spyOn(prisma.candidateProjects, 'findFirst' as any).mockResolvedValue(roleSpecificNomination);
    jest
      .spyOn(prisma.candidateProjectDocumentVerification, 'findMany' as any)
      .mockResolvedValue([verifiedVerification]);

    const result = await service.getCandidateProjectVerificationsByRole(
      'cand-1',
      'proj-1',
      'rc-other',
    );

    expect(result.candidateProject.id).toBe('cpm-1');
    expect(result.verifications).toHaveLength(1);
  });

  it('throws NotFoundException when no nomination exists for candidate and project', async () => {
    jest.spyOn(prisma.roleNeeded, 'findFirst' as any).mockResolvedValue({
      id: 'rn-1',
      projectId: 'proj-1',
      roleCatalogId: 'rc-1',
      roleCatalog: { id: 'rc-1', name: 'nurse' },
    });
    jest.spyOn(prisma.candidateProjects, 'findUnique' as any).mockResolvedValue(null);
    jest.spyOn(prisma.candidateProjects, 'findFirst' as any).mockResolvedValue(null);

    await expect(
      service.getCandidateProjectVerificationsByRole('cand-1', 'proj-1', 'rc-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
