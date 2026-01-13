import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TransferToProcessingDto } from './dto/transfer-to-processing.dto';
import { QueryCandidatesToTransferDto } from './dto/query-candidates-to-transfer.dto';
import { QueryAllProcessingCandidatesDto } from './dto/query-all-processing-candidates.dto';
import { DOCUMENT_TYPE } from '../common/constants';

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    // Fetch all country document rules for this country (if any)
    const countryRules = country
      ? await this.prisma.countryDocumentRequirement.findMany({ where: { countryCode: country } })
      : [];

    const steps = await this.prisma.processingStep.findMany({
      where: { processingCandidateId },
      orderBy: { template: { order: 'asc' } },
      include: {
        template: true,
        documents: { include: { candidateProjectDocumentVerification: { include: { document: true } } } },
      },
    });

    // Attach requiredDocuments for each step
    const stepsWithRules = steps.map((s) => {
      const stepSpecific = countryRules.filter((r) => r.processingStepTemplateId === s.templateId);
      const global = countryRules.filter((r) => r.processingStepTemplateId === null);

      // merge, preferring stepSpecific when docType duplicates
      const merged: any[] = [];
      const seen = new Set<string>();
      for (const r of [...stepSpecific, ...global]) {
        if (!seen.has(r.docType)) {
          merged.push(r);
          seen.add(r.docType);
        }
      }

      return {
        ...s,
        requiredDocuments: merged,
      };
    });

    return stepsWithRules;
  }

  async updateProcessingStep(stepId: string, data: any, userId: string) {
    // Allowed updates: status, assignedTo, rejectionReason, dueDate
    const { status, assignedTo, rejectionReason, dueDate } = data;

    const step = await this.prisma.processingStep.findUnique({ where: { id: stepId }, include: { template: true, processingCandidate: true } });
    if (!step) throw new Error('Processing step not found');

    const updates: any = {};
    if (status) {
      updates.status = status;
      if (status === 'completed') updates.completedAt = new Date();
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
          notes: JSON.stringify({ action: 'update_step', details: { status, assignedTo, rejectionReason } }),
        },
      });

      // If step completed, optionally advance next step (sequential flow)
      if (status === 'completed') {
        // Find next pending step for same processingCandidate
        const nextStep = await tx.processingStep.findFirst({
          where: { processingCandidateId: step.processingCandidateId, status: 'pending' },
          orderBy: { template: { order: 'asc' } },
        });
        if (nextStep) {
          await tx.processingStep.update({ where: { id: nextStep.id }, data: { status: 'in_progress', startedAt: new Date() } });

          await tx.processingHistory.create({
            data: {
              processingCandidateId: step.processingCandidateId,
              status: 'in_progress',
              step: nextStep.templateId,
              changedById: userId,
              notes: `Advanced to next step ${nextStep.id}`,
            },
          });
        } else {
          // All steps completed -> mark processing candidate completed
          await tx.processingCandidate.update({ where: { id: step.processingCandidateId }, data: { processingStatus: 'completed' } });

          await tx.processingHistory.create({
            data: {
              processingCandidateId: step.processingCandidateId,
              status: 'completed',
              step: step.template.key,
              changedById: userId,
              notes: 'All steps completed',
            },
          });
        }
      }
    });

    return { success: true };
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

    return {
      candidates: candidatesWithCountry,
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
            documentVerifications: {
              where: { isDeleted: false },
              include: {
                document: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
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
      throw new NotFoundException(`Processing record with ID ${id} not found`);
    }

    // Map history to include assignedTo at the same level as other relations
    const mappedHistory = processingCandidate.history.map((h: any) => ({
      ...h,
      assignedTo: h.processingCandidate?.assignedTo || null,
      processingCandidate: undefined,
    }));

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

    return { ...processingCandidate, history: mappedHistory };
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
