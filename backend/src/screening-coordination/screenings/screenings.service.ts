import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CandidateProjectsService } from '../../candidate-projects/candidate-projects.service';
import { CreateScreeningDto } from './dto/create-screening.dto';
import { UpdateScreeningDto } from './dto/update-screening.dto';
import { CompleteScreeningDto } from './dto/complete-screening.dto';
import { QueryScreeningsDto } from './dto/query-screenings.dto';
import {
  CANDIDATE_PROJECT_STATUS,
  SCREENING_DECISION,
  SCREENING_STATUS,
} from '../../common/constants/statuses';

@Injectable()
export class ScreeningsService {
  private readonly logger = new Logger(ScreeningsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => CandidateProjectsService))
    private readonly candidateProjectsService: CandidateProjectsService,
  ) {}

  /**
   * Create/Schedule a new screening
   */
  async create(dto: CreateScreeningDto, scheduledBy?: string | null) {
    // Verify candidate-project exists and is in correct status
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id: dto.candidateProjectMapId },
      include: {
        candidate: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: { select: { id: true, title: true } },
        roleNeeded: { select: { id: true, designation: true } },
        subStatus: true,
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate-Project with ID "${dto.candidateProjectMapId}" not found`,
      );
    }

    // Check if already has a pending screening
    const existingInterview = await this.prisma.screening.findFirst({
      where: {
        candidateProjectMapId: dto.candidateProjectMapId,
        decision: null, // Not yet completed
      },
    });

    if (existingInterview) {
      throw new ConflictException(
        'This candidate already has a pending screening',
      );
    }

    // Verify coordinator exists and has correct role
    const coordinator = await this.prisma.user.findFirst({
      where: {
        id: dto.coordinatorId,
        userRoles: {
          some: {
            role: {
              name: 'Interview Coordinator',
            },
          },
        },
      },
    });

    if (!coordinator) {
      throw new NotFoundException(
        `Interview Coordinator with ID "${dto.coordinatorId}" not found`,
      );
    }

    // Verify template exists if provided
    // if (dto.templateId) {
    //   const template = await this.prisma.screeningTemplate.findUnique({
    //     where: { id: dto.templateId },
    //   });
    //   if (!template) {
    //     throw new NotFoundException(
    //       `Template with ID "${dto.templateId}" not found`,
    //     );
    //   }
    //   // Verify template is for the same role as candidate's roleNeeded
    //   if (candidateProject.roleNeeded) {
    //     // Get roleCatalog from roleNeeded.designation
    //     const roleCatalog = await this.prisma.roleCatalog.findFirst({
    //       where: {
    //         name: {
    //           equals: candidateProject.roleNeeded.designation,
    //           mode: 'insensitive',
    //         },
    //       },
    //     });
    //     if (roleCatalog && template.roleId !== roleCatalog.id) {
    //       throw new BadRequestException(
    //         'Template role does not match candidate role',
    //       );
    //     }
    //   }
    // }

    // Create the screening, update candidate sub-status, and write history
    // in a single transaction to keep data consistent.
    // Resolve scheduler name (if scheduledBy provided) so we can record a human-friendly
    // changedByName in history entries. If scheduledBy isn't provided, fall back to
    // the coordinator's name we already loaded.
    let schedulerName: string | null = null;
    if (scheduledBy) {
      const scheduler = await this.prisma.user.findUnique({ where: { id: scheduledBy } });
      schedulerName = scheduler?.name ?? null;
    }

    const created = await this.prisma.$transaction(async (tx) => {
      // Re-validate template inside the transaction to avoid a race where a template
      // could be deleted between the initial check above and the create call.
      if (dto.templateId) {
        const txTemplate = await tx.screeningTemplate.findUnique({ where: { id: dto.templateId } });
        if (!txTemplate) {
          throw new NotFoundException(`Template with ID "${dto.templateId}" not found`);
        }
        // Verify template role (do this inside tx as well for consistency)
        if (candidateProject.roleNeeded) {
          const roleCatalog = await tx.roleCatalog.findFirst({
            where: {
              name: { equals: candidateProject.roleNeeded.designation, mode: 'insensitive' },
            },
          });
          if (roleCatalog && txTemplate.roleId !== roleCatalog.id) {
            throw new BadRequestException('Template role does not match candidate role');
          }
        }
      }
      let screening: any;
      try {
        screening = await tx.screening.create({
        data: {
          candidateProjectMapId: dto.candidateProjectMapId,
          coordinatorId: dto.coordinatorId,
          // templateId: dto.templateId,
          scheduledTime: dto.scheduledTime ? new Date(dto.scheduledTime) : null,
          duration: dto.duration ?? 60,
          meetingLink: dto.meetingLink,
          mode: dto.mode ?? 'video',
          status: SCREENING_STATUS.SCHEDULED,
        },
        include: {
          candidateProjectMap: {
            include: {
              candidate: {
                select: { firstName: true, lastName: true, email: true },
              },
              project: { select: { title: true } },
              roleNeeded: { select: { designation: true } },
            },
          },
        },
        });
      } catch (e: any) {
        // Translate common FK constraint failures into clear HTTP exceptions
        // to avoid leaking Prisma errors to the client.
        if (e?.code === 'P2003' && e?.meta?.constraint) {
          const constraint: string = e.meta.constraint;
          if (constraint.includes('templateId')) {
            throw new NotFoundException(`Template with ID "${dto.templateId}" not found`);
          }
          if (constraint.includes('candidateProjectMapId')) {
            throw new NotFoundException(`Candidate-Project with ID "${dto.candidateProjectMapId}" not found`);
          }
          if (constraint.includes('coordinatorId')) {
            throw new NotFoundException(`Coordinator with ID "${dto.coordinatorId}" not found`);
          }
        }
        // Re-throw unknown errors
        throw e;
      }

      // Update candidate-project status to SCREENING_SCHEDULED (use constant)
      await tx.candidateProjects.update({
        where: { id: dto.candidateProjectMapId },
        data: {
          subStatus: {
            connect: { name: CANDIDATE_PROJECT_STATUS.SCREENING_SCHEDULED },
          },
        },
      });

      // Create candidate-project status history entry
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: dto.candidateProjectMapId,
          // store the status *name* as the snapshot (consistent with other history records)
          subStatusSnapshot: 'Screening Scheduled',
          // Prefer the scheduler user id if provided, otherwise fall back to coordinatorId
          changedById: scheduledBy ?? dto.coordinatorId ?? null,
          // Use resolved schedulerName when available; otherwise coordinator.name
          changedByName: schedulerName ?? coordinator.name ?? null,
          reason: `Screening scheduled${schedulerName ? ` by ${schedulerName}` : dto.coordinatorId ? ` with coordinator ${coordinator.name}` : ''}`,
        },
      });

      // Create an interview-level status history record (supports screening & main interviews)
      await tx.interviewStatusHistory.create({
        data: {
          interviewType: 'screening',
          interviewId: screening.id,
          candidateProjectMapId: dto.candidateProjectMapId,
          previousStatus: null, // No previous status on creation
          status: 'scheduled',
          statusSnapshot: 'Screening Scheduled',
          statusAt: new Date(),
          changedById: scheduledBy ?? dto.coordinatorId ?? null,
          changedByName: schedulerName ?? coordinator.name ?? null,
          reason: `Screening scheduled${schedulerName ? ` by ${schedulerName}` : dto.coordinatorId ? ` with coordinator ${coordinator.name}` : ''}`,
        },
      });

      return screening;
    });

    // Return the enriched, canonical object via existing read method
    return this.findOne(created.id);
  }

  /**
   * Find all screenings with optional filtering
   */
  async findAll(query: QueryScreeningsDto) {
    const { page = 1, limit = 10, candidateProjectMapId, coordinatorId, decision, projectId, roleCatalogId, search } = query;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {};

    // Only return screenings that have been assigned a trainer
    where.isAssignedTrainer = false;

    if (candidateProjectMapId) {
      where.candidateProjectMapId = candidateProjectMapId;
    }

    if (coordinatorId) {
      where.coordinatorId = coordinatorId;
    }

    if (decision) {
      where.decision = decision;
    }

    // Support filtering by related candidate-project fields (projectId and roleCatalogId)
    const cpWhere: any = {};
    const cpAND: any[] = [];

    if (projectId) {
      cpAND.push({ projectId });
    }
    if (roleCatalogId) {
      // roleCatalogId exists on RoleNeeded → roleCatalogId
      cpAND.push({ roleNeeded: { is: { roleCatalogId: roleCatalogId } } });
    }
    if (search) {
      cpAND.push({
        candidate: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { mobileNumber: { contains: search, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (cpAND.length > 0) {
      where.candidateProjectMap = { is: { AND: cpAND } };
    }

    const [total, items] = await Promise.all([
      this.prisma.screening.count({ where }),
      this.prisma.screening.findMany({
        where,
        include: {
          candidateProjectMap: {
            include: {
              candidate: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  gender: true,
                  email: true,
                  profileImage: true,
                  countryCode: true,
                  mobileNumber: true,
                  dateOfBirth: true,
                  currentRole: true,
                  currentEmployer: true,
                  experience: true,
                  totalExperience: true,
                  candidateContacts: true,
                  referralCompanyName: true,
                  qualifications: {
                    include: { qualification: { select: { id: true, name: true, shortName: true, level: true } } },
                  },
                  workExperiences: {
                    select: { id: true, companyName: true, jobTitle: true, startDate: true, endDate: true, isCurrent: true, description: true, location: true, skills: true },
                  },
                  documents: { where: { isDeleted: false } },
                },
              },
              project: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  deadline: true,
                  priority: true,
                  groomingRequired: true,
                  projectType: true,
                  client: { select: { id: true, name: true, email: true, phone: true } },
                  country: { select: { code: true, name: true } },
                  creator: { select: { id: true, name: true } },
                  documentRequirements: true,
                },
              },
              roleNeeded: { select: { id: true, designation: true, roleCatalogId: true, roleCatalog: { select: { id: true, name: true, label: true, shortName: true } } } },
              recruiter: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  mobileNumber: true,
                },
              },
              mainStatus: true,
              subStatus: true,
              documentVerifications: {
                include: {
                  document: true,
                },
              },
            },
          },
          checklistItems: {
            orderBy: { category: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    // Attach `isDocumentVerificationRequired` flag per item
    const itemsWithFlags = await this.addDocumentVerificationFlag(items);

    // Add combined phone for candidate and return full candidate/project details
    const enrichedItems = itemsWithFlags.map((it) => {
      const cpm = it.candidateProjectMap;
      if (cpm?.candidate) {
        cpm.candidate = {
          ...cpm.candidate,
          phone: `${cpm.candidate.countryCode ?? ''} ${cpm.candidate.mobileNumber ?? ''}`,
        };
      }
      return it;
    });

    return {
      success: true,
      data: {
        items: enrichedItems,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
      message: 'Screenings retrieved successfully',
    };
  }

  /**
   * Get all approved screenings with candidate document details
   */
  async getApprovedList(query: QueryScreeningsDto) {
    const { page = 1, limit = 10, search, projectId, roleCatalogId } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      decision: SCREENING_DECISION.APPROVED,
    };

    const cpAND: any[] = [];

    if (projectId) {
      cpAND.push({ projectId });
    }

    if (roleCatalogId) {
      cpAND.push({
        roleNeeded: { is: { roleCatalogId: roleCatalogId } }
      });
    }

    if (search) {
      cpAND.push({
        candidate: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { mobileNumber: { contains: search, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (cpAND.length > 0) {
      where.candidateProjectMap = {
        is: {
          AND: cpAND,
        },
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.screening.count({ where }),
      this.prisma.screening.findMany({
        where,
        include: {
          candidateProjectMap: {
            include: {
              candidate: {
                select: {
                  id: true,
                  profileImage: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  mobileNumber: true,
                }
              },
              project: {
                select: {
                  id: true,
                  title: true,
                  client: {
                    select: {
                      id: true,
                      name: true,
                      type: true,
                      email: true,
                      phone: true,
                    }
                  }
                }
              },
              // include only verification status for computing docsStatus, but do not return raw verifications
              documentVerifications: {
                where: { isDeleted: false },
                select: {
                  status: true,
                },
              },
              roleNeeded: {
                select: {
                  id: true,
                  designation: true,
                  roleCatalog: {
                    select: {
                      id: true,
                      name: true,
                      label: true,
                      shortName: true,
                    }
                  }
                }
              },
              recruiter: {
                select: {
                  id: true,
                  name: true,
                }
              },
              mainStatus: true,
              subStatus: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Compute docsStatus flag per item and remove raw documentVerifications from response
    const itemsWithDocsStatus = items.map((it) => {
      const cpm = it.candidateProjectMap ?? null;
      let docsStatus = 'pending';

      if (cpm && Array.isArray(cpm.documentVerifications)) {
        const statuses = cpm.documentVerifications.map((v: any) => v.status);
        if (statuses.includes('rejected')) docsStatus = 'rejected';
        else if (statuses.length === 0) docsStatus = 'pending';
        else if (statuses.every((s: string) => s === 'verified')) docsStatus = 'verified';
        else if (statuses.includes('pending')) docsStatus = 'pending';
        else if (statuses.includes('verified')) docsStatus = 'verified';
      }

      if (!cpm) return it;

      // Remove documentVerifications array from the returned object and add docsStatus flag
      const { documentVerifications, ...rest } = cpm as any;
      return {
        ...it,
        candidateProjectMap: {
          ...rest,
          docsStatus,
        },
      };
    });

    // Determine `isInInterview` for candidate-projects by checking status history
    const cpIds = itemsWithDocsStatus
      .map((it) => it.candidateProjectMap?.id)
      .filter(Boolean);

    const interviewSubStatuses = [
      'interview_assigned',
      'interview_scheduled',
      'interview_rescheduled',
      'interview_completed',
      'interview_passed',
      'interview_failed',
    ];

    const interviewHistories = cpIds.length
      ? await this.prisma.candidateProjectStatusHistory.findMany({
          where: {
            candidateProjectMapId: { in: cpIds },
            subStatus: { name: { in: interviewSubStatuses } },
          },
          select: { candidateProjectMapId: true },
        })
      : [];

    const inInterviewSet = new Set(interviewHistories.map((h) => h.candidateProjectMapId));

    // Attach latest `sendToClient` (DocumentForwardHistory) per candidate-project-role and the `isInInterview` flag
    const itemsWithSendToClient = await Promise.all(
      itemsWithDocsStatus.map(async (it) => {
        const cpm = it.candidateProjectMap;
        if (!cpm) return { ...it, sendToClient: null, isInInterview: false };

        const candidateId = cpm.candidate?.id;
        const projectId = cpm.project?.id;
        const roleCatalogId = cpm.roleNeeded?.roleCatalog?.id || null;

        const latestForward = await this.prisma.documentForwardHistory.findFirst({
          where: {
            candidateId,
            projectId,
            roleCatalogId: roleCatalogId || null,
          },
          orderBy: { sentAt: 'desc' },
        });

        return {
          ...it,
          sendToClient: latestForward ?? null,
          isInInterview: Boolean(inInterviewSet.has(cpm.id)),
        };
      }),
    );

    return {
      success: true,
      data: {
        items: itemsWithSendToClient,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
      message: 'Approved screenings retrieved successfully',
    };

    return {
      success: true,
      data: {
        items: itemsWithDocsStatus,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
      message: 'Approved screenings retrieved successfully',
    };
  }

  /**
   * Helper: attach `isDocumentVerificationRequired` and `isDocumentVerified` to screening items
   * - isDocumentVerificationRequired: true when candidate-project has NOT been sent for document verification
   * - isDocumentVerified: true when candidate-project has a history entry with sub-status 'documents_verified'
   */
  private async addDocumentVerificationFlag(items: any[]) {
    if (!items || items.length === 0) return items;

    // collect distinct candidateProjectMapIds
    const cpIds = Array.from(new Set(items.map((it) => it.candidateProjectMapId).filter(Boolean)));
    if (cpIds.length === 0) return items.map((it) => ({ ...it, isDocumentVerificationRequired: true, isDocumentVerified: false }));

    // Resolve relevant statuses
    const [mainStatus, subStatusVerification, subStatusVerified] = await Promise.all([
      this.prisma.candidateProjectMainStatus.findUnique({ where: { name: 'documents' } }),
      this.prisma.candidateProjectSubStatus.findUnique({ where: { name: 'verification_in_progress_document' } }),
      this.prisma.candidateProjectSubStatus.findUnique({ where: { name: 'documents_verified' } }),
    ]);

    // If none of the status records exist, default to requiring verification and not verified
    if (!mainStatus && !subStatusVerification && !subStatusVerified) {
      return items.map((it) => ({ ...it, isDocumentVerificationRequired: true, isDocumentVerified: false }));
    }

    // Fetch histories for these candidate-project ids
    const histories = await this.prisma.candidateProjectStatusHistory.findMany({
      where: {
        candidateProjectMapId: { in: cpIds },
        OR: [
          ...(mainStatus ? [{ mainStatusId: mainStatus.id }] : []),
          ...(subStatusVerification ? [{ subStatusId: subStatusVerification.id }] : []),
          ...(subStatusVerified ? [{ subStatusId: subStatusVerified.id }] : []),
        ],
      },
      select: { candidateProjectMapId: true, mainStatusId: true, subStatusId: true },
    });

    const sentSet = new Set<string>();
    const verifiedSet = new Set<string>();

    for (const h of histories) {
      if (mainStatus && h.mainStatusId === mainStatus.id) sentSet.add(h.candidateProjectMapId);
      if (subStatusVerification && h.subStatusId === subStatusVerification.id) sentSet.add(h.candidateProjectMapId);
      if (subStatusVerified && h.subStatusId === subStatusVerified.id) verifiedSet.add(h.candidateProjectMapId);
    }

    return items.map((it) => ({
      ...it,
      isDocumentVerificationRequired: !sentSet.has(it.candidateProjectMapId),
      isDocumentVerified: verifiedSet.has(it.candidateProjectMapId),
    }));
  }

  /**
   * Find a single screening by ID
   */
  async findOne(id: string) {
    const interview = await this.prisma.screening.findUnique({
      where: { id },
      include: {
          candidateProjectMap: {
            include: {
              candidate: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  gender: true,
                  email: true,
                  profileImage: true,
                  countryCode: true,
                  mobileNumber: true,
                  dateOfBirth: true,
                  currentRole: true,
                  currentEmployer: true,
                  experience: true,
                  totalExperience: true,
                  candidateContacts: true,
                  referralCompanyName: true,
                  qualifications: {
                    include: {
                      qualification: { select: { id: true, name: true, shortName: true, level: true } },
                    },
                  },
                  workExperiences: {
                    select: {
                      id: true,
                      companyName: true,
                      jobTitle: true,
                      startDate: true,
                      endDate: true,
                      isCurrent: true,
                      description: true,
                      location: true,
                      skills: true,
                    },
                  },
                  documents: { where: { isDeleted: false } },
                },
              },
              project: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  deadline: true,
                  priority: true,
                  groomingRequired: true,
                  projectType: true,
                  client: { select: { id: true, name: true, email: true, phone: true } },
                  country: { select: { code: true, name: true } },
                  creator: { select: { id: true, name: true } },
                  documentRequirements: true,
                },
              },
              roleNeeded: { select: { id: true, designation: true, roleCatalogId: true, roleCatalog: { select: { id: true, name: true, label: true, shortName: true } } } },
              // Ensure callers get the current main/sub status on the candidate-project map
              mainStatus: true,
              subStatus: true,
              documentVerifications: {
                include: {
                  document: true,
                },
              },
            },
          },
        template: {
          include: {
            items: {
              orderBy: [{ category: 'asc' }, { order: 'asc' }],
            },
          },
        },
        checklistItems: {
          orderBy: { category: 'asc' },
        },
        trainingAssignments: {
          include: {
            trainingSessions: true,
          },
        },
      },
    });

    if (!interview) {
      throw new NotFoundException(`Screening with ID "${id}" not found`);
    }

    // Prefer included RoleCatalog if available, otherwise fall back to lookup by designation
    let roleCatalog: {
      id: string;
      name: string;
      label: string;
      shortName?: string | null;
    } | null = interview.candidateProjectMap?.roleNeeded?.roleCatalog ?? null;

    if (!roleCatalog && interview.candidateProjectMap?.roleNeeded?.designation) {
      roleCatalog = await this.prisma.roleCatalog.findFirst({
        where: {
          name: {
            equals: interview.candidateProjectMap.roleNeeded.designation,
            mode: 'insensitive',
          },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          label: true,
          shortName: true,
        },
      });
    }

    // Build combined contact string for candidate (countryCode + mobileNumber)
    const candidateWithContact = interview.candidateProjectMap?.candidate
      ? {
          ...interview.candidateProjectMap.candidate,
          phone: `${interview.candidateProjectMap.candidate.countryCode ?? ''} ${interview.candidateProjectMap.candidate.mobileNumber ?? ''}`,
        }
      : null;

    // Fetch coordinator details and return as an object { id, name }
    let coordinator: { id: string; name: string | null } | null = null;
    if (interview.coordinatorId) {
      const coordUser = await this.prisma.user.findUnique({
        where: { id: interview.coordinatorId },
        select: { id: true, name: true },
      });
      coordinator = coordUser ? { id: coordUser.id, name: coordUser.name ?? null } : { id: interview.coordinatorId, name: null };
    }

    // Attach document flags (re-use helper) and add roleCatalog, coordinator object, and candidate contact
    const [augmented] = await this.addDocumentVerificationFlag([interview]);

    return {
      ...interview,
      coordinator,
      isDocumentVerificationRequired: augmented?.isDocumentVerificationRequired ?? true,
      isDocumentVerified: augmented?.isDocumentVerified ?? false,
      candidateProjectMap: {
        ...interview.candidateProjectMap,
        candidate: candidateWithContact,
        roleCatalog,
      },
    };
  }

  /**
   * Find screening details by candidate, project, and role catalog
   */
  async findByDetails(candidateId: string, projectId: string, roleCatalogId: string) {
    const screening = await this.prisma.screening.findFirst({
      where: {
        candidateProjectMap: {
          candidateId,
          projectId,
          roleNeeded: {
            roleCatalogId,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (!screening) {
      throw new NotFoundException(
        `No screening found for candidate ${candidateId}, project ${projectId}, and role ${roleCatalogId}`,
      );
    }

    return this.findOne(screening.id);
  }

  /**
   * Update a screening (scheduling details only)
   */
  async update(id: string, dto: UpdateScreeningDto) {
    // Verify interview exists
    const existing = await this.findOne(id);

    // Don't allow updates if already completed. Prefer authoritative markers
    // (status or decision) when determining completion to avoid false
    // positives from stray `conductedAt` values in historical data.
    if (
      existing.status === SCREENING_STATUS.COMPLETED ||
      existing.decision != null
    ) {
      throw new BadRequestException(
        'Cannot update a completed screening. Use the complete endpoint instead.',
      );
    }

    // Make the update in a transaction so we can write an interview-level history entry
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedInterview = await tx.screening.update({
        where: { id },
        data: {
          scheduledTime: dto.scheduledTime
            ? new Date(dto.scheduledTime)
            : undefined,
          duration: dto.duration,
          meetingLink: dto.meetingLink,
          mode: dto.mode,
        },
        include: {
          candidateProjectMap: {
            include: {
              candidate: {
                select: { firstName: true, lastName: true, email: true },
              },
              project: { select: { title: true } },
              roleNeeded: { select: { designation: true } },
              // include statuses in updates/reads
              mainStatus: true,
              subStatus: true,
            },
          },
        },
      });

      // Determine status change for scheduling
      const previousStatus = existing.scheduledTime ? 'scheduled' : null;
      let newStatus: string | null = null;
      if (dto.scheduledTime) {
        // scheduling or rescheduling
        newStatus = existing.scheduledTime ? 'rescheduled' : 'scheduled';
      } else if (!dto.scheduledTime && existing.scheduledTime) {
        // unscheduling/cleared scheduled time
        newStatus = 'unscheduled';
      }

        if (newStatus) {
        await tx.interviewStatusHistory.create({
          data: {
            interviewType: 'screening',
            interviewId: id,
            candidateProjectMapId: existing.candidateProjectMapId,
            previousStatus: previousStatus,
            status: newStatus,
            statusSnapshot:
              newStatus === 'rescheduled'
                ? 'Screening Rescheduled'
                : newStatus === 'unscheduled'
                ? 'Screening Unscheduling'
                : 'Screening Scheduled',
            statusAt: new Date(),
            // update endpoint does not currently pass user info through controller
            changedById: null,
            changedByName: null,
            reason: dto.meetingLink ? `Updated meeting link` : undefined,
          },
        });
      }

      return updatedInterview;
    });

    return updated;
  }

  /**
   * Update only the template associated with a screening
   */
  async updateTemplate(id: string, templateId: string) {
    // Verify interview exists (findOne will throw if not found)
    const existing = await this.findOne(id);

    // Prevent changing template after interview is completed. Check status to
    // avoid mis-detection when `conductedAt` is present for other reasons.
    if (
      existing.status === SCREENING_STATUS.COMPLETED ||
      existing.decision != null
    ) {
      throw new BadRequestException('Cannot change template for a completed screening');
    }

    // Verify template exists and matches candidate role if applicable.
    // We intentionally validate the interview's completion before fetching
    // the template so callers receive the more relevant "completed" error
    // when appropriate.
    const template = await this.prisma.screeningTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      throw new NotFoundException(`Template with ID "${templateId}" not found`);
    }

    if (existing.candidateProjectMap?.roleNeeded?.designation) {
      const roleCatalog = await this.prisma.roleCatalog.findFirst({
        where: {
          name: { equals: existing.candidateProjectMap.roleNeeded.designation, mode: 'insensitive' },
        },
        select: { id: true },
      });

      // if (roleCatalog && template.roleId !== roleCatalog.id) {
      //   throw new BadRequestException('Template role does not match candidate role');
      // }
    }

    // Update the screening's templateId
    try {
      await this.prisma.screening.update({ where: { id }, data: { templateId } });
    } catch (e: any) {
      if (e?.code === 'P2003' && e?.meta?.constraint && e.meta.constraint.includes('templateId')) {
        throw new NotFoundException(`Template with ID "${templateId}" not found`);
      }
      throw e;
    }

    return this.findOne(id);
  }

  /**
   * Complete a screening with assessment results
   */
  async complete(id: string, dto: CompleteScreeningDto, userId: string) {
    // Verify interview exists
    const existing = await this.findOne(id);

    // Check if already completed
    if (existing.conductedAt) {
      throw new BadRequestException('This screening is already completed');
    }

    // Use transaction to update interview and create checklist items
    const result = await this.prisma.$transaction(async (tx) => {
      // Update the screening
      const updated = await tx.screening.update({
        where: { id },
        data: {
          conductedAt: new Date(),
          overallRating: dto.overallRating,
          decision: dto.decision,
          remarks: dto.remarks,
          strengths: dto.strengths,
          status: SCREENING_STATUS.COMPLETED,
          areasOfImprovement: dto.areasOfImprovement,
        },
      });

      // Create checklist items
      if (dto.checklistItems && dto.checklistItems.length > 0) {
        await tx.screeningChecklistItem.createMany({
          data: dto.checklistItems.map((item) => ({
            screeningId: id,
            templateItemId: item.templateItemId, // Link to template item if from template
            category: item.category,
            criterion: item.criterion,
            passed: item.passed,
            notes: item.notes,
            score: item.score,
          })),
        });
      }

      // Update candidate-project status based on decision
      const statusUpdate: any = {};

      if (dto.decision === SCREENING_DECISION.APPROVED) {
        statusUpdate.subStatus = {
          connect: {
            name: CANDIDATE_PROJECT_STATUS.SCREENING_PASSED,
          },
        };
      } else if (dto.decision === SCREENING_DECISION.NEEDS_TRAINING) {
        statusUpdate.subStatus = {
          connect: {
            name: CANDIDATE_PROJECT_STATUS.SCREENING_FAILED,
          },
        };
      } else if (dto.decision === SCREENING_DECISION.REJECTED) {
        statusUpdate.subStatus = {
          connect: {
            name: CANDIDATE_PROJECT_STATUS.REJECTED_INTERVIEW,
          },
        };
      }

      // Apply the sub-status update and capture the updated map so we can create
      // a correct history record (we need the actual subStatus.id, not the name)
      const updatedMap = await tx.candidateProjects.update({
        where: { id: existing.candidateProjectMapId },
        data: statusUpdate,
        include: { subStatus: true, mainStatus: true },
      });

      // Create status history entry using accurate snapshot + FK id
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: existing.candidateProjectMapId,
          subStatusId: updatedMap.subStatus?.id ?? null,
          subStatusSnapshot: updatedMap.subStatus?.name ?? null,
          changedById: userId,
          reason: `Screening ${dto.decision}`,
          notes: dto.remarks,
        },
      });

    
      await tx.interviewStatusHistory.create({
        data: {
          interviewType: 'screening',
          interviewId: id,
          candidateProjectMapId: existing.candidateProjectMapId,
          status: 'completed',
          statusSnapshot: 'Screening Completed',
          statusAt: new Date(),
          changedById: userId,
    
        },
      });

      return updated;
    });

    // Fetch complete result with relations
    const finalResult = await this.findOne(id);

    // Auto-trigger "send for verification" if approved and no documents assigned yet
    if (dto.decision === SCREENING_DECISION.APPROVED) {
      const cpm = finalResult.candidateProjectMap;
      
      // Only auto-send if there are no existing document verifications for this candidate/project nomination
      const hasExistingDocs = (cpm as any)?.documentVerifications?.length > 0;
      
      if (!hasExistingDocs && cpm && userId) {
        try {
          await this.candidateProjectsService.sendForVerification(
            {
              candidateId: cpm.candidateId,
              projectId: cpm.projectId,
              roleNeededId: cpm.roleNeededId as string,
              recruiterId: cpm.recruiterId || undefined,
              notes: 'Automatically sent for document verification after passing screening assessment.',
            } as any,
            userId,
          );
          this.logger.log(`Automatically sent candidate ${cpm.candidateId} for verification after passing screening.`);
        } catch (error) {
          this.logger.error(`Failed to automatically send for verification: ${error.message}`);
          // We don't throw here to avoid failing the whole screening completion if verification auto-trigger fails
        }
      }
    }

    return finalResult;
  }

  /**
  * Delete a screening (only if not completed)
   */
  async remove(id: string) {
    // Verify interview exists
    const existing = await this.findOne(id);

    // Don't allow deletion if completed. Prefer status check over `conductedAt`.
    if (
      existing.status === SCREENING_STATUS.COMPLETED ||
      existing.decision != null
    ) {
      throw new BadRequestException('Cannot delete a completed screening');
    }

    await this.prisma.screening.delete({
      where: { id },
    });

    return { success: true, message: 'Screening deleted successfully' };
  }

  /**
  * Get screening statistics for a coordinator
   */
  async getCoordinatorStats(coordinatorId: string) {
    const [total, completed, pending, approved, needsTraining, rejected] =
      await Promise.all([
        this.prisma.screening.count({ where: { coordinatorId } }),
        this.prisma.screening.count({ where: { coordinatorId, conductedAt: { not: null } } }),
        this.prisma.screening.count({ where: { coordinatorId, conductedAt: null } }),
        this.prisma.screening.count({ where: { coordinatorId, decision: SCREENING_DECISION.APPROVED } }),
        this.prisma.screening.count({ where: { coordinatorId, decision: SCREENING_DECISION.NEEDS_TRAINING } }),
        this.prisma.screening.count({ where: { coordinatorId, decision: SCREENING_DECISION.REJECTED } }),
      ]);

    return {
      total,
      completed,
      pending,
      byDecision: {
        approved,
        needsTraining,
        rejected,
      },
      approvalRate:
        completed > 0 ? ((approved / completed) * 100).toFixed(2) : '0',
    };
  }

  /**
  * Get screening related status history for a candidate-project map
   * Supports pagination via { page, limit } in query
   */
  async getScreeningHistory(candidateProjectMapId: string, query: any) {
    const { page = 1, limit = 20 } = query || {};

    // Ensure candidate-project exists
    const cp = await this.prisma.candidateProjects.findUnique({ where: { id: candidateProjectMapId } });
    if (!cp) {
      throw new NotFoundException(`Candidate-Project with ID "${candidateProjectMapId}" not found`);
    }

    const where = { candidateProjectMapId, interviewType: 'screening' };

    const total = await this.prisma.interviewStatusHistory.count({ where });

    const items = await this.prisma.interviewStatusHistory.findMany({
      where,
      include: {
        changedBy: { select: { id: true, name: true } },
      },
      orderBy: { statusAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      success: true,
      data: {
        items,
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
      message: 'Screening history for candidate-project',
    };
  }

  /**
  * Return candidate-project assignments that were set to 'screening_assigned',
   * ordered by the most recent history entry (statusChangedAt) for that sub-status.
   * This ensures the "latest assignment" appears first.
   */
  async getAssignedCandidateProjects(query: any) {
    const { page = 1, limit = 10, projectId, candidateId, recruiterId, roleCatalogId, search } = query;

    const where: any = {
      subStatus: { is: { name: 'screening_assigned' } },
    };

    if (projectId) where.projectId = projectId;
    if (candidateId) where.candidateId = candidateId;
    if (recruiterId) where.recruiterId = recruiterId;
    // Filter by roleCatalogId via the RoleNeeded relation
    if (roleCatalogId) {
      where.roleNeeded = { is: { roleCatalogId: roleCatalogId } };
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const s = search.trim();
      where.OR = [
        { id: { contains: s, mode: 'insensitive' } },
        { candidate: { firstName: { contains: s, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: s, mode: 'insensitive' } } },
        { candidate: { email: { contains: s, mode: 'insensitive' } } },
        { project: { title: { contains: s, mode: 'insensitive' } } },
        { roleNeeded: { designation: { contains: s, mode: 'insensitive' } } },
      ];
    }

    // Count total matching maps for pagination
    const total = await this.prisma.candidateProjects.count({ where });

    // Get paginated candidate-project maps ordered by assignment time (most recent first)
    const items = await this.prisma.candidateProjects.findMany({
      where,
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
            email: true,
            profileImage: true,
            countryCode: true,
            mobileNumber: true,
            dateOfBirth: true,
            currentRole: true,
            currentEmployer: true,
            experience: true,
            totalExperience: true,
            qualifications: {
              include: {
                qualification: { select: { id: true, name: true, shortName: true, level: true } },
              },
            },
            workExperiences: {
              select: {
                id: true,
                companyName: true,
                jobTitle: true,
                startDate: true,
                endDate: true,
                isCurrent: true,
                description: true,
                location: true,
                skills: true,
              },
            },
          },
        },
        project: {
          include: {
            client: { select: { id: true, name: true } },
            country: { select: { code: true, name: true } },
            creator: { select: { id: true, name: true } },
            documentRequirements: true,
          },
        },
        roleNeeded: { select: { id: true, designation: true } },
        recruiter: { select: { id: true, name: true, email: true } },
        mainStatus: true,
        subStatus: true,
        documentVerifications: {
          include: {
            document: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Attach a combined phone field to the candidate for easier consumption by the frontend
    const itemsWithCandidatePhone = items.map((it) => {
      const candidate = it.candidate
        ? {
            ...it.candidate,
            phone: `${it.candidate.countryCode ?? ''} ${it.candidate.mobileNumber ?? ''}`.trim(),
          }
        : null;
      return { ...it, candidate };
    });

    return {
      success: true,
      data: {
        items: itemsWithCandidatePhone.map((it) => ({ ...it, assignedAt: it.assignedAt })),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
      message: 'Assigned candidate-projects for screenings (latest first)',
    };
  }

  /**
  * Return upcoming screenings (status = scheduled) ordered by scheduledTime ASC
   */
  async getUpcoming(query: any) {
    const { page = 1, limit = 20, coordinatorId, candidateProjectMapId, projectId, roleCatalogId, search } = query;

    // Return all scheduled screenings (don't exclude past times).
    // The UI needs to display expired (past) scheduled interviews too, so we'll
    // compute isExpired per-item below instead of filtering them out here.
    const where: any = {
      status: SCREENING_STATUS.SCHEDULED,
    };

    if (coordinatorId) where.coordinatorId = coordinatorId;
    if (candidateProjectMapId) where.candidateProjectMapId = candidateProjectMapId;

    // Support filtering by project and roleCatalog via candidateProjectMap relation
    const cpAND: any[] = [];
    if (projectId) cpAND.push({ projectId });
    if (roleCatalogId) cpAND.push({ roleNeeded: { is: { roleCatalogId } } });
    if (cpAND.length > 0) {
      where.candidateProjectMap = { is: { AND: cpAND } };
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const s = search.trim();
      where.OR = [
        { candidateProjectMap: { id: { contains: s, mode: 'insensitive' } } },
        { candidateProjectMap: { candidate: { firstName: { contains: s, mode: 'insensitive' } } } },
        { candidateProjectMap: { candidate: { lastName: { contains: s, mode: 'insensitive' } } } },
        { candidateProjectMap: { candidate: { email: { contains: s, mode: 'insensitive' } } } },
        { candidateProjectMap: { project: { title: { contains: s, mode: 'insensitive' } } } },
        { candidateProjectMap: { roleNeeded: { designation: { contains: s, mode: 'insensitive' } } } },
      ];
    }

    const total = await this.prisma.screening.count({ where });

    const items = await this.prisma.screening.findMany({
      where,
      include: {
        candidateProjectMap: {
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
                email: true,
                profileImage: true,
                countryCode: true,
                mobileNumber: true,
                dateOfBirth: true,
                currentRole: true,
                currentEmployer: true,
                experience: true,
                totalExperience: true,
                candidateContacts: true,
                referralCompanyName: true,
                qualifications: {
                  include: {
                    qualification: { select: { id: true, name: true, shortName: true, level: true } },
                  },
                },
                workExperiences: {
                  select: {
                    id: true,
                    companyName: true,
                    jobTitle: true,
                    startDate: true,
                    endDate: true,
                    isCurrent: true,
                    description: true,
                    location: true,
                    skills: true,
                  },
                },
                documents: { where: { isDeleted: false } },
              },
            },
            project: {
              select: {
                id: true,
                title: true,
                description: true,
                deadline: true,
                priority: true,
                groomingRequired: true,
                projectType: true,
                client: { select: { id: true, name: true, email: true, phone: true } },
                country: { select: { code: true, name: true } },
                creator: { select: { id: true, name: true } },
                documentRequirements: true,
              },
            },

            roleNeeded: { select: { id: true, designation: true, roleCatalogId: true } },
            mainStatus: true,
            subStatus: true,
            documentVerifications: {
              include: {
                document: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledTime: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Add an isExpired flag so caller/UI can render past scheduled interviews
    // differently. Treat null scheduledTime as not expired.
    const now = new Date();
    const itemsWithExpired = items.map((it) => ({
      ...it,
      isExpired: it.scheduledTime ? new Date(it.scheduledTime) < now : false,
    }));

    // Attach document flags to upcoming items
    let itemsWithFlags: any[] = await this.addDocumentVerificationFlag(itemsWithExpired);

    // Enrich candidate with combined phone and keep full details
    itemsWithFlags = itemsWithFlags.map((it) => {
      const cp = it.candidateProjectMap ?? null;
      if (!cp) return it;
      const cand = cp.candidate
        ? { ...cp.candidate, phone: `${cp.candidate.countryCode ?? ''} ${cp.candidate.mobileNumber ?? ''}`.trim() }
        : null;
      return { ...it, candidateProjectMap: { ...cp, candidate: cand } };
    });

    return {
      success: true,
      data: {
        items: itemsWithFlags,
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
      message: 'Upcoming screenings (scheduled earliest first)',
    };
  }

  /**
   * Assign a candidate to a main interview (mirrors candidate-projects sendForInterview)
   */
  async assignToMainInterview(dto: any, userId: string) {
    const { projectId, candidateId, recruiterId: providedRecruiterId, notes } = dto as any;

    // Validate candidate and project
    const candidate = await this.prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) throw new NotFoundException(`Candidate with ID ${candidateId} not found`);

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found`);

    // Resolve recruiter
    let recruiterId = providedRecruiterId ?? userId;
    const recruiter = recruiterId ? await this.prisma.user.findUnique({ where: { id: recruiterId } }) : null;
    if (recruiterId && !recruiter) throw new NotFoundException(`Recruiter with ID "${recruiterId}" not found`);

    // Determine statuses
    const mainStatus = await this.prisma.candidateProjectMainStatus.findUnique({ where: { name: 'interview' } });
    const subName  = 'interview_assigned';
    const subStatus = await this.prisma.candidateProjectSubStatus.findUnique({ where: { name: subName } });

    if (!mainStatus || !subStatus) throw new BadRequestException('Required status not found');

    // Get user snapshot (only fetch when userId provided)
    const user = userId ? await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } }) : null;

    const existingAssignment = await this.prisma.candidateProjects.findFirst({ where: { candidateId, projectId } });

    const candidateProject = await this.prisma.$transaction(async (tx) => {
      if (existingAssignment) {
        const updated = await tx.candidateProjects.update({
          where: { id: existingAssignment.id },
          data: {
            recruiterId: recruiterId ?? undefined,
            assignedAt: new Date(),
            notes: notes ?? existingAssignment.notes,
            mainStatusId: mainStatus.id,
            subStatusId: subStatus.id,
          },
          include: {
            candidate: true,
            project: true,
            roleNeeded: true,
            recruiter: true,
            currentProjectStatus: true,
          },
        });

        await tx.candidateProjectStatusHistory.create({
          data: {
            candidateProjectMapId: existingAssignment.id,
            mainStatusId: mainStatus.id,
            subStatusId: subStatus.id,
            subStatusSnapshot: subStatus.name,
            changedById: userId,
            changedByName: user?.name ?? null,
            reason: notes ?? 'Assigned to interview',
          },
        });
        // Update any pending screenings for this candidate-project to mark them as
        // assigned to the main interview flow and write interview-level history.
        if (tx.screening && tx.interviewStatusHistory) {
          // If a specific screeningId is provided in the request, update only that
          // interview (validate it belongs to this candidate-project map). Otherwise
          // update any pending scheduled screenings for the map (existing behavior).
          const targetScreeningId = (dto as any)?.screeningId;
          if (targetScreeningId) {
            const target = await tx.screening.findUnique({ where: { id: targetScreeningId } });
            if (!target || target.candidateProjectMapId !== existingAssignment.id) {
              throw new NotFoundException(`Screening with ID "${targetScreeningId}" not found for this candidate-project`);
            }

            await tx.screening.update({ where: { id: targetScreeningId }, data: { status: SCREENING_STATUS.ASSIGNED_TO_MAIN_INTERVIEW } });
            await tx.interviewStatusHistory.create({
              data: {
                interviewType: 'screening',
                interviewId: targetScreeningId,
                candidateProjectMapId: existingAssignment.id,
                previousStatus: target.status ?? null,
                status: SCREENING_STATUS.ASSIGNED_TO_MAIN_INTERVIEW,
                statusSnapshot: 'Assigned to Main Interview',
                statusAt: new Date(),
                changedById: userId ?? null,
                changedByName: user?.name ?? null,
                reason: notes ?? 'Assigned to main interview',
              },
            });
          }
        }

        return updated;
      }

      const created = await tx.candidateProjects.create({
        data: {
          candidateId,
          projectId,
          recruiterId: recruiterId ?? null,
          assignedAt: new Date(),
          notes: notes ?? null,
          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,
        },
        include: {
          candidate: true,
          project: true,
          roleNeeded: true,
          recruiter: true,
          currentProjectStatus: true,
        },
      });

      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: created.id,
          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,
          subStatusSnapshot: subStatus.name,
          changedById: userId,
          changedByName: user?.name ?? null,
          reason: notes ?? 'Assigned to interview',
        },
      });

      // Update any pending screenings for this newly created candidate-project map
      // to mark them as assigned to the main interview flow and write interview-level history.
      if (tx.screening && tx.interviewStatusHistory) {
        const targetScreeningId = (dto as any)?.screeningId;
        if (targetScreeningId) {
          const target = await tx.screening.findUnique({ where: { id: targetScreeningId } });
          if (!target || target.candidateProjectMapId !== created.id) {
            throw new NotFoundException(`Screening with ID "${targetScreeningId}" not found for this candidate-project`);
          }

          await tx.screening.update({ where: { id: targetScreeningId }, data: { status: SCREENING_STATUS.ASSIGNED_TO_MAIN_INTERVIEW } });
          await tx.interviewStatusHistory.create({
            data: {
              interviewType: 'screening',
              interviewId: targetScreeningId,
              candidateProjectMapId: created.id,
              previousStatus: target.status ?? null,
              status: SCREENING_STATUS.ASSIGNED_TO_MAIN_INTERVIEW,
              statusSnapshot: 'Assigned to Main Interview',
              statusAt: new Date(),
              changedById: userId ?? null,
              changedByName: user?.name ?? null,
              reason: notes ?? 'Assigned to main interview',
            },
          });
        }
      }

      return created;
    });

    return candidateProject;
  }
}
