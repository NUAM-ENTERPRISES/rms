import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { OutboxService } from '../notifications/outbox.service';
import { PrismaService } from '../database/prisma.service';
import { CreateCandidateProjectDto } from './dto/create-candidate-project.dto';
import { UpdateCandidateProjectDto } from './dto/update-candidate-project.dto';
import { QueryCandidateProjectsDto } from './dto/query-candidate-projects.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { SendForInterviewDto } from './dto/send-for-interview.dto';
import { BulkSendForInterviewDto } from './dto/bulk-send-for-interview.dto';
import { BulkCheckEligibilityDto } from './dto/bulk-check-eligibility.dto';
import { ProjectOverviewQueryDto, DatePeriod } from './dto/project-overview-query.dto';
import {
  CANDIDATE_PROJECT_STATUS,
  TRAINING_TYPE,
  TRAINING_PRIORITY,
  TRAINING_EVENT,
  DOCUMENT_STATUS,
  DOCUMENT_TYPE,
} from '../common/constants';

@Injectable()
export class CandidateProjectsService {
  private readonly logger = new Logger(CandidateProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Assign candidate to project with nominated status
   * Creates a new candidate-project assignment with status ID 1 (nominated)
   * and creates an initial status history entry
   * Automatically matches candidate qualifications with project roles if roleNeededId not provided
   *
   */
  async assignCandidateToProject(
    createDto: CreateCandidateProjectDto,
    userId: string,
  ) {
    let { candidateId, projectId, roleNeededId, recruiterId } = createDto;

    // -------------------------------
    // VERIFY candidate exists
    // -------------------------------
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // -------------------------------
    // VERIFY project exists
    // -------------------------------
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rolesNeeded: true,
      },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // -------------------------------
    // AUTO-MATCH ROLE
    // -------------------------------
    // if (!roleNeededId && project.rolesNeeded.length > 0) {
    //   const matchedRoleId = await this.autoMatchCandidateToRole(
    //     candidate,
    //     project.rolesNeeded,
    //   );
    //   if (matchedRoleId) {
    //     roleNeededId = matchedRoleId;
    //   }
    // }

    // -------------------------------
    // VERIFY role if provided
    // -------------------------------
    if (roleNeededId) {
      const role = project.rolesNeeded.find((r) => r.id === roleNeededId);
      if (!role) {
        throw new NotFoundException(
          `Role with ID ${roleNeededId} not found in this project`,
        );
      }

      // -------------------------------
      // VALIDATE GENDER AND AGE
      // -------------------------------
      this.validateCandidateForRole(candidate, role);
    }

    // -------------------------------
    // RECRUITER VALIDATION
    // -------------------------------
    // 1. Prioritize candidate's assigned recruiter from assignments table
    const activeRecruiterId = await this.getCandidateActiveRecruiter(candidateId);
    
    // 2. Use assigned recruiter, or provided one, otherwise fallback to current user
    const finalRecruiterId = activeRecruiterId || recruiterId || userId;

    const recruiter = await this.prisma.user.findUnique({
      where: { id: finalRecruiterId },
    });
    if (!recruiter) {
      throw new NotFoundException(`Recruiter not found`);
    }

    // -------------------------------
    // CHECK EXISTING assignment
    // -------------------------------
    const exists = await this.prisma.candidateProjects.findFirst({
      where: {
        candidateId,
        projectId,
        roleNeededId: roleNeededId || null,
      },
    });

    if (exists) {
      throw new BadRequestException(
        `Candidate already assigned to this project${roleNeededId ? ' for this role' : ''}`,
      );
    }

    // -------------------------------
    // GET NOMINATED MAIN & SUB STATUS
    // -------------------------------
    const mainStatus = await this.prisma.candidateProjectMainStatus.findUnique({
      where: { name: 'nominated' },
    });

    const subStatus = await this.prisma.candidateProjectSubStatus.findUnique({
      where: { name: 'nominated_initial' },
    });

    if (!mainStatus || !subStatus) {
      throw new BadRequestException(
        'Nominated status not found. Please seed the DB.',
      );
    }

    // -------------------------------
    // GET user name for history
    // -------------------------------
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // -------------------------------
    // CREATE ASSIGNMENT + HISTORY
    // -------------------------------
    const assignment = await this.prisma.$transaction(async (tx) => {
      // CREATE assignment with NEW STATUS SYSTEM
      const newAssignment = await tx.candidateProjects.create({
        data: {
          candidateId,
          projectId,
          roleNeededId: roleNeededId || null,
          recruiterId: finalRecruiterId || null,
          assignedAt: new Date(),
          notes: createDto.notes || null,

          // NEW STATUS SYSTEM
          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,
        },
        include: {
          candidate: true,
          project: true,
          roleNeeded: true,
          recruiter: true,
          mainStatus: true,
          subStatus: true,
        },
      });

      // CREATE NEW STATUS HISTORY RECORD
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: newAssignment.id,
          changedById: userId,
          changedByName: user?.name || null,

          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,

          mainStatusSnapshot: mainStatus.label,
          subStatusSnapshot: subStatus.label,

          reason: 'Initial assignment to project',
          notes: `Assigned to project${roleNeededId ? ' for specific role' : ''}`,
        },
      });

      // AUTO-ASSIGN DOCUMENTS OF SAME ROLE
      if (roleNeededId) {
        await this.autoAssignExistingDocuments(
          tx,
          candidateId,
          roleNeededId,
          newAssignment.id,
          userId,
          user?.name,
        );
      }

