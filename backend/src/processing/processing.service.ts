import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TransferToProcessingDto } from './dto/transfer-to-processing.dto';
import { QueryCandidatesToTransferDto } from './dto/query-candidates-to-transfer.dto';
import { DOCUMENT_TYPE } from '../common/constants';

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Transfer candidates to the processing team
   */
  async transferToProcessing(dto: TransferToProcessingDto, userId: string) {
    const { candidateIds, projectId, roleNeededId, assignedProcessingTeamUserId, notes } = dto;

    // 1. Verify project and role exist
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const roleNeeded = await this.prisma.roleNeeded.findUnique({
      where: { id: roleNeededId },
    });

    if (!roleNeeded) {
      throw new NotFoundException(`Role requirement with ID ${roleNeededId} not found`);
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
              roleNeededId,
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
            notes,
          },
          create: {
            candidateId,
            projectId,
            roleNeededId: roleForProcessing,
            assignedProcessingTeamUserId,
            processingStatus: 'assigned',
            notes,
          },
        });

        // Add history record
        await tx.processingHistory.create({
          data: {
            processingCandidate: { connect: { id: processingCandidate.id } },
            status: 'assigned',
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
   * Get candidates who have passed interviews and are ready to be transferred to processing
   */
  async getCandidatesToTransfer(query: QueryCandidatesToTransferDto) {
    const {
      search,
      type,
      mode,
      projectId,
      roleNeededId,
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

    if (projectId || candidateId || roleNeededId) {
      where.candidateProjectMap = {
        ...where.candidateProjectMap,
        ...(projectId && { projectId }),
        ...(candidateId && { candidateId }),
        ...(roleNeededId && { roleNeededId }),
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
   * Get the processing history for a specific candidate nomination
   */
  async getProcessingHistory(candidateId: string, projectId: string, roleNeededId: string) {
    const processingCandidate = await this.prisma.processingCandidate.findUnique({
      where: {
        candidateId_projectId_roleNeededId: {
          candidateId,
          projectId,
          roleNeededId,
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
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!processingCandidate) {
      throw new NotFoundException(
        `No processing record found for candidate ${candidateId} in project ${projectId}`,
      );
    }

    return processingCandidate;
  }
}
