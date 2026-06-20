import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { OutboxService } from '../notifications/outbox.service';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateCandidateProjectDto } from './dto/create-candidate-project.dto';
import { UpdateCandidateProjectDto } from './dto/update-candidate-project.dto';
import { QueryCandidateProjectsDto } from './dto/query-candidate-projects.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { SendForInterviewDto } from './dto/send-for-interview.dto';
import { BulkSendForInterviewDto } from './dto/bulk-send-for-interview.dto';
import { BulkCheckEligibilityDto } from './dto/bulk-check-eligibility.dto';
import { BulkAssignCandidateProjectDto } from './dto/bulk-assign-candidate-project.dto';
import { BulkSendForScreeningDto } from './dto/bulk-send-for-screening.dto';
import { ProjectOverviewQueryDto, DatePeriod } from './dto/project-overview-query.dto';
import {
  CANDIDATE_PROJECT_STATUS,
  CANDIDATE_PROJECT_STATUS_CHANGE_REQUEST_STATUSES,
  CANDIDATE_STATUS,
  TRAINING_PRIORITY,
  TRAINING_EVENT,
  TRAINING_STATUS,
  DOCUMENT_STATUS,
  DOCUMENT_TYPE,
  isCandidateProjectPipelineBlocked,
  isProcessingStatusChangeRequestType,
  isProcessingStatusTransitionAllowed,
} from '../common/constants';
import { assertAgentCandidateLinkedToAgentProject } from '../common/agent-project-candidate-scope';
import { assertProjectOpenForAssignment } from '../projects/utils/project-deadline.util';
import {
  CANDIDATE_PROJECT_STATUS_CHANGE_APPROVER_ROLES,
  CANDIDATE_PROJECT_STATUS_CHANGE_DIRECT_ROLES,
  PROCESSING_STATUS_CHANGE_APPROVER_ROLES,
  PROCESSING_STATUS_CHANGE_DIRECT_ROLES,
  ROLE_NAMES,
} from '../common/constants/role-ids';
import { CreateStatusChangeRequestDto, resolveProcessingRequestedStatus } from './dto/create-status-change-request.dto';
import { ReviewStatusChangeRequestDto } from './dto/review-status-change-request.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { withActiveAccountStatus } from '../users/user-account-status.filter';
import { ProcessingService } from '../processing/processing.service';

/** Project overview sub-status tiles (aligned with web ProjectCandidatesOverviewPage filters). */
const PROJECT_DOCUMENT_SUB_STATUS_TILES = [
  {
    key: 'pending',
    label: 'Pending',
    subStatusNames: [
      'pending_documents',
      'documents_submitted',
      'verification_in_progress_document',
      'documents_re_submission_requested',
      'client_revision_requested',
    ],
  },
  {
    key: 'verified',
    label: 'Verified',
    subStatusNames: ['documents_verified'],
  },
  {
    key: 'rejected',
    label: 'Rejected',
    subStatusNames: ['rejected_documents'],
  },
  {
    key: 'submitted_to_client',
    label: 'Send to Client',
    subStatusNames: ['submitted_to_client'],
  },
] as const;

const PROJECT_INTERVIEW_SUB_STATUS_TILES = [
  {
    key: 'scheduled',
    label: 'Interview Scheduled',
    subStatusName: 'interview_scheduled',
  },
  { key: 'passed', label: 'Passed', subStatusName: 'interview_passed' },
  { key: 'failed', label: 'Failed', subStatusName: 'interview_failed' },
  { key: 'backout', label: 'Backout', subStatusName: 'interview_backout' },
] as const;

const PROJECT_PROCESSING_SUB_STATUS_TILES = [
  {
    key: 'transferred',
    label: 'Transferred',
    subStatusName: 'transfered_to_processing',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    subStatusName: 'processing_in_progress',
  },
  {
    key: 'completed',
    label: 'Completed',
    subStatusName: 'processing_completed',
  },
  { key: 'cancelled', label: 'Cancelled', subStatusName: 'processing_cancelled' },
  {
    key: 'ready_final',
    label: 'Ready for Final',
    subStatusName: 'ready_for_final',
  },
] as const;

@Injectable()
export class CandidateProjectsService {
  private readonly logger = new Logger(CandidateProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly outboxService: OutboxService,
    private readonly notificationsGateway: NotificationsGateway,
    @Inject(forwardRef(() => ProcessingService))
    private readonly processingService: ProcessingService,
  ) {}

  private async ensureInterviewCoordinator(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const isCoordinator = user.userRoles.some(
      (ur) => ur.role?.name === 'Interview Coordinator',
    );

    if (!isCoordinator) {
      throw new ForbiddenException(
        'Only Interview Coordinator can perform this action',
      );
    }
  }

  private async getInterviewCoordinators(): Promise<Array<{ id: string }>> {
    return this.prisma.user.findMany({
      where: withActiveAccountStatus({
        userRoles: {
          some: {
            role: {
              name: 'Interview Coordinator',
            },
          },
        },
      }),
      select: {
        id: true,
      },
    });
  }

  private isCandidatePositiveStatus(candidate: any): boolean {
    const status = typeof candidate?.currentStatus === 'string'
      ? candidate.currentStatus
      : candidate?.currentStatus?.statusName;

    const normalizedStatus = String(status || '').trim().toLowerCase();
    return [
      CANDIDATE_STATUS.INTERESTED,
      CANDIDATE_STATUS.FUTURE,
      CANDIDATE_STATUS.ON_HOLD,
    ].includes(normalizedStatus as any);
  }

  private ensureCandidatePositiveForProjectAssignment(candidate: any) {
    if (!this.isCandidatePositiveStatus(candidate)) {
      throw new BadRequestException(
        `Candidate must be in a positive status (${CANDIDATE_STATUS.INTERESTED}, ${CANDIDATE_STATUS.FUTURE}, or ${CANDIDATE_STATUS.ON_HOLD}) to be assigned to a project.`,
      );
    }
  }

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
      include: { currentStatus: true },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    this.ensureCandidatePositiveForProjectAssignment(candidate);

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

    assertProjectOpenForAssignment(project);

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

    await assertAgentCandidateLinkedToAgentProject(this.prisma, candidate, projectId);

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

    // Publish data sync event
    try {
      // Always sync Project to refresh eligible/nominated/consolidated lists
      await this.outboxService.publishDataSync({
        userId,
        type: 'Project',
        id: projectId,
        message: `Candidate assigned to project ${projectId}.`,
      });

      await this.outboxService.publishDataSync({
        userId,
        type: 'RecruiterDocuments',
        id: 'LIST',
        message: `Candidate assigned to project.`,
      });

      if (finalRecruiterId && finalRecruiterId !== userId) {
        // Sync for the specific recruiter as well
        await this.outboxService.publishDataSync({
          userId: finalRecruiterId,
          type: 'Project',
          id: projectId,
          message: `Candidate assigned to project ${projectId}.`,
        });

        await this.outboxService.publishDataSync({
          userId: finalRecruiterId,
          type: 'RecruiterDocuments',
          id: 'LIST',
          message: `Candidate assigned to project.`,
        });
      }
    } catch (err) {
      this.logger.error(`Failed to publish data sync event for assignment ${assignment.id}`, err.stack);
    }

    if (project.requiredScreening) {
      const coordinators = await this.getInterviewCoordinators();
      const candidateName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Candidate';
      const notificationTasks = coordinators.map((coordinator) => {
        const idemKey = `candidate-assigned:${assignment.id}:${coordinator.id}`;
        return this.notificationsService.createNotification({
          userId: coordinator.id,
          type: 'candidate_assigned_project',
          title: 'Project Screening Required',
          message: `Project screening required: ${candidateName} has been assigned to this project ${project.title}. Please assign for screening.`,
          link: `/projects/${project.id}`,
          meta: {
            projectId: project.id,
            candidateId: candidate.id,
            candidateProjectMapId: assignment.id,
          },
          idemKey,
        });
      });

      try {
        await Promise.all(notificationTasks);
      } catch (err) {
        this.logger.error(
          `Failed to send assignment notifications to interview coordinators for assignment ${assignment.id}: ${err.message}`,
        );
      }
    }

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