      return newAssignment;
    });

    return assignment;
  }

  /**
   * Send candidate for verification
   * Creates candidate-project assignment if not exists, or updates existing
   * Sets status to verification_in_progress (ID 4)
   * Automatically matches candidate qualifications with project roles if roleNeededId not provided
   */
  async sendForVerification(
    createDto: CreateCandidateProjectDto,
    userId: string,
  ) {
    let { candidateId, projectId, roleNeededId, recruiterId } = createDto;

    // -------------------------------
    // VERIFY candidate
    // -------------------------------
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate)
      throw new NotFoundException(`Candidate ${candidateId} not found`);

    // -------------------------------
    // VERIFY project
    // -------------------------------
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { rolesNeeded: true },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    // -------------------------------
    // AUTO MATCH ROLE
    // -------------------------------
    if (!roleNeededId && project.rolesNeeded.length > 0) {
      const matchedRoleId = await this.autoMatchCandidateToRole(
        candidate,
        project.rolesNeeded,
      );
      if (matchedRoleId) roleNeededId = matchedRoleId;
    }

    // -------------------------------
    // VALIDATE ROLE (IF PROVIDED)
    // -------------------------------
    if (roleNeededId) {
      const role = project.rolesNeeded.find((r) => r.id === roleNeededId);
      if (!role)
        throw new NotFoundException(
          `Role ${roleNeededId} not found in this project`,
        );

      // -------------------------------
      // VALIDATE GENDER AND AGE
      // -------------------------------
      this.validateCandidateForRole(candidate, role);
    }

    // -------------------------------
    // RECRUITER HANDLING
    // -------------------------------
    // 1. Prioritize candidate's assigned recruiter from assignments table
    const activeRecruiterId = await this.getCandidateActiveRecruiter(candidateId);
    
    // 2. Use assigned recruiter, or provided one, otherwise fallback to current user
    const finalRecruiterId = activeRecruiterId || recruiterId || userId;

    const recruiter = await this.prisma.user.findUnique({
      where: { id: finalRecruiterId },
    });
    if (!recruiter) {
      throw new NotFoundException(`Recruiter ${finalRecruiterId} not found`);
    }

    // -------------------------------
    // NEW STATUS SYSTEM
    // -------------------------------
    const mainStatus = await this.prisma.candidateProjectMainStatus.findUnique({
      where: { name: 'documents' },
    });

    const subStatus = await this.prisma.candidateProjectSubStatus.findUnique({
      where: { name: 'verification_in_progress_document' },
    });

    if (!mainStatus || !subStatus) {
      throw new BadRequestException(
        'Document verification statuses missing. Please seed the DB.',
      );
    }

    // -------------------------------
    // GET USER (FOR HISTORY SNAPSHOT)
    // -------------------------------
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // -------------------------------
    // CHECK EXISTING ASSIGNMENT
    // -------------------------------
    const existingAssignment = await this.prisma.candidateProjects.findFirst({
      where: {
        candidateId,
        projectId,
        roleNeededId: roleNeededId || null,
      },
    });

    // -------------------------------
    // CREATE OR UPDATE ASSIGNMENT
    // -------------------------------
    const candidateProject = await this.prisma.$transaction(async (tx) => {
      let assignment;

      if (existingAssignment) {
        // UPDATE
        assignment = await tx.candidateProjects.update({
          where: { id: existingAssignment.id },
          data: {
            mainStatusId: mainStatus.id,
            subStatusId: subStatus.id,
            recruiterId: finalRecruiterId, // Always ensure recruiter is synchronized
            notes: createDto.notes ?? existingAssignment.notes,
          },
          include: {
            candidate: true,
            project: true,
            roleNeeded: true,
            recruiter: true,
            mainStatus: true,
            subStatus: true,
          },
        });
      } else {
        // CREATE
        assignment = await tx.candidateProjects.create({
          data: {
            candidateId,
            projectId,
            roleNeededId: roleNeededId || null,
            recruiterId: finalRecruiterId || null,

            mainStatusId: mainStatus.id,
            subStatusId: subStatus.id,
            assignedAt: new Date(),
            notes: createDto.notes || null,
          },
          include: {
            candidate: true,
            project: true,
            roleNeeded: true,
            recruiter: true,
            mainStatus: true,
            subStatus: true,
          },
        });
      }

      // CREATE NEW HISTORY ENTRY
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: assignment.id,
          changedById: userId,
          changedByName: user?.name || null,

          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,

          mainStatusSnapshot: mainStatus.label,
          subStatusSnapshot: subStatus.label,

          reason: 'Sent for document verification',
          notes: createDto.notes || 'Verification started',
        },
      });

      // AUTO-ASSIGN DOCUMENTS OF SAME ROLE
      if (roleNeededId) {
        await this.autoAssignExistingDocuments(
          tx,
          candidateId,
          roleNeededId,
          assignment.id,
          userId,
          user?.name,
        );
      }

      return assignment;
    });

    // Publish outbox event for document verification so downstream services handle notifications
    await this.outboxService.publishCandidateSentForVerification(
      candidateProject.id,
      '', // assignedToExecutive (none selected here)
    );

    return candidateProject;
  }

  /**
   * Send candidate for screening
   * Creates or updates candidate-project assignment and sets status to interview / screening_assigned
   * Adds candidate project status history and interview status history entries
   */
  async sendForScreening(createDto: CreateCandidateProjectDto, userId: string) {
    let { candidateId, projectId, roleNeededId, recruiterId } = createDto;

    // -------------------------------
    // VERIFY candidate
    // -------------------------------
    const candidate = await this.prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) throw new NotFoundException(`Candidate ${candidateId} not found`);

    // -------------------------------
    // VERIFY project
    // -------------------------------
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, include: { rolesNeeded: true } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    // -------------------------------
    // AUTO MATCH ROLE
    // -------------------------------
    if (!roleNeededId && project.rolesNeeded.length > 0) {
      const matchedRoleId = await this.autoMatchCandidateToRole(candidate, project.rolesNeeded);
      if (matchedRoleId) roleNeededId = matchedRoleId;
    }

    // -------------------------------
    // VALIDATE ROLE (IF PROVIDED)
    // -------------------------------
    if (roleNeededId) {
      const role = project.rolesNeeded.find((r) => r.id === roleNeededId);
      if (!role)
        throw new BadRequestException(
          `Role ${roleNeededId} does not belong to project ${projectId}`,
        );

      // -------------------------------
      // VALIDATE GENDER AND AGE
      // -------------------------------
      this.validateCandidateForRole(candidate, role);
    }

    // -------------------------------
    // RECRUITER HANDLING
    // -------------------------------
    // 1. Prioritize candidate's assigned recruiter from assignments table
    const activeRecruiterId = await this.getCandidateActiveRecruiter(candidateId);
    
    // 2. Use assigned recruiter, or provided one, otherwise fallback to current user
    const finalRecruiterId = activeRecruiterId || recruiterId || userId;

    const recruiter = await this.prisma.user.findUnique({ where: { id: finalRecruiterId } });
    if (!recruiter) throw new NotFoundException(`Recruiter ${finalRecruiterId} not found`);

    // -------------------------------
    // NEW STATUS SYSTEM: interview / screening_assigned
    // -------------------------------
    const mainStatus = await this.prisma.candidateProjectMainStatus.findUnique({ where: { name: 'interview' } });
    const subStatus = await this.prisma.candidateProjectSubStatus.findUnique({ where: { name: 'screening_assigned' } });

    if (!mainStatus || !subStatus) {
      throw new BadRequestException('Interview statuses missing. Please seed the DB.');
    }

    // -------------------------------
    // GET USER (FOR HISTORY SNAPSHOT)
    // -------------------------------
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    // -------------------------------
    // CHECK EXISTING ASSIGNMENT
    // -------------------------------
    const existingAssignment = await this.prisma.candidateProjects.findFirst({ where: { candidateId, projectId, roleNeededId: roleNeededId || null } });

    // -------------------------------
    // CREATE OR UPDATE ASSIGNMENT
    // -------------------------------
    const candidateProject = await this.prisma.$transaction(async (tx) => {
      let assignment;

      if (existingAssignment) {
        // update status and always synchronize recruiter
        const data: any = {
          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,
          recruiterId: finalRecruiterId,
        };
        // Removed: if (recruiterId) data.recruiterId = recruiterId;
        if (createDto.notes !== undefined) data.notes = createDto.notes ?? existingAssignment.notes;

        assignment = await tx.candidateProjects.update({
          where: { id: existingAssignment.id },
          data,
          include: { candidate: true, project: true, mainStatus: true, subStatus: true, recruiter: true },
        });
      } else {
        assignment = await tx.candidateProjects.create({
          data: {
            candidateId,
            projectId,
            roleNeededId: roleNeededId || null,
            recruiterId: finalRecruiterId || null,
            assignedAt: new Date(),
            notes: createDto.notes || null,
            mainStatusId: mainStatus.id,
            subStatusId: subStatus.id,
          },
          include: { candidate: true, project: true, mainStatus: true, subStatus: true, recruiter: true },
        });
      }

      // CREATE NEW STATUS HISTORY RECORD
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: assignment.id,
          changedById: userId,
          changedByName: user?.name || null,

          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,

          mainStatusSnapshot: mainStatus.label,
          subStatusSnapshot: subStatus.label,

          reason: 'Sent for screening',
          notes: createDto.notes || 'Screening assigned',
        },
      });

      // CREATE interview status history entry (screening event)
      await tx.interviewStatusHistory.create({
        data: {
          interviewType: 'screening',
          interviewId: null,
          candidateProjectMapId: assignment.id,
          previousStatus: null,
          status: 'assigned',
          statusSnapshot: 'Screening Assigned',
          statusAt: new Date(),
          changedById: userId,
          changedByName: user?.name || null,
          reason: 'Sent for screening',
        },
      });

      // AUTO-ASSIGN DOCUMENTS OF SAME ROLE
      if (roleNeededId) {
        await this.autoAssignExistingDocuments(
          tx,
          candidateId,
          roleNeededId,
          assignment.id,
          userId,
          user?.name,
        );
      }

      return assignment;
    });

    // Publish an outbox event so downstream services notify coordinators
    await this.outboxService.publishCandidateSentToScreening(
      candidateProject.id,
      '', // screeningId (none for assignment)
      '', // coordinatorId (not selected yet)
      recruiterId || userId || '',
    );

    return candidateProject;
  }

  /**
   * Send notifications to all Documentation Executive users
   */
  private async notifyDocumentationExecutives(
    candidateProject: any,
    candidate: any,
  ) {
    try {
      // Get Documentation Executive role
      const docRole = await this.prisma.role.findUnique({
        where: { name: 'Documentation Executive' },
        include: {
          userRoles: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!docRole || !docRole.userRoles.length) {
        console.log('No Documentation Executive users found');
        return;
      }

      // Use NotificationsService to create notifications so realtime socket events are emitted
      const createPromises = docRole.userRoles.map(async (userRole) => {
        const dto = {
          userId: userRole.user.id,
          type: 'DOCUMENT_VERIFICATION',
          title: 'New Document Verification Request',
          message: `${candidate.firstName} ${candidate.lastName} has been sent for document verification in project "${candidateProject.project.title}"`,
          idemKey: `doc-verify-${candidateProject.id}-${userRole.user.id}-${Date.now()}`,
          link: `/candidates/${candidate.id}/documents/${candidateProject.id}`,
          meta: {
            candidateProjectId: candidateProject.id,
            candidateId: candidate.id,
            projectId: candidateProject.projectId,
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            projectTitle: candidateProject.project.title,
          },
        };

        try {
          await this.notificationsService.createNotification(dto as any);
        } catch (err) {
          // Log and continue — the notification shouldn't block verification
          this.logger.error(
            `Failed to create/emit notification for user ${userRole.user.id}: ${err?.message || err}`,
          );
        }
      });

      await Promise.all(createPromises);

      this.logger.log(
        `✅ Sent notifications to ${docRole.userRoles.length} Documentation Executive users (issued via NotificationsService)`,
      );
    } catch (error) {
      console.error(
        'Error sending notifications to Documentation Executives:',
        error,
      );
      // Don't throw error - notifications are not critical
    }
  }
  // NOTE: Notifications for coordinators and documentation executives are handled via Outbox events
  // to keep this service focused on business logic and avoid duplication. Helper notification methods
  // removed in favor of outbox publishes.

  /**
   * Get an overview of candidates for a project with counts and filtered data
   */
  async getProjectOverview(
    projectId: string,
    queryDto: ProjectOverviewQueryDto,
    userId: string,
    userRoles: string[] = [],
  ) {
    const { 
      page = 1, 
      limit = 10, 
      roleCatalogId, 
      search, 
      startDate, 
      endDate, 
      period 
    } = queryDto;
    
    const skip = (page - 1) * limit;

    // -------------------------------
    // 1. Build Base Where Clause
    // -------------------------------
    const where: any = { projectId };

    if (roleCatalogId) {
      where.roleNeeded = { roleCatalogId };
    }

    // Capture base context (except mainStatus) for counts
    const baseWhereForCounts = { ...where };

    if (queryDto.mainStatus && queryDto.mainStatus !== 'all') {
      where.mainStatus = { name: queryDto.mainStatus };
    }

    // Role-based filtering: recruiter only sees their assigned candidates
    const isRecruiter = userRoles.includes('Recruiter');
    const isSpecialistOrManagement = userRoles.some(r =>
      [
        'CEO',
        'Director',
        'Manager',
        'Team Head',
        'Team Lead',
        'System Admin',
        'Documentation Executive',
        'Processing Executive',
        'Interview Coordinator',
        'Screening Trainer',
      ].includes(r),
    );

    if (isRecruiter && !isSpecialistOrManagement) {
      where.recruiterId = userId;
      baseWhereForCounts.recruiterId = userId;
    }

    // Date Filtering Logic
    if (period || (startDate && endDate)) {
      const dateRange: { gte?: Date; lte?: Date } = {};
      
      if (period) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (period) {
          case DatePeriod.TODAY:
            dateRange.gte = startOfDay;
            break;
          case DatePeriod.YESTERDAY:
            const yesterday = new Date(startOfDay);
            yesterday.setDate(yesterday.getDate() - 1);
            dateRange.gte = yesterday;
            dateRange.lte = new Date(startOfDay.getTime() - 1);
            break;
          case DatePeriod.THIS_WEEK:
            const firstDayOfWeek = new Date(startOfDay);
            const dayNum = firstDayOfWeek.getDay(); // 0 is Sunday
            firstDayOfWeek.setDate(firstDayOfWeek.getDate() - (dayNum === 0 ? 6 : dayNum - 1)); // Set to Monday
            dateRange.gte = firstDayOfWeek;
            break;
          case DatePeriod.LAST_WEEK:
            const lastWeekStart = new Date(startOfDay);
            const todayDayNum = lastWeekStart.getDay();
            lastWeekStart.setDate(lastWeekStart.getDate() - (todayDayNum === 0 ? 6 : todayDayNum - 1) - 7);
            const lastWeekEnd = new Date(lastWeekStart);
            lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
            lastWeekEnd.setHours(23, 59, 59, 999);
            dateRange.gte = lastWeekStart;
            dateRange.lte = lastWeekEnd;
            break;
          case DatePeriod.THIS_MONTH:
            dateRange.gte = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case DatePeriod.LAST_MONTH:
            dateRange.gte = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            dateRange.lte = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            break;
          case DatePeriod.THIS_YEAR:
            dateRange.gte = new Date(now.getFullYear(), 0, 1);
            break;
        }
      } else if (startDate && endDate) {
        dateRange.gte = new Date(startDate);
        dateRange.lte = new Date(endDate);
      }

      if (dateRange.gte || dateRange.lte) {
        where.createdAt = dateRange;
        baseWhereForCounts.createdAt = dateRange;
      }
    }

    // Search Logic
    if (search) {
      const searchFilter = {
        candidate: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { mobileNumber: { contains: search, mode: 'insensitive' } },
          ],
        },
      };
      Object.assign(where, searchFilter);
      Object.assign(baseWhereForCounts, searchFilter);
    }

    // -------------------------------
    // 2. Query Counts and Paginated Data
    // -------------------------------
    const [
      totalCandidates,
      nominatedCount,
      documentsCount,
      interviewCount,
      processingCount,
      finalCount,
      data,
      project,
      filteredCount,
    ] = await Promise.all([
      // Total count should use baseWhereForCounts to ignore current status filter
      this.prisma.candidateProjects.count({ where: baseWhereForCounts }),

      // Individual counts by main status should also use baseWhereForCounts
      this.prisma.candidateProjects.count({
        where: { ...baseWhereForCounts, mainStatus: { name: 'nominated' } },
      }),
      this.prisma.candidateProjects.count({
        where: { ...baseWhereForCounts, mainStatus: { name: 'documents' } },
      }),
      this.prisma.candidateProjects.count({
        where: { ...baseWhereForCounts, mainStatus: { name: 'interview' } },
      }),
      this.prisma.candidateProjects.count({
        where: { ...baseWhereForCounts, mainStatus: { name: 'processing' } },
      }),
      this.prisma.candidateProjects.count({
        where: { ...baseWhereForCounts, mainStatus: { name: 'final' } },
      }),

      // Paginated candidate list uses 'where' (which includes mainStatus)
      this.prisma.candidateProjects.findMany({
        where,
        skip,
        take: limit,
        include: {
          candidate: true,
          project: {
            select: { title: true },
          },
          roleNeeded: {
            select: {
              id: true,
              projectId: true,
              roleCatalogId: true,
              designation: true,
              roleCatalog: true,
            },
          },
          mainStatus: true,
          subStatus: true,
          recruiter: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: { title: true },
      }),
      // Total filtered count for pagination
      this.prisma.candidateProjects.count({ where }),
    ]);

    return {
      projectTitle: project?.title || 'Unknown Project',
      summary: {
        totalCandidates,
        nominatedCount,
        documentsCount,
        interviewCount,
        processingCount,
        finalCount, // aka Deployed counts as per user request
      },
      data,
      meta: {
        total: filteredCount,
        page,
        limit,
        totalPages: Math.ceil(filteredCount / limit),
      },
    };
  }

  async findAll(queryDto: QueryCandidateProjectsDto) {
    const {
      page = 1,
      limit = 10,
      candidateId,
      projectId,
      recruiterId,
      statusId,
      search,
    } = queryDto;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (candidateId) {
      where.candidateId = candidateId;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (recruiterId) {
      where.recruiterId = recruiterId;
    }

    if (statusId) {
      where.currentProjectStatusId = statusId;
    }

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

    const [data, total] = await Promise.all([
      this.prisma.candidateProjects.findMany({
        where,
        skip,
        take: limit,
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              mobileNumber: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          roleNeeded: {
            select: {
              id: true,
              designation: true,
              minExperience: true,
              maxExperience: true,
            },
          },
          recruiter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          currentProjectStatus: true,
        },
        orderBy: {
          assignedAt: 'desc',
        },
      }),
      this.prisma.candidateProjects.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobileNumber: true,
            dateOfBirth: true,
            countryCode: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            deadline: true,
          },
        },
        roleNeeded: {
          select: {
            id: true,
            designation: true,
            minExperience: true,
            maxExperience: true,
            additionalRequirements: true,
          },
        },
        recruiter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        // NEW STATUS SYSTEM
        mainStatus: true,
        subStatus: true,

        // NEW STATUS HISTORY
        projectStatusHistory: {
          include: {
            changedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },

            // include main + sub status objects
            mainStatus: true,
            subStatus: true,
          },
          orderBy: {
            statusChangedAt: 'desc',
          },
        },
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project assignment with ID ${id} not found`,
      );
    }

    return candidateProject;
  }

  async update(
    id: string,
    updateDto: UpdateCandidateProjectDto,
    userId: string,
  ) {
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project assignment with ID ${id} not found`,
      );
    }

    const { roleNeededId, recruiterId, ...otherUpdates } = updateDto;

    // Verify role if being updated
    if (roleNeededId) {
      const roleNeeded = await this.prisma.roleNeeded.findUnique({
        where: { id: roleNeededId },
      });
      if (!roleNeeded) {
        throw new NotFoundException(`Role with ID ${roleNeededId} not found`);
      }
    }

    // Verify recruiter if being updated
    if (recruiterId) {
      const recruiter = await this.prisma.user.findUnique({
        where: { id: recruiterId },
      });
      if (!recruiter) {
        throw new NotFoundException(
          `Recruiter with ID ${recruiterId} not found`,
        );
      }
    }

    const updated = await this.prisma.candidateProjects.update({
      where: { id },
      data: {
        ...otherUpdates,
        roleNeededId,
        recruiterId,
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobileNumber: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        roleNeeded: {
          select: {
            id: true,
            designation: true,
            minExperience: true,
            maxExperience: true,
          },
        },
        recruiter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        currentProjectStatus: true,
      },
    });

    return updated;
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateProjectStatusDto,
    userId: string,
  ) {
    const { mainStatusId, subStatusId, subStatusName, reason, notes } = updateStatusDto;

    // -------------------------------------
    // FIND candidate project
    // -------------------------------------
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project assignment with ID ${id} not found`,
      );
    }

    // -------------------------------------
    // GET sub-status (required)
    // -------------------------------------
    let subStatus;
    if (subStatusId) {
      subStatus = await this.prisma.candidateProjectSubStatus.findUnique({
        where: { id: subStatusId },
        include: { stage: true },
      });
    } else if (subStatusName) {
      subStatus = await this.prisma.candidateProjectSubStatus.findUnique({
        where: { name: subStatusName },
        include: { stage: true },
      });
    }

    if (!subStatus) {
      throw new NotFoundException(
        `Sub-status ${subStatusId || subStatusName} not found`,
      );
    }

    // -------------------------------------
    // IF mainStatusId not given → use subStatus.stage
    // -------------------------------------
    const mainStatus = mainStatusId
      ? await this.prisma.candidateProjectMainStatus.findUnique({
          where: { id: mainStatusId },
        })
      : subStatus.stage; // auto detected

    if (!mainStatus) {
      throw new NotFoundException(`Main status not found`);
    }

    // -------------------------------------
    // GET USER NAME FOR HISTORY & RESOLVE RECRUITER
    // -------------------------------------
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const activeRecruiterId = await this.getCandidateActiveRecruiter(candidateProject.candidateId);

    // -------------------------------------
    // UPDATE & ADD HISTORY IN TRANSACTION
    // -------------------------------------
    const result = await this.prisma.$transaction(async (tx) => {
      // UPDATE current status (NEW SYSTEM)
      const updated = await tx.candidateProjects.update({
        where: { id },
        data: {
          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,
          // Sync recruiter if one is active in assignments table
          ...(activeRecruiterId ? { recruiterId: activeRecruiterId } : {}),
        },
        include: {
          candidate: true,
          project: true,
          roleNeeded: true,
          recruiter: true,
          mainStatus: true,
          subStatus: true,
        },
      });

      // Create history entry (NEW SYSTEM)
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: id,
          changedById: userId,
          changedByName: user?.name || null,

          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,

          mainStatusSnapshot: mainStatus.label,
          subStatusSnapshot: subStatus.label,

          reason: reason || null,
          notes: notes || null,
        },
      });

      return updated;
    });

    return result;
  }

  async remove(id: string) {
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project assignment with ID ${id} not found`,
      );
    }

    await this.prisma.candidateProjects.delete({
      where: { id },
    });

    return { message: 'Candidate project assignment deleted successfully' };
  }

  async getStatusHistory(id: string) {
    // -------------------------------------
    // VALIDATE candidate–project assignment
    // -------------------------------------
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project assignment with ID ${id} not found`,
      );
    }

    // -------------------------------------
    // FETCH STATUS HISTORY (NEW SYSTEM)
    // -------------------------------------
    const history = await this.prisma.candidateProjectStatusHistory.findMany({
      where: {
        candidateProjectMapId: id,
      },
      include: {
        changedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        // NEW RELATIONS
        mainStatus: {
          select: {
            id: true,
            name: true,
            label: true,
            color: true,
            order: true,
          },
        },
        subStatus: {
          select: {
            id: true,
            name: true,
            label: true,
            color: true,
            order: true,
          },
        },
      },
      orderBy: {
        statusChangedAt: 'desc',
      },
    });

    return history;
  }

  async getProjectCandidates(
    projectId: string,
    queryDto: QueryCandidateProjectsDto,
  ) {
    const { page = 1, limit = 10, statusId, search } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      projectId,
    };

    if (statusId) {
      where.currentProjectStatusId = statusId;
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

    const [data, total] = await Promise.all([
      this.prisma.candidateProjects.findMany({
        where,
        skip,
        take: limit,
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              mobileNumber: true,
            },
          },
          roleNeeded: {
            select: {
              id: true,
              designation: true,
              minExperience: true,
              maxExperience: true,
            },
          },
          recruiter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          currentProjectStatus: true,
        },
        orderBy: {
          assignedAt: 'desc',
        },
      }),
      this.prisma.candidateProjects.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCandidateProjects(
    candidateId: string,
    queryDto: QueryCandidateProjectsDto,
  ) {
    const { page = 1, limit = 10, statusId, search } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      candidateId,
    };

    if (statusId) {
      where.currentProjectStatusId = statusId;
    }

    if (search) {
      where.project = {
        title: { contains: search, mode: 'insensitive' },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.candidateProjects.findMany({
        where,
        skip,
        take: limit,
        include: {
          project: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              deadline: true,
            },
          },
          roleNeeded: {
            select: {
              id: true,
              designation: true,
              minExperience: true,
              maxExperience: true,
            },
          },
          recruiter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          currentProjectStatus: true,
        },
        orderBy: {
          assignedAt: 'desc',
        },
      }),
      this.prisma.candidateProjects.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Auto-match candidate to appropriate role based on qualifications
   * Matches candidate's education/qualifications with project's available roles
   */
  private async autoMatchCandidateToRole(
    candidate: any,
    rolesNeeded: any[],
  ): Promise<string | null> {
    if (!candidate.qualifications || candidate.qualifications.length === 0) {
      console.log('Candidate has no qualifications for auto-matching');
      return null;
    }

    // Extract qualification names and related role recommendations
    const candidateRoles = new Set<string>();

    for (const cq of candidate.qualifications) {
      const qual = cq.qualification;

      // Add the qualification field as potential role (e.g., "Nursing" -> "Nurse")
      if (qual.field) {
        candidateRoles.add(qual.field.toLowerCase());
      }

      // Add role recommendations
      if (qual.roleRecommendations) {
        for (const rec of qual.roleRecommendations) {
          if (rec.role && rec.role.name) {
            candidateRoles.add(rec.role.name.toLowerCase());
          }
        }
      }

      // Add qualification name as potential role match
      if (qual.name) {
        candidateRoles.add(qual.name.toLowerCase());
      }
    }

    console.log('Candidate potential roles:', Array.from(candidateRoles));

    // Try to match with project roles
    for (const roleNeeded of rolesNeeded) {
      const designation = roleNeeded.designation.toLowerCase();

      // Check for exact or partial match
      for (const candidateRole of candidateRoles) {
        // Exact match
        if (designation === candidateRole) {
          console.log(`Exact match found: ${roleNeeded.designation}`);
          return roleNeeded.id;
        }

        // Partial match (e.g., "Registered Nurse" contains "Nurse")
        if (
          designation.includes(candidateRole) ||
          candidateRole.includes(designation)
        ) {
          console.log(
            `Partial match found: ${roleNeeded.designation} ~ ${candidateRole}`,
          );
          return roleNeeded.id;
        }
      }
    }

    // If no match found, try matching by keywords
    const nursingKeywords = [
      'nurse',
      'nursing',
      'rn',
      'registered nurse',
      'staff nurse',
    ];
    const doctorKeywords = ['doctor', 'physician', 'md', 'medical doctor'];
    const labKeywords = [
      'lab',
      'laboratory',
      'technician',
      'medical technologist',
    ];

    const hasCandidateKeyword = (keywords: string[]) => {
      return Array.from(candidateRoles).some((role) =>
        keywords.some((keyword) => role.includes(keyword)),
      );
    };

    const hasRoleKeyword = (designation: string, keywords: string[]) => {
      const designationLower = designation.toLowerCase();
      return keywords.some((keyword) => designationLower.includes(keyword));
    };

    // Match by category keywords
    for (const roleNeeded of rolesNeeded) {
      if (
        hasCandidateKeyword(nursingKeywords) &&
        hasRoleKeyword(roleNeeded.designation, nursingKeywords)
      ) {
        console.log(`Keyword match (Nursing): ${roleNeeded.designation}`);
        return roleNeeded.id;
      }

      if (
        hasCandidateKeyword(doctorKeywords) &&
        hasRoleKeyword(roleNeeded.designation, doctorKeywords)
      ) {
        console.log(`Keyword match (Doctor): ${roleNeeded.designation}`);
        return roleNeeded.id;
      }

      if (
        hasCandidateKeyword(labKeywords) &&
        hasRoleKeyword(roleNeeded.designation, labKeywords)
      ) {
        console.log(`Keyword match (Lab): ${roleNeeded.designation}`);
        return roleNeeded.id;
      }
    }

    console.log('No automatic role match found');
    return null;
  }

  /**
   * Send candidate to screening (recruiter action)
   * Creates a screening record and notifies the selected coordinator
   */
  async sendToScreening(
    candidateProjectMapId: string,
    coordinatorId: string,
    userId: string,
    scheduledTime?: string,
    meetingLink?: string,
  ) {
    // Verify candidate-project exists
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectMapId },
      include: {
        candidate: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: {
          select: {
            id: true,
            title: true,
            team: {
              select: { headId: true },
            },
          },
        },
        roleNeeded: {
          select: { designation: true },
        },
        subStatus: true,
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate-Project with ID "${candidateProjectMapId}" not found`,
      );
    }

    // Verify coordinator exists and has correct role
    const coordinator = await this.prisma.user.findUnique({
      where: { id: coordinatorId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!coordinator) {
      throw new NotFoundException(
        `Coordinator with ID "${coordinatorId}" not found`,
      );
    }

    const isCoordinator = coordinator.userRoles.some(
      (ur) => ur.role.name === 'Interview Coordinator',
    );
    if (!isCoordinator) {
      throw new BadRequestException(
        `User "${coordinator.name}" is not an Interview Coordinator`,
      );
    }

    // Create screening and update status in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create screening record
      const screening = await tx.screening.create({
        data: {
          candidateProjectMapId,
          coordinatorId,
          scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
          meetingLink,
          mode: 'video',
          status: 'scheduled',
        },
      });

      // Update candidate-project status
      await tx.candidateProjects.update({
        where: { id: candidateProjectMapId },
        data: {
          subStatus: {
            connect: {
              name: CANDIDATE_PROJECT_STATUS.SCREENING_SCHEDULED,
            },
          },
        },
      });

      // Create status history
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId,
          subStatusSnapshot: CANDIDATE_PROJECT_STATUS.SCREENING_SCHEDULED,
          changedById: userId,
          reason: `Sent to screening with coordinator ${coordinator.name}`,
        },
      });

      // Also create an interview status history record for auditing (screening event)
      await tx.interviewStatusHistory.create({
        data: {
          interviewType: 'screening',
          interviewId: screening.id,
          candidateProjectMapId: candidateProjectMapId,
          previousStatus: null,
          status: 'scheduled',
          statusSnapshot: 'Screening Scheduled',
          statusAt: new Date(),
          changedById: userId,
          changedByName: coordinator.name,
          reason: `Sent to screening with coordinator ${coordinator.name}`,
        },
      });

      return screening;
    });

    // Publish notification event
    await this.outboxService.publishCandidateSentToScreening(
      candidateProjectMapId,
      result.id,
      coordinatorId,
      candidateProject.recruiterId || userId,
    );

    this.logger.log(
      `Candidate ${candidateProject.candidate.firstName} ${candidateProject.candidate.lastName} sent to screening with coordinator ${coordinator.name}`,
    );

    return {
      ...result,
      candidate: candidateProject.candidate,
      project: candidateProject.project,
    };
  }

  /**
   * Approve candidate for client interview (skip screening interview)
   * Directly moves candidate from documents_verified to approved status
   */
  async approveForClientInterview(
    candidateProjectMapId: string,
    userId: string,
    notes?: string,
  ) {
    // Verify candidate-project exists
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectMapId },
      include: {
        candidate: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: {
          select: { id: true, title: true },
        },
        subStatus: true,
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate-Project with ID "${candidateProjectMapId}" not found`,
      );
    }

    // Verify current status allows this transition
    const currentStatus = candidateProject.subStatus?.name;
    if (currentStatus !== CANDIDATE_PROJECT_STATUS.DOCUMENTS_VERIFIED) {
      throw new BadRequestException(
        `Cannot approve for client interview. Current status: ${currentStatus}. Expected: ${CANDIDATE_PROJECT_STATUS.DOCUMENTS_VERIFIED}`,
      );
    }

    // Update status in transaction
    const activeRecruiterId = await this.getCandidateActiveRecruiter(candidateProject.candidate.id);

    await this.prisma.$transaction(async (tx) => {
      // Update candidate-project status to approved
      await tx.candidateProjects.update({
        where: { id: candidateProjectMapId },
        data: {
          subStatus: {
            connect: {
              name: CANDIDATE_PROJECT_STATUS.APPROVED,
            },
          },
          // Sync recruiter if one is active in assignments table
          ...(activeRecruiterId ? { recruiter: { connect: { id: activeRecruiterId } } } : {}),
        },
      });

      // Create status history
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId,
          subStatusSnapshot: CANDIDATE_PROJECT_STATUS.APPROVED,
          changedById: userId,
          reason: 'Approved for client interview (skipped screening)',
          notes,
        },
      });
    });

    this.logger.log(
      `Candidate ${candidateProject.candidate.firstName} ${candidateProject.candidate.lastName} approved for client interview (screening skipped)`,
    );

    return {
      success: true,
      message: 'Candidate approved for client interview',
    };
  }

  /**
   * Send candidate for interview (either screening or client interview assignment)
   * - Sets main stage to 'interview'
   * - Sets sub-status to either 'interview_assigned' or 'screening_assigned'
   * - Creates or updates candidate-project assignment and adds a status history entry
   */
  async sendForInterview(dto: SendForInterviewDto, userId: string) {
    const { projectId, candidateId, type, recruiterId: providedRecruiterId, notes } = dto as any;

    // Validate candidate & project
    const candidate = await this.prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) throw new NotFoundException(`Candidate ${candidateId} not found`);

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    // Resolve recruiter
    // 1. Prioritize candidate's assigned recruiter from assignments table
    const activeRecruiterId = await this.getCandidateActiveRecruiter(candidateId);
    
    // 2. Use assigned recruiter, or provided one, otherwise fallback to current user
    const finalRecruiterId = activeRecruiterId || providedRecruiterId || userId;

    if (finalRecruiterId) {
      const recruiter = await this.prisma.user.findUnique({ where: { id: finalRecruiterId } });
      if (!recruiter) throw new NotFoundException(`Recruiter ${finalRecruiterId} not found`);
    }

    // Find main 'interview' status and sub-status name based on type
    const mainStatus = await this.prisma.candidateProjectMainStatus.findUnique({ where: { name: 'interview' } });
    let subName =
      type === 'interview_assigned'
        ? 'interview_assigned'
        : type === 'training_assigned'
        ? 'training_assigned'
        : 'screening_assigned';
    const subStatus = await this.prisma.candidateProjectSubStatus.findUnique({ where: { name: subName } });

    if (!mainStatus || !subStatus) {
      throw new BadRequestException('Interview statuses missing. Please seed the DB.');
    }

    // Get user snapshot
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    // Check existing assignment for candidate & project
    const existingAssignment = await this.prisma.candidateProjects.findFirst({ where: { candidateId, projectId } });

    const candidateProject = await this.prisma.$transaction(async (tx) => {
      let assignment;

      if (existingAssignment) {
        // Update status and always synchronize recruiter
        const data: any = {
          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,
          recruiterId: finalRecruiterId,
        };
        // Removed: if (providedRecruiterId) data.recruiterId = finalRecruiterId;
        if (notes !== undefined) data.notes = notes ?? existingAssignment.notes;

        assignment = await tx.candidateProjects.update({
          where: { id: existingAssignment.id },
          data,
          include: { candidate: true, project: true, mainStatus: true, subStatus: true, recruiter: true },
        });
      } else {
        // Create new assignment
        assignment = await tx.candidateProjects.create({
          data: {
            candidateId,
            projectId,
            recruiterId: finalRecruiterId || null,
            assignedAt: new Date(),
            notes: notes || null,
            mainStatusId: mainStatus.id,
            subStatusId: subStatus.id,
          },
          include: { candidate: true, project: true, mainStatus: true, subStatus: true, recruiter: true },
        });
      }

      // If this is a training assignment, create a training record and interview history entry
      if (type === 'training_assigned') {
        // Create training assignment
        await tx.trainingAssignment.create({
          data: {
            candidateProjectMapId: assignment.id,
            assignedBy: userId,
            trainingType: TRAINING_TYPE.BASIC as any,
            focusAreas: [],
            priority: TRAINING_PRIORITY.MEDIUM as any,
            status: TRAINING_EVENT.BASIC_ASSIGNED as any,
            assignedAt: new Date(),
            notes: notes || 'basic training assigned',
          },
        });

        // Add an interview status history entry to reflect the training assignment
        await tx.interviewStatusHistory.create({
          data: {
            interviewType: 'training',
            interviewId: null,
            candidateProjectMapId: assignment.id,
            previousStatus: null,
            status: TRAINING_EVENT.BASIC_ASSIGNED,
            statusSnapshot: 'Basic Training Assigned',
            statusAt: new Date(),
            changedById: userId,
            changedByName: user?.name || null,
            reason: 'Assigned basic training',
          },
        });
      }

      // Create status history entry (for all types)
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId: assignment.id,
          changedById: userId,
          changedByName: user?.name || null,

          mainStatusId: mainStatus.id,
          subStatusId: subStatus.id,

          mainStatusSnapshot: mainStatus.label,
          subStatusSnapshot: subStatus.label,

          reason: type === 'training_assigned' ? 'Assigned to training' : `Sent for interview (${subName})`,
          notes: notes || null,
        },
      });

      // Also create an interview-level status history record for screening/client interview assignments
      if (type === 'screening_assigned') {
        await tx.interviewStatusHistory.create({
          data: {
            interviewType: 'screening',
            interviewId: null,
            candidateProjectMapId: assignment.id,
            previousStatus: null,
            status: 'assigned',
            statusSnapshot: 'Screening Assigned',
            statusAt: new Date(),
            changedById: userId,
            changedByName: user?.name || null,
            reason: `Screening assigned`,
          },
        });
      }

      if (type === 'interview_assigned') {
        await tx.interviewStatusHistory.create({
          data: {
            interviewType: 'client',
            interviewId: null,
            candidateProjectMapId: assignment.id,
            previousStatus: null,
            status: 'assigned',
            statusSnapshot: 'Client Interview Assigned',
            statusAt: new Date(),
            changedById: userId,
            changedByName: user?.name || null,
            reason: `Client interview assigned`,
          },
        });
      }

      return assignment;
    });

    // Optionally we could publish an outbox event here if needed

    return candidateProject;
  }

  /**
   * Bulk send candidates for interview
   * Iterates through candidate IDs and calls sendForInterview for each
   */
  async bulkSendForInterview(dto: BulkSendForInterviewDto, userId: string) {
    const { candidateIds, projectId, type, recruiterId, notes } = dto;
    const results: any[] = [];
    const errors: any[] = [];

    for (const candidateId of candidateIds) {
      try {
        const result = await this.sendForInterview(
          {
            candidateId,
            projectId,
            type,
            recruiterId,
            notes,
          },
          userId,
        );
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Failed to send candidate ${candidateId} for interview: ${error.message}`,
        );
        errors.push({
          candidateId,
          error: error.message,
        });
      }
    }

    return {
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Automatically assign existing documents of the same role to a new project assignment
   */
  private async autoAssignExistingDocuments(
    tx: any,
    candidateId: string,
    roleNeededId: string,
    newAssignmentId: string,
    userId: string,
    userName?: string,
  ) {
    if (!roleNeededId) return;

    // Find the role catalog ID for this role needed
    const roleNeeded = await tx.roleNeeded.findUnique({
      where: { id: roleNeededId },
      select: { roleCatalogId: true },
    });

    if (!roleNeeded) return;

    const roleCatalogId = roleNeeded.roleCatalogId;

    // Find existing resumes for this candidate that match the role
    // We only auto-assign resumes as per requirement
    const existingResumes = await tx.document.findMany({
      where: {
        candidateId: candidateId,
        docType: DOCUMENT_TYPE.RESUME,
        roleCatalogId: roleCatalogId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    for (const doc of existingResumes) {
      // Check if this document is already linked to the new assignment
      const alreadyLinked =
        await tx.candidateProjectDocumentVerification.findUnique({
          where: {
            candidateProjectMapId_documentId: {
              candidateProjectMapId: newAssignmentId,
              documentId: doc.id,
            },
          },
        });

      if (!alreadyLinked) {
        const newVerification =
          await tx.candidateProjectDocumentVerification.create({
            data: {
              candidateProjectMapId: newAssignmentId,
              documentId: doc.id,
              roleCatalogId: roleCatalogId,
              status: doc.status,
              notes: `Auto-assigned from existing resume`,
            },
          });

        // Create history entry for the auto-assignment
        await tx.documentVerificationHistory.create({
          data: {
            verificationId: newVerification.id,
            action: doc.status,
            performedBy: userId,
            performedByName: userName || null,
            notes: 'auto assigned when project assigned',
          },
        });
      }
    }
  }

  /**
   * Check candidate eligibility for a project
   * Returns detailed eligibility report for each role in the project
   */
  async checkEligibility(candidateId: string, projectId: string) {
    // 1. Fetch candidate
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        qualifications: {
          include: { qualification: true },
        },
        // include work history so we can compute experience when totalExperience is not set
        workExperiences: true,
      },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // 2. Fetch project with roles
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rolesNeeded: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const age = candidate.dateOfBirth ? this.calculateAge(new Date(candidate.dateOfBirth)) : null;
    const candidateGender = candidate.gender?.toLowerCase();
    let candidateExp = candidate.totalExperience ?? candidate.experience ?? 0;
    // If explicit experience is missing/zero, derive from work history when available
    if ((!candidateExp || candidateExp === 0) && Array.isArray(candidate.workExperiences) && candidate.workExperiences.length > 0) {
      candidateExp = this.calculateExperienceFromWorkHistory(candidate.workExperiences);
    }

    const roleEligibility = project.rolesNeeded.map((role) => {
      const reasons: string[] = [];
      const flags = {
        gender: true,
        age: true,
        experience: true,
      };

      // Gender Check
      if (
        role.genderRequirement &&
        role.genderRequirement.toLowerCase() !== 'all'
      ) {
        const requiredGender = role.genderRequirement.toLowerCase();
        if (!candidateGender) {
          flags.gender = false;
          reasons.push(
            `Gender is required for this role (${role.genderRequirement}), but candidate gender is not specified.`,
          );
        } else if (candidateGender !== requiredGender) {
          flags.gender = false;
          reasons.push(
            `Gender mismatch: Role requires ${role.genderRequirement}, but candidate is ${candidate.gender}.`,
          );
        }
      }

      // Age Check
      if (age === null) {
        flags.age = false;
        reasons.push(
          `Age is required for this role (${role.minAge} to ${role.maxAge} years) but candidate date of birth is not provided.`,
        );
      } else if (age < role.minAge || age > role.maxAge) {
        flags.age = false;
        reasons.push(
          `Age mismatch: Candidate is ${age} years old, but role requires ${role.minAge} to ${role.maxAge} years.`,
        );
      }

      // Experience Check
      if (role.minExperience !== null && candidateExp < role.minExperience) {
        flags.experience = false;
        reasons.push(
          `Experience mismatch: Candidate has ${candidateExp} years, but role requires minimum ${role.minExperience} years.`,
        );
      }
      if (role.maxExperience !== null && candidateExp > role.maxExperience) {
        flags.experience = false;
        reasons.push(
          `Experience mismatch: Candidate has ${candidateExp} years, but role exceeds maximum ${role.maxExperience} years.`,
        );
      }

      return {
        roleId: role.id,
        designation: role.designation,
        isEligible: reasons.length === 0,
        flags,
        reasons,
      };
    });

    return {
      candidateId,
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      projectId,
      projectTitle: project.title,
      isEligible: roleEligibility.some((r) => r.isEligible),
      roleEligibility,
    };
  }

  /**
   * Bulk check candidate eligibility for a project
   * Returns only candidates who are NOT eligible
   */
  async checkBulkEligibility(dto: BulkCheckEligibilityDto) {
    const { projectId, candidateIds } = dto;

    // 1. Fetch project with roles
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rolesNeeded: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // 2. Fetch all candidates
    const candidates = await this.prisma.candidate.findMany({
      where: {
        id: { in: candidateIds },
      },
      include: {
        // include work history so bulk eligibility mirrors single-candidate behavior
        workExperiences: true,
      },
    });

    const results = candidates.map((candidate) => {
      const age = candidate.dateOfBirth ? this.calculateAge(new Date(candidate.dateOfBirth)) : null;
      const candidateGender = candidate.gender?.toLowerCase();
      let candidateExp = candidate.totalExperience ?? candidate.experience ?? 0;
      if ((!candidateExp || candidateExp === 0) && Array.isArray(candidate.workExperiences) && candidate.workExperiences.length > 0) {
        candidateExp = this.calculateExperienceFromWorkHistory(candidate.workExperiences);
      }

      const roleEligibility = project.rolesNeeded.map((role) => {
        const reasons: string[] = [];
        const flags = {
          gender: true,
          age: true,
          experience: true,
        };

        // Gender Check
        if (
          role.genderRequirement &&
          role.genderRequirement.toLowerCase() !== 'all'
        ) {
          const requiredGender = role.genderRequirement.toLowerCase();
          if (!candidateGender) {
            flags.gender = false;
            reasons.push(
              `Gender is required for this role (${role.genderRequirement}), but candidate gender is not specified.`,
            );
          } else if (candidateGender !== requiredGender) {
            flags.gender = false;
            reasons.push(
              `Gender mismatch: Role requires ${role.genderRequirement}, but candidate is ${candidate.gender}.`,
            );
          }
        }

        // Age Check
        if (age === null) {
          flags.age = false;
          reasons.push(
            `Age is required for this role (${role.minAge} to ${role.maxAge} years) but candidate date of birth is not provided.`,
          );
        } else if (age < role.minAge || age > role.maxAge) {
          flags.age = false;
          reasons.push(
            `Age mismatch: Candidate is ${age} years old, but role requires ${role.minAge} to ${role.maxAge} years.`,
          );
        }

        // Experience Check
        if (role.minExperience !== null && candidateExp < role.minExperience) {
          flags.experience = false;
          reasons.push(
            `Experience mismatch: Candidate has ${candidateExp} years, but role requires minimum ${role.minExperience} years.`,
          );
        }

        if (role.maxExperience !== null && candidateExp > role.maxExperience) {
          flags.experience = false;
          reasons.push(
            `Experience mismatch: Candidate has ${candidateExp} years, but role exceeds maximum ${role.maxExperience} years.`,
          );
        }

        return {
          roleId: role.id,
          designation: role.designation,
          isEligible: reasons.length === 0,
          flags,
          reasons,
        };
      });

      return {
        candidateId: candidate.id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        isEligible: roleEligibility.some((r) => r.isEligible),
        roleEligibility,
      };
    });

    // Return only candidates who are NOT eligible
    return results.filter((r) => !r.isEligible);
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dob: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Calculate total experience (years) from an array of workExperiences.
   * Matches logic used in other services (average month length = 30.44 days).
   */
  private calculateExperienceFromWorkHistory(workExperiences: any[]): number {
    let totalMonths = 0;

    workExperiences.forEach((exp) => {
      const start = new Date(exp.startDate);
      const end = exp.endDate ? new Date(exp.endDate) : new Date();

      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month
      totalMonths += diffMonths;
    });

    return Math.floor(totalMonths / 12);
  }

  /**
   * Validate candidate against role requirements (gender, age)
   */
  private validateCandidateForRole(candidate: any, roleNeeded: any) {
    if (!roleNeeded) return;

    // Gender check
    if (
      roleNeeded.genderRequirement &&
      roleNeeded.genderRequirement.toLowerCase() !== 'all'
    ) {
      if (!candidate.gender) {
        throw new BadRequestException(
          `This candidate does not have a gender specified, but the project role requires ${roleNeeded.genderRequirement}.`,
        );
      }
      const candidateGender = candidate.gender.toLowerCase();
      const requiredGender = roleNeeded.genderRequirement.toLowerCase();

      if (candidateGender !== requiredGender) {
        throw new BadRequestException(
          `This candidate's gender (${candidate.gender}) does not match the project role requirement (${roleNeeded.genderRequirement}).`,
        );
      }
    }

    // Age check
    if (candidate.dateOfBirth) {
      const age = this.calculateAge(new Date(candidate.dateOfBirth));
      if (age < roleNeeded.minAge || age > roleNeeded.maxAge) {
        throw new BadRequestException(
          `This candidate's age (${age}) is outside the required range for this project role (${roleNeeded.minAge} to ${roleNeeded.maxAge} years).`,
        );
      }
    } else {
      // If dateOfBirth is missing but there are age requirements
      if (roleNeeded.minAge > 0 || roleNeeded.maxAge < 100) {
        throw new BadRequestException(
          `Candidate date of birth is required to verify age requirements (${roleNeeded.minAge} to ${roleNeeded.maxAge} years).`,
        );
      }
    }
  }

  /**
   * Helper to get candidate's active recruiter from CandidateRecruiterAssignment
   */
  private async getCandidateActiveRecruiter(
    candidateId: string,
  ): Promise<string | null> {
    const assignment = await this.prisma.candidateRecruiterAssignment.findFirst({
      where: {
        candidateId,
        isActive: true,
      },
      select: {
        recruiterId: true,
      },
    });

    return assignment?.recruiterId || null;
  }
}
