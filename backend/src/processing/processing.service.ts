import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TransferToProcessingDto } from './dto/transfer-to-processing.dto';
import { QueryCandidatesToTransferDto } from './dto/query-candidates-to-transfer.dto';
import { QueryAllProcessingCandidatesDto } from './dto/query-all-processing-candidates.dto';
import { DOCUMENT_TYPE, DOCUMENT_STATUS, CANDIDATE_STATUS } from '../common/constants';
import { ProcessingDocumentReuploadDto } from './dto/processing-document-reupload.dto';
import { VerifyProcessingDocumentDto } from './dto/verify-processing-document.dto';
import { UpdateProcessingStepDto } from './dto/update-processing-step.dto';
import { OutboxService } from '../notifications/outbox.service';
import { HrdRemindersService } from '../hrd-reminders/hrd-reminders.service';
import { DataFlowRemindersService } from '../data-flow-reminders/data-flow-reminders.service';

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly hrdRemindersService: HrdRemindersService,
    private readonly dataFlowRemindersService: DataFlowRemindersService,
  ) {}

  /**
   * Transfer candidates to the processing team
   */
  async transferToProcessing(dto: TransferToProcessingDto, userId: string) {
    const { candidateIds, projectId, roleNeededId, roleCatalogId, assignedProcessingTeamUserId, notes } = dto;

    // 1. Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Resolve RoleNeeded:
    // - If roleCatalogId is provided, find the RoleNeeded entry for this project that references that roleCatalog
    // - Otherwise, fall back to roleNeededId (if provided)
    let roleNeeded = null as any;

    if (roleCatalogId) {
      roleNeeded = await this.prisma.roleNeeded.findFirst({
        where: { projectId, roleCatalogId },
      });

      if (!roleNeeded) {
        throw new NotFoundException(`Role requirement for project ${projectId} with roleCatalogId ${roleCatalogId} not found`);
      }
    } else if (roleNeededId) {
      roleNeeded = await this.prisma.roleNeeded.findUnique({
        where: { id: roleNeededId },
      });

      if (!roleNeeded) {
        throw new NotFoundException(`Role requirement with ID ${roleNeededId} not found`);
      }
    } else {
      throw new BadRequestException('Either roleCatalogId or roleNeededId must be provided');
    }

    // 2. Verify processing user exists
    const processingUser = await this.prisma.user.findUnique({
      where: { id: assignedProcessingTeamUserId },
    });

    if (!processingUser) {
      throw new NotFoundException(`Processing user with ID ${assignedProcessingTeamUserId} not found`);
    }

    // 3. Get the "Transferred to Processing" status IDs
    const mainStatus = await this.prisma.candidateProjectMainStatus.findUnique({
      where: { name: 'processing' },
    });

    const subStatus = await this.prisma.candidateProjectSubStatus.findUnique({
      where: { name: 'transfered_to_processing' },
    });

    if (!mainStatus || !subStatus) {
      throw new BadRequestException('Processing status configuration not found in database');
    }

    // 4. Process each candidate
    const results: any[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const candidateId of candidateIds) {
        // Find existing candidate project map (try exact match first)
        let candidateProjectMap = await tx.candidateProjects.findUnique({
          where: {
            candidateId_projectId_roleNeededId: {
              candidateId,
              projectId,
              roleNeededId: roleNeeded.id,
            },
          },
        });

        if (!candidateProjectMap) {
          // Fallback: see if candidate is nominated to the project with any role
          const fallback = await tx.candidateProjects.findFirst({
            where: { candidateId, projectId },
            orderBy: { createdAt: 'desc' },
          });

          if (fallback) {
            // If the fallback nomination has no role, require the client to provide a role
            if (!fallback.roleNeededId) {
              throw new BadRequestException(
                `Candidate ${candidateId} is nominated for project ${projectId} but the nomination has no roleAssigned. Please provide a valid roleNeededId.`,
              );
            }

            this.logger.warn(
              `Role mismatch for candidate ${candidateId} in project ${projectId}: requested role ${roleNeededId} - using role ${fallback.roleNeededId}`,
            );

            candidateProjectMap = fallback;
          } else {
            throw new NotFoundException(
              `Candidate ${candidateId} is not nominated for project ${projectId} with role ${roleNeededId}`,
            );
          }
        }

        // Create or Update ProcessingCandidate record - use the actual role from the candidateProjectMap
        const roleForProcessing = candidateProjectMap.roleNeededId as string;

        const processingCandidate = await tx.processingCandidate.upsert({
          where: {
            candidateId_projectId_roleNeededId: {
              candidateId,
              projectId,
              roleNeededId: roleForProcessing,
            },
          },
          update: {
            assignedProcessingTeamUserId,
            processingStatus: 'assigned',
            step: 'verify_offer_letter',
            notes,
          },
          create: {
            candidateId,
            projectId,
            roleNeededId: roleForProcessing,
            assignedProcessingTeamUserId,
            processingStatus: 'assigned',
            step: 'verify_offer_letter',
            notes,
          },
        });

        // Add history record
        await tx.processingHistory.create({
          data: {
            processingCandidate: { connect: { id: processingCandidate.id } },
            status: 'assigned',
            step: 'verify_offer_letter',
            changedBy: userId ? { connect: { id: userId } } : undefined,
            recruiter: candidateProjectMap.recruiterId
              ? { connect: { id: candidateProjectMap.recruiterId } }
              : undefined,
            notes: notes || 'Transferred to processing department',
          },
        });

        // Update Candidate Projects status
        await tx.candidateProjects.update({
          where: { id: candidateProjectMap.id },
          data: {
            mainStatusId: mainStatus.id,
            subStatusId: subStatus.id,
          },
        });

        // Add to Candidate Project status history
        await tx.candidateProjectStatusHistory.create({
          data: {
            candidateProjectMapId: candidateProjectMap.id,
            mainStatusId: mainStatus.id,
            subStatusId: subStatus.id,
            mainStatusSnapshot: mainStatus.label,
            subStatusSnapshot: subStatus.label,
            changedById: userId,
            reason: notes || 'Transferred to processing team',
          },
        });

        // Create processing steps for this processing candidate (idempotent)
        await this.createStepsForProcessingCandidate(processingCandidate.id, tx);

        // Publish event for notification
        await this.outbox.publishCandidateTransferredToProcessing(
          processingCandidate.id,
          candidateId,
          projectId,
          assignedProcessingTeamUserId,
          userId,
          tx,
        );

        results.push({
          candidateId,
          processingCandidateId: processingCandidate.id,
          status: 'success',
        });
      }
    });

    return {
      transferredCount: candidateIds.length,
      results,
    };
  }

  /**
   * Idempotent creation of processing steps for a processingCandidate
   */
  async createStepsForProcessingCandidate(processingCandidateId: string, tx?: any) {
    const prismaTx = tx || this.prisma;

    // Fetch processing candidate and determine country (prefer project country)
    const processingCandidate = await prismaTx.processingCandidate.findUnique({
      where: { id: processingCandidateId },
      include: { candidate: true, project: true },
    });
    if (!processingCandidate) throw new Error('Processing candidate not found');

    const country = processingCandidate.project?.countryCode || processingCandidate.candidate?.countryCode || null;

    // Fetch country-specific plan
    let plan: Array<{ stepTemplateId: string; stepTemplate?: any; order?: number }> = [];
    if (country) {
      const countryPlan = await prismaTx.processingCountryStep.findMany({
        where: { countryCode: country },
        orderBy: { order: 'asc' },
        include: { stepTemplate: true },
      });
      plan = countryPlan.map((p) => ({ stepTemplateId: p.stepTemplateId, stepTemplate: p.stepTemplate, order: p.order }));
    }

    // Fallback to global templates if no country plan
    if (plan.length === 0) {
      const templates = await prismaTx.processingStepTemplate.findMany({ orderBy: { order: 'asc' } });
      plan = templates.map((t) => ({ stepTemplateId: t.id, stepTemplate: t, order: t.order }));
    }

    // Create missing steps idempotently
    for (const p of plan) {
      const exists = await prismaTx.processingStep.findFirst({ where: { processingCandidateId, templateId: p.stepTemplateId } });
      if (!exists) {
        await prismaTx.processingStep.create({
          data: {
            processingCandidateId,
            templateId: p.stepTemplateId,
            status: 'pending',
          },
        });
      }
    }

    // Only auto-start the first step if the processing candidate is already marked as 'in_progress'
    // This prevents a transfer action from immediately setting steps to in_progress; transfers should keep status 'assigned'
    const anyInProgress = await prismaTx.processingStep.findFirst({ where: { processingCandidateId, status: 'in_progress' } });
    if (!anyInProgress) {
      const pc = await prismaTx.processingCandidate.findUnique({ where: { id: processingCandidateId } });
      if (pc && pc.processingStatus === 'in_progress') {
        // find first created step ordered by template.order (use template relation)
        const firstStep = await prismaTx.processingStep.findFirst({
          where: { processingCandidateId },
          orderBy: { template: { order: 'asc' } },
        });
        if (firstStep) {
          await prismaTx.processingStep.update({ where: { id: firstStep.id }, data: { status: 'in_progress', startedAt: new Date() } });
        }
      }
    }
  }

  async getProcessingSteps(processingCandidateId: string) {
    // Ensure steps are materialized according to country plan
    await this.createStepsForProcessingCandidate(processingCandidateId);

    // Resolve candidate country for document rules
    const pc = await this.prisma.processingCandidate.findUnique({ where: { id: processingCandidateId }, include: { candidate: true, project: true } });
    const country = pc?.project?.countryCode || pc?.candidate?.countryCode || null;

    // Fetch all country document rules for this country + global ('ALL')
    const countryRules = await this.prisma.countryDocumentRequirement.findMany({
      where: { countryCode: country ? { in: ['ALL', country] } : { in: ['ALL'] } },
    });

    const steps = await this.prisma.processingStep.findMany({
      where: { processingCandidateId },
      orderBy: { template: { order: 'asc' } },
      include: {
        template: true,
        documents: { include: { candidateProjectDocumentVerification: { include: { document: true } } } },
      },
    });

    // Return step list WITHOUT documents or requiredDocuments — these are heavy and unnecessary
    // for the basic steps endpoint. Frontend should use the dedicated requirements endpoints
    // (e.g., /steps/:processingId/hrd-requirements) when it needs rule/requirement details.
    const stepsWithoutDocs = steps.map((s) => {
      // omit `documents` by destructuring
      const { documents, ...rest } = s as any;
      return rest;
    });

    return stepsWithoutDocs;
  }

  // -----------------
  // HRD helpers & validation
  // -----------------
  private async ensureHrdCanComplete(processingStepId: string) {
    const step = await this.prisma.processingStep.findUnique({
      where: { id: processingStepId },
      include: {
        processingCandidate: true,
        template: true,
        documents: { include: { candidateProjectDocumentVerification: { include: { document: true } } } },
      },
    });
    if (!step) throw new Error('Processing step not found');

    const processingCandidate = await this.prisma.processingCandidate.findUnique({
      where: { id: step.processingCandidateId },
      include: { candidate: true, project: true },
    });
    if (!processingCandidate) throw new Error('Processing candidate not found');

    const country = processingCandidate.project?.countryCode || processingCandidate.candidate?.countryCode || null;

    // Fetch HRD rules (global + country)
    const rules = await this.prisma.countryDocumentRequirement.findMany({
      where: {
        processingStepTemplateId: step.templateId,
        countryCode: { in: country ? ['ALL', country] : ['ALL'] },
      },
    });

    // Merge rules: country overrides ALL
    const ruleMap: Record<string, any> = {};
    for (const r of rules) {
      if (!ruleMap[r.docType] || r.countryCode !== 'ALL') ruleMap[r.docType] = r;
    }

    const mandatoryDocTypes = Object.values(ruleMap)
      .filter((r: any) => r.mandatory)
      .map((r: any) => r.docType);

    // Check uploaded/verified documents for this step
    const uploadedDocTypes = new Set<string>();
    for (const pd of step.documents || []) {
      const ver = pd.candidateProjectDocumentVerification;
      // Allow completion if document is verified OR pending (uploaded but not yet verified)
      // We only block if it's missing or explicitly rejected
      if (
        ver &&
        (ver.status === 'verified' || ver.status === 'pending') &&
        ver.document?.docType
      ) {
        uploadedDocTypes.add(ver.document.docType);
      }
    }

    const missing = mandatoryDocTypes.filter((d) => !uploadedDocTypes.has(d));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Cannot complete HRD step. Missing or unverified documents: ${missing.join(
          ', ',
        )}`,
      );
    }
  }

  async getHrdRequirements(processingCandidateId: string, docType?: string) {
    // Ensure steps exist
    await this.createStepsForProcessingCandidate(processingCandidateId);

    const pc = await this.prisma.processingCandidate.findUnique({
      where: { id: processingCandidateId },
      include: {
        candidate: true,
        project: true,
        role: { include: { roleCatalog: true } },
      },
    });
    if (!pc)
      throw new NotFoundException(
        `Processing candidate ${processingCandidateId} not found`,
      );

    const country =
      pc.project?.countryCode || pc.candidate?.countryCode || null;

    const hrdTemplate = await this.prisma.processingStepTemplate.findUnique({
      where: { key: 'hrd' },
    });
    if (!hrdTemplate) throw new NotFoundException(`HRD step template not found`);

    const rules = await this.prisma.countryDocumentRequirement.findMany({
      where: {
        processingStepTemplateId: hrdTemplate.id,
        countryCode: { in: country ? ['ALL', country] : ['ALL'] },
      },
    });

    // Merge rules: country wins
    const map: Record<string, any> = {};
    for (const r of rules) {
      if (!map[r.docType] || r.countryCode !== 'ALL') map[r.docType] = r;
    }

    let requiredDocuments = Object.values(map).map((r: any) => ({
      docType: r.docType,
      label: r.label,
      mandatory: r.mandatory,
      source: r.countryCode,
    }));

    // Use DocTypes from rules instead of a hardcoded list to allow country-specific requirements
    const activeDocTypes = requiredDocuments.map((d) => d.docType);

    // If docType filter provided, restrict requiredDocuments further
    if (docType) {
      requiredDocuments = requiredDocuments.filter((d) => d.docType === docType);
    }

    // Find HRD processing step with rich includes (document, verification, history, related project/role info)
    const hrdStep = await this.prisma.processingStep.findFirst({
      where: { processingCandidateId, templateId: hrdTemplate.id },
      include: {
        template: true,
        documents: {
          include: {
            candidateProjectDocumentVerification: {
              include: {
                document: true,
                roleCatalog: true,
                // Only include minimal fields for candidateProjectMap.roleNeeded per request
                candidateProjectMap: {
                  include: {
                    project: true,
                    roleNeeded: {
                      select: {
                        id: true,
                        projectId: true,
                        roleCatalogId: true,
                        designation: true,
                      },
                    },
                  },
                },
                // Do NOT include verificationHistory (removed intentionally)
              },
            },
          },
        },
      },
    });

    const filterDocTypes = docType ? [docType] : activeDocTypes;

    // Map processing_documents, filter to relevant doc types
    let processing_documents = (hrdStep?.documents || [])
      .map((d: any) => {
        const ver = d.candidateProjectDocumentVerification;
        return {
          processingStepDocumentId: d.id,
          processingDocument: {
            id: d.id,
            status: d.status,
            notes: d.notes || null,
            uploadedBy: d.uploadedBy || null,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          },
          verification: ver
            ? {
                id: ver.id,
                status: ver.status,
                notes: ver.notes || null,
                rejectionReason: ver.rejectionReason || null,
                resubmissionRequested: ver.resubmissionRequested || false,
                roleCatalog: ver.roleCatalog || null,
                // candidateProjectMap will include the trimmed roleNeeded per query
                candidateProjectMap: ver.candidateProjectMap || null,
                createdAt: ver.createdAt,
                updatedAt: ver.updatedAt,
              }
            : null,
          document: ver?.document || null,
        };
      })
      .filter((u) => u.document && filterDocTypes.includes(u.document.docType));

    // Include candidate's own documents of relevant doc types and their verifications
    const candidateDocuments = await this.prisma.document.findMany({
      where: {
        candidateId: pc.candidate.id,
        isDeleted: false,
        docType: { in: filterDocTypes },
        OR: [
          { roleCatalogId: pc.role?.roleCatalogId || null },
          { roleCatalogId: null },
        ],
      },
      include: {
        verifications: {
          include: {
            candidateProjectMap: {
              include: {
                project: true,
                roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } },
              },
            },
            roleCatalog: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute counts for HRD overview
    const mandatoryDocTypes = requiredDocuments
      .filter((d) => d.mandatory)
      .map((d) => d.docType);

    // Count uploaded document types (either attached to the HRD step or present in candidate documents)
    const uploadedDocTypes = new Set<string>();
    processing_documents.forEach((pd: any) => {
      if (pd.document?.docType) uploadedDocTypes.add(pd.document.docType);
    });
    candidateDocuments.forEach((d: any) => {
      if (d.docType) uploadedDocTypes.add(d.docType);
    });

    const uploadedCount = uploadedDocTypes.size;

    // Count verified processing documents (verification.status === 'verified')
    const verifiedCount = processing_documents.filter(
      (pd: any) => pd.verification && pd.verification.status === 'verified',
    ).length;

    // Missing count should only reflect mandatory documents that are not uploaded
    const missingCount = mandatoryDocTypes.filter(
      (docType) => !uploadedDocTypes.has(docType),
    ).length;

    // HRD completion flag based on HRD step status
    const isHrdCompleted = !!hrdStep && hrdStep.status === 'completed';

    // Remove `documents` from step response (not needed in HRD payload)
    const step = hrdStep
      ? (() => {
          const { documents, ...rest } = hrdStep as any;
          return rest;
        })()
      : null;

    return {
      isHrdCompleted,
      step,
      processingCandidate: {
        id: pc.id,
        processingStatus: pc.processingStatus,
        candidate: {
          id: pc.candidate?.id || null,
          firstName: pc.candidate?.firstName || null,
          lastName: pc.candidate?.lastName || null,
          email: pc.candidate?.email || null,
          mobileNumber: pc.candidate?.mobileNumber || null,
          countryCode: pc.candidate?.countryCode || null,
        },
        project: {
          id: pc.project?.id || null,
          title: pc.project?.title || null,
          countryCode: pc.project?.countryCode || null,
          description: pc.project?.description || null,
          clientId: pc.project?.clientId || null,
          teamId: pc.project?.teamId || null,
        },
        role: pc.role
          ? {
              id: pc.role.id,
              designation: pc.role.designation,
              roleCatalog: pc.role.roleCatalog || null,
            }
          : null,
      },
      requiredDocuments,
      processing_documents,
      candidateDocuments,
      counts: {
        totalConfigured: requiredDocuments.length,
        totalMandatory: mandatoryDocTypes.length,
        uploadedCount,
        verifiedCount,
        missingCount, // Only mandatory missing
      },
    };
  }

  /**
   * Visa requirements (HRD-shaped response)
   * - Merges global ('ALL') + country rules for processingStepTemplate key = 'visa'
   * - Keeps the same response structure as getHrdRequirements
   */
  async getVisaRequirements(processingCandidateId: string, docType?: string) {
    // Ensure steps exist
    await this.createStepsForProcessingCandidate(processingCandidateId);

    const pc = await this.prisma.processingCandidate.findUnique({
      where: { id: processingCandidateId },
      include: { candidate: true, project: true, role: { include: { roleCatalog: true } } },
    });
    if (!pc) throw new NotFoundException(`Processing candidate ${processingCandidateId} not found`);

    const country = pc.project?.countryCode || pc.candidate?.countryCode || null;

    const visaTemplate = await this.prisma.processingStepTemplate.findUnique({ where: { key: 'visa' } });
    if (!visaTemplate) throw new NotFoundException(`Visa step template not found`);

    const rules = await this.prisma.countryDocumentRequirement.findMany({
      where: {
        processingStepTemplateId: visaTemplate.id,
        countryCode: { in: country ? ['ALL', country] : ['ALL'] },
      },
    });

    // Merge rules: country wins
    const map: Record<string, any> = {};
    for (const r of rules) {
      if (!map[r.docType] || r.countryCode !== 'ALL') map[r.docType] = r;
    }

    let requiredDocuments = Object.values(map).map((r: any) => ({
      docType: r.docType,
      label: r.label,
      mandatory: r.mandatory,
      source: r.countryCode,
    }));

    const activeDocTypes = requiredDocuments.map((d) => d.docType);

    if (docType) requiredDocuments = requiredDocuments.filter((d) => d.docType === docType);

    const visaStep = await this.prisma.processingStep.findFirst({
      where: { processingCandidateId, templateId: visaTemplate.id },
      include: {
        template: true,
        documents: {
          include: {
            candidateProjectDocumentVerification: {
              include: {
                document: true,
                roleCatalog: true,
                candidateProjectMap: {
                  include: {
                    project: true,
                    roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const filterDocTypes = docType ? [docType] : activeDocTypes;

    let processing_documents = (visaStep?.documents || [])
      .map((d: any) => ({
        id: d.id,
        processingStepId: d.processingStepId,
        uploadedAt: d.createdAt,
        documentId: d.candidateProjectDocumentVerification?.documentId || null,
        verification: d.candidateProjectDocumentVerification || null,
        document: d.candidateProjectDocumentVerification?.document || null,
      }))
      .filter((u) => u.document && filterDocTypes.includes(u.document.docType));

    const candidateDocuments = await this.prisma.document.findMany({
      where: {
        candidateId: pc.candidate.id,
        isDeleted: false,
        docType: { in: filterDocTypes },
        OR: [{ roleCatalogId: pc.role?.roleCatalogId || null }, { roleCatalogId: null }],
      },
      include: {
        verifications: {
          include: {
            candidateProjectMap: {
              include: {
                project: true,
                roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } },
              },
            },
            roleCatalog: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mandatoryDocTypes = requiredDocuments.filter((d) => d.mandatory).map((d) => d.docType);

    const uploadedDocTypes = new Set<string>();
    processing_documents.forEach((pd: any) => pd.document && uploadedDocTypes.add(pd.document.docType));
    candidateDocuments.forEach((d: any) => d.docType && uploadedDocTypes.add(d.docType));

    const uploadedCount = uploadedDocTypes.size;
    const verifiedCount = processing_documents.filter((pd: any) => pd.verification && pd.verification.status === 'verified').length;
    const missingCount = mandatoryDocTypes.filter((docType) => !uploadedDocTypes.has(docType)).length;

    const isVisaCompleted = !!visaStep && visaStep.status === 'completed';

    const step = visaStep ? (() => { const { documents, ...rest } = visaStep as any; return rest; })() : null;

    return {
      isVisaCompleted,
      step,
      processingCandidate: {
        id: pc.id,
        processingStatus: pc.processingStatus,
        candidate: {
          id: pc.candidate?.id || null,
          firstName: pc.candidate?.firstName || null,
          lastName: pc.candidate?.lastName || null,
          email: pc.candidate?.email || null,
          mobileNumber: pc.candidate?.mobileNumber || null,
          countryCode: pc.candidate?.countryCode || null,
        },
        project: {
          id: pc.project?.id || null,
          title: pc.project?.title || null,
          countryCode: pc.project?.countryCode || null,
          description: pc.project?.description || null,
          clientId: pc.project?.clientId || null,
          teamId: pc.project?.teamId || null,
        },
        role: pc.role ? { id: pc.role.id, designation: pc.role.designation, roleCatalog: pc.role.roleCatalog || null } : null,
      },
      requiredDocuments,
      processing_documents,
      candidateDocuments,
      counts: {
        totalConfigured: requiredDocuments.length,
        totalMandatory: mandatoryDocTypes.length,
        uploadedCount,
        verifiedCount,
        missingCount,
      },
    };
  }

  async getDocumentReceivedRequirements(processingCandidateId: string, docType?: string) {
    // Ensure steps exist
    await this.createStepsForProcessingCandidate(processingCandidateId);

    const pc = await this.prisma.processingCandidate.findUnique({
      where: { id: processingCandidateId },
      include: { candidate: true, project: true, role: { include: { roleCatalog: true } } },
    });
    if (!pc) throw new Error('Processing candidate not found');

    const country = pc.project?.countryCode || pc.candidate?.countryCode || null;

    const documentReceivedTemplate = await this.prisma.processingStepTemplate.findUnique({ where: { key: 'document_received' } });
    if (!documentReceivedTemplate) throw new Error("ProcessingStepTemplate 'document_received' not found");

    const rules = await this.prisma.countryDocumentRequirement.findMany({
      where: {
        processingStepTemplateId: documentReceivedTemplate.id,
        countryCode: { in: country ? ['ALL', country] : ['ALL'] },
      },
    });

    // Merge rules: country wins
    const map: Record<string, any> = {};
    for (const r of rules) {
      map[`${r.countryCode}:${r.docType}`] = r;
    }

    let requiredDocuments = Object.values(map).map((r: any) => ({
      docType: r.docType,
      label: r.label,
      mandatory: r.mandatory,
      source: r.countryCode,
    }));

    const activeDocTypes = requiredDocuments.map((d) => d.docType);

    if (docType) requiredDocuments = requiredDocuments.filter((d) => d.docType === docType);

    const documentReceivedStep = await this.prisma.processingStep.findFirst({
      where: { processingCandidateId, templateId: documentReceivedTemplate.id },
      include: {
        template: true,
        documents: {
          include: {
            candidateProjectDocumentVerification: {
              include: {
                document: true,
                roleCatalog: true,
                candidateProjectMap: {
                  include: {
                    project: true,
                    roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const filterDocTypes = docType ? [docType] : activeDocTypes;

    let processing_documents = (documentReceivedStep?.documents || [])
      .map((d: any) => ({
        id: d.id,
        processingStepId: d.processingStepId,
        uploadedAt: d.createdAt,
        documentId: d.candidateProjectDocumentVerification?.documentId || null,
        verification: d.candidateProjectDocumentVerification || null,
        document: d.candidateProjectDocumentVerification?.document || null,
      }))
      .filter((u) => u.document && filterDocTypes.includes(u.document.docType));

    const candidateDocuments = await this.prisma.document.findMany({
      where: {
        candidateId: pc.candidate.id,
        isDeleted: false,
        docType: { in: filterDocTypes },
        OR: [{ roleCatalogId: pc.role?.roleCatalogId || null }, { roleCatalogId: null }],
      },
      include: {
        verifications: {
          include: {
            candidateProjectMap: {
              include: {
                project: true,
                roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } },
              },
            },
            roleCatalog: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mandatoryDocTypes = requiredDocuments.filter((d) => d.mandatory).map((d) => d.docType);

    const uploadedDocTypes = new Set<string>();
    processing_documents.forEach((pd: any) => pd.document && uploadedDocTypes.add(pd.document.docType));
    candidateDocuments.forEach((d: any) => d.docType && uploadedDocTypes.add(d.docType));

    const uploadedCount = uploadedDocTypes.size;
    const verifiedCount = processing_documents.filter((pd: any) => pd.verification && pd.verification.status === 'verified').length;
    const missingCount = mandatoryDocTypes.filter((docType) => !uploadedDocTypes.has(docType)).length;

    const isDocumentReceivedCompleted = !!documentReceivedStep && documentReceivedStep.status === 'completed';

    const step = documentReceivedStep ? (() => {
      const { documents, ...rest } = documentReceivedStep as any;
      return rest;
    })() : null;

    return {
      isDocumentReceivedCompleted,
      step,
      processingCandidate: {
        id: pc.id,
        processingStatus: pc.processingStatus,
        candidate: {
          id: pc.candidate?.id || null,
          firstName: pc.candidate?.firstName || null,
          lastName: pc.candidate?.lastName || null,
          email: pc.candidate?.email || null,
          mobileNumber: pc.candidate?.mobileNumber || null,
          countryCode: pc.candidate?.countryCode || null,
        },
        project: {
          id: pc.project?.id || null,
          title: pc.project?.title || null,
          countryCode: pc.project?.countryCode || null,
          description: pc.project?.description || null,
          clientId: pc.project?.clientId || null,
          teamId: pc.project?.teamId || null,
        },
        role: pc.role ? { id: pc.role.id, designation: pc.role.designation, roleCatalog: pc.role.roleCatalog || null } : null,
      },
      requiredDocuments,
      processing_documents,
      candidateDocuments,
      counts: {
        totalConfigured: requiredDocuments.length,
        totalMandatory: mandatoryDocTypes.length,
        uploadedCount,
        verifiedCount,
        missingCount,
      },
    };
  }

  /**
   * Emigration requirements (HRD-shaped response)
   * - Merges global ('ALL') + country rules for processingStepTemplate key = 'emigration'
   * - Returns the same response shape as getHrdRequirements so frontend can reuse HRD UI
   */
  async getEmigrationRequirements(processingCandidateId: string, docType?: string) {
    // Ensure steps exist
    await this.createStepsForProcessingCandidate(processingCandidateId);

    const pc = await this.prisma.processingCandidate.findUnique({
      where: { id: processingCandidateId },
      include: { candidate: true, project: true, role: { include: { roleCatalog: true } } },
    });
    if (!pc) throw new NotFoundException(`Processing candidate ${processingCandidateId} not found`);

    const country = pc.project?.countryCode || pc.candidate?.countryCode || null;

    const emigrationTemplate = await this.prisma.processingStepTemplate.findUnique({ where: { key: 'emigration' } });
    if (!emigrationTemplate) throw new NotFoundException(`Emigration step template not found`);

    const rules = await this.prisma.countryDocumentRequirement.findMany({
      where: {
        processingStepTemplateId: emigrationTemplate.id,
        countryCode: { in: country ? ['ALL', country] : ['ALL'] },
      },
    });

    // Merge rules: country wins
    const map: Record<string, any> = {};
    for (const r of rules) {
      map[r.docType] = (map[r.docType] || r);
      if (r.countryCode !== 'ALL') map[r.docType] = r; // country overrides ALL
    }

    let requiredDocuments = Object.values(map).map((r: any) => ({
      docType: r.docType,
      label: r.label,
      mandatory: r.mandatory,
      source: r.countryCode,
    }));

    const activeDocTypes = requiredDocuments.map((d) => d.docType);
    if (docType) requiredDocuments = requiredDocuments.filter((d) => d.docType === docType);

    const emigrationStep = await this.prisma.processingStep.findFirst({
      where: { processingCandidateId, templateId: emigrationTemplate.id },
      include: {
        template: true,
        documents: {
          include: {
            candidateProjectDocumentVerification: {
              include: {
                document: true,
                roleCatalog: true,
                candidateProjectMap: {
                  include: {
                    project: true,
                    roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const filterDocTypes = docType ? [docType] : activeDocTypes;

    const processing_documents = (emigrationStep?.documents || [])
      .map((d: any) => ({
        id: d.id,
        processingStepId: d.processingStepId,
        uploadedAt: d.createdAt,
        documentId: d.candidateProjectDocumentVerification?.documentId || null,
        verification: d.candidateProjectDocumentVerification || null,
        document: d.candidateProjectDocumentVerification?.document || null,
      }))
      .filter((u) => u.document && filterDocTypes.includes(u.document.docType));

    const candidateDocuments = await this.prisma.document.findMany({
      where: {
        candidateId: pc.candidate.id,
        isDeleted: false,
        docType: { in: filterDocTypes },
        OR: [{ roleCatalogId: pc.role?.roleCatalogId || null }, { roleCatalogId: null }],
      },
      include: {
        verifications: {
          include: {
            candidateProjectMap: {
              include: {
                project: true,
                roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } },
              },
            },
            roleCatalog: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mandatoryDocTypes = requiredDocuments.filter((d) => d.mandatory).map((d) => d.docType);

    const uploadedDocTypes = new Set<string>();
    processing_documents.forEach((pd: any) => pd.document && uploadedDocTypes.add(pd.document.docType));
    candidateDocuments.forEach((d: any) => d.docType && uploadedDocTypes.add(d.docType));

    const uploadedCount = uploadedDocTypes.size;
    const verifiedCount = processing_documents.filter((pd: any) => pd.verification && pd.verification.status === 'verified').length;
    const missingCount = mandatoryDocTypes.filter((docType) => !uploadedDocTypes.has(docType)).length;

    const isEmigrationCompleted = !!emigrationStep && emigrationStep.status === 'completed';

    const step = emigrationStep ? (() => { const { documents, ...rest } = emigrationStep as any; return rest; })() : null;

    return {
      isEmigrationCompleted,
      step,
      processingCandidate: {
        id: pc.id,
        processingStatus: pc.processingStatus,
        candidate: {
          id: pc.candidate?.id || null,
          firstName: pc.candidate?.firstName || null,
          lastName: pc.candidate?.lastName || null,
          email: pc.candidate?.email || null,
          mobileNumber: pc.candidate?.mobileNumber || null,
          countryCode: pc.candidate?.countryCode || null,
        },
        project: {
          id: pc.project?.id || null,
          title: pc.project?.title || null,
          countryCode: pc.project?.countryCode || null,
          description: pc.project?.description || null,
          clientId: pc.project?.clientId || null,
          teamId: pc.project?.teamId || null,
        },
        role: pc.role ? { id: pc.role.id, designation: pc.role.designation, roleCatalog: pc.role.roleCatalog || null } : null,
      },
      requiredDocuments,
      processing_documents,
      candidateDocuments,
      counts: {
        totalConfigured: requiredDocuments.length,
        totalMandatory: mandatoryDocTypes.length,
        uploadedCount,
        verifiedCount,
        missingCount,
      },
    };
  }

  async getCouncilRegistrationRequirements(processingCandidateId: string, docType?: string) {
    // Ensure steps exist
    await this.createStepsForProcessingCandidate(processingCandidateId);

    const pc = await this.prisma.processingCandidate.findUnique({
      where: { id: processingCandidateId },
      include: { candidate: true, project: true, role: { include: { roleCatalog: true } } },
    });
    if (!pc) throw new NotFoundException(`Processing candidate ${processingCandidateId} not found`);

    const country = pc.project?.countryCode || pc.candidate?.countryCode || null;

    const councilTemplate = await this.prisma.processingStepTemplate.findUnique({ where: { key: 'council_registration' } });
    if (!councilTemplate) throw new NotFoundException(`Council Registration step template not found`);

    const rules = await this.prisma.countryDocumentRequirement.findMany({
      where: {
        processingStepTemplateId: councilTemplate.id,
        countryCode: { in: country ? ['ALL', country] : ['ALL'] },
      },
    });

    // Merge rules: country wins
    const map: Record<string, any> = {};
    for (const r of rules) {
      if (!map[r.docType] || r.countryCode !== 'ALL') map[r.docType] = r;
    }

    let requiredDocuments = Object.values(map).map((r: any) => ({
      docType: r.docType,
      label: r.label,
      mandatory: r.mandatory,
      source: r.countryCode,
    }));

    const activeDocTypes = requiredDocuments.map((d) => d.docType);

    if (docType) {
      requiredDocuments = requiredDocuments.filter((d) => d.docType === docType);
    }

    const councilStep = await this.prisma.processingStep.findFirst({
      where: { processingCandidateId, templateId: councilTemplate.id },
      include: {
        template: true,
        documents: {
          include: {
            candidateProjectDocumentVerification: {
              include: {
                document: true,
                roleCatalog: true,
                candidateProjectMap: {
                  include: {
                    project: true,
                    roleNeeded: {
                      select: {
                        id: true,
                        projectId: true,
                        roleCatalogId: true,
                        designation: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const filterDocTypes = docType ? [docType] : activeDocTypes;

    let processing_documents = (councilStep?.documents || [])
      .map((d: any) => {
        const ver = d.candidateProjectDocumentVerification;
        return {
          processingStepDocumentId: d.id,
          processingDocument: {
            id: d.id,
            status: d.status,
            notes: d.notes || null,
            uploadedBy: d.uploadedBy || null,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          },
          verification: ver
            ? {
                id: ver.id,
                status: ver.status,
                notes: ver.notes || null,
                rejectionReason: ver.rejectionReason || null,
                resubmissionRequested: ver.resubmissionRequested || false,
                roleCatalog: ver.roleCatalog || null,
                candidateProjectMap: ver.candidateProjectMap || null,
                createdAt: ver.createdAt,
                updatedAt: ver.updatedAt,
              }
            : null,
          document: ver?.document || null,
        };
      })
      .filter((u) => u.document && filterDocTypes.includes(u.document.docType));

    const candidateDocuments = await this.prisma.document.findMany({
      where: {
        candidateId: pc.candidate.id,
        isDeleted: false,
        docType: { in: filterDocTypes },
        OR: [
          { roleCatalogId: pc.role?.roleCatalogId || null },
          { roleCatalogId: null },
        ],
      },
      include: {
        verifications: {
          include: {
            candidateProjectMap: {
              include: {
                project: true,
                roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } },
              },
            },
            roleCatalog: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mandatoryDocTypes = requiredDocuments
      .filter((d) => d.mandatory)
      .map((d) => d.docType);

    const uploadedDocTypes = new Set<string>();
    processing_documents.forEach((pd: any) => {
      if (pd.document?.docType) uploadedDocTypes.add(pd.document.docType);
    });
    candidateDocuments.forEach((d: any) => {
      if (d.docType) uploadedDocTypes.add(d.docType);
    });

    const uploadedCount = uploadedDocTypes.size;

    const verifiedCount = processing_documents.filter(
      (pd: any) => pd.verification && pd.verification.status === 'verified',
    ).length;

    const missingCount = mandatoryDocTypes.filter(
      (docType) => !uploadedDocTypes.has(docType),
    ).length;

    const isCouncilRegistrationCompleted = !!councilStep && councilStep.status === 'completed';

    const step = councilStep
      ? (() => {
          const { documents, ...rest } = councilStep as any;
          return rest;
        })()
      : null;

    return {
      isCouncilRegistrationCompleted,
      step,
      processingCandidate: {
        id: pc.id,
        processingStatus: pc.processingStatus,
        candidate: {
          id: pc.candidate?.id || null,
          firstName: pc.candidate?.firstName || null,
          lastName: pc.candidate?.lastName || null,
          email: pc.candidate?.email || null,
          mobileNumber: pc.candidate?.mobileNumber || null,
          countryCode: pc.candidate?.countryCode || null,
        },
        project: {
          id: pc.project?.id || null,
          title: pc.project?.title || null,
          countryCode: pc.project?.countryCode || null,
          description: pc.project?.description || null,
          clientId: pc.project?.clientId || null,
          teamId: pc.project?.teamId || null,
        },
        role: pc.role
          ? {
              id: pc.role.id,
              designation: pc.role.designation,
              roleCatalog: pc.role.roleCatalog || null,
            }
          : null,
      },
      requiredDocuments,
      processing_documents,
      candidateDocuments,
      counts: {
        totalConfigured: requiredDocuments.length,
        totalMandatory: mandatoryDocTypes.length,
        uploadedCount,
        verifiedCount,
        missingCount,
      },
    };
  }

  async getDocumentAttestationRequirements(processingCandidateId: string, docType?: string) {
    // Ensure steps exist
    await this.createStepsForProcessingCandidate(processingCandidateId);

    const pc = await this.prisma.processingCandidate.findUnique({
      where: { id: processingCandidateId },
      include: { candidate: true, project: true, role: { include: { roleCatalog: true } } },
    });
    if (!pc) throw new NotFoundException(`Processing candidate ${processingCandidateId} not found`);

    const country = pc.project?.countryCode || pc.candidate?.countryCode || null;

    const attestationTemplate = await this.prisma.processingStepTemplate.findUnique({ where: { key: 'document_attestation' } });
    if (!attestationTemplate) throw new NotFoundException(`Document Attestation step template not found`);

    const rules = await this.prisma.countryDocumentRequirement.findMany({
      where: {
        processingStepTemplateId: attestationTemplate.id,
        countryCode: { in: country ? ['ALL', country] : ['ALL'] },
      },
    });

    // Merge rules: country wins
    const map: Record<string, any> = {};
    for (const r of rules) {
      if (!map[r.docType] || r.countryCode !== 'ALL') map[r.docType] = r;
    }

    let requiredDocuments = Object.values(map).map((r: any) => ({
      docType: r.docType,
      label: r.label,
      mandatory: r.mandatory,
      source: r.countryCode,
    }));

    const activeDocTypes = requiredDocuments.map((d) => d.docType);

    if (docType) {
      requiredDocuments = requiredDocuments.filter((d) => d.docType === docType);
    }

    const attestationStep = await this.prisma.processingStep.findFirst({
      where: { processingCandidateId, templateId: attestationTemplate.id },
      include: {
        template: true,
        documents: {
          include: {
            candidateProjectDocumentVerification: {
              include: {
                document: true,
                roleCatalog: true,
                candidateProjectMap: {
                  include: {
                    project: true,
                    roleNeeded: {
                      select: {
                        id: true,
                        projectId: true,
                        roleCatalogId: true,
                        designation: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const filterDocTypes = docType ? [docType] : activeDocTypes;

    let processing_documents = (attestationStep?.documents || [])
      .map((d: any) => {
        const ver = d.candidateProjectDocumentVerification;
        return {
          processingStepDocumentId: d.id,
          processingDocument: {
            id: d.id,
            status: d.status,
            notes: d.notes || null,
            uploadedBy: d.uploadedBy || null,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          },
          verification: ver
            ? {
                id: ver.id,
                status: ver.status,
                notes: ver.notes || null,
                rejectionReason: ver.rejectionReason || null,
                resubmissionRequested: ver.resubmissionRequested || false,
                roleCatalog: ver.roleCatalog || null,
                candidateProjectMap: ver.candidateProjectMap || null,
                createdAt: ver.createdAt,
                updatedAt: ver.updatedAt,
              }
            : null,
          document: ver?.document || null,
        };
      })
      .filter((u) => u.document && filterDocTypes.includes(u.document.docType));

    const candidateDocuments = await this.prisma.document.findMany({
      where: {
        candidateId: pc.candidate.id,
        isDeleted: false,
        docType: { in: filterDocTypes },
        OR: [
          { roleCatalogId: pc.role?.roleCatalogId || null },
          { roleCatalogId: null },
        ],
      },
      include: {
        verifications: {
          include: {
            candidateProjectMap: {
              include: {
                project: true,
                roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } },
              },
            },
            roleCatalog: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mandatoryDocTypes = requiredDocuments
      .filter((d) => d.mandatory)
      .map((d) => d.docType);

    const uploadedDocTypes = new Set<string>();
    processing_documents.forEach((pd: any) => {
      if (pd.document?.docType) uploadedDocTypes.add(pd.document.docType);
    });
    candidateDocuments.forEach((d: any) => {
      if (d.docType) uploadedDocTypes.add(d.docType);
    });

    const uploadedCount = uploadedDocTypes.size;

    const verifiedCount = processing_documents.filter(
      (pd: any) => pd.verification && pd.verification.status === 'verified',
    ).length;

    const missingCount = mandatoryDocTypes.filter(
      (docType) => !uploadedDocTypes.has(docType),
    ).length;

    const isDocumentAttestationCompleted = !!attestationStep && attestationStep.status === 'completed';

    const step = attestationStep
      ? (() => {
          const { documents, ...rest } = attestationStep as any;
          return rest;
        })()
      : null;

    return {
      isDocumentAttestationCompleted,
      step,
      processingCandidate: {
        id: pc.id,
        processingStatus: pc.processingStatus,
        candidate: {
          id: pc.candidate?.id || null,
          firstName: pc.candidate?.firstName || null,
          lastName: pc.candidate?.lastName || null,
          email: pc.candidate?.email || null,
          mobileNumber: pc.candidate?.mobileNumber || null,
          countryCode: pc.candidate?.countryCode || null,
        },
        project: {
          id: pc.project?.id || null,
          title: pc.project?.title || null,
          countryCode: pc.project?.countryCode || null,
          description: pc.project?.description || null,
          clientId: pc.project?.clientId || null,
          teamId: pc.project?.teamId || null,
        },
        role: pc.role
          ? {
              id: pc.role.id,
              designation: pc.role.designation,
              roleCatalog: pc.role.roleCatalog || null,
            }
          : null,
      },
      requiredDocuments,
      processing_documents,
      candidateDocuments,
      counts: {
        totalConfigured: requiredDocuments.length,
        totalMandatory: mandatoryDocTypes.length,
        uploadedCount,
        verifiedCount,
        missingCount,
      },
    };
  }

  async getMedicalRequirements(processingCandidateId: string, docType?: string) {
    // Ensure steps exist
    await this.createStepsForProcessingCandidate(processingCandidateId);

    const pc = await this.prisma.processingCandidate.findUnique({
      where: { id: processingCandidateId },
      include: { candidate: true, project: true, role: { include: { roleCatalog: true } } },
    });
    if (!pc) throw new NotFoundException(`Processing candidate ${processingCandidateId} not found`);

    const country = pc.project?.countryCode || pc.candidate?.countryCode || null;

    const medicalTemplate = await this.prisma.processingStepTemplate.findUnique({ where: { key: 'medical' } });
    if (!medicalTemplate) throw new NotFoundException(`Medical step template not found`);

    const rules = await this.prisma.countryDocumentRequirement.findMany({
      where: {
        processingStepTemplateId: medicalTemplate.id,
        countryCode: { in: country ? ['ALL', country] : ['ALL'] },
      },
    });

    // Merge rules: country wins
    const map: Record<string, any> = {};
    for (const r of rules) {
      if (!map[r.docType] || r.countryCode !== 'ALL') map[r.docType] = r;
    }

    let requiredDocuments = Object.values(map).map((r: any) => ({
      docType: r.docType,
      label: r.label,
      mandatory: r.mandatory,
      source: r.countryCode,
    }));

    const activeDocTypes = requiredDocuments.map((d) => d.docType);

    if (docType) {
      requiredDocuments = requiredDocuments.filter((d) => d.docType === docType);
    }

    const medicalStep = await this.prisma.processingStep.findFirst({
      where: { processingCandidateId, templateId: medicalTemplate.id },
      include: {
        template: true,
        documents: {
          include: {
            candidateProjectDocumentVerification: {
              include: {
                document: true,
                roleCatalog: true,
                candidateProjectMap: {
                  include: {
                    project: true,
                    roleNeeded: {
                      select: {
                        id: true,
                        projectId: true,
                        roleCatalogId: true,
                        designation: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const filterDocTypes = docType ? [docType] : activeDocTypes;

    let processing_documents = (medicalStep?.documents || [])
      .map((d: any) => {
        const ver = d.candidateProjectDocumentVerification;
        return {
          processingStepDocumentId: d.id,
          processingDocument: {
            id: d.id,
            status: d.status,
            notes: d.notes || null,
            uploadedBy: d.uploadedBy || null,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          },
          verification: ver
            ? {
                id: ver.id,
                status: ver.status,
                notes: ver.notes || null,
                rejectionReason: ver.rejectionReason || null,
                resubmissionRequested: ver.resubmissionRequested || false,
                roleCatalog: ver.roleCatalog || null,
                candidateProjectMap: ver.candidateProjectMap || null,
                createdAt: ver.createdAt,
                updatedAt: ver.updatedAt,
              }
            : null,
          document: ver?.document || null,
        };
      })
      .filter((u) => u.document && filterDocTypes.includes(u.document.docType));

    const candidateDocuments = await this.prisma.document.findMany({
      where: {
        candidateId: pc.candidate.id,
        isDeleted: false,
        docType: { in: filterDocTypes },
        OR: [
          { roleCatalogId: pc.role?.roleCatalogId || null },
          { roleCatalogId: null },
        ],
      },
      include: {
        verifications: {
          include: {
            candidateProjectMap: {
              include: {
                project: true,
                roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } },
              },
            },
            roleCatalog: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mandatoryDocTypes = requiredDocuments
      .filter((d) => d.mandatory)
      .map((d) => d.docType);

    const uploadedDocTypes = new Set<string>();
    processing_documents.forEach((pd: any) => {
      if (pd.document?.docType) uploadedDocTypes.add(pd.document.docType);
    });
    candidateDocuments.forEach((d: any) => {
      if (d.docType) uploadedDocTypes.add(d.docType);
    });

    const uploadedCount = uploadedDocTypes.size;

    const verifiedCount = processing_documents.filter(
      (pd: any) => pd.verification && pd.verification.status === 'verified',
    ).length;

    const missingCount = mandatoryDocTypes.filter(
      (docType) => !uploadedDocTypes.has(docType),
    ).length;

    const isMedicalCompleted = !!medicalStep && medicalStep.status === 'completed';

    const step = medicalStep
      ? (() => {
          const { documents, ...rest } = medicalStep as any;
          return rest;
        })()
      : null;

    return {
      isMedicalCompleted,
      step,
      processingCandidate: {
        id: pc.id,
        processingStatus: pc.processingStatus,
        candidate: {
          id: pc.candidate?.id || null,
          firstName: pc.candidate?.firstName || null,
          lastName: pc.candidate?.lastName || null,
          email: pc.candidate?.email || null,
          mobileNumber: pc.candidate?.mobileNumber || null,
          countryCode: pc.candidate?.countryCode || null,
        },
        project: {
          id: pc.project?.id || null,
          title: pc.project?.title || null,
          countryCode: pc.project?.countryCode || null,
          description: pc.project?.description || null,
          clientId: pc.project?.clientId || null,
          teamId: pc.project?.teamId || null,
        },
        role: pc.role
          ? {
              id: pc.role.id,
              designation: pc.role.designation,
              roleCatalog: pc.role.roleCatalog || null,
            }
          : null,
      },
      requiredDocuments,
      processing_documents,
      candidateDocuments,
      counts: {
        totalConfigured: requiredDocuments.length,
        totalMandatory: mandatoryDocTypes.length,
        uploadedCount,
        verifiedCount,
        missingCount,
      },
    };
  }

  // --- Biometric requirements (HRD-shaped response) ---
  async getBiometricRequirements(processingCandidateId: string, docType?: string) {
    // Ensure steps exist
    await this.createStepsForProcessingCandidate(processingCandidateId);

    const pc = await this.prisma.processingCandidate.findUnique({
      where: { id: processingCandidateId },
      include: { candidate: true, project: true, role: { include: { roleCatalog: true } } },
    });
    if (!pc) throw new NotFoundException(`Processing candidate ${processingCandidateId} not found`);

    const country = pc.project?.countryCode || pc.candidate?.countryCode || null;

    const biometricTemplate = await this.prisma.processingStepTemplate.findUnique({ where: { key: 'biometrics' } });
    if (!biometricTemplate) throw new NotFoundException(`Biometric step template not found`);

    const rules = await this.prisma.countryDocumentRequirement.findMany({
      where: {
        processingStepTemplateId: biometricTemplate.id,
        countryCode: { in: country ? ['ALL', country] : ['ALL'] },
      },
    });

    // Merge rules: country wins
    const map: Record<string, any> = {};
    for (const r of rules) {
      if (!map[r.docType] || r.countryCode !== 'ALL') map[r.docType] = r;
    }

    let requiredDocuments = Object.values(map).map((r: any) => ({
      docType: r.docType,
      label: r.label,
      mandatory: r.mandatory,
      source: r.countryCode,
    }));

    const activeDocTypes = requiredDocuments.map((d) => d.docType);

    if (docType) {
      requiredDocuments = requiredDocuments.filter((d) => d.docType === docType);
    }

    const biometricStep = await this.prisma.processingStep.findFirst({
      where: { processingCandidateId, templateId: biometricTemplate.id },
      include: {
        template: true,
        documents: {
          include: {
            candidateProjectDocumentVerification: {
              include: {
                document: true,
                roleCatalog: true,
                candidateProjectMap: {
                  include: {
                    project: true,
                    roleNeeded: {
                      select: {
                        id: true,
                        projectId: true,
                        roleCatalogId: true,
                        designation: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const filterDocTypes = docType ? [docType] : activeDocTypes;

    let processing_documents = (biometricStep?.documents || [])
      .map((d: any) => {
        const ver = d.candidateProjectDocumentVerification;
        return {
          processingStepDocumentId: d.id,
          processingDocument: {
            id: d.id,
            status: d.status,
            notes: d.notes || null,
            uploadedBy: d.uploadedBy || null,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          },
          verification: ver
            ? {
                id: ver.id,
                status: ver.status,
                notes: ver.notes || null,
                rejectionReason: ver.rejectionReason || null,
                resubmissionRequested: ver.resubmissionRequested || false,
                roleCatalog: ver.roleCatalog || null,
                candidateProjectMap: ver.candidateProjectMap || null,
                createdAt: ver.createdAt,
                updatedAt: ver.updatedAt,
              }
            : null,
          document: ver?.document || null,
        };
      })
      .filter((u) => u.document && filterDocTypes.includes(u.document.docType));

    const candidateDocuments = await this.prisma.document.findMany({
      where: {
        candidateId: pc.candidate.id,
        isDeleted: false,
        docType: { in: filterDocTypes },
        OR: [
          { roleCatalogId: pc.role?.roleCatalogId || null },
          { roleCatalogId: null },
        ],
      },
      include: {
        verifications: {
          include: {
            candidateProjectMap: {
              include: {
                project: true,
                roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } },
              },
            },
            roleCatalog: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mandatoryDocTypes = requiredDocuments
      .filter((d) => d.mandatory)
      .map((d) => d.docType);

    const uploadedDocTypes = new Set<string>();
    processing_documents.forEach((pd: any) => {
      if (pd.document?.docType) uploadedDocTypes.add(pd.document.docType);
    });
    candidateDocuments.forEach((d: any) => {
      if (d.docType) uploadedDocTypes.add(d.docType);
    });

    const uploadedCount = uploadedDocTypes.size;

    const verifiedCount = processing_documents.filter(
      (pd: any) => pd.verification && pd.verification.status === 'verified',
    ).length;

    const missingCount = mandatoryDocTypes.filter(
      (docType) => !uploadedDocTypes.has(docType),
    ).length;

    const isBiometricCompleted = !!biometricStep && biometricStep.status === 'completed';

    const step = biometricStep
      ? (() => {
          const { documents, ...rest } = biometricStep as any;
          return rest;
        })()
      : null;

    return {
      isBiometricCompleted,
      step,
      processingCandidate: {
        id: pc.id,
        processingStatus: pc.processingStatus,
        candidate: {
          id: pc.candidate?.id || null,
          firstName: pc.candidate?.firstName || null,
          lastName: pc.candidate?.lastName || null,
          email: pc.candidate?.email || null,
          mobileNumber: pc.candidate?.mobileNumber || null,
          countryCode: pc.candidate?.countryCode || null,
        },
        project: {
          id: pc.project?.id || null,
          title: pc.project?.title || null,
          countryCode: pc.project?.countryCode || null,
          description: pc.project?.description || null,
          clientId: pc.project?.clientId || null,
          teamId: pc.project?.teamId || null,
        },
        role: pc.role
          ? {
              id: pc.role.id,
              designation: pc.role.designation,
              roleCatalog: pc.role.roleCatalog || null,
            }
          : null,
      },
      requiredDocuments,
      processing_documents,
      candidateDocuments,
      counts: {
        totalConfigured: requiredDocuments.length,
        totalMandatory: mandatoryDocTypes.length,
        uploadedCount,
        verifiedCount,
        missingCount,
      },
    };
  }

  async getEligibilityRequirements(processingCandidateId: string, docType?: string) {
    // Ensure steps exist
    await this.createStepsForProcessingCandidate(processingCandidateId);

    const pc = await this.prisma.processingCandidate.findUnique({
      where: { id: processingCandidateId },
      include: { candidate: true, project: true, role: { include: { roleCatalog: true } } },
    });
    if (!pc) throw new NotFoundException(`Processing candidate ${processingCandidateId} not found`);

    const country = pc.project?.countryCode || pc.candidate?.countryCode || null;

    const eligibilityTemplate = await this.prisma.processingStepTemplate.findUnique({ where: { key: 'eligibility' } });
    if (!eligibilityTemplate) throw new NotFoundException(`Eligibility step template not found`);

    const rules = await this.prisma.countryDocumentRequirement.findMany({
      where: {
        processingStepTemplateId: eligibilityTemplate.id,
        countryCode: { in: country ? ['ALL', country] : ['ALL'] },
      },
    });

    // Merge rules (country overrides ALL)
    const map: Record<string, any> = {};
    for (const r of rules) {
      if (!map[r.docType] || r.countryCode !== 'ALL') map[r.docType] = r;
    }

    let requiredDocuments = Object.values(map).map((r: any) => ({
      docType: r.docType,
      label: r.label,
      mandatory: r.mandatory,
      source: r.countryCode,
    }));

    // Use DocTypes from rules
    const activeDocTypes = requiredDocuments.map((d) => d.docType);

    if (docType) {
      requiredDocuments = requiredDocuments.filter((d) => d.docType === docType);
    }

    // Find Eligibility processing step with rich includes
    const elStep = await this.prisma.processingStep.findFirst({
      where: { processingCandidateId, templateId: eligibilityTemplate.id },
      include: {
        template: true,
        documents: {
          include: {
            candidateProjectDocumentVerification: {
              include: {
                document: true,
                roleCatalog: true,
                candidateProjectMap: {
                  include: {
                    project: true,
                    roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const filterDocTypes = docType ? [docType] : activeDocTypes;

    let processing_documents = (elStep?.documents || [])
      .map((d: any) => ({
        id: d.id,
        uploadedBy: d.uploadedBy,
        status: d.status,
        uploadedAt: d.createdAt,
        verification: d.candidateProjectDocumentVerification || null,
      }))
      .filter((u) => u.verification && filterDocTypes.includes(u.verification.document?.docType));

    const candidateDocuments = await this.prisma.document.findMany({
      where: {
        candidateId: pc.candidate.id,
        isDeleted: false,
        docType: { in: filterDocTypes },
        OR: [ { roleCatalogId: pc.role?.roleCatalogId || null }, { roleCatalogId: null } ],
      },
      include: {
        verifications: {
          include: {
            candidateProjectMap: { include: { project: true, roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } } } },
            roleCatalog: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mandatoryDocTypes = requiredDocuments.filter((d) => d.mandatory).map((d) => d.docType);

    const uploadedDocTypes = new Set<string>();
    processing_documents.forEach((pd: any) => { if (pd.verification && pd.verification.document) uploadedDocTypes.add(pd.verification.document.docType); });
    candidateDocuments.forEach((d: any) => { if (d.docType) uploadedDocTypes.add(d.docType); });

    const uploadedCount = uploadedDocTypes.size;
    const verifiedCount = processing_documents.filter((pd: any) => pd.verification && pd.verification.status === 'verified').length;
    const missingCount = mandatoryDocTypes.filter((docType) => !uploadedDocTypes.has(docType)).length;

    const isEligibilityCompleted = !!elStep && elStep.status === 'completed';

    const step = elStep ? (() => { const { documents, ...rest } = elStep as any; return rest; })() : null;

    return {
      isEligibilityCompleted,
      step,
      processingCandidate: {
        id: pc.id,
        processingStatus: pc.processingStatus,
        candidate: {
          id: pc.candidate?.id || null,
          firstName: pc.candidate?.firstName || null,
          lastName: pc.candidate?.lastName || null,
          email: pc.candidate?.email || null,
          mobileNumber: pc.candidate?.mobileNumber || null,
          countryCode: pc.candidate?.countryCode || null,
        },
        project: {
          id: pc.project?.id || null,
          title: pc.project?.title || null,
          countryCode: pc.project?.countryCode || null,
          description: pc.project?.description || null,
          clientId: pc.project?.clientId || null,
          teamId: pc.project?.teamId || null,
        },
        role: pc.role ? { id: pc.role.id, designation: pc.role.designation, roleCatalog: pc.role.roleCatalog || null } : null,
      },
      requiredDocuments,
      processing_documents,
      candidateDocuments,
      counts: {
        totalConfigured: requiredDocuments.length,
        totalMandatory: mandatoryDocTypes.length,
        uploadedCount,
        verifiedCount,
        missingCount,
      },
    };
  }

  
  // -----------------
  // Data Flow helpers & validation
  // -----------------
  async getDataFlowRequirements(processingCandidateId: string, docType?: string) {
    // Ensure steps exist
    await this.createStepsForProcessingCandidate(processingCandidateId);

    const pc = await this.prisma.processingCandidate.findUnique({
      where: { id: processingCandidateId },
      include: {
        candidate: true,
        project: true,
        role: { include: { roleCatalog: true } },
      },
    });
    if (!pc)
      throw new NotFoundException(
        `Processing candidate ${processingCandidateId} not found`,
      );

    const country = pc.project?.countryCode || pc.candidate?.countryCode || null;

    const dataFlowTemplate = await this.prisma.processingStepTemplate.findUnique({ where: { key: 'data_flow' } });
    if (!dataFlowTemplate) throw new NotFoundException(`Data Flow step template not found`);

    const rules = await this.prisma.countryDocumentRequirement.findMany({
      where: {
        processingStepTemplateId: dataFlowTemplate.id,
        countryCode: { in: country ? ['ALL', country] : ['ALL'] },
      },
    });

    // Merge rules: country wins
    const map: Record<string, any> = {};
    for (const r of rules) {
      if (!map[r.docType] || r.countryCode !== 'ALL') map[r.docType] = r;
    }

    let requiredDocuments = Object.values(map).map((r: any) => ({
      docType: r.docType,
      label: r.label,
      mandatory: r.mandatory,
      source: r.countryCode,
    }));

    // Use DocTypes from rules
    const activeDocTypes = requiredDocuments.map((d) => d.docType);

    if (docType) {
      requiredDocuments = requiredDocuments.filter((d) => d.docType === docType);
    }

    // Find Data Flow processing step with includes
    const dfStep = await this.prisma.processingStep.findFirst({
      where: { processingCandidateId, templateId: dataFlowTemplate.id },
      include: {
        template: true,
        documents: {
          include: {
            candidateProjectDocumentVerification: {
              include: {
                document: true,
                roleCatalog: true,
                candidateProjectMap: {
                  include: {
                    project: true,
                    roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const filterDocTypes = docType ? [docType] : activeDocTypes;

    let processing_documents = (dfStep?.documents || [])
      .map((d: any) => {
        const ver = d.candidateProjectDocumentVerification;
        return {
          processingStepDocumentId: d.id,
          processingDocument: {
            id: d.id,
            status: d.status,
            notes: d.notes || null,
            uploadedBy: d.uploadedBy || null,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          },
          verification: ver
            ? {
                id: ver.id,
                status: ver.status,
                notes: ver.notes || null,
                rejectionReason: ver.rejectionReason || null,
                resubmissionRequested: ver.resubmissionRequested || false,
                roleCatalog: ver.roleCatalog || null,
                candidateProjectMap: ver.candidateProjectMap || null,
                createdAt: ver.createdAt,
                updatedAt: ver.updatedAt,
              }
            : null,
          document: ver?.document || null,
        };
      })
      .filter((u) => u.document && filterDocTypes.includes(u.document.docType));

    const candidateDocuments = await this.prisma.document.findMany({
      where: {
        candidateId: pc.candidate.id,
        isDeleted: false,
        docType: { in: filterDocTypes },
        OR: [
          { roleCatalogId: pc.role?.roleCatalogId || null },
          { roleCatalogId: null },
        ],
      },
      include: {
        verifications: {
          include: {
            candidateProjectMap: {
              include: {
                project: true,
                roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } },
              },
            },
            roleCatalog: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mandatoryDocTypes = requiredDocuments
      .filter((d) => d.mandatory)
      .map((d) => d.docType);

    const uploadedDocTypes = new Set<string>();
    processing_documents.forEach((pd: any) => {
      if (pd.document?.docType) uploadedDocTypes.add(pd.document.docType);
    });
    candidateDocuments.forEach((d: any) => {
      if (d.docType) uploadedDocTypes.add(d.docType);
    });

    const uploadedCount = uploadedDocTypes.size;

    const verifiedCount = processing_documents.filter(
      (pd: any) => pd.verification && pd.verification.status === 'verified',
    ).length;

    const missingCount = mandatoryDocTypes.filter((docType) => !uploadedDocTypes.has(docType)).length;

    const isDataFlowCompleted = !!dfStep && dfStep.status === 'completed';

    const step = dfStep
      ? (() => {
          const { documents, ...rest } = dfStep as any;
          return rest;
        })()
      : null;

    return {
      isDataFlowCompleted,
      step,
      processingCandidate: {
        id: pc.id,
        processingStatus: pc.processingStatus,
        candidate: {
          id: pc.candidate?.id || null,
          firstName: pc.candidate?.firstName || null,
          lastName: pc.candidate?.lastName || null,
          email: pc.candidate?.email || null,
          mobileNumber: pc.candidate?.mobileNumber || null,
          countryCode: pc.candidate?.countryCode || null,
        },
        project: {
          id: pc.project?.id || null,
          title: pc.project?.title || null,
          countryCode: pc.project?.countryCode || null,
          description: pc.project?.description || null,
          clientId: pc.project?.clientId || null,
          teamId: pc.project?.teamId || null,
        },
        role: pc.role
          ? {
              id: pc.role.id,
              designation: pc.role.designation,
              roleCatalog: pc.role.roleCatalog || null,
            }
          : null,
      },
      requiredDocuments,
      processing_documents,
      candidateDocuments,
      counts: {
        totalConfigured: requiredDocuments.length,
        totalMandatory: mandatoryDocTypes.length,
        uploadedCount,
        verifiedCount,
        missingCount,
      },
    };
  }

  /**
   * Prometric helpers & requirements (mirrors HRD/Data Flow response shape)
   */
  async getPrometricRequirements(processingCandidateId: string, docType?: string) {
    await this.createStepsForProcessingCandidate(processingCandidateId);

    const pc = await this.prisma.processingCandidate.findUnique({
      where: { id: processingCandidateId },
      include: { candidate: true, project: true, role: { include: { roleCatalog: true } } },
    });
    if (!pc) throw new NotFoundException(`Processing candidate ${processingCandidateId} not found`);

    const country = pc.project?.countryCode || pc.candidate?.countryCode || null;

    const prometricTemplate = await this.prisma.processingStepTemplate.findUnique({ where: { key: 'prometric' } });
    if (!prometricTemplate) throw new NotFoundException(`Prometric step template not found`);

    const rules = await this.prisma.countryDocumentRequirement.findMany({
      where: { processingStepTemplateId: prometricTemplate.id, countryCode: { in: country ? ['ALL', country] : ['ALL'] } },
    });

    const map: Record<string, any> = {};
    for (const r of rules) {
      if (!map[r.docType] || r.countryCode !== 'ALL') map[r.docType] = r;
    }

    let requiredDocuments = Object.values(map).map((r: any) => ({ docType: r.docType, label: r.label, mandatory: r.mandatory, source: r.countryCode }));
    const activeDocTypes = requiredDocuments.map((d) => d.docType);
    if (docType) requiredDocuments = requiredDocuments.filter((d) => d.docType === docType);

    const prometricStep = await this.prisma.processingStep.findFirst({
      where: { processingCandidateId, templateId: prometricTemplate.id },
      include: {
        template: true,
        documents: {
          include: {
            candidateProjectDocumentVerification: {
              include: { document: true, roleCatalog: true, candidateProjectMap: { include: { project: true, roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } } } } },
            },
          },
        },
      },
    });

    const filterDocTypes = docType ? [docType] : activeDocTypes;

    const processing_documents = (prometricStep?.documents || [])
      .map((d: any) => {
        const ver = d.candidateProjectDocumentVerification;
        return {
          processingStepDocumentId: d.id,
          processingDocument: { id: d.id, status: d.status, notes: d.notes || null, uploadedBy: d.uploadedBy || null, createdAt: d.createdAt, updatedAt: d.updatedAt },
          verification: ver ? { id: ver.id, status: ver.status, notes: ver.notes || null, rejectionReason: ver.rejectionReason || null, resubmissionRequested: ver.resubmissionRequested || false, roleCatalog: ver.roleCatalog || null, candidateProjectMap: ver.candidateProjectMap || null, createdAt: ver.createdAt, updatedAt: ver.updatedAt } : null,
          document: ver?.document || null,
        };
      })
      .filter((u) => u.document && filterDocTypes.includes(u.document.docType));

    const candidateDocuments = await this.prisma.document.findMany({
      where: {
        candidateId: pc.candidate.id,
        isDeleted: false,
        docType: { in: filterDocTypes },
        OR: [{ roleCatalogId: pc.role?.roleCatalogId || null }, { roleCatalogId: null }],
      },
      include: { verifications: { include: { candidateProjectMap: { include: { project: true, roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } } } }, roleCatalog: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const mandatoryDocTypes = requiredDocuments.filter((d) => d.mandatory).map((d) => d.docType);
    const uploadedDocTypes = new Set<string>();
    processing_documents.forEach((pd: any) => { if (pd.document?.docType) uploadedDocTypes.add(pd.document.docType); });
    candidateDocuments.forEach((d: any) => { if (d.docType) uploadedDocTypes.add(d.docType); });

    const uploadedCount = uploadedDocTypes.size;
    const verifiedCount = processing_documents.filter((pd: any) => pd.verification && pd.verification.status === 'verified').length;
    const missingCount = mandatoryDocTypes.filter((docType) => !uploadedDocTypes.has(docType)).length;

    const isPrometricCompleted = !!prometricStep && prometricStep.status === 'completed';
    const step = prometricStep ? (() => { const { documents, ...rest } = prometricStep as any; return rest; })() : null;

    return {
      isPrometricCompleted,
      step,
      processingCandidate: {
        id: pc.id,
        processingStatus: pc.processingStatus,
        candidate: { id: pc.candidate?.id || null, firstName: pc.candidate?.firstName || null, lastName: pc.candidate?.lastName || null, email: pc.candidate?.email || null, mobileNumber: pc.candidate?.mobileNumber || null, countryCode: pc.candidate?.countryCode || null },
        project: { id: pc.project?.id || null, title: pc.project?.title || null, countryCode: pc.project?.countryCode || null, description: pc.project?.description || null, clientId: pc.project?.clientId || null, teamId: pc.project?.teamId || null },
        role: pc.role ? { id: pc.role.id, designation: pc.role.designation, roleCatalog: pc.role.roleCatalog || null } : null,
      },
      requiredDocuments,
      processing_documents,
      candidateDocuments,
      counts: { totalConfigured: requiredDocuments.length, totalMandatory: mandatoryDocTypes.length, uploadedCount, verifiedCount, missingCount },
    };
  }

  /**
   * Ticket requirements (HRD-shaped response)
   * - Merges global ('ALL') + country rules for processingStepTemplate key = 'ticket'
   * - Returns the same response shape as getHrdRequirements so frontend can reuse HRD UI
   */
  async getTicketRequirements(processingCandidateId: string, docType?: string) {
    // Ensure steps exist
    await this.createStepsForProcessingCandidate(processingCandidateId);

    const pc = await this.prisma.processingCandidate.findUnique({
      where: { id: processingCandidateId },
      include: { candidate: true, project: true, role: { include: { roleCatalog: true } } },
    });
    if (!pc) throw new NotFoundException(`Processing candidate ${processingCandidateId} not found`);

    const country = pc.project?.countryCode || pc.candidate?.countryCode || null;

    const ticketTemplate = await this.prisma.processingStepTemplate.findUnique({ where: { key: 'ticket' } });
    if (!ticketTemplate) throw new NotFoundException(`Ticket step template not found`);

    const rules = await this.prisma.countryDocumentRequirement.findMany({
      where: {
        processingStepTemplateId: ticketTemplate.id,
        countryCode: { in: country ? ['ALL', country] : ['ALL'] },
      },
    });

    // Merge rules: country wins
    const map: Record<string, any> = {};
    for (const r of rules) {
      if (!map[r.docType] || r.countryCode !== 'ALL') map[r.docType] = r;
    }

    let requiredDocuments = Object.values(map).map((r: any) => ({ docType: r.docType, label: r.label, mandatory: r.mandatory, source: r.countryCode }));
    const activeDocTypes = requiredDocuments.map((d) => d.docType);
    if (docType) requiredDocuments = requiredDocuments.filter((d) => d.docType === docType);

    const ticketStep = await this.prisma.processingStep.findFirst({
      where: { processingCandidateId, templateId: ticketTemplate.id },
      include: {
        template: true,
        documents: {
          include: {
            candidateProjectDocumentVerification: {
              include: {
                document: true,
                roleCatalog: true,
                candidateProjectMap: {
                  include: {
                    project: true,
                    roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const filterDocTypes = docType ? [docType] : activeDocTypes;

    const processing_documents = (ticketStep?.documents || [])
      .map((d: any) => ({
        id: d.id,
        processingStepId: d.processingStepId,
        uploadedAt: d.createdAt,
        documentId: d.candidateProjectDocumentVerification?.documentId || null,
        verification: d.candidateProjectDocumentVerification || null,
        document: d.candidateProjectDocumentVerification?.document || null,
      }))
      .filter((u) => u.document && filterDocTypes.includes(u.document.docType));

    const candidateDocuments = await this.prisma.document.findMany({
      where: {
        candidateId: pc.candidate.id,
        isDeleted: false,
        docType: { in: filterDocTypes },
        OR: [{ roleCatalogId: pc.role?.roleCatalogId || null }, { roleCatalogId: null }],
      },
      include: {
        verifications: {
          include: {
            candidateProjectMap: {
              include: {
                project: true,
                roleNeeded: { select: { id: true, projectId: true, roleCatalogId: true, designation: true } },
              },
            },
            roleCatalog: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mandatoryDocTypes = requiredDocuments.filter((d) => d.mandatory).map((d) => d.docType);
    const uploadedDocTypes = new Set<string>();
    processing_documents.forEach((pd: any) => pd.document && uploadedDocTypes.add(pd.document.docType));
    candidateDocuments.forEach((d: any) => d.docType && uploadedDocTypes.add(d.docType));

    const uploadedCount = uploadedDocTypes.size;
    const verifiedCount = processing_documents.filter((pd: any) => pd.verification && pd.verification.status === 'verified').length;
    const missingCount = mandatoryDocTypes.filter((docType) => !uploadedDocTypes.has(docType)).length;

    const isTicketCompleted = !!ticketStep && ticketStep.status === 'completed';

    const step = ticketStep ? (() => { const { documents, ...rest } = ticketStep as any; return rest; })() : null;

    return {
      isTicketCompleted,
      step,
      processingCandidate: {
        id: pc.id,
        processingStatus: pc.processingStatus,
        candidate: { id: pc.candidate?.id || null, firstName: pc.candidate?.firstName || null, lastName: pc.candidate?.lastName || null, email: pc.candidate?.email || null, mobileNumber: pc.candidate?.mobileNumber || null, countryCode: pc.candidate?.countryCode || null },
        project: { id: pc.project?.id || null, title: pc.project?.title || null, countryCode: pc.project?.countryCode || null, description: pc.project?.description || null, clientId: pc.project?.clientId || null, teamId: pc.project?.teamId || null },
        role: pc.role ? { id: pc.role.id, designation: pc.role.designation, roleCatalog: pc.role.roleCatalog || null } : null,
      },
      requiredDocuments,
      processing_documents,
      candidateDocuments,
      counts: { totalConfigured: requiredDocuments.length, totalMandatory: mandatoryDocTypes.length, uploadedCount, verifiedCount, missingCount },
    };
  }

  async updateProcessingStep(stepId: string, data: any, userId: string) {
    // Allowed updates: status, assignedTo, rejectionReason, dueDate
    const { status, assignedTo, rejectionReason, dueDate } = data;

    const step = await this.prisma.processingStep.findUnique({
      where: { id: stepId },
      include: { template: true, processingCandidate: true },
    });
    if (!step) throw new NotFoundException('Processing step not found');

    if (status === 'completed') {
      return this.completeProcessingStep(stepId, userId);
    }

    const updates: any = {};
    if (status) {
      updates.status = status;
      if (status === 'in_progress') updates.startedAt = new Date();
      if (status === 'rejected') updates.rejectionReason = rejectionReason || null;
    }
    if (assignedTo) updates.assignedTo = assignedTo;
    if (dueDate) updates.dueDate = new Date(dueDate);

    await this.prisma.$transaction(async (tx) => {
      await tx.processingStep.update({ where: { id: stepId }, data: updates });

      // Add processing history entry
      await tx.processingHistory.create({
        data: {
          processingCandidateId: step.processingCandidateId,
          status: status || step.status,
          step: step.template.key,
          changedById: userId,
          notes: JSON.stringify({
            action: 'update_step',
            details: { status, assignedTo, rejectionReason },
          }),
        },
      });
    });

    return { success: true };
  }

  /**
   * Set or update the submittedAt timestamp for a processing step (candidate submission)
   * Only updates the submittedAt field (no status changes)
   */
  async submitProcessingStepDate(stepId: string, data: any, userId: string) {
    const { submittedAt } = data || {};

    const step = await this.prisma.processingStep.findUnique({ where: { id: stepId }, include: { template: true, processingCandidate: true } });
    if (!step) throw new NotFoundException('Processing step not found');

    const newSubmittedAt = submittedAt ? new Date(submittedAt) : new Date();

    await this.prisma.$transaction(async (tx) => {
      // Update submittedAt and set step to in_progress (unless final)
      const updates: any = { submittedAt: newSubmittedAt };
      if (!['completed', 'rejected'].includes(step.status) && step.status !== 'in_progress') {
        updates.status = 'in_progress';
        updates.startedAt = step.startedAt || new Date();
      }

      await tx.processingStep.update({ where: { id: stepId }, data: updates });

      // Find recruiter from candidate_projects (to attach to history) if available
      let recruiterId: string | undefined = undefined;
      try {
        const cp = await tx.candidateProjects.findFirst({
          where: {
            candidateId: step.processingCandidate?.candidateId,
            projectId: step.processingCandidate?.projectId,
            roleNeededId: step.processingCandidate?.roleNeededId,
          },
        });
        if (cp && cp.recruiterId) recruiterId = cp.recruiterId;
      } catch (err) {
        // ignore lookup errors
      }

      // determine action text
      const action = step.submittedAt ? 'changed' : 'submitted';

      // create processing history entry — record new status (in_progress if we set it)
      await tx.processingHistory.create({
        data: {
          processingCandidateId: step.processingCandidateId,
          status: updates.status || step.status,
          step: step.template.key,
          changedById: userId,
          recruiterId: recruiterId,
          notes: `${step.template?.key || 'Step'} submitted date ${action}`,
        },
      });
    });

    // If this is an HRD step, schedule HRD reminder
    try {
      if (step.template?.key === 'hrd') {
        await this.hrdRemindersService.createHRDReminder(step.id, step.processingCandidateId, step.assignedTo || null, newSubmittedAt);
      }
      if (step.template?.key === 'data_flow') {
        await this.dataFlowRemindersService.createDataFlowReminder(step.id, step.processingCandidateId, step.assignedTo || null, newSubmittedAt);
      }
    } catch (error) {
      this.logger.error(`Failed to schedule reminder for step ${stepId}:`, error);
    }

    return { success: true };
  }

  /**
   * Mark a processing step as completed and auto-advance to next step
   */
  async completeProcessingStep(stepId: string, userId: string, opts?: any) {
    const step = await this.prisma.processingStep.findUnique({
      where: { id: stepId },
      include: {
        template: true,
        processingCandidate: {
          include: { candidate: true, project: true },
        },
      },
    });

    if (!step) throw new NotFoundException('Processing step not found');
    if (step.status === 'completed') {
      return { success: true, message: 'Step already completed' };
    }

    // Prevent completing HRD step unless required documents are verified
    if (step.template?.key === 'hrd') {
      await this.ensureHrdCanComplete(step.id);
    }



    // MEDICAL step: require isMedicalPassed in request body; persist mofaNumber/isMedicalPassed
    // - If isMedicalPassed === false -> persist flags then cancel the processing (single cancellation path)
    if (step.template?.key === 'medical') {
      const isMedicalPassed = opts && typeof (opts as any).isMedicalPassed !== 'undefined' ? (opts as any).isMedicalPassed : undefined;
      const mofaNumber = opts && (opts as any).mofaNumber;
      const notes = opts && (opts as any).notes;

      if (typeof isMedicalPassed === 'undefined') {
        throw new BadRequestException('isMedicalPassed is required when completing a medical step');
      }

      if (isMedicalPassed === false) {
        // persist medical result then reuse cancellation routine
        // cast `data` to `any` because some environments may have an out-of-sync generated Prisma client
        await this.prisma.processingStep.update({
          where: { id: stepId },
          data: { mofaNumber: mofaNumber || null, isMedicalPassed: false },
        });

        const cancelReason = notes ? `Medical failed: ${String(notes).trim()}` : 'Medical failed';
        const cancelResult = await this.cancelProcessingStep(stepId, userId, cancelReason);
        return Object.assign({}, cancelResult, { isMedicalPassed: false });
      }

      // if passed -> allow normal completion flow but ensure flags will be persisted in the transaction below
    }



    const txResult = await this.prisma.$transaction(async (tx) => {
      // 1. Mark current step as completed
      // build typed update payload to satisfy Prisma's enum typing
      const updateData: any = {
        status: 'completed',
        completedAt: new Date(),
      };


      // Persist medical-specific fields when completing a medical step
      if (step.template?.key === 'medical' && opts) {
        if (typeof (opts as any).isMedicalPassed !== 'undefined') {
          updateData.isMedicalPassed = (opts as any).isMedicalPassed;
        }
        if ((opts as any).mofaNumber) {
          updateData.mofaNumber = (opts as any).mofaNumber;
        }
      }



      await tx.processingStep.update({
        where: { id: stepId },
        data: updateData,
      });

      // 2. Create history for step completion
      // Fetch the candidate project mapping to include recruiterId in history (if available)
      const candidateProjectMap = await tx.candidateProjects.findFirst({
        where: {
          candidateId: step.processingCandidate?.candidateId,
          projectId: step.processingCandidate?.projectId,
          roleNeededId: step.processingCandidate?.roleNeededId,
        },
      });
      const recruiterIdForHistory = candidateProjectMap?.recruiterId || undefined;

      let historyNotes = `Step "${step.template.label}" marked as completed`;

      // Append optional note provided by caller (keeps existing behaviour when none provided)
      if (opts && (opts as any).notes) {
        historyNotes = `${historyNotes} — ${String((opts as any).notes).trim()}`;
      }

      await tx.processingHistory.create({
        data: {
          processingCandidateId: step.processingCandidateId,
          status: 'completed',
          step: step.template.key,
          changedById: userId,
          recruiterId: recruiterIdForHistory,
          notes: historyNotes,
        },
      });

      // 3. Find next pending step for same processingCandidate
      const nextStep = await tx.processingStep.findFirst({
        where: {
          processingCandidateId: step.processingCandidateId,
          status: 'pending',
        },
        orderBy: { template: { order: 'asc' } },
        include: { template: true },
      });

      if (nextStep) {
        // 4. Advance to next step
        await tx.processingStep.update({
          where: { id: nextStep.id },
          data: {
            status: 'in_progress',
            startedAt: new Date(),
          },
        });

        // 5. Update ProcessingCandidate current step
        await tx.processingCandidate.update({
          where: { id: step.processingCandidateId },
          data: {
            step: nextStep.template.key,
            processingStatus: 'in_progress',
          },
        });

        // 6. Create history for moving to next step
        await tx.processingHistory.create({
          data: {
            processingCandidateId: step.processingCandidateId,
            status: 'in_progress',
            step: nextStep.template.key,
            changedById: userId,
            recruiterId: recruiterIdForHistory,
            notes: `Advanced to next step: ${nextStep.template.label}`,
          },
        });

        return {
          success: true,
          currentStep: step.template.key,
          nextStep: nextStep.template.key,
          processingStatus: 'in_progress',
        };
      } else {
        // 7. All steps completed -> mark processing candidate completed
        await tx.processingCandidate.update({
          where: { id: step.processingCandidateId },
          data: {
            processingStatus: 'completed',
            step: 'completed',
          },
        });

        // 8. Create history for overall completion
        await tx.processingHistory.create({
          data: {
            processingCandidateId: step.processingCandidateId,
            status: 'completed',
            step: 'completed',
            changedById: userId,
            recruiterId: recruiterIdForHistory,
            notes: 'All processing steps completed',
          },
        });

        return {
          success: true,
          currentStep: step.template.key,
          nextStep: null,
          processingStatus: 'completed',
        };
      }
    });

    // After transaction commit: if this was an HRD step, cancel HRD reminders
    try {
      if (step.template?.key === 'hrd') {
        await this.hrdRemindersService.cancelHRDRemindersForStep(stepId);
      }
      if (step.template?.key === 'data_flow') {
        await this.dataFlowRemindersService.cancelDataFlowRemindersForStep(stepId);
      }
    } catch (err) {
      this.logger.error(`Failed to cancel reminders after completing step ${stepId}:`, err);
    }

    return txResult;
  }

  /**
   * Cancel a processing step
   * Marks the step as cancelled and records history (includes recruiterId when available)
   */
  async cancelProcessingStep(stepId: string, userId: string, reason?: string) {
    const step = await this.prisma.processingStep.findUnique({
      where: { id: stepId },
      include: {
        template: true,
        processingCandidate: { include: { candidate: true, project: true } },
      },
    });

    if (!step) throw new NotFoundException('Processing step not found');
    if (step.status === 'cancelled') {
      return { success: true, message: 'Step already cancelled' };
    }

    const txResult = await this.prisma.$transaction(async (tx) => {
      // 1. Mark selected step as cancelled (store provided reason in rejectionReason)
      await tx.processingStep.update({
        where: { id: stepId },
        data: {
          status: 'cancelled',
          rejectionReason: reason || 'cancelled',
        },
      });

      // 2. Cancel all other pending/in-progress steps for this processing candidate
      await tx.processingStep.updateMany({
        where: {
          processingCandidateId: step.processingCandidateId,
          id: { not: stepId },
          status: { in: ['pending', 'in_progress'] },
        },
        data: {
          status: 'cancelled',
          rejectionReason: reason || 'cancelled',
        },
      });

      // 3. Update the ProcessingCandidate as cancelled
      await tx.processingCandidate.update({
        where: { id: step.processingCandidateId },
        data: {
          processingStatus: 'cancelled',
          step: 'cancelled',
        },
      });

      // Fetch candidateProjectMap to include recruiterId in history if present
      const candidateProjectMap = await tx.candidateProjects.findFirst({
        where: {
          candidateId: step.processingCandidate?.candidateId,
          projectId: step.processingCandidate?.projectId,
          roleNeededId: step.processingCandidate?.roleNeededId,
        },
      });
      const recruiterIdForHistory = candidateProjectMap?.recruiterId || undefined;

      // 4. Create history entry for the cancelled step
      const stepNotes = reason
        ? `Step "${step.template.label}" cancelled: ${reason}`
        : `Step "${step.template.label}" cancelled`;

      await tx.processingHistory.create({
        data: {
          processingCandidateId: step.processingCandidateId,
          status: 'cancelled',
          step: step.template.key,
          changedById: userId,
          recruiterId: recruiterIdForHistory,
          notes: stepNotes,
        },
      });

      // 5. Create overall processing cancellation history entry
      const overallNotes = reason
        ? `Processing cancelled due to step cancellation: ${reason}`
        : 'Processing cancelled due to step cancellation';

      await tx.processingHistory.create({
        data: {
          processingCandidateId: step.processingCandidateId,
          status: 'cancelled',
          step: 'cancelled',
          changedById: userId,
          recruiterId: recruiterIdForHistory,
          notes: overallNotes,
        },
      });

      return { success: true };
    });

    // After transaction: cancel reminders for this step and for any other steps belonging to the processingCandidate
    try {
      // cancel for the specific step (existing behaviour)
      if (step.template?.key === 'hrd') {
        await this.hrdRemindersService.cancelHRDRemindersForStep(stepId);
      }
      if (step.template?.key === 'data_flow') {
        await this.dataFlowRemindersService.cancelDataFlowRemindersForStep(stepId);
      }

      // cancel reminders for all steps of this processing candidate (if any)
      const otherSteps = await this.prisma.processingStep.findMany({ where: { processingCandidateId: step.processingCandidateId } });
      for (const s of otherSteps) {
        try {
          await this.hrdRemindersService.cancelHRDRemindersForStep(s.id);
        } catch (err) {
          this.logger.error(`Failed to cancel HRD reminders for step ${s.id} while cancelling processing ${step.processingCandidateId}:`, err);
        }
        try {
          await this.dataFlowRemindersService.cancelDataFlowRemindersForStep(s.id);
        } catch (err) {
          this.logger.error(`Failed to cancel Data Flow reminders for step ${s.id} while cancelling processing ${step.processingCandidateId}:`, err);
        }
      }
    } catch (err) {
      this.logger.error(`Failed to cancel reminders after cancelling step ${stepId}:`, err);
    }

    return txResult;
  }

  /**
   * Mark entire processing flow as complete and mark candidate as HIRED (final).
   * - Updates CandidateProjects main/sub status to final/hired
   * - Updates Candidate.currentStatus -> working
   * - Creates CandidateProjectStatusHistory, CandidateStatusHistory and ProcessingHistory entries
   * - Idempotent (no-op if already hired / already working)
   */
  async completeProcessing(processingCandidateId: string, userId: string, dto?: { notes?: string }) {
    const pc = await this.prisma.processingCandidate.findUnique({
      where: { id: processingCandidateId },
      include: { candidate: true, project: true, role: true, candidateProjectMap: true },
    });
    if (!pc) throw new NotFoundException('Processing candidate not found');

    const mainStatus = await this.prisma.candidateProjectMainStatus.findUnique({ where: { name: 'final' } });
    const subStatus = await this.prisma.candidateProjectSubStatus.findUnique({ where: { name: 'hired' } });
    if (!mainStatus || !subStatus) throw new BadRequestException('Final/Hired status not configured in DB');

    const candidateProjectMap = pc.candidateProjectMap;
    if (!candidateProjectMap) throw new NotFoundException('Associated candidate-project mapping not found');

    // Idempotent: if already hired, return current state
    if (candidateProjectMap.subStatusId === subStatus.id) {
      return { success: true, message: 'Candidate already marked as hired' };
    }

    await this.prisma.$transaction(async (tx) => {
      // 1) Update processing candidate
      await tx.processingCandidate.update({
        where: { id: processingCandidateId },
        data: { processingStatus: 'completed', step: 'completed', notes: dto?.notes || null },
      });

      // 2) Update candidate-project status
      await tx.candidateProjects.update({
        where: { id: candidateProjectMap.id },
        data: { mainStatusId: mainStatus.id, subStatusId: subStatus.id },
      });

      // 3) Create candidate project status history
      const user = await tx.user.findUnique({ where: { id: userId }, select: { name: true } });
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: candidateProjectMap.id,
          changedById: userId,
          changedByName: user?.name || null,
          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,
          mainStatusSnapshot: mainStatus.label,
          subStatusSnapshot: subStatus.label,
          reason: 'Processing completed — candidate hired',
          notes: dto?.notes || null,
        },
      });

      // 4) Ensure candidate.currentStatus -> DEPLOYED and create CandidateStatusHistory
      const deployedStatus = await tx.candidateStatus.findFirst({
        where: { statusName: { equals: CANDIDATE_STATUS.DEPLOYED, mode: 'insensitive' } },
      });
      if (deployedStatus) {
        const candidateRecord = await tx.candidate.findUnique({ where: { id: pc.candidate.id }, select: { id: true, currentStatusId: true } });
        if (candidateRecord && candidateRecord.currentStatusId !== deployedStatus.id) {
          await tx.candidate.update({ where: { id: pc.candidate.id }, data: { currentStatusId: deployedStatus.id } });

          await tx.candidateStatusHistory.create({
            data: {
              candidateId: pc.candidate.id,
              changedById: userId,
              changedByName: user?.name ?? 'System',
              statusId: deployedStatus.id,
              statusNameSnapshot: deployedStatus.statusName,
              statusUpdatedAt: new Date(),
              reason: 'Candidate hired — set to deployed',
              notificationCount: 0,
            },
          });
        }
      }

      // 5) Create processing history entry
      await tx.processingHistory.create({
        data: {
          processingCandidateId,
          status: 'completed',
          step: 'processing_completed',
          changedById: userId,
          notes: dto ? JSON.stringify({ action: 'complete_processing', notes: dto.notes || null }) : 'Processing completed',
        },
      });

      // 6) Publish outbox event so notifications / integrations can react (done inside tx)
      await this.outbox.publishCandidateHired(
        processingCandidateId,
        pc.candidate.id,
        pc.project.id,
        candidateProjectMap.id,
        candidateProjectMap.recruiterId || null,
        userId || null,
        dto?.notes || null,
        tx,
      );
    });

    return { success: true, message: 'Processing completed and candidate marked as hired' };
  }

  async attachDocumentToStep(processingStepId: string, documentId: string, uploadedBy?: string) {
    // 1. Get the processing step to find the candidate and project
    const step = await this.prisma.processingStep.findUnique({
      where: { id: processingStepId },
      include: {
        processingCandidate: true,
      },
    });

    if (!step) {
      throw new Error(`Processing step ${processingStepId} not found`);
    }

    // 2. Find the CandidateProjectMap associated with this processing candidate
    const candidateProjectMap = await this.prisma.candidateProjects.findFirst({
      where: {
        candidateId: step.processingCandidate.candidateId,
        projectId: step.processingCandidate.projectId,
        roleNeededId: step.processingCandidate.roleNeededId,
      },
    });

    if (!candidateProjectMap) {
      throw new Error(
        'Candidate project mapping not found for processing candidate',
      );
    }

    // 3. Find or Create CandidateProjectDocumentVerification for this document and map
    let verification =
      await this.prisma.candidateProjectDocumentVerification.findUnique({
        where: {
          candidateProjectMapId_documentId: {
            candidateProjectMapId: candidateProjectMap.id,
            documentId,
          },
        },
      });

    if (!verification) {
      verification = await this.prisma.candidateProjectDocumentVerification.create({
        data: {
          candidateProjectMapId: candidateProjectMap.id,
          documentId,
          status: 'pending',
        },
      });
    }

    // 4. Create ProcessingStepDocument linking the verification
    const doc = await this.prisma.processingStepDocument.create({
      data: {
        processingStepId,
        candidateProjectDocumentVerificationId: verification.id,
        uploadedBy,
        status: 'pending',
      },
    });
    return doc;
  }

  /**
   * Processing-level document re-upload: replace existing document with a new upload
   * Soft-deletes the old document and its verification(s), creates history entries,
   * creates a new document and verification (status RESUBMITTED), attaches to a step if provided and updates project status.
   */
  async processingDocumentReupload(dto: ProcessingDocumentReuploadDto, userId: string) {
    const { oldDocumentId, candidateProjectMapId, fileName, fileUrl, fileSize, mimeType, expiryDate, documentNumber, notes, roleCatalogId, docType } = dto;

    // 1. Validate old document
    const oldDocument = await this.prisma.document.findUnique({ where: { id: oldDocumentId } });
    if (!oldDocument || (oldDocument as any).isDeleted) {
      throw new NotFoundException(`Document with ID ${oldDocumentId} not found`);
    }

    // 2. Validate candidateProjectMap
    const candidateProjectMap = await this.prisma.candidateProjects.findUnique({ where: { id: candidateProjectMapId }, include: { project: true } });
    if (!candidateProjectMap) {
      throw new NotFoundException(`Candidate project mapping with ID ${candidateProjectMapId} not found`);
    }

    // 3. Ensure document belongs to candidate
    if (oldDocument.candidateId !== candidateProjectMap.candidateId) {
      throw new BadRequestException('Document does not belong to the specified candidate nomination');
    }

    // 4. Get user info for history
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    // 5. Perform transaction: soft delete old verification(s) + document, add history; create new document + verification + history
    const result = await this.prisma.$transaction(async (tx) => {
      // find existing verifications that link this old document to the nomination
      const existingVerifications = await tx.candidateProjectDocumentVerification.findMany({ where: { documentId: oldDocumentId, candidateProjectMapId: candidateProjectMapId, isDeleted: false } as any });
      const verificationIds = existingVerifications.map((v) => v.id);

      // soft delete verifications
      if (verificationIds.length > 0) {
        await tx.candidateProjectDocumentVerification.updateMany({ where: { id: { in: verificationIds } } as any, data: { isDeleted: true, deletedAt: new Date() } as any });
      }

      // soft delete the old document
      await tx.document.updateMany({ where: { id: oldDocumentId, isDeleted: false } as any, data: { isDeleted: true, deletedAt: new Date() } as any });

      // add history entries for the replaced (soft-deleted) verification(s)
      if (verificationIds.length > 0) {
        const historyEntries = verificationIds.map((id) => ({
          verificationId: id,
          action: 'replaced',
          performedBy: userId,
          performedByName: user?.name || 'System',
          notes: 'Old document replaced by processing re-upload',
        }));
        await tx.documentVerificationHistory.createMany({ data: historyEntries });
      }

      // create the new document
      const newDocument = await tx.document.create({ data: {
        candidateId: oldDocument.candidateId,
        docType: docType || oldDocument.docType,
        fileName,
        fileUrl,
        fileSize,
        mimeType,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        documentNumber,
        notes,
        roleCatalogId: roleCatalogId || oldDocument.roleCatalogId || null,
        uploadedBy: userId,
        status: DOCUMENT_STATUS.PENDING,
      } });

      // create verification for the new document
      const newVerification = await tx.candidateProjectDocumentVerification.create({ data: {
        candidateProjectMapId: candidateProjectMapId,
        documentId: newDocument.id,
        roleCatalogId: roleCatalogId || oldDocument.roleCatalogId || null,
        status: DOCUMENT_STATUS.PENDING,
        notes,
      } as any });

      // create history entry for new verification (processing re-upload)
      await tx.documentVerificationHistory.create({ data: {
        verificationId: newVerification.id,
        action: 'reuploaded',
        performedBy: userId,
        performedByName: user?.name || null,
        notes: 'reuploaded',
      } });

      return { oldDocumentId, newDocument, newVerification };
    });

    // 6. Update candidate project status similar to DocumentsService
    // Recompute summary counts to determine new status
    const totalSubmitted = await this.prisma.candidateProjectDocumentVerification.count({ where: { candidateProjectMapId: candidateProjectMapId, isDeleted: false } as any });
    const totalPending = await this.prisma.candidateProjectDocumentVerification.count({ where: { candidateProjectMapId: candidateProjectMapId, isDeleted: false, status: 'pending' } as any });
    const totalRejected = await this.prisma.candidateProjectDocumentVerification.count({ where: { candidateProjectMapId: candidateProjectMapId, isDeleted: false, status: 'rejected' } as any });

    const totalRequired = await this.prisma.documentRequirement.count({ where: { projectId: candidateProjectMap.projectId, isDeleted: false } as any });

    // Safely fetch current project status (can be null) to avoid TS2531
    const currentProject = await this.prisma.candidateProjects.findUnique({ where: { id: candidateProjectMapId }, include: { currentProjectStatus: true } });
    let newStatusName = currentProject?.currentProjectStatus?.statusName || 'pending_documents';

    if (totalSubmitted === 0) {
      newStatusName = 'pending_documents';
    } else if (totalPending > 0 || totalSubmitted < totalRequired) {
      newStatusName = 'verification_in_progress';
    } else if (totalRejected > 0) {
      newStatusName = 'rejected_documents';
    } else if (totalSubmitted >= totalRequired && totalRejected === 0 && totalPending === 0) {
      newStatusName = 'documents_verified';
    }

    const current = await this.prisma.candidateProjects.findUnique({ where: { id: candidateProjectMapId }, include: { currentProjectStatus: true } });

    if (current && newStatusName !== current.currentProjectStatus.statusName) {
      const newStatus = await this.prisma.candidateProjectStatus.findFirst({ where: { statusName: newStatusName } });
      if (newStatus) {
        await this.prisma.candidateProjects.update({ where: { id: candidateProjectMapId }, data: { currentProjectStatusId: newStatus.id } });
      }
    }

    return result;
  }

  /**
   * Verify a document in the context of processing
   * Updates document status, ensures project verification, and links to processing step
   */
  async verifyProcessingDocument(dto: VerifyProcessingDocumentDto, userId: string) {
    const { documentId, processingStepId, notes } = dto;

    // 1. Get the processing step to find the candidate and project
    const step = await this.prisma.processingStep.findUnique({
      where: { id: processingStepId },
      include: {
        processingCandidate: {
          include: {
            candidate: true,
          },
        },
        template: true,
      },
    });

    if (!step) {
      throw new NotFoundException(`Processing step ${processingStepId} not found`);
    }

    // 2. Find the CandidateProjectMap associated with this processing candidate
    const candidateProjectMap = await this.prisma.candidateProjects.findFirst({
      where: {
        candidateId: step.processingCandidate.candidateId,
        projectId: step.processingCandidate.projectId,
        roleNeededId: step.processingCandidate.roleNeededId,
      },
    });

    if (!candidateProjectMap) {
      throw new NotFoundException('Candidate project mapping not found for processing candidate');
    }

    // Get user info for history
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const txResult = await this.prisma.$transaction(async (tx) => {
      // 3. Update Document status
      await tx.document.update({
        where: { id: documentId },
        data: {
          status: DOCUMENT_STATUS.VERIFIED,
          verifiedAt: new Date(),
          verifiedBy: userId,
        },
      });

      // 4. Find or Create CandidateProjectDocumentVerification (CPM-Doc link)
      let verification = await tx.candidateProjectDocumentVerification.findUnique({
        where: {
          candidateProjectMapId_documentId: {
            candidateProjectMapId: candidateProjectMap.id,
            documentId: documentId,
          },
        },
      });

      if (!verification) {
        verification = await tx.candidateProjectDocumentVerification.create({
          data: {
            candidateProjectMapId: candidateProjectMap.id,
            documentId: documentId,
            status: DOCUMENT_STATUS.VERIFIED,
            notes: notes || 'Verified by processing team',
          } as any,
        });
      } else {
        verification = await tx.candidateProjectDocumentVerification.update({
          where: { id: verification.id },
          data: {
            status: DOCUMENT_STATUS.VERIFIED,
            notes: notes || verification.notes || 'Verified by processing team',
            isDeleted: false,
            deletedAt: null,
          } as any,
        });
      }

      // 5. Create or Update ProcessingStepDocument (Linking verification TO the step)
      const existingStepDoc = await tx.processingStepDocument.findFirst({
        where: {
          candidateProjectDocumentVerificationId: verification.id,
        },
      });

      if (!existingStepDoc) {
        await tx.processingStepDocument.create({
          data: {
            processingStepId: processingStepId,
            candidateProjectDocumentVerificationId: verification.id,
            status: DOCUMENT_STATUS.VERIFIED,
            notes: notes || 'Verified by processing team',
            uploadedBy: userId,
          },
        });
      } else {
        await tx.processingStepDocument.update({
          where: { id: existingStepDoc.id },
          data: {
            processingStepId: processingStepId, // Ensure it's linked to the right step if it was floating
            status: DOCUMENT_STATUS.VERIFIED,
            notes: notes || existingStepDoc.notes || 'Verified by processing team',
          },
        });
      }

      // 6. Create Document History Entry
      await tx.documentVerificationHistory.create({
        data: {
          verificationId: verification.id,
          action: DOCUMENT_STATUS.VERIFIED,
          performedBy: userId,
          performedByName: user?.name || null,
          notes: notes || 'initially document verified by processing team',
        },
      });

      // 7. Ensure the processing step is marked as in_progress when a document is verified
      const currentStep = await tx.processingStep.findUnique({ where: { id: processingStepId } });
      if (currentStep && !['in_progress', 'completed', 'rejected'].includes(currentStep.status)) {
        await tx.processingStep.update({
          where: { id: processingStepId },
          data: { status: 'in_progress', startedAt: currentStep.startedAt || new Date() },
        });

        await tx.processingHistory.create({
          data: {
            processingCandidateId: step.processingCandidateId,
            status: 'in_progress',
            step: step.template?.key || step.templateId || null,
            changedById: userId,
            recruiterId: candidateProjectMap.recruiterId || null,
            notes: 'Document verified — step marked in_progress',
          },
        });
      }

      return { success: true, verificationId: verification.id };
    });

    // If this verification is related to HRD step, cancel HRD reminders for that step
    try {
      const stepWithTemplate = await this.prisma.processingStep.findUnique({ where: { id: processingStepId }, include: { template: true } });
      if (stepWithTemplate?.template?.key === 'hrd') {
        await this.hrdRemindersService.cancelHRDRemindersForStep(processingStepId);
      }
    } catch (err) {
      this.logger.error(`Failed to cancel HRD reminders after verification for step ${processingStepId}:`, err);
    }

    return txResult;
  }

  /**
   * Sync processing step statuses for a given processing candidate
   * - Marks steps as `in_progress` if they have any verified processing documents
   * - Reverts steps to `pending` if they have no verified documents
   */
  async syncProcessingStepStatuses(processingCandidateId: string, userId?: string) {
    const steps = await this.prisma.processingStep.findMany({
      where: { processingCandidateId },
      include: { documents: { include: { candidateProjectDocumentVerification: true } }, template: true },
    });

    const changes: Array<{ stepId: string; oldStatus: string; newStatus: string }> = [];

    await this.prisma.$transaction(async (tx) => {
      for (const s of steps) {
        // Do not change already finalized steps
        if (['completed', 'rejected'].includes(s.status)) continue;

        const hasVerifiedDocument = (s.documents || []).some(
          (d: any) => d.status === 'verified' || (d.candidateProjectDocumentVerification && d.candidateProjectDocumentVerification.status === 'verified'),
        );

        if (hasVerifiedDocument && s.status !== 'in_progress') {
          await tx.processingStep.update({
            where: { id: s.id },
            data: { status: 'in_progress', startedAt: s.startedAt || new Date() },
          });

          await tx.processingHistory.create({
            data: {
              processingCandidateId,
              status: 'in_progress',
              step: s.template?.key || s.templateId || null,
              changedById: userId || null,
              notes: 'Step marked in_progress due to verified document(s)',
            },
          });

          changes.push({ stepId: s.id, oldStatus: s.status, newStatus: 'in_progress' });
        } else if (!hasVerifiedDocument && s.status !== 'pending') {
          await tx.processingStep.update({ where: { id: s.id }, data: { status: 'pending', startedAt: null } });

          await tx.processingHistory.create({
            data: {
              processingCandidateId,
              status: 'pending',
              step: s.template?.key || s.templateId || null,
              changedById: userId || null,
              notes: 'Step reverted to pending (no verified documents)',
            },
          });

          changes.push({ stepId: s.id, oldStatus: s.status, newStatus: 'pending' });
        }
      }
    });

    return { updated: changes.length, changes };
  }

  /**
   * Get candidates who have passed interviews and are ready to be transferred to processing
   */
  async getCandidatesToTransfer(query: QueryCandidatesToTransferDto) {
    const {
      search,
      type,
      mode,
      projectId,
      roleNeededId,
      roleCatalogId,
      candidateId,
      status = 'all',
      page = 1,
      limit = 10,
    } = query;

    const where: any = {
      outcome: 'passed',
    };

    if (type) {
      where.type = type;
    }

    if (mode) {
      where.mode = mode;
    }

    // Apply transfer status filter
    if (status === 'pending') {
      where.candidateProjectMap = {
        ...where.candidateProjectMap,
        processing: null,
      };
    } else if (status === 'transferred') {
      where.candidateProjectMap = {
        ...where.candidateProjectMap,
        processing: { isNot: null },
      };
    }

    if (projectId || candidateId || roleNeededId || roleCatalogId) {
      where.candidateProjectMap = {
        ...where.candidateProjectMap,
        ...(projectId && { projectId }),
        ...(candidateId && { candidateId }),
        ...(roleNeededId && { roleNeededId }),
        ...(roleCatalogId && { roleNeeded: { roleCatalogId } }),
      };
    }

    // Search functionality
    if (search) {
      where.OR = [
        {
          candidateProjectMap: {
            candidate: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          candidateProjectMap: {
            project: {
              title: { contains: search, mode: 'insensitive' },
            },
          },
        },
        {
          candidateProjectMap: {
            recruiter: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [interviews, total] = await Promise.all([
      this.prisma.interview.findMany({
        where,
        include: {
          candidateProjectMap: {
            include: {
              candidate: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  mobileNumber: true,
                  countryCode: true,
                  experience: true,
                  totalExperience: true,
                  highestEducation: true,
                  university: true,
                  currentRole: true,
                  currentEmployer: true,
                  skills: true,
                  profileImage: true,
                  dateOfBirth: true,
                  gender: true,
                  qualifications: {
                    include: {
                      qualification: true,
                    },
                  },
                },
              },
              project: {
                select: {
                  id: true,
                  title: true,
                },
              },
              roleNeeded: {
                select: {
                  id: true,
                  designation: true,
                  roleCatalogId: true,
                  roleCatalog: {
                    select: {
                      id: true,
                      name: true,
                      label: true,
                    },
                  },
                },
              },
              recruiter: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              processing: true, // To show if already in processing
              documentVerifications: {
                where: {
                  isDeleted: false,
                  document: {
                    docType: DOCUMENT_TYPE.OFFER_LETTER,
                    isDeleted: false,
                  },
                },
                include: {
                  document: {
                    select: {
                      id: true,
                      docType: true,
                      fileName: true,
                      fileUrl: true,
                      status: true,
                      createdAt: true,
                    },
                  },
                },
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
        orderBy: {
          scheduledTime: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.interview.count({ where }),
    ]);

    const mappedInterviews = interviews.map((itv) => ({
      ...itv,
      isTransferredToProcessing: !!itv.candidateProjectMap?.processing,
      offerLetterData: itv.candidateProjectMap?.documentVerifications?.[0] || null,
      isOfferLetterUploaded: (itv.candidateProjectMap?.documentVerifications?.length || 0) > 0,
    }));

    return {
      interviews: mappedInterviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all processing candidates with filters, search and pagination
   */
  async getAllProcessingCandidates(query: QueryAllProcessingCandidatesDto) {
    const {
      search,
      projectId,
      roleCatalogId,
      status = 'assigned',
      page = 1,
      limit = 10,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {};

    // Filter by project
    if (projectId) {
      where.projectId = projectId;
    }

    // Filter by processing status
    if (status && status !== 'all') {
      where.processingStatus = status;
    }

    // Filter by role catalog (via roleNeeded mapping)
    if (roleCatalogId) {
      where.role = {
        roleCatalogId: roleCatalogId,
      };
    }

    // Search functionality
    if (search) {
      where.OR = [
        {
          candidate: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          project: {
            title: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [candidates, total, statusCounts] = await Promise.all([
      this.prisma.processingCandidate.findMany({
        where,
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              mobileNumber: true,
              profileImage: true,
              countryCode: true,
              experience: true,
              highestEducation: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
              country: { select: { code: true, name: true } },
            },
          },
          role: {
            select: {
              id: true,
              projectId: true,
              roleCatalogId: true,
              designation: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          candidateProjectMap: {
            include: {
              recruiter: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.processingCandidate.count({ where }),
      this.prisma.processingCandidate.groupBy({
        by: ['processingStatus'],
        where: {
          projectId: projectId,
          ...(roleCatalogId && {
            role: {
              roleCatalogId: roleCatalogId,
            },
          }),
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    const counts = {
      all: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };

    statusCounts.forEach((sc) => {
      const status = sc.processingStatus as keyof typeof counts;
      if (counts.hasOwnProperty(status)) {
        counts[status] = sc._count._all;
      }
    });

    counts.all = Object.values(counts).reduce((a, b) => a + b, 0) - counts.all;
    // Recalculate total for 'all' correctly
    const allCount = await this.prisma.processingCandidate.count({
      where: {
        projectId: projectId,
        ...(roleCatalogId && {
          role: {
            roleCatalogId: roleCatalogId,
          },
        }),
      },
    });
    counts.all = allCount;

    // Attach country flag and display name for each candidate's project (if present)
    const candidatesWithCountry = candidates.map((c: any) => {
      if (c.project && c.project.country) {
        const country = c.project.country as any;
        const flag = this.getCountryFlagEmoji(country.code);
        c.project.country = {
          ...country,
          flag,
          flagName: flag ? `${flag} ${country.name}` : country.name,
        };
      }
      return c;
    });

    // Compute progress percentage for each candidate based on processing steps
    const processingCandidateIds = candidatesWithCountry.map((c: any) => c.id);

    const stepTotalsMap: Record<string, number> = {};
    const completedStepsMap: Record<string, number> = {};

    if (processingCandidateIds.length > 0) {
      const [totals, completed] = await Promise.all([
        this.prisma.processingStep.groupBy({
          by: ['processingCandidateId'],
          where: { processingCandidateId: { in: processingCandidateIds } },
          _count: { _all: true },
        }),
        this.prisma.processingStep.groupBy({
          by: ['processingCandidateId'],
          where: { processingCandidateId: { in: processingCandidateIds }, status: 'completed' },
          _count: { _all: true },
        }),
      ]);

      totals.forEach((t: any) => {
        stepTotalsMap[t.processingCandidateId] = t._count._all;
      });
      completed.forEach((c: any) => {
        completedStepsMap[c.processingCandidateId] = c._count._all;
      });
    }

    const candidatesWithProgress = candidatesWithCountry.map((c: any) => {
      const total = stepTotalsMap[c.id] || 0;
      const completed = completedStepsMap[c.id] || 0;
      const progressCount = total === 0 ? 0 : Math.round((completed / total) * 100);
      return {
        ...c,
        progressCount,
      };
    });

    return {
      candidates: candidatesWithProgress,
      counts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get the processing history for a specific candidate nomination
   */
  async getProcessingHistory(candidateId: string, projectId: string, roleCatalogId: string) {
    // Resolve roleNeeded via projectId + roleCatalogId
    const roleNeeded = await this.prisma.roleNeeded.findFirst({ where: { projectId, roleCatalogId } });

    if (!roleNeeded) {
      throw new NotFoundException(
        `No role mapping found for project ${projectId} and roleCatalogId ${roleCatalogId}`,
      );
    }

    const processingCandidate = await this.prisma.processingCandidate.findUnique({
      where: {
        candidateId_projectId_roleNeededId: {
          candidateId,
          projectId,
          roleNeededId: roleNeeded.id,
        },
      },
      include: {
        candidate: {
          select: { firstName: true, lastName: true, email: true },
        },
        project: {
          select: { title: true },
        },
        role: {
          select: { designation: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        history: {
          include: {
            changedBy: {
              select: { id: true, name: true },
            },
            recruiter: {
              select: { id: true, name: true },
            },
            processingCandidate: {
              select: {
                assignedTo: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!processingCandidate) {
      throw new NotFoundException(
        `No processing record found for candidate ${candidateId} in project ${projectId} for roleCatalogId ${roleCatalogId}`,
      );
    }

    // Map history to include assignedTo at the same level as other relations
    const mappedHistory = processingCandidate.history.map((h: any) => ({
      ...h,
      assignedTo: h.processingCandidate?.assignedTo || null,
      processingCandidate: undefined,
    }));

    return { ...processingCandidate, history: mappedHistory };
  }

  /**
   * Get processing candidates for a specific project
   */
  async getProcessingCandidatesByProject(projectId: string, query: any) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { projectId };

    if (status && status !== 'all') {
      where.processingStatus = status;
    }

    if (search) {
      where.candidate = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [candidates, total] = await Promise.all([
      this.prisma.processingCandidate.findMany({
        where,
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              mobileNumber: true,
              profileImage: true,
            },
          },
          role: {
            select: {
              id: true,
              designation: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
            },
          },
          candidateProjectMap: {
            include: {
              recruiter: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.processingCandidate.count({ where }),
    ]);

    return {
      candidates,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Get processing details by processing ID
   */
  async getProcessingDetailsById(id: string) {
    const processingCandidate = await this.prisma.processingCandidate.findUnique({
      where: { id },
      include: {
        candidate: {
          include: {
            qualifications: {
              include: {
                qualification: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            description: true,
            deadline: true,
            requiredScreening: true,
            status: true,
            createdBy: true,
            teamId: true,
            createdAt: true,
            updatedAt: true,
            priority: true,
            countryCode: true,
            projectType: true,
            resumeEditable: true,
            groomingRequired: true,
            hideContactInfo: true,
            country: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                type: true,
              },
            },
            team: {
              select: {
                id: true,
                name: true,
              },
            },
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        role: {
          include: {
            roleCatalog: true,
          },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, mobileNumber: true },
        },
        candidateProjectMap: {
          include: {
            recruiter: {
              select: { id: true, name: true, email: true },
            },
            mainStatus: true,
            subStatus: true,
            // documentVerifications intentionally omitted for performance; use dedicated endpoint
          },
        },
        // history intentionally omitted for performance; use dedicated endpoint

      },
    });

    if (!processingCandidate) {
      throw new NotFoundException(`Processing record with ID ${id} not found`);
    }

    // Attach country flag and combined flag-name for project country
    if (processingCandidate.project && processingCandidate.project.country) {
      const country = processingCandidate.project.country as any;
      const flag = this.getCountryFlagEmoji(country.code);
      processingCandidate.project.country = {
        ...country,
        flag,
        flagName: flag ? `${flag} ${country.name}` : country.name,
      };
    }

    // Add role requirements to project object for convenience
    if (processingCandidate.project && processingCandidate.role) {
      (processingCandidate.project as any).minAge = processingCandidate.role.minAge;
      (processingCandidate.project as any).maxAge = processingCandidate.role.maxAge;
      (processingCandidate.project as any).genderRequirement = (processingCandidate.role as any).genderRequirement;
    }

    // Compute progress percentage for this processing candidate
    const [totalSteps, completedSteps] = await Promise.all([
      this.prisma.processingStep.count({ where: { processingCandidateId: id } }),
      this.prisma.processingStep.count({ where: { processingCandidateId: id, status: 'completed' } }),
    ]);

    const progressCount = totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);

    return {
      ...processingCandidate,
      progressCount,
    };
  }

  /**
   * Get verified project document verifications and common candidate documents for a processing candidate
   */
  async getCandidateAllProjectDocuments(
    processingId: string,
    opts?: { page?: number; limit?: number; search?: string },
  ) {
    const page = Math.max(1, opts?.page || 1);
    const limit = Math.min(100, Math.max(1, opts?.limit || 20));
    const search = opts?.search?.trim() || null;

    const pc = await this.prisma.processingCandidate.findUnique({
      where: { id: processingId },
      include: { candidate: true, project: true, role: { include: { roleCatalog: true } } },
    });
    if (!pc) throw new NotFoundException(`Processing record with ID ${processingId} not found`);

    const candidateId = pc.candidateId;
    const projectId = pc.projectId;
    const roleCatalogId = pc.role?.roleCatalogId || null;

    // Find candidate project mapping for this project
    const cpm = await this.prisma.candidateProjects.findFirst({ where: { candidateId, projectId } });

    // Build search conditions
    const docSearchCondition: any = search
      ? {
          OR: [
            { document: { fileName: { contains: search, mode: 'insensitive' } } },
            { document: { docType: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    let projectVerifications: any[] = [];
    if (cpm) {
      projectVerifications = await this.prisma.candidateProjectDocumentVerification.findMany({
        where: { candidateProjectMapId: cpm.id, status: 'verified', isDeleted: false, ...(search ? docSearchCondition : {}) } as any,
        include: { document: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Common doc types that should always be included even if not tied to a roleCatalog
    const commonDocTypes = ['pan_card', 'aadhaar', 'passport_copy'];

    // Candidate documents that are verified and either belong to the roleCatalog or are common types
    const docWhere: any = {
      candidateId,
      isDeleted: false,
      status: 'verified',
      AND: [
        {
          OR: [
            { roleCatalogId: roleCatalogId },
            { roleCatalogId: null, docType: { in: commonDocTypes } },
          ],
        },
      ],
    };

    if (search) {
      docWhere.AND.push({ OR: [{ fileName: { contains: search, mode: 'insensitive' } }, { docType: { contains: search, mode: 'insensitive' } }] });
    }

    const candidateDocs = await this.prisma.document.findMany({
      where: docWhere as any,
      orderBy: { createdAt: 'desc' },
    });

    // Map candidate documents to a verification-like shape so frontend can consume similar structure
    const standalone = candidateDocs.map((doc: any) => ({
      id: null,
      candidateProjectMapId: null,
      documentId: doc.id,
      roleCatalogId: doc.roleCatalogId,
      status: doc.status,
      notes: doc.notes || null,
      rejectionReason: null,
      resubmissionRequested: false,
      isDeleted: doc.isDeleted,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      document: doc,
    }));

    // Merge project verifications and standalone docs, prefer project verifications when both exist for the same document
    const map = new Map<string, any>();
    for (const v of projectVerifications) map.set(v.documentId, v);
    for (const s of standalone) if (!map.has(s.documentId)) map.set(s.documentId, s);

    // Convert to array and sort by createdAt desc
    const all = Array.from(map.values()).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = all.slice(start, start + limit);

    return {
      items,
      pagination: { page, limit, total, totalPages },
    };
  }

  /**
   * Get processing history entries for a processing candidate (paginated by date desc)
   */
  async getProcessingCandidateHistory(processingId: string, opts?: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, opts?.page || 1);
    const limit = Math.min(200, Math.max(1, opts?.limit || 20));
    const search = opts?.search?.trim() || null;

    // Build where clause with optional search across notes, status, step and related names
    const where: any = { processingCandidateId: processingId };
    if (search) {
      where.AND = [
        {
          OR: [
            { notes: { contains: search, mode: 'insensitive' } },
            { step: { contains: search, mode: 'insensitive' } },
            { status: { contains: search, mode: 'insensitive' } },
            { changedBy: { name: { contains: search, mode: 'insensitive' } } },
            { recruiter: { name: { contains: search, mode: 'insensitive' } } },
            { processingCandidate: { assignedTo: { name: { contains: search, mode: 'insensitive' } } } },
          ],
        },
      ];
    }

    const total = await this.prisma.processingHistory.count({ where });

    const histories = await this.prisma.processingHistory.findMany({
      where,
      include: {
        changedBy: { select: { id: true, name: true } },
        recruiter: { select: { id: true, name: true } },
        processingCandidate: {
          include: { assignedTo: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const items = histories.map((h: any) => ({
      ...h,
      assignedTo: h.processingCandidate?.assignedTo || null,
      processingCandidate: undefined,
    }));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  private getCountryFlagEmoji(code?: string): string | null {
    if (!code) return null;
    const cc = code.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc)) return null; // only support ISO alpha-2
    try {
      return Array.from(cc)
        .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
        .join('');
    } catch (err) {
      return null;
    }
  }
}