    assertProjectOpenForAssignment(project);

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
      include: {
        subStatus: true,
        mainStatus: true,
      },
    });

    if (existingAssignment) {
      this.assertCandidateProjectPipelineNotBlocked(
        existingAssignment.mainStatus?.name,
      );
    }

    const screeningTrainingStatuses = [
      'screening_assigned',
      'screening_scheduled',
      'screening_completed',
      'screening_passed',
      'screening_failed',
      'training_assigned',
      'training_scheduled',
      'training_in_progress',
      'training_completed',
      'ready_for_reassessment',
    ];

    if (existingAssignment && existingAssignment.subStatus && screeningTrainingStatuses.includes(existingAssignment.subStatus.name)) {
      throw new BadRequestException(
        'Candidate currently in screening/ng.training stage. Cannot send for verification.',
      );
    }

    if (project.introductionVideoRequired) {
      const assignmentForIntroCheck =
        existingAssignment ??
        (await this.prisma.candidateProjects.findFirst({
          where: {
            candidateId,
            projectId,
            roleNeededId: roleNeededId || null,
          },
        }));

      if (!assignmentForIntroCheck) {
        throw new BadRequestException(
          'Introduction video is required before sending for verification',
        );
      }

      const introVideoVerification =
        await this.prisma.candidateProjectDocumentVerification.findFirst({
          where: {
            candidateProjectMapId: assignmentForIntroCheck.id,
            isDeleted: false,
            document: {
              docType: 'introduction_video',
              isDeleted: false,
            },
          },
        });

      if (!introVideoVerification) {
        throw new BadRequestException(
          'Introduction video is required before sending for verification',
        );
      }
    }

    if (existingAssignment) {
      const existingBlockedHistory = await this.prisma.candidateProjectStatusHistory.findFirst({
        where: {
          candidateProjectMapId: existingAssignment.id,
          subStatus: {
            name: {
              in: screeningTrainingStatuses,
            },
          },
        },
        orderBy: {
          statusChangedAt: 'desc',
        },
      });

      if (existingBlockedHistory) {
        throw new BadRequestException(
          'Candidate already has screening/training and cannot be sent for document verification at this stage.',
        );
      }
    }

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

    // Emit real-time synchronization event for Recruiter Documents
    try {
      // Always sync Project to refresh eligible/nominated/consolidated lists
      await this.outboxService.publishDataSync({
        userId,
        type: 'Project',
        id: projectId,
        message: `Candidate sent for verification in project ${projectId}.`,
      });

      await this.outboxService.publishDataSync({
        userId,
        type: 'RecruiterDocuments',
        id: 'LIST',
        message: 'Candidate sent for verification',
      });
    } catch (err) {
      this.logger.error(`Failed to publish data sync event for verification: ${err.message}`);
    }

    return candidateProject;
  }

  /**
   * Send candidate for screening
   * Creates or updates candidate-project assignment and sets status to interview / screening_assigned
   * Adds candidate project status history and interview status history entries
   */
  /**
   * Send candidate for screening
   * Creates or updates candidate-project assignment and sets status to interview / screening_assigned
   * Adds candidate project status history and interview status history entries
   */
  async sendForScreening(createDto: CreateCandidateProjectDto, userId: string) {
    await this.ensureInterviewCoordinator(userId);

    let { candidateId, projectId, roleNeededId, recruiterId } = createDto;

    // -------------------------------
    // VERIFY candidate
    // -------------------------------
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { currentStatus: true },
    });
    if (!candidate) throw new NotFoundException(`Candidate ${candidateId} not found`);

    // -------------------------------
    // VERIFY project
    // -------------------------------
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, include: { rolesNeeded: true } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    assertProjectOpenForAssignment(project);

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
    const existingAssignment = await this.prisma.candidateProjects.findFirst({
      where: { candidateId, projectId, roleNeededId: roleNeededId || null },
      include: { subStatus: true },
    });

    if (!existingAssignment) {
      this.ensureCandidatePositiveForProjectAssignment(candidate);
    }

    if (existingAssignment?.subStatus) {
      const screeningStatuses = [
        'screening_assigned',
        'screening_scheduled',
        'screening_in_progress',
        'screening_completed',
        'screening_passed',
        'screening_failed',
      ];
      if (screeningStatuses.includes(existingAssignment.subStatus.name)) {
        throw new BadRequestException(
          `Candidate is already in screening process (Current status: ${existingAssignment.subStatus.label || existingAssignment.subStatus.name})`,
        );
      }
    }

    // -------------------------------
    // CREATE OR UPDATE ASSIGNMENT
    // -------------------------------
    const result = await this.prisma.$transaction(async (tx) => {
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

      // CREATE Screening record if coordinator is assigned
      let screeningId: string | null = null;
      if (createDto.coordinatorId) {
        const screening = await tx.screening.create({
          data: {
            candidateProjectMapId: assignment.id,
            coordinatorId: createDto.coordinatorId,
            status: 'scheduled',
          },
        });
        screeningId = screening.id;
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
          interviewId: screeningId,
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

      return { ...assignment, screeningId };
    });

    // Publish an outbox event so downstream services notify coordinator and recruiter
    await this.outboxService.publishCandidateSentToScreening(
      result.id,
      result.screeningId || '', // screeningId
      createDto.coordinatorId || '', // coordinatorId for this screening
      finalRecruiterId || null, // notify the actual recruiter assigned to this candidate
      userId, // scheduledBy
    );

    // Emit real-time synchronization event
    try {
      if (result.id) {
        // Build recipients list for real-time updates
        const coordinatorId = createDto.coordinatorId || result.screening?.coordinatorId;
        const recipients = new Set<string>();

        if (coordinatorId) recipients.add(coordinatorId);
        if (finalRecruiterId) recipients.add(finalRecruiterId);
        if (userId) recipients.add(userId);

        // Include all active interview coordinators/screening trainers for assigned-screenings updates
        const coordinators = (await this.prisma.user.findMany({
          where: withActiveAccountStatus({
            userRoles: {
              some: {
                role: {
                  name: {
                    in: ['Interview Coordinator', 'Screening Trainer'],
                  },
                },
              },
            },
          }),
          select: { id: true },
        })) || [];

        for (const coord of coordinators) {
          if (coord?.id) recipients.add(coord.id);
        }

        const recipientsSet = [...recipients];

        if (recipientsSet.length > 0) {
          await this.notificationsGateway.emitToUsers(recipientsSet, 'data:sync', {
            type: 'Screening',
            id: result.id,
            message: `Candidate has been sent for screening.`,
          });

          // Always sync Project to refresh eligible/nominated/consolidated lists
          await this.notificationsGateway.emitToUsers(recipientsSet, 'data:sync', {
            type: 'Project',
            id: projectId,
            message: `Candidate sent for screening in project ${projectId}.`,
          });
        }
      }
    } catch (err) {
      this.logger.error(`Failed to emit real-time update for screening ${result.id}`, err.stack);
    }

    return result;
  }

  /**
   * Bulk send candidates for screening
   * Iterates through assignments and calls sendForScreening for each
   * Uses round-robin if no coordinatorId is provided
   */
  async bulkSendForScreening(dto: BulkSendForScreeningDto, userId: string) {
    await this.ensureInterviewCoordinator(userId);

    const { assignments, projectId, coordinatorId } = dto;
    const results: any[] = [];
    const errors: any[] = [];

    // Get all available coordinators for round-robin if no global coordinator is selected
    let availableCoordinators: string[] = [];
    let coordinatorCursor = 0;

    if (!coordinatorId) {
      const coordinators = await this.prisma.user.findMany({
        where: withActiveAccountStatus({
          userRoles: {
            some: {
              role: {
                name: {
                  in: ['Screening Trainer'],
                },
              },
            },
          },
        }),
        select: { id: true },
        orderBy: { id: 'asc' },
      });
      availableCoordinators = coordinators.map((c) => c.id);
    }

    for (const assignment of assignments) {
      const { candidateId, roleNeededId, notes, coordinatorId: individualCoordinatorId } = assignment;

      try {
        // Determine coordinator for this candidate
        // Priority: 1. Individual Coordinator, 2. Global Coordinator, 3. Round Robin
        let finalCoordinatorId = individualCoordinatorId || coordinatorId;

        if (!finalCoordinatorId && availableCoordinators.length > 0) {
          finalCoordinatorId = availableCoordinators[coordinatorCursor];
          coordinatorCursor = (coordinatorCursor + 1) % availableCoordinators.length;
        }

        const res = await this.sendForScreening(
          {
            candidateId,
            projectId,
            roleNeededId,
            notes,
            coordinatorId: finalCoordinatorId,
          },
          userId,
        );
        results.push(res);
      } catch (error: any) {
        this.logger.error(
          `Error sending candidate ${candidateId} for screening in bulk: ${error.message}`,
        );
        errors.push({ candidateId, error: error.message });
      }
    }

    // Emit bulk real-time synchronization event if there are results
    if (results.length > 0) {
      try {
        await this.notificationsGateway.emitToUser(userId, 'data:sync', {
          type: 'Screening',
          id: 'LIST',
          message: `${results.length} candidates sent for screening successfully.`,
        });
      } catch (err) {
        this.logger.error(`Failed to emit bulk real-time update for screenings`, err.stack);
      }
    }

    return {
      totalRequested: assignments.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
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
      period,
      gender,
      countries,
      visaTypes,
      sectors,
      qualification,
      minExp,
      maxExp,
      minAge,
      maxAge,
    } = queryDto;
    
    const skip = (page - 1) * limit;

    // -------------------------------
    // 1. Build Base Where Clause
    // -------------------------------
    const where: any = { projectId };

    // Advanced Filters Integration
    if (gender) {
      where.candidate = { ...where.candidate, gender };
    }

    if (countries) {
      const countryList = countries.split(',').filter(Boolean);
      if (countryList.length > 0) {
        where.candidate = {
          ...where.candidate,
          candidateCountries: {
            some: {
              countryId: { in: countryList }
            }
          }
        };
      }
    }

    if (visaTypes) {
      const visaList = visaTypes.split(',').filter(Boolean);
      if (visaList.length > 0) {
        where.candidate = {
          ...where.candidate,
          visaType: { in: visaList }
        };
      }
    }

    if (sectors) {
      const sectorList = sectors.split(',').filter(Boolean);
      if (sectorList.length > 0) {
        where.candidate = {
          ...where.candidate,
          sectorType: { in: sectorList }
        };
      }
    }

    if (qualification) {
      where.candidate = {
        ...where.candidate,
        qualifications: {
          contains: qualification,
          mode: 'insensitive'
        }
      };
    }

    if (minExp !== undefined || maxExp !== undefined) {
      where.candidate = {
        ...where.candidate,
        experienceYears: {
          ...(minExp !== undefined && { gte: minExp }),
          ...(maxExp !== undefined && { lte: maxExp }),
        }
      };
    }

    if (minAge !== undefined || maxAge !== undefined) {
      const now = new Date();
      where.candidate = {
        ...where.candidate,
        dateOfBirth: {
          ...(maxAge !== undefined && { 
            gte: new Date(now.getFullYear() - maxAge - 1, now.getMonth(), now.getDate()) 
          }),
          ...(minAge !== undefined && { 
            lte: new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate()) 
          }),
        }
      };
    }

    if (roleCatalogId) {
      where.roleNeeded = { roleCatalogId };
    }

    // Capture base context (except mainStatus) for counts
    const baseWhereForCounts = { ...where };

    if (queryDto.mainStatus && queryDto.mainStatus !== 'all') {
      where.mainStatus = { name: queryDto.mainStatus };
    }

    if (queryDto.subStatuses) {
      const subStatusNames = queryDto.subStatuses.split(',').map((s) => s.trim()).filter(Boolean);
      if (subStatusNames.length > 0) {
        where.subStatus = { name: { in: subStatusNames } };
      }
    } else if (queryDto.subStatus && queryDto.subStatus !== 'all') {
      where.subStatus = { name: queryDto.subStatus };
    }

    // Role-based filtering: recruiters and Agent Coordinators only see candidates
    // assigned to them on the project row (aligned with recruiter pipeline / agent flow).
    const isRecruiter = userRoles.includes('Recruiter');
    const isAgentCoordinator = userRoles.includes(ROLE_NAMES.AGENT_COORDINATOR);
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

    const scopeToOwnAssignments =
      (isRecruiter || isAgentCoordinator) && !isSpecialistOrManagement;

    if (scopeToOwnAssignments) {
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
            { candidateCode: { contains: search, mode: 'insensitive' } },
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
      ...documentSubStatusCounts
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
      ...PROJECT_DOCUMENT_SUB_STATUS_TILES.map((tile) =>
        this.prisma.candidateProjects.count({
          where: {
            ...baseWhereForCounts,
            mainStatus: { name: 'documents' },
            subStatus: { name: { in: [...tile.subStatusNames] } },
          },
        }),
      ),
      ...PROJECT_INTERVIEW_SUB_STATUS_TILES.map((tile) =>
        this.prisma.candidateProjects.count({
          where: {
            ...baseWhereForCounts,
            mainStatus: { name: 'interview' },
            subStatus: { name: tile.subStatusName },
          },
        }),
      ),
      ...PROJECT_PROCESSING_SUB_STATUS_TILES.map((tile) =>
        this.prisma.candidateProjects.count({
          where: {
            ...baseWhereForCounts,
            mainStatus: { name: 'processing' },
            subStatus: { name: tile.subStatusName },
          },
        }),
      ),
    ]);

    const interviewSubStatusCounts = documentSubStatusCounts.slice(
      PROJECT_DOCUMENT_SUB_STATUS_TILES.length,
      PROJECT_DOCUMENT_SUB_STATUS_TILES.length +
        PROJECT_INTERVIEW_SUB_STATUS_TILES.length,
    ) as number[];
    const processingSubStatusCounts = documentSubStatusCounts.slice(
      PROJECT_DOCUMENT_SUB_STATUS_TILES.length +
        PROJECT_INTERVIEW_SUB_STATUS_TILES.length,
    ) as number[];
    const documentSubStatusCountsOnly = documentSubStatusCounts.slice(
      0,
      PROJECT_DOCUMENT_SUB_STATUS_TILES.length,
    ) as number[];

    const [data, project, filteredCount] = await Promise.all([
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
        documentsSubStatus: {
          tiles: PROJECT_DOCUMENT_SUB_STATUS_TILES.map((tile, index) => ({
            key: tile.key,
            label: tile.label,
            count: documentSubStatusCountsOnly[index],
            subStatusName: tile.key,
          })),
        },
        interviewSubStatus: {
          tiles: PROJECT_INTERVIEW_SUB_STATUS_TILES.map((tile, index) => ({
            key: tile.key,
            label: tile.label,
            count: interviewSubStatusCounts[index],
            subStatusName: tile.key,
          })),
        },
        processingSubStatus: {
          tiles: PROJECT_PROCESSING_SUB_STATUS_TILES.map((tile, index) => ({
            key: tile.key,
            label: tile.label,
            count: processingSubStatusCounts[index],
            subStatusName: tile.key,
          })),
        },
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
              roleCatalogId: true,
              roleCatalog: {
                select: { id: true, name: true, label: true },
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
          currentProjectStatus: true,
          subStatus: {
            select: {
              id: true,
              name: true,
              label: true,
            },
          },
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

  private assertCandidateProjectPipelineNotBlocked(
    mainStatusName: string | null | undefined,
  ): void {
    if (!isCandidateProjectPipelineBlocked(mainStatusName)) return;
    const label =
      mainStatusName === CANDIDATE_PROJECT_STATUS.WITHDRAWN
        ? 'Withdrawn'
        : 'On Hold';
    throw new BadRequestException(
      `This candidate's project is currently ${label}. Pipeline actions are disabled.`,
    );
  }

  private async getUserRoleNames(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.userRoles.map((ur) => ur.role.name);
  }

  private async assertUserCanApproveStatusChange(
    userId: string,
    requestType: string,
  ): Promise<void> {
    const roleNames = await this.getUserRoleNames(userId);
    const approverRoles = isProcessingStatusChangeRequestType(requestType)
      ? (PROCESSING_STATUS_CHANGE_APPROVER_ROLES as readonly string[])
      : (CANDIDATE_PROJECT_STATUS_CHANGE_APPROVER_ROLES as readonly string[]);
    const canApprove = roleNames.some((name) => approverRoles.includes(name));
    if (!canApprove) {
      throw new ForbiddenException(
        'You do not have permission to approve or reject status change requests',
      );
    }
  }

  private async userCanDirectApplyStatusChange(userId: string): Promise<boolean> {
    const roleNames = await this.getUserRoleNames(userId);
    return roleNames.some((name) =>
      (CANDIDATE_PROJECT_STATUS_CHANGE_DIRECT_ROLES as readonly string[]).includes(
        name,
      ),
    );
  }

  private async userCanDirectApplyProcessingStatusChange(
    userId: string,
  ): Promise<boolean> {
    const roleNames = await this.getUserRoleNames(userId);
    return roleNames.some((name) =>
      (PROCESSING_STATUS_CHANGE_DIRECT_ROLES as readonly string[]).includes(
        name,
      ),
    );
  }

  async createStatusChangeRequest(
    candidateProjectMapId: string,
    dto: CreateStatusChangeRequestDto,
    userId: string,
  ) {
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectMapId },
      include: {
        mainStatus: true,
        previousMainStatus: true,
        previousSubStatus: true,
        candidate: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, title: true, country: { select: { code: true, name: true } } } },
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project assignment with ID ${candidateProjectMapId} not found`,
      );
    }

    const isCurrentlyBlocked = isCandidateProjectPipelineBlocked(
      candidateProject.mainStatus?.name,
    );

    // Validate based on request type
    if (dto.requestType === 'block') {
      // requestedStatus required for block
      if (!dto.requestedStatus) {
        throw new BadRequestException(
          'requestedStatus is required for block type',
        );
      }
      // Prevent blocking to same status (e.g., On Hold → On Hold)
      if (candidateProject.mainStatus?.name === dto.requestedStatus) {
        throw new BadRequestException(
          `Candidate is already in ${dto.requestedStatus} status`,
        );
      }
      // Note: DO NOT throw error if already blocked - allow Withdrawn ↔ On Hold
    } else if (dto.requestType === 'reactivate') {
      // Must BE blocked
      if (!isCurrentlyBlocked) {
        throw new BadRequestException(
          'Can only reactivate from withdrawn or on_hold status',
        );
      }
      // Must have previous status stored
      if (!candidateProject.previousMainStatusId) {
        throw new BadRequestException(
          'No previous status to restore. Please contact administrator.',
        );
      }
    } else if (isProcessingStatusChangeRequestType(dto.requestType)) {
      if (!dto.processingStepId) {
        throw new BadRequestException(
          'processingStepId is required for processing status change requests',
        );
      }
      if (candidateProject.mainStatus?.name !== 'processing') {
        throw new BadRequestException(
          'Processing status change requests are only allowed while candidate is in processing',
        );
      }
      dto.requestedStatus =
        dto.requestedStatus ?? resolveProcessingRequestedStatus(dto.requestType);

      const processingCandidate = await this.prisma.processingCandidate.findFirst({
        where: {
          candidateId: candidateProject.candidateId,
          projectId: candidateProject.projectId,
        },
      });
      if (!processingCandidate?.assignedProcessingTeamUserId) {
        throw new BadRequestException(
          'Candidate must be assigned to a processing team before requesting a status change',
        );
      }
      if (
        !isProcessingStatusTransitionAllowed(
          dto.requestType,
          processingCandidate.processingStatus,
        )
      ) {
        throw new BadRequestException(
          `Cannot request ${dto.requestType} while processing status is ${processingCandidate.processingStatus}`,
        );
      }
    }

    const existingPending =
      await this.prisma.candidateProjectStatusChangeRequest.findFirst({
        where: {
          candidateProjectMapId,
          status: CANDIDATE_PROJECT_STATUS_CHANGE_REQUEST_STATUSES.PENDING,
        },
      });

    if (existingPending) {
      throw new BadRequestException(
        'A pending status change request already exists for this candidate project',
      );
    }

    const canDirectApply = isProcessingStatusChangeRequestType(dto.requestType)
      ? await this.userCanDirectApplyProcessingStatusChange(userId)
      : await this.userCanDirectApplyStatusChange(userId);
    if (canDirectApply) {
      return this.directApplyStatusChange(
        candidateProjectMapId,
        dto,
        userId,
        candidateProject,
      );
    }

    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.candidateProjectStatusChangeRequest.create({
        data: {
          candidateProjectMapId,
          requestType: dto.requestType,
          requestedStatus: dto.requestedStatus || '',
          reason: dto.reason,
          requestedBy: userId,
          processingStepId: dto.processingStepId ?? null,
          stepKey: dto.stepKey ?? null,
          processingCandidateId: dto.processingCandidateId ?? null,
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
        },
      });

      await this.outboxService.publishCandidateProjectStatusChangeRequested(
        {
          requestId: created.id,
          candidateProjectMapId,
          candidateId: candidateProject.candidateId,
          projectId: candidateProject.projectId,
          candidateName: `${candidateProject.candidate.firstName} ${candidateProject.candidate.lastName}`,
          projectTitle: candidateProject.project.title,
          requestType: dto.requestType,
          requestedStatus: dto.requestedStatus,
          requestedBy: userId,
          requesterName: requester?.name ?? 'Recruiter',
          reason: dto.reason,
          processingStepId: dto.processingStepId,
          stepKey: dto.stepKey,
          processingCandidateId: dto.processingCandidateId,
          countryCode: candidateProject.project.country?.code,
          countryName: candidateProject.project.country?.name,
        },
        tx,
      );

      return created;
    });

    return request;
  }

  private async directApplyStatusChange(
    candidateProjectMapId: string,
    dto: CreateStatusChangeRequestDto,
    userId: string,
    candidateProject: {
      candidateId: string;
      projectId: string;
      candidate: { firstName: string; lastName: string };
      project: { title: string };
    },
  ) {
    if (isProcessingStatusChangeRequestType(dto.requestType)) {
      const created = await this.prisma.candidateProjectStatusChangeRequest.create({
        data: {
          candidateProjectMapId,
          requestType: dto.requestType,
          requestedStatus: dto.requestedStatus || '',
          reason: dto.reason,
          requestedBy: userId,
          status: CANDIDATE_PROJECT_STATUS_CHANGE_REQUEST_STATUSES.APPROVED,
          reviewedBy: userId,
          reviewedAt: new Date(),
          processingStepId: dto.processingStepId ?? null,
          stepKey: dto.stepKey ?? null,
          processingCandidateId: dto.processingCandidateId ?? null,
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          reviewer: { select: { id: true, name: true, email: true } },
        },
      });

      await this.processingService.executeApprovedProcessingStatusChange(
        {
          requestType: dto.requestType,
          processingStepId: dto.processingStepId!,
          candidateProjectMapId,
          reason: dto.reason,
        },
        userId,
      );

      return created;
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.candidateProjectStatusChangeRequest.create({
        data: {
          candidateProjectMapId,
          requestType: dto.requestType,
          requestedStatus: dto.requestedStatus || '',
          reason: dto.reason,
          requestedBy: userId,
          status: CANDIDATE_PROJECT_STATUS_CHANGE_REQUEST_STATUSES.APPROVED,
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          reviewer: { select: { id: true, name: true, email: true } },
        },
      });

      await this.applyStatusUpdateInTransaction(
        tx,
        candidateProjectMapId,
        {
          subStatusName: dto.requestType === 'reactivate' ? undefined : dto.requestedStatus,
          reason: dto.reason,
        },
        userId,
        dto.requestType as 'block' | 'reactivate',
      );

      return created;
    });
  }

  /**
   * Store current status as previous ONLY if this is the first block
   * (i.e., candidate is not already blocked)
   */
  private async storePreviousStatusIfNeeded(
    tx: Prisma.TransactionClient,
    candidateProjectMapId: string,
  ) {
    const current = await tx.candidateProjects.findUnique({
      where: { id: candidateProjectMapId },
      select: {
        mainStatusId: true,
        subStatusId: true,
        mainStatus: { select: { name: true } },
        previousMainStatusId: true,
        statusBlockedAt: true,
      },
    });

    if (!current) {
      throw new NotFoundException('Candidate project not found');
    }

    // Only store if NOT already blocked (first time blocking)
    const isCurrentlyBlocked = isCandidateProjectPipelineBlocked(
      current.mainStatus?.name,
    );

    if (!isCurrentlyBlocked && !current.previousMainStatusId) {
      // First block - store current as previous
      await tx.candidateProjects.update({
        where: { id: candidateProjectMapId },
        data: {
          previousMainStatusId: current.mainStatusId,
          previousSubStatusId: current.subStatusId,
          statusBlockedAt: new Date(),
        },
      });
    }
    // If already blocked, don't overwrite previousStatus
  }

  async getPendingStatusChangeRequest(candidateProjectMapId: string) {
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectMapId },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project assignment with ID ${candidateProjectMapId} not found`,
      );
    }

    const pending =
      await this.prisma.candidateProjectStatusChangeRequest.findFirst({
        where: {
          candidateProjectMapId,
          status: CANDIDATE_PROJECT_STATUS_CHANGE_REQUEST_STATUSES.PENDING,
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

    return pending;
  }

  async getStatusChangeRequestHistory(
    candidateProjectMapId: string,
    page = 1,
    limit = 10,
  ) {
    const candidateProject = await this.prisma.candidateProjects.findUnique({
      where: { id: candidateProjectMapId },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project assignment with ID ${candidateProjectMapId} not found`,
      );
    }

    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      this.prisma.candidateProjectStatusChangeRequest.findMany({
        where: { candidateProjectMapId },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          reviewer: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.candidateProjectStatusChangeRequest.count({
        where: { candidateProjectMapId },
      }),
    ]);

    return {
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async approveStatusChangeRequest(
    requestId: string,
    dto: ReviewStatusChangeRequestDto,
    userId: string,
  ) {
    const request =
      await this.prisma.candidateProjectStatusChangeRequest.findUnique({
        where: { id: requestId },
        include: {
          candidateProjectMap: {
            include: {
              candidate: { select: { id: true, firstName: true, lastName: true } },
              project: { select: { id: true, title: true } },
            },
          },
          requester: { select: { id: true, name: true } },
        },
      });

    if (!request) {
      throw new NotFoundException('Status change request not found');
    }

    await this.assertUserCanApproveStatusChange(userId, request.requestType);

    if (request.status !== CANDIDATE_PROJECT_STATUS_CHANGE_REQUEST_STATUSES.PENDING) {
      throw new BadRequestException('Status change request has already been processed');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.candidateProjectStatusChangeRequest.update({
        where: { id: requestId },
        data: {
          status: CANDIDATE_PROJECT_STATUS_CHANGE_REQUEST_STATUSES.APPROVED,
          reviewedBy: userId,
          reviewedAt: new Date(),
          reviewNotes: dto.reviewNotes ?? null,
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          reviewer: { select: { id: true, name: true, email: true } },
        },
      });

      if (!isProcessingStatusChangeRequestType(request.requestType)) {
        await this.applyStatusUpdateInTransaction(
          tx,
          request.candidateProjectMapId,
          {
            subStatusName:
              request.requestType === 'reactivate' ? undefined : request.requestedStatus,
            reason: request.reason,
            notes: dto.reviewNotes,
          },
          userId,
          request.requestType as 'block' | 'reactivate',
        );
      }

      await this.outboxService.publishCandidateProjectStatusChangeReviewed(
        {
          requestId,
          candidateProjectMapId: request.candidateProjectMapId,
          candidateId: request.candidateProjectMap.candidateId,
          projectId: request.candidateProjectMap.projectId,
          candidateName: `${request.candidateProjectMap.candidate.firstName} ${request.candidateProjectMap.candidate.lastName}`,
          projectTitle: request.candidateProjectMap.project.title,
          requestType: request.requestType,
          requestedStatus: request.requestedStatus,
          requestedBy: request.requestedBy,
          outcome: 'approved',
          reviewNotes: dto.reviewNotes,
          processingStepId: request.processingStepId ?? undefined,
          stepKey: request.stepKey ?? undefined,
          processingCandidateId: request.processingCandidateId ?? undefined,
        },
        tx,
      );

      return updatedRequest;
    });

    if (isProcessingStatusChangeRequestType(request.requestType)) {
      await this.processingService.executeApprovedProcessingStatusChange(
        {
          requestType: request.requestType,
          processingStepId: request.processingStepId!,
          candidateProjectMapId: request.candidateProjectMapId,
          reason: request.reason,
        },
        userId,
      );
    }

    return result;
  }

  async rejectStatusChangeRequest(
    requestId: string,
    dto: ReviewStatusChangeRequestDto,
    userId: string,
  ) {
    const request =
      await this.prisma.candidateProjectStatusChangeRequest.findUnique({
        where: { id: requestId },
        include: {
          candidateProjectMap: {
            include: {
              candidate: { select: { id: true, firstName: true, lastName: true } },
              project: { select: { id: true, title: true } },
            },
          },
        },
      });

    if (!request) {
      throw new NotFoundException('Status change request not found');
    }

    await this.assertUserCanApproveStatusChange(userId, request.requestType);

    if (request.status !== CANDIDATE_PROJECT_STATUS_CHANGE_REQUEST_STATUSES.PENDING) {
      throw new BadRequestException('Status change request has already been processed');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const rejected = await tx.candidateProjectStatusChangeRequest.update({
        where: { id: requestId },
        data: {
          status: CANDIDATE_PROJECT_STATUS_CHANGE_REQUEST_STATUSES.REJECTED,
          reviewedBy: userId,
          reviewedAt: new Date(),
          reviewNotes: dto.reviewNotes ?? null,
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          reviewer: { select: { id: true, name: true, email: true } },
        },
      });

      await this.outboxService.publishCandidateProjectStatusChangeReviewed(
        {
          requestId,
          candidateProjectMapId: request.candidateProjectMapId,
          candidateId: request.candidateProjectMap.candidateId,
          projectId: request.candidateProjectMap.projectId,
          candidateName: `${request.candidateProjectMap.candidate.firstName} ${request.candidateProjectMap.candidate.lastName}`,
          projectTitle: request.candidateProjectMap.project.title,
          requestType: request.requestType,
          requestedStatus: request.requestedStatus,
          requestedBy: request.requestedBy,
          outcome: 'rejected',
          reviewNotes: dto.reviewNotes,
          processingStepId: request.processingStepId ?? undefined,
          stepKey: request.stepKey ?? undefined,
          processingCandidateId: request.processingCandidateId ?? undefined,
        },
        tx,
      );

      return rejected;
    });

    return updated;
  }

  private async applyStatusUpdateInTransaction(
    tx: Prisma.TransactionClient,
    id: string,
    updateStatusDto: Pick<
      UpdateProjectStatusDto,
      'mainStatusId' | 'subStatusId' | 'subStatusName' | 'reason' | 'notes'
    >,
    userId: string,
    requestType?: 'block' | 'reactivate',
  ) {
    const { mainStatusId, subStatusId, subStatusName, reason, notes } =
      updateStatusDto;

    const candidateProject = await tx.candidateProjects.findUnique({
      where: { id },
      include: {
        mainStatus: true,
        previousMainStatus: true,
        previousSubStatus: true,
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project assignment with ID ${id} not found`,
      );
    }

    let targetMainStatusId: string;
    let targetSubStatusId: string;
    let targetMainStatus;
    let targetSubStatus;

    if (requestType === 'reactivate') {
      // Restore last active status
      if (
        !candidateProject.previousMainStatusId ||
        !candidateProject.previousSubStatusId
      ) {
        throw new BadRequestException('No previous status to restore');
      }
      targetMainStatusId = candidateProject.previousMainStatusId;
      targetSubStatusId = candidateProject.previousSubStatusId;

      targetMainStatus = candidateProject.previousMainStatus;
      targetSubStatus = candidateProject.previousSubStatus;

      // Clear previous status and blockedAt after restoring
      await tx.candidateProjects.update({
        where: { id },
        data: {
          previousMainStatusId: null,
          previousSubStatusId: null,
          statusBlockedAt: null,
        },
      });
    } else if (requestType === 'block') {
      // Store current status as previous ONLY if first block
      await this.storePreviousStatusIfNeeded(tx, id);

      // Resolve target status from subStatusName
      if (!subStatusName) {
        throw new BadRequestException('subStatusName required for block');
      }

      targetSubStatus = await tx.candidateProjectSubStatus.findUnique({
        where: { name: subStatusName },
        include: { stage: true },
      });

      if (!targetSubStatus) {
        throw new NotFoundException(`Sub-status ${subStatusName} not found`);
      }

      targetMainStatus = targetSubStatus.stage;
      targetMainStatusId = targetSubStatus.stageId;
      targetSubStatusId = targetSubStatus.id;
    } else {
      // Regular update (existing logic for other status changes)
      if (subStatusId) {
        targetSubStatus = await tx.candidateProjectSubStatus.findUnique({
          where: { id: subStatusId },
          include: { stage: true },
        });
      } else if (subStatusName) {
        targetSubStatus = await tx.candidateProjectSubStatus.findUnique({
          where: { name: subStatusName },
          include: { stage: true },
        });
      }

      if (!targetSubStatus) {
        throw new NotFoundException(
          `Sub-status ${subStatusId || subStatusName} not found`,
        );
      }

      targetMainStatus = mainStatusId
        ? await tx.candidateProjectMainStatus.findUnique({
            where: { id: mainStatusId },
          })
        : targetSubStatus.stage;

      if (!targetMainStatus) {
        throw new NotFoundException('Main status not found');
      }

      targetMainStatusId = targetMainStatus.id;
      targetSubStatusId = targetSubStatus.id;
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const activeRecruiterId = await this.getCandidateActiveRecruiter(
      candidateProject.candidateId,
    );

    const updated = await tx.candidateProjects.update({
      where: { id },
      data: {
        mainStatusId: targetMainStatusId,
        subStatusId: targetSubStatusId,
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

    await tx.candidateProjectStatusHistory.create({
      data: {
        candidateProjectMapId: id,
        changedById: userId,
        changedByName: user?.name || null,
        mainStatusId: targetMainStatusId,
        subStatusId: targetSubStatusId,
        mainStatusSnapshot: targetMainStatus.label,
        subStatusSnapshot: targetSubStatus.label,
        reason: reason || null,
        notes: notes || null,
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
      include: { mainStatus: true },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate project assignment with ID ${id} not found`,
      );
    }

    this.assertCandidateProjectPipelineNotBlocked(
      candidateProject.mainStatus?.name,
    );

    return this.prisma.$transaction((tx) =>
      this.applyStatusUpdateInTransaction(
        tx,
        id,
        { mainStatusId, subStatusId, subStatusName, reason, notes },
        userId,
      ),
    );
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
              roleCatalogId: true,
              roleCatalog: {
                select: { id: true, name: true, label: true },
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
          currentProjectStatus: true,
          subStatus: {
            select: {
              id: true,
              name: true,
              label: true,
            },
          },
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
        mainStatus: true,
      },
    });

    if (!candidateProject) {
      throw new NotFoundException(
        `Candidate-Project with ID "${candidateProjectMapId}" not found`,
      );
    }

    this.assertCandidateProjectPipelineNotBlocked(
      candidateProject.mainStatus?.name,
    );

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
          status: scheduledTime ? 'scheduled' : 'assigned',
        },
      });

      // Update candidate-project status to assigned
      await tx.candidateProjects.update({
        where: { id: candidateProjectMapId },
        data: {
          subStatus: {
            connect: {
              name: CANDIDATE_PROJECT_STATUS.SCREENING_ASSIGNED,
            },
          },
        },
      });

      // Create status history
      await tx.candidateProjectStatusHistory.create({
        data: {
          candidateProjectMapId,
          subStatusSnapshot: CANDIDATE_PROJECT_STATUS.SCREENING_ASSIGNED,
          changedById: userId,
          reason: `Assigned to screening with coordinator ${coordinator.name}`,
        },
      });

      // Also create an interview status history record for auditing (screening event)
      await tx.interviewStatusHistory.create({
        data: {
          interviewType: 'screening',
          interviewId: screening.id,
          candidateProjectMapId: candidateProjectMapId,
          previousStatus: null,
          status: 'assigned',
          statusSnapshot: 'Screening Assigned',
          statusAt: new Date(),
          changedById: userId,
          changedByName: coordinator.name,
          reason: `Assigned to screening with coordinator ${coordinator.name}`,
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
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { currentStatus: true },
    });
    if (!candidate) throw new NotFoundException(`Candidate ${candidateId} not found`);

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    assertProjectOpenForAssignment(project);

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
    const existingAssignment = await this.prisma.candidateProjects.findFirst({
      where: { candidateId, projectId },
      include: { mainStatus: true },
    });

    if (!existingAssignment) {
      this.ensureCandidatePositiveForProjectAssignment(candidate);
    } else {
      this.assertCandidateProjectPipelineNotBlocked(
        existingAssignment.mainStatus?.name,
      );
    }

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
        // Create training record for basic training without a linked screening
        await tx.screeningTraining.create({
          data: {
            candidateProjectMapId: assignment.id,
            assignedBy: userId,
            focusAreas: [],
            priority: TRAINING_PRIORITY.MEDIUM as any,
            status: TRAINING_STATUS.ASSIGNED as any,
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

    if (type === 'screening_assigned') {
      await this.outboxService.publishCandidateAssignedToScreening(
        candidateProject.id,
        dto.coordinatorId || userId, // Fallback to current user if coordinator not provided in DTO
        candidateProject.recruiterId || userId,
        userId,
      );
    } else if (type === 'interview_assigned') {
      // Future: Add publishCandidateAssignedToMainInterview if needed
    }

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
        currentStatus: true,
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
        rolesNeeded: {
          include: {
            roleCatalog: true,
          },
        },
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
      const hardReasons: string[] = [];
      const softReasons: string[] = [];
      const flags = {
        gender: true,
        age: true,
        experience: true,
      };

      // Status Check (Hard) - Block assignment for non-positive candidates and RNR
      if (!this.isCandidatePositiveStatus(candidate)) {
        hardReasons.push(
          `Candidate must be in a positive status (${CANDIDATE_STATUS.INTERESTED}, ${CANDIDATE_STATUS.FUTURE}, or ${CANDIDATE_STATUS.ON_HOLD}) to be assigned to a project.`,
        );
      }

      if (candidate.currentStatus?.statusName?.toLowerCase() === CANDIDATE_STATUS.RNR) {
        hardReasons.push(
          `Candidate is currently in Ringing No Response (RNR) status and cannot be assigned to a project.`,
        );
      }

      // Gender Check (Hard)
      if (
        role.genderRequirement &&
        role.genderRequirement.toLowerCase() !== 'all'
      ) {
        const requiredGender = role.genderRequirement.toLowerCase();
        if (!candidateGender) {
          flags.gender = false;
          hardReasons.push(
            `Gender is required for this role (${role.genderRequirement}), but candidate gender is not specified.`,
          );
        } else if (candidateGender !== requiredGender) {
          flags.gender = false;
          hardReasons.push(
            `Gender mismatch: Role requires ${role.genderRequirement}, but candidate is ${candidate.gender}.`,
          );
        }
      }

      // Age Check (Hard)
      if (age === null) {
        flags.age = false;
        hardReasons.push(
          `Age is required for this role (${role.minAge} to ${role.maxAge} years) but candidate date of birth is not provided.`,
        );
      } else if (age < role.minAge || age > role.maxAge) {
        flags.age = false;
        hardReasons.push(
          `Age mismatch: Candidate is ${age} years old, but role requires ${role.minAge} to ${role.maxAge} years.`,
        );
      }

      // Experience Check (Hard)
      if (role.minExperience !== null && candidateExp < role.minExperience) {
        flags.experience = false;
        hardReasons.push(
          `Experience mismatch: This candidate has ${candidateExp} years of total experience, which is less than the required minimum of ${role.minExperience} years.`,
        );
      }
      if (role.maxExperience !== null && candidateExp > role.maxExperience) {
        flags.experience = false;
        hardReasons.push(
          `Experience mismatch: This candidate has ${candidateExp} years of total experience, which exceeds the allowed maximum of ${role.maxExperience} years for this role.`,
        );
      }

      // Specific Role Match Check (Hard & Soft)
      if (role.roleCatalogId) {
        // Calculate years of experience specifically for this role
        const specificExp = this.calculateExperienceFromWorkHistory(
          candidate.workExperiences || [],
          role.roleCatalogId,
        );

        if (specificExp === 0) {
          flags.experience = false;
          hardReasons.push(
            `Experience mismatch: Candidate has no recorded work history as ${
              role.roleCatalog?.label || role.designation
            }.`,
          );
        } else if (role.minExperience !== null && specificExp < role.minExperience) {
          // If candidate has some experience but not enough for the specific role
          softReasons.push(
            `Experience Warning: The candidate has ${candidateExp} years total experience, but only ${specificExp} years specifically as ${
              role.roleCatalog?.label || role.designation
            }. Note that this role requires ${role.minExperience} years of experience in this specific position.`,
          );
        }
      }

      // Salary Check (Soft)
      // Use only expectedMinSalary for candidate salary expectations.
      // expectedMaxSalary is deprecated for current matching logic and no longer
      // exposed on the Job Preference form.
      const projMin = role.minSalaryRange;
      const projMax = role.maxSalaryRange;
      const candMin = candidate.expectedMinSalary;

      if (projMax && candMin && candMin > projMax) {
        const rangeStr = projMin ? `${projMin} - ${projMax}` : `up to ${projMax}`;
        softReasons.push(
          `Salary mismatch: Candidate expects minimum ${candMin}, but project budget is ${rangeStr}.`,
        );
      }

      // 4. Licensing/Verification Check (Soft)
      if (project.licensingExam) {
        if (!candidate.licensingExam) {
          softReasons.push(
            `Licensing Exam mismatch: Project requires ${project.licensingExam}, but candidate has no licensing exam specified.`,
          );
        } else if (
          project.licensingExam.toLowerCase() !==
          candidate.licensingExam.toLowerCase()
        ) {
          softReasons.push(
            `Licensing Exam mismatch: Project requires ${project.licensingExam}, but candidate has ${candidate.licensingExam}.`,
          );
        }
      }

      if (project.dataFlow === true && candidate.dataFlow !== true) {
        softReasons.push(`DataFlow verification is required for this project.`);
      }

      if (project.eligibility === true && candidate.eligibility !== true) {
        softReasons.push(`Eligibility verification is required for this project.`);
      }

      return {
        roleId: role.id,
        designation: role.designation,
        isEligible: hardReasons.length === 0,
        flags,
        reasons: [...hardReasons, ...softReasons],
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
   * Returns eligibility status for all requested candidates
   */
  async checkBulkEligibility(dto: BulkCheckEligibilityDto) {
    const { projectId, candidateIds } = dto;

    // 1. Fetch project with roles
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rolesNeeded: {
          include: {
            roleCatalog: true,
          },
        },
        country: true,
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
        currentStatus: true,
        // include work history so bulk eligibility mirrors single-candidate behavior
        workExperiences: true,
        preferredCountries: {
          include: {
            country: true,
          },
        },
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
        const hardReasons: string[] = [];
        const softReasons: string[] = [];
        const flags = {
          gender: true,
          age: true,
          experience: true,
        };

        // Status Check (Hard) - Block assignment for non-positive candidates and RNR
        if (!this.isCandidatePositiveStatus(candidate)) {
          hardReasons.push(
            `Candidate must be in a positive status (${CANDIDATE_STATUS.INTERESTED}, ${CANDIDATE_STATUS.FUTURE}, or ${CANDIDATE_STATUS.ON_HOLD}) to be assigned to a project.`,
          );
        }

        if (candidate.currentStatus?.statusName?.toLowerCase() === CANDIDATE_STATUS.RNR) {
          hardReasons.push(
            `Candidate is currently in Ringing No Response (RNR) status and cannot be assigned to a project.`,
          );
        }

        // Gender Check (Hard)
        if (
          role.genderRequirement &&
          role.genderRequirement.toLowerCase() !== 'all'
        ) {
          const requiredGender = role.genderRequirement.toLowerCase();
          if (!candidateGender) {
            flags.gender = false;
            hardReasons.push(
              `Gender is required for this role (${role.genderRequirement}), but candidate gender is not specified.`,
            );
          } else if (candidateGender !== requiredGender) {
            flags.gender = false;
            hardReasons.push(
              `Gender mismatch: Role requires ${role.genderRequirement}, but candidate is ${candidate.gender}.`,
            );
          }
        }

        // Age Check (Hard)
        if (age === null) {
          flags.age = false;
          hardReasons.push(
            `Age is required for this role (${role.minAge} to ${role.maxAge} years) but candidate date of birth is not provided.`,
          );
        } else if (age < role.minAge || age > role.maxAge) {
          flags.age = false;
          hardReasons.push(
            `Age mismatch: Candidate is ${age} years old, but role requires ${role.minAge} to ${role.maxAge} years.`,
          );
        }

        // Experience Check (Hard)
        if (role.minExperience !== null && candidateExp < role.minExperience) {
          flags.experience = false;
          hardReasons.push(
            `Experience mismatch: This candidate has ${candidateExp} years of total experience, which is less than the required minimum of ${role.minExperience} years.`,
          );
        }

        if (
          role.maxExperience !== null &&
          role.maxExperience !== undefined &&
          candidateExp > role.maxExperience
        ) {
          flags.experience = false;
          hardReasons.push(
            `Experience mismatch: This candidate has ${candidateExp} years of total experience, which exceeds the allowed maximum of ${role.maxExperience} years for this role.`,
          );
        }

        // --- NEW: Specific Role Match Check (Hard & Soft) ---
        if (role.roleCatalogId) {
          // Calculate years of experience specifically for this role
          const specificExp = this.calculateExperienceFromWorkHistory(
            candidate.workExperiences || [],
            role.roleCatalogId,
          );

          if (specificExp === 0) {
            hardReasons.push(
              `Experience mismatch: Candidate has no recorded work history as ${
                role.roleCatalog?.label || role.designation
              }.`,
            );
          } else if (role.minExperience !== null && specificExp < role.minExperience) {
            // If candidate has some experience but not enough for the specific role
            softReasons.push(
              `Experience Warning: The candidate has ${candidateExp} years total experience, but only ${specificExp} years specifically as ${
                role.roleCatalog?.label || role.designation
              }. Note that this role requires ${role.minExperience} years of experience in this specific position.`,
            );
          }
        }

        // 1. Country Preference Check (Soft)
        const prefCountries = candidate.preferredCountries || [];
        if (prefCountries.length > 0 && project.countryCode) {
          const isCountryMatch = prefCountries.some(
            (cp) => cp.countryCode === project.countryCode,
          );
          if (!isCountryMatch) {
            const countryList = prefCountries
              .map((cp) => (cp as any).country?.name || cp.countryCode)
              .join(', ');
            softReasons.push(
              `Candidate preferred country is ${countryList}, not ${
                project.country?.name || project.countryCode
              }.`,
            );
          }
        }

        // 2. Sector Type Check (Soft)
        if (
          candidate.sectorType &&
          project.projectType &&
          candidate.sectorType.toLowerCase() !== 'any_preference' &&
          candidate.sectorType.toLowerCase() !== 'no_preference'
        ) {
          if (
            candidate.sectorType.toLowerCase() !==
            project.projectType.toLowerCase()
          ) {
            softReasons.push(
              `Sector mismatch: Candidate preferred ${candidate.sectorType}, but project is ${project.projectType}.`,
            );
          }
        }

        // 3. Salary Check (Soft)
        // Use only expectedMinSalary for candidate salary expectations.
        // expectedMaxSalary is deprecated for current matching logic and no longer
        // exposed on the Job Preference form.
        const projMin = role.minSalaryRange;
        const projMax = role.maxSalaryRange;
        const candMin = candidate.expectedMinSalary;

        if (projMax && candMin && candMin > projMax) {
          const rangeStr = projMin ? `${projMin} - ${projMax}` : `up to ${projMax}`;
          softReasons.push(
            `Salary mismatch: Candidate expects minimum ${candMin}, but project budget is ${rangeStr}.`,
          );
        }

        // 4. Licensing/Verification Check (Soft)
        if (project.licensingExam) {
          if (!candidate.licensingExam) {
            softReasons.push(
              `Licensing Exam mismatch: Project requires ${project.licensingExam}, but candidate has no licensing exam specified.`,
            );
          } else if (
            project.licensingExam.toLowerCase() !==
            candidate.licensingExam.toLowerCase()
          ) {
            softReasons.push(
              `Licensing Exam mismatch: Project requires ${project.licensingExam}, but candidate has ${candidate.licensingExam}.`,
            );
          }
        }

        if (project.dataFlow === true && candidate.dataFlow !== true) {
          softReasons.push(`DataFlow verification is required for this project.`);
        }

        if (project.eligibility === true && candidate.eligibility !== true) {
          softReasons.push(`Eligibility verification is required for this project.`);
        }

        return {
          roleId: role.id,
          designation: role.designation,
          isEligible: hardReasons.length === 0,
          flags,
          reasons: [...hardReasons, ...softReasons],
        };
      });

      return {
        candidateId: candidate.id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        isEligible: roleEligibility.some((r) => r.isEligible),
        roleEligibility,
      };
    });

    // Return the full results (even eligible ones) so the UI can show role-specific mismatch messages in tooltips
    return results;
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
  private calculateExperienceFromWorkHistory(
    workExperiences: any[],
    roleCatalogId?: string,
  ): number {
    let totalMonths = 0;

    workExperiences.forEach((exp) => {
      // If roleCatalogId is provided, only sum experience matching that role
      if (roleCatalogId && exp.roleCatalogId !== roleCatalogId) {
        return;
      }

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

  /**
   * Bulk assign candidates to project
   */
  async bulkAssignCandidatesToProject(
    dto: BulkAssignCandidateProjectDto,
    userId: string,
  ) {
    const { projectId, assignments } = dto;
    const results: any[] = [];
    const errors: any[] = [];

    // Get project just once
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { rolesNeeded: true },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    assertProjectOpenForAssignment(project);

    // Get common statuses once
    const mainStatus = await this.prisma.candidateProjectMainStatus.findUnique({
      where: { name: 'nominated' },
    });

    const subStatus = await this.prisma.candidateProjectSubStatus.findUnique({
      where: { name: 'nominated_initial' },
    });

    if (!mainStatus || !subStatus) {
      throw new Error('Nominated status not found in database');
    }

    // Get current user for history snapshots
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    for (const assignmentDto of assignments) {
      const { candidateId, roleNeededId, notes } = assignmentDto;

      try {
        // Simple verification - candidate exists
        const candidate = await this.prisma.candidate.findUnique({
          where: { id: candidateId },
          include: { currentStatus: true },
        });

        if (!candidate) {
          errors.push({ candidateId, error: 'Candidate not found' });
          continue;
        }

        try {
          this.ensureCandidatePositiveForProjectAssignment(candidate);
        } catch (error: any) {
          errors.push({ candidateId, error: error.message || 'Candidate status not eligible for assignment' });
          continue;
        }

        // Verify role exists and belongs to the project to avoid foreign key violations
        if (roleNeededId) {
          const roleExists = await this.prisma.roleNeeded.findFirst({
            where: { 
              id: roleNeededId,
              projectId: projectId 
            },
          });

          if (!roleExists) {
            errors.push({ candidateId, error: `Role ${roleNeededId} does not exist in project ${projectId}` });
            continue;
          }
        }

        // Check for existing assignment
        const exists = await this.prisma.candidateProjects.findFirst({
          where: {
            candidateId,
            projectId,
            roleNeededId,
          },
        });

        if (exists) {
          errors.push({ candidateId, error: 'Already assigned to this project with this role' });
          continue;
        }

        try {
          await assertAgentCandidateLinkedToAgentProject(this.prisma, candidate, projectId);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Assignment validation failed';
          errors.push({ candidateId, error: msg });
          continue;
        }

        // Recruiter from assignment table or fallback to recruiter provided (not in bulk dto) or currently logged in user
        const activeRecruiterId = await this.getCandidateActiveRecruiter(candidateId);
        const finalRecruiterId = activeRecruiterId || userId;

        const assignment = await this.prisma.$transaction(async (tx) => {
          const newAssignment = await tx.candidateProjects.create({
            data: {
              candidateId,
              projectId,
              roleNeededId: roleNeededId || null,
              recruiterId: finalRecruiterId || null,
              assignedAt: new Date(),
              notes: notes || null,
              mainStatusId: mainStatus.id,
              subStatusId: subStatus.id,
            },
          });

          await tx.candidateProjectStatusHistory.create({
            data: {
              candidateProjectMapId: newAssignment.id,
              changedById: userId,
              changedByName: user?.name,
              mainStatusId: mainStatus.id,
              subStatusId: subStatus.id,
              mainStatusSnapshot: mainStatus.label,
              subStatusSnapshot: subStatus.label,
              reason: 'Bulk assignment to project',
              notes: notes || 'Assigned to project via bulk operation',
            },
          });

          // Auto-assign documents
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

        results.push(assignment);

        // Publish data sync event for each assigned candidate
        try {
          await this.outboxService.publishDataSync({
            userId,
            type: 'RecruiterDocuments',
            id: 'LIST',
            message: `Candidate assigned to project.`,
          });

          if (finalRecruiterId && finalRecruiterId !== userId) {
            await this.outboxService.publishDataSync({
              userId: finalRecruiterId,
              type: 'RecruiterDocuments',
              id: 'LIST',
              message: `Candidate assigned to project.`,
            });
          }
        } catch (err) {
          this.logger.error(`Failed to publish data sync event for assignment ${assignment.id}`, err.stack);
        }

        // Notify Interview Coordinators for screening-required projects
        if (project.requiredScreening) {
          const coordinators = await this.getInterviewCoordinators();
          const candidateName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Candidate';
          const coordinatorNotifications = coordinators.map((coord) => {
            const idemKey = `candidate-assigned:${assignment.id}:${coord.id}`;
            return this.notificationsService.createNotification({
              userId: coord.id,
              type: 'candidate_assigned_project',
              title: 'Project Screening Required',
              message: `Project screening required: ${candidateName} has been assigned to this project ${project.title}. Please assign for screening.`,
              link: `/projects/${project.id}`,
              meta: {
                projectId: project.id,
                candidateId: candidate.id,
                candidateProjectMapId: assignment.id,
              },
              idemKey,
            });
          });

          try {
            await Promise.all(coordinatorNotifications);
          } catch (err) {
            this.logger.error(
              `Failed to send coordinator notification for bulk assignment ${assignment.id}: ${err.message}`,
            );
          }
        }
      } catch (error: any) {
        this.logger.error(`Error in bulk assignment for candidate ${candidateId}: ${error.message}`);
        errors.push({ candidateId, error: error.message });
      }
    }

    return {
      totalRequested: assignments.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }
}
