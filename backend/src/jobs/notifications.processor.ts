import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface NotificationJobData {
  type: string;
  eventId: string;
  payload: Record<string, unknown>;
}

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<any> {
    const { type, eventId, payload } = job.data;
    this.logger.log(`Processing notification job: ${type} (${eventId})`);

    try {
      switch (type) {
        case 'MemberTransferRequested':
          return await this.handleTransferRequested(job);
        case 'CandidateDocumentsVerified':
          return await this.handleCandidateDocumentsVerified(job);
        case 'CandidateDocumentsRejected':
          return await this.handleCandidateDocumentsRejected(job);
        case 'CandidateSentForVerification':
          return await this.handleCandidateSentForVerification(job);
        case 'CandidateAssignedToRecruiter':
          return await this.handleCandidateAssignedToRecruiter(job);
        case 'CandidateSentToScreening':
          return await this.handleCandidateSentToScreening(job);
        case 'CandidateApprovedForClientInterview':
          return await this.handleCandidateApprovedForClientInterview(job);
        case 'CandidateFailedScreening':
          return await this.handleCandidateFailedScreening(job);
        default:
          this.logger.warn(`Unknown notification type: ${type}`);
          return { success: false, message: `Unknown type: ${type}` };
      }
    } catch (error) {
      this.logger.error(
        `Failed to process notification ${type}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleTransferRequested(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing transfer request event: ${eventId}`);

    try {
      const { transferId, userId, fromTeamId, toTeamId, requestedBy } =
        payload as {
          transferId: string;
          userId: string;
          fromTeamId: string;
          toTeamId: string;
          requestedBy: string;
        };

      // Load team information
      const team = await this.prisma.team.findUnique({
        where: { id: fromTeamId },
        include: {
          userTeams: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!team) {
        throw new Error(`Team ${fromTeamId} not found`);
      }

      // Get recipients (team lead, head, manager)
      const recipients = [team.leadId, team.headId, team.managerId].filter(
        Boolean,
      );

      // Create notifications for each recipient
      for (const recipientId of recipients) {
        if (!recipientId) continue;

        const idemKey = `${eventId}:${recipientId}:transfer_request`;

        await this.notificationsService.createNotification({
          userId: recipientId,
          type: 'transfer_request',
          title: 'New Team Transfer Request',
          message: `A team member has requested to transfer to another team.`,
          link: `/teams/${fromTeamId}/transfers/${transferId}`,
          meta: payload,
          idemKey,
        });
      }

      this.logger.log(
        `Transfer request notifications created for ${recipients.length} recipients`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process transfer request: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleCandidateDocumentsVerified(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(
      `Processing candidate documents verified event: ${eventId}`,
    );

    try {
      const { candidateProjectMapId, verifiedBy } = payload as {
        candidateProjectMapId: string;
        verifiedBy: string;
      };

      // Load candidate project mapping with candidate and project details
      const candidateProjectMap =
        await this.prisma.candidateProjects.findUnique({
          where: { id: candidateProjectMapId },
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                countryCode: true,
                mobileNumber: true,
                email: true,
              },
            },
            project: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        });

      if (!candidateProjectMap) {
        this.logger.warn(
          `Candidate project mapping ${candidateProjectMapId} not found`,
        );
        return;
      }

      // Check if recruiter exists
      if (!candidateProjectMap.recruiterId) {
        this.logger.warn(
          `No recruiter assigned to candidate project mapping ${candidateProjectMapId}`,
        );
        return;
      }

      // Get the recruiter who nominated this candidate
      const recruiter = await this.prisma.user.findUnique({
        where: { id: candidateProjectMap.recruiterId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!recruiter) {
        this.logger.warn(
          `Recruiter ${candidateProjectMap.recruiterId} not found`,
        );
        return;
      }

      const idemKey = `${eventId}:${recruiter.id}:candidate_documents_rejected`;

      await this.notificationsService.createNotification({
        userId: recruiter.id,
        type: 'candidate_documents_verified',
        title: 'Candidate Documents Verified',
        message: `Documents for candidate ${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} have been verified for project ${candidateProjectMap.project.title}. You can now proceed with project allocation.`,
        link: `/candidate-project/${candidateProjectMap.candidate.id}/projects/${candidateProjectMap.project.id}`,
        meta: {
          candidateProjectMapId,
          candidateId: candidateProjectMap.candidate.id,
          projectId: candidateProjectMap.project.id,
          verifiedBy,
        },
        idemKey,
      });

      this.logger.log(
        `Candidate documents verified notification created for recruiter ${recruiter.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process candidate documents verified: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleCandidateDocumentsRejected(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(
      `Processing candidate documents rejected event: ${eventId}`,
    );

    try {
      const { candidateProjectMapId, verifiedBy } = payload as {
        candidateProjectMapId: string;
        verifiedBy: string;
      };

      // Load candidate project mapping with candidate and project details
      const candidateProjectMap =
        await this.prisma.candidateProjects.findUnique({
          where: { id: candidateProjectMapId },
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                countryCode: true,
                mobileNumber: true,
                email: true,
              },
            },
            project: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        });

      if (!candidateProjectMap) {
        this.logger.warn(
          `Candidate project mapping ${candidateProjectMapId} not found`,
        );
        return;
      }

      // Check if recruiter exists
      if (!candidateProjectMap.recruiterId) {
        this.logger.warn(
          `No recruiter assigned to candidate project mapping ${candidateProjectMapId}`,
        );
        return;
      }

      // Get the recruiter who nominated this candidate
      const recruiter = await this.prisma.user.findUnique({
        where: { id: candidateProjectMap.recruiterId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!recruiter) {
        this.logger.warn(
          `Recruiter ${candidateProjectMap.recruiterId} not found`,
        );
        return;
      }

      const idemKey = `${eventId}:${recruiter.id}:candidate_documents_verified`;

      await this.notificationsService.createNotification({
        userId: recruiter.id,
        type: 'candidate_documents_rejected',
        title: 'Candidate Documents Rejected',
        message: `Documents for candidate ${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} have been rejected for project ${candidateProjectMap.project.title}. Please review and take necessary action.`,
         link: `/candidate-project/${candidateProjectMap.candidate.id}/projects/${candidateProjectMap.project.id}`,
        meta: {
          candidateProjectMapId,
          candidateId: candidateProjectMap.candidate.id,
          projectId: candidateProjectMap.project.id,
          verifiedBy,
        },
        idemKey,
      });

      this.logger.log(
        `Candidate documents rejected notification created for recruiter ${recruiter.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process candidate documents rejected: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleCandidateSentForVerification(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(
      `Processing candidate sent for verification event: ${eventId}`,
    );

    try {
      const { candidateProjectMapId, assignedToExecutive } = payload as {
        candidateProjectMapId: string;
        assignedToExecutive: string;
      };

      // Load candidate project mapping with candidate and project details
      const candidateProjectMap =
        await this.prisma.candidateProjects.findUnique({
          where: { id: candidateProjectMapId },
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            project: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        });

      if (!candidateProjectMap) {
        this.logger.warn(
          `Candidate project mapping ${candidateProjectMapId} not found`,
        );
        return;
      }

      const idemKey = `${eventId}:${assignedToExecutive}:candidate_sent_for_verification`;

      await this.notificationsService.createNotification({
        userId: assignedToExecutive,
        type: 'candidate_sent_for_verification',
        title: 'New Candidate for Document Verification',
        message: `Candidate ${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} has been assigned to you for document verification for project ${candidateProjectMap.project.title}.`,
        link: `/candidates/${candidateProjectMap.candidate.id}/verification/${candidateProjectMapId}`,
        meta: {
          candidateProjectMapId,
          candidateId: candidateProjectMap.candidate.id,
          projectId: candidateProjectMap.project.id,
        },
        idemKey,
      });

      this.logger.log(
        `Candidate sent for verification notification created for executive ${assignedToExecutive}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process candidate sent for verification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleDefault(job: Job<NotificationJobData>) {
    const { type, eventId } = job.data;
    this.logger.warn(
      `Unhandled notification event type: ${type} (eventId: ${eventId})`,
    );

    // Log the unhandled event for monitoring
    await this.prisma.auditLog.create({
      data: {
        userId: 'system',
        actionType: 'unhandled_notification_event',
        entityType: 'notification',
        entityId: eventId,
        changes: {
          eventType: type,
          eventId,
        },
      },
    });
  }

  async handleCandidateAssignedToRecruiter(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(
      `Processing candidate assigned to recruiter event: ${eventId}`,
    );

    try {
      const {
        candidateId,
        projectId,
        roleNeededId,
        recruiterId,
        matchScore,
        matchReasons,
      } = payload as {
        candidateId: string;
        projectId: string;
        roleNeededId: string;
        recruiterId: string;
        matchScore: number;
        matchReasons: string[];
      };

      // Load candidate and project details
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      });

      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          title: true,
        },
      });

      const roleNeeded = await this.prisma.roleNeeded.findUnique({
        where: { id: roleNeededId },
        select: {
          id: true,
          designation: true,
        },
      });

      if (!candidate || !project || !roleNeeded) {
        this.logger.warn(
          `Missing data for candidate assignment: candidate=${!!candidate}, project=${!!project}, role=${!!roleNeeded}`,
        );
        return;
      }

      const idemKey = `${eventId}:${recruiterId}:candidate_assigned`;

      await this.notificationsService.createNotification({
        userId: recruiterId,
        type: 'candidate_assigned',
        title: 'New Candidate Assigned',
        message: `Candidate ${candidate.firstName} ${candidate.lastName} has been assigned to you for ${roleNeeded.designation} role in project ${project.title}. Match score: ${matchScore}%`,
        link: `/projects/${projectId}/candidates/${candidateId}`,
        meta: {
          candidateId,
          projectId,
          roleNeededId,
          matchScore,
          matchReasons,
        },
        idemKey,
      });

      this.logger.log(
        `Candidate assigned notification created for recruiter ${recruiterId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process candidate assigned to recruiter: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  
    async handleCandidateSentToScreening(job: Job<NotificationJobData>) {
      const { eventId, payload } = job.data;
      this.logger.log(`Processing candidate sent to screening event: ${eventId}`);

      try {
        const { candidateProjectMapId, screeningId, coordinatorId, recruiterId } = payload as {
          candidateProjectMapId: string;
          screeningId: string;
          coordinatorId: string;
          recruiterId: string;
        };

        // Load candidate project mapping with candidate and project details
        const candidateProjectMap = await this.prisma.candidateProjects.findUnique({
          where: { id: candidateProjectMapId },
          include: {
            candidate: { select: { firstName: true, lastName: true, id: true } },
            project: { select: { id: true, title: true } },
          },
        });

        if (!candidateProjectMap) {
          this.logger.warn(`Candidate project mapping ${candidateProjectMapId} not found`);
          return;
        }

        // Notify coordinator
        const coordinator = await this.prisma.user.findUnique({ where: { id: coordinatorId } });
        if (coordinator) {
          const idemKey = `${eventId}:${coordinator.id}:candidate_sent_to_screening`;

          await this.notificationsService.createNotification({
            userId: coordinator.id,
            type: 'candidate_sent_to_screening',
            title: 'Candidate assigned to screening',
            message: `Candidate ${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} has been assigned to you for screening for project ${candidateProjectMap.project.title}.`,
            link: `/screenings/${screeningId}`,
            meta: { candidateProjectMapId, screeningId },
            idemKey,
          });
        }

        // Notify recruiter
        if (recruiterId) {
          const idemKey = `${eventId}:${recruiterId}:candidate_sent_to_screening`;
          await this.notificationsService.createNotification({
            userId: recruiterId,
            type: 'candidate_sent_to_screening',
            title: 'Candidate assigned to screening',
            message: `Candidate ${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} has been sent to screening.`,
            link: `/candidate-projects/${candidateProjectMapId}/screening/${screeningId}`,
            meta: { candidateProjectMapId, screeningId },
            idemKey,
          });
        }

        this.logger.log(`Notifications created for candidate sent to screening event: ${eventId}`);
      } catch (error) {
        this.logger.error(`Failed to process candidate sent to screening: ${error.message}`, error.stack);
        throw error;
      }
    }

  /**
   * Handle candidate approved for client interview notification
   * Notifies recruiter and team head after passing screening
   */
  async handleCandidateApprovedForClientInterview(
    job: Job<NotificationJobData>,
  ) {
    const { eventId, payload } = job.data;
    this.logger.log(
      `Processing candidate approved for client interview event: ${eventId}`,
    );

    try {
      const {
        candidateProjectMapId,
        screeningId,
        coordinatorId,
        recruiterId,
        teamHeadId,
      } = payload as {
        candidateProjectMapId: string;
        screeningId: string;
        coordinatorId: string;
        recruiterId: string;
        teamHeadId?: string;
      };

      // Load candidate project mapping with details
      const candidateProjectMap =
        await this.prisma.candidateProjects.findUnique({
          where: { id: candidateProjectMapId },
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
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
                designation: true,
              },
            },
          },
        });

      if (!candidateProjectMap) {
        this.logger.warn(
          `Candidate project mapping ${candidateProjectMapId} not found`,
        );
        return;
      }

      const roleDesignation =
        candidateProjectMap.roleNeeded?.designation || 'Unknown Role';

      // Notify recruiter
      if (recruiterId) {
        const idemKeyRecruiter = `${eventId}:${recruiterId}:screening_passed`;

        await this.notificationsService.createNotification({
          userId: recruiterId,
          type: 'screening_passed',
          title: 'Candidate Approved for Client Interview',
          message: `${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} has successfully passed the screening for ${candidateProjectMap.project.title} (${roleDesignation}). You can now schedule the client interview.`,
          link: `/candidate-projects/${candidateProjectMapId}/screening/${screeningId}`,
          meta: {
            candidateProjectMapId,
            screeningId,
            candidateId: candidateProjectMap.candidate.id,
            projectId: candidateProjectMap.project.id,
            coordinatorId,
          },
          idemKey: idemKeyRecruiter,
        });

        this.logger.log(`Screening passed notification created for recruiter ${recruiterId}`);
      }

      // Notify team head if present
      if (teamHeadId) {
        const idemKeyTeamHead = `${eventId}:${teamHeadId}:screening_passed`;

        await this.notificationsService.createNotification({
          userId: teamHeadId,
          type: 'screening_passed',
          title: 'Candidate Ready for Client Interview',
          message: `${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} has passed the screening for ${candidateProjectMap.project.title} (${roleDesignation}) and is ready for client interview.`,
          link: `/candidate-projects/${candidateProjectMapId}/screening/${screeningId}`,
          meta: {
            candidateProjectMapId,
            screeningId,
            candidateId: candidateProjectMap.candidate.id,
            projectId: candidateProjectMap.project.id,
            coordinatorId,
          },
          idemKey: idemKeyTeamHead,
        });

        this.logger.log(`Screening passed notification created for team head ${teamHeadId}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process candidate approved for client interview: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle candidate failed screening notification
   * Notifies recruiter and team head when candidate fails screening
   */
  async handleCandidateFailedScreening(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing candidate failed screening event: ${eventId}`);

    try {
      const {
        candidateProjectMapId,
        screeningId,
        coordinatorId,
        recruiterId,
        decision,
        teamHeadId,
      } = payload as {
        candidateProjectMapId: string;
        screeningId: string;
        coordinatorId: string;
        recruiterId: string;
        decision: string;
        teamHeadId?: string;
      };

      // Load candidate project mapping with details
      const candidateProjectMap = await this.prisma.candidateProjects.findUnique({
        where: { id: candidateProjectMapId },
        include: {
          candidate: { select: { id: true, firstName: true, lastName: true } },
          project: { select: { id: true, title: true } },
          roleNeeded: { select: { designation: true } },
        },
      });

      if (!candidateProjectMap) {
        this.logger.warn(`Candidate project mapping ${candidateProjectMapId} not found`);
        return;
      }

      const roleDesignation = candidateProjectMap.roleNeeded?.designation || 'Unknown Role';
      const decisionText = decision.replace('_', ' ');

      // Notify recruiter
      if (recruiterId) {
        const idemKeyRecruiter = `${eventId}:${recruiterId}:candidate_failed_screening`;

        await this.notificationsService.createNotification({
          userId: recruiterId,
          type: 'candidate_failed_screening',
          title: 'Screening Result - Action Required',
          message: `${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} did not pass the screening for ${candidateProjectMap.project.title} (${roleDesignation}). Decision: ${decisionText}. Please review and take appropriate action.`,
          link: `/candidate-projects/${candidateProjectMapId}/screening/${screeningId}`,
          meta: {
            candidateProjectMapId,
            screeningId,
            candidateId: candidateProjectMap.candidate.id,
            projectId: candidateProjectMap.project.id,
            coordinatorId,
            decision,
          },
          idemKey: idemKeyRecruiter,
        });

        this.logger.log(`Screening failed notification created for recruiter ${recruiterId}`);
      }

      // Notify team head if present
      if (teamHeadId) {
        const idemKeyTeamHead = `${eventId}:${teamHeadId}:candidate_failed_screening`;

        await this.notificationsService.createNotification({
          userId: teamHeadId,
          type: 'candidate_failed_screening',
          title: 'Screening Result - Review Needed',
          message: `${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} did not pass the screening for ${candidateProjectMap.project.title} (${roleDesignation}). Decision: ${decisionText}.`,
          link: `/candidate-projects/${candidateProjectMapId}/screening/${screeningId}`,
          meta: {
            candidateProjectMapId,
            screeningId,
            candidateId: candidateProjectMap.candidate.id,
            projectId: candidateProjectMap.project.id,
            coordinatorId,
            decision,
          },
          idemKey: idemKeyTeamHead,
        });

        this.logger.log(`Screening failed notification created for team head ${teamHeadId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process candidate failed screening: ${error.message}`, error.stack);
      throw error;
    }
  }
}
