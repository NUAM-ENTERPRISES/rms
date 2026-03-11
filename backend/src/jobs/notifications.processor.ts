import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

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
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
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
        case 'DocumentVerified':
          return await this.handleDocumentVerified(job);
        case 'DocumentRejected':
          return await this.handleDocumentRejected(job);
        case 'DocumentResubmissionRequested':
          return await this.handleDocumentResubmissionRequested(job);
        case 'DocumentResubmitted':
          return await this.handleDocumentResubmitted(job);
        case 'CandidateSentForVerification':
          return await this.handleCandidateSentForVerification(job);
        case 'CandidateAssignedToRecruiter':
          return await this.handleCandidateAssignedToRecruiter(job);
        case 'CandidateRecruiterAssigned':
          return await this.handleCandidateRecruiterAssigned(job);
        case 'CandidateTransferredBack':
          return await this.handleCandidateTransferredBack(job);
        case 'CandidateAssignedToScreening':
          return await this.handleCandidateAssignedToScreeningAssignment(job);
        case 'CandidateSentToScreening':
          return await this.handleCandidateSentToScreening(job);
        case 'CandidateApprovedForClientInterview':
          return await this.handleCandidateApprovedForClientInterview(job);
        case 'CandidateTransferredToProcessing':
          return await this.handleCandidateTransferredToProcessing(job);
        case 'CandidateHired':
          return await this.handleCandidateHired(job);
        case 'CandidateReadyForProcessing':
        case 'interview_passed':
          return await this.handleCandidateReadyForProcessing(job);
        case 'DocumentsForwardedToClient':
          return await this.handleDocumentsForwardedToClient(job);
        case 'CandidateFailedScreening':
          return await this.handleCandidateFailedScreening(job);
        case 'RecruiterNotification':
          return await this.handleRecruiterNotification(job);
        case 'DocumentationNotification':
          return await this.handleDocumentationNotification(job);
        case 'DataSync':
          return await this.handleDataSyncJob(job);
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
        title: `${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} Document verification fully completed`,
        message: `All required documents for candidate ${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} have been successfully verified for project ${candidateProjectMap.project.title}. You can now proceed with allocation.`,
        link: `/recruiter-docs/${candidateProjectMap.project.id}/${candidateProjectMap.candidate.id}`,
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
         link: `/recruiter-docs/${candidateProjectMap.project.id}/${candidateProjectMap.candidate.id}`,
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

  async handleDocumentVerified(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing document verified event: ${eventId}`);

    try {
      const { documentId, verifiedBy, candidateProjectMapId } = payload as {
        documentId: string;
        verifiedBy: string;
        candidateProjectMapId: string;
      };

      // Load document with candidate details
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!document) {
        this.logger.error(`Document ${documentId} not found`);
        return;
      }

      const candidateProjectMap =
        await this.prisma.candidateProjects.findUnique({
          where: { id: candidateProjectMapId },
          include: {
            project: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        });

      if (!candidateProjectMap) {
        this.logger.error(
          `Candidate project mapping ${candidateProjectMapId} not found`,
        );
        return;
      }

      // Identify the appropriate notification recipient. by default we used to notify the
      // user who originally uploaded the document (uploader). however if the document is
      // tied to a candidate-project map we prefer to notify the recruiter assigned to that
      // nomination. this ensures that when the documentation team verifies a file the
      // recruiter (not the documentation user) gets informed.
      const recruiterId = candidateProjectMap?.recruiterId;

      // Fetch the uploader for fallback only; we'll still load their name in case we need it in
      // the message.
      const uploader = await this.prisma.user.findUnique({
        where: { id: document.uploadedBy },
        select: {
          id: true,
          name: true,
        },
      });

      // Determine who should receive the notification
      const recipientId = recruiterId || uploader?.id;
      if (!recipientId) {
        this.logger.error(
          `No valid recipient found for document verified event (${documentId})`,
        );
        return;
      }

      const idemKey = `${eventId}:${recipientId}:document_verified`;

      // Build a generic message; include verifier/uploader info if available
      const recipientIsRecruiter = recruiterId && recruiterId === recipientId;
      const verifierUser = await this.prisma.user.findUnique({
        where: { id: verifiedBy },
        select: { name: true },
      });
      const verifierName = verifierUser?.name || 'A team member';

      const message = recipientIsRecruiter
        ? `Document "${document.fileName}" for candidate ${document.candidate.firstName} ${document.candidate.lastName} has been verified by ${verifierName} for project ${candidateProjectMap.project.title}.`
        : `Your uploaded document "${document.fileName}" for candidate ${document.candidate.firstName} ${document.candidate.lastName} has been verified for project ${candidateProjectMap.project.title}.`;

      await this.notificationsService.createNotification({
        userId: recipientId,
        type: 'document_verified',
        title: 'Document Verified',
        message,
        link: `/recruiter-docs/${candidateProjectMap.project.id}/${document.candidate.id}`,
        meta: {
          documentId,
          candidateId: document.candidate.id,
          projectId: candidateProjectMap.project.id,
          verifiedBy,
        },
        idemKey,
      });

      // log recipient instead of uploader to avoid null issues
      this.logger.log(
        `Document verified notification created for user ${recipientId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process document verified: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleDocumentRejected(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing document rejected event: ${eventId}`);

    try {
      const { documentId, rejectedBy, candidateProjectMapId, reason } =
        payload as {
          documentId: string;
          rejectedBy: string;
          candidateProjectMapId: string;
          reason?: string;
        };

      // Load document with candidate details
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!document) {
        this.logger.error(`Document ${documentId} not found`);
        return;
      }

      const candidateProjectMap =
        await this.prisma.candidateProjects.findUnique({
          where: { id: candidateProjectMapId },
          include: {
            project: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        });

      if (!candidateProjectMap) {
        this.logger.error(
          `Candidate project mapping ${candidateProjectMapId} not found`,
        );
        return;
      }

      // Determine recipient similar to verified event. recruiter first, fall back to uploader
      const recruiterId = candidateProjectMap?.recruiterId;
      const uploader = await this.prisma.user.findUnique({
        where: { id: document.uploadedBy },
        select: {
          id: true,
          name: true,
        },
      });

      const recipientId = recruiterId || uploader?.id;
      if (!recipientId) {
        this.logger.error(
          `No valid recipient found for document rejected event (${documentId})`,
        );
        return;
      }

      const idemKey = `${eventId}:${recipientId}:document_rejected`;

      const recipientIsRecruiter = recruiterId && recruiterId === recipientId;
      const messageBase = recipientIsRecruiter
        ? `Document "${document.fileName}" for candidate ${document.candidate.firstName} ${document.candidate.lastName} has been rejected for project ${candidateProjectMap.project.title}.`
        : `Your uploaded document "${document.fileName}" for candidate ${document.candidate.firstName} ${document.candidate.lastName} has been rejected for project ${candidateProjectMap.project.title}.`;

      const message = reason ? `${messageBase} Reason: ${reason}` : messageBase;

      await this.notificationsService.createNotification({
        userId: recipientId,
        type: 'document_rejected',
        title: 'Document Rejected',
        message,
        link: `/recruiter-docs/${candidateProjectMap.project.id}/${document.candidate.id}`,
        meta: {
          documentId,
          candidateId: document.candidate.id,
          projectId: candidateProjectMap.project.id,
          rejectedBy,
          reason,
        },
        idemKey,
      });

      this.logger.log(
        `Document rejected notification created for user ${recipientId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process document rejected: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleDocumentResubmissionRequested(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(
      `Processing document resubmission requested event: ${eventId}`,
    );

    try {
      const { documentId, requestedBy, candidateProjectMapId, reason } =
        payload as {
          documentId: string;
          requestedBy: string;
          candidateProjectMapId: string;
          reason?: string;
        };

      // Load document with candidate details
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!document) {
        this.logger.error(`Document ${documentId} not found`);
        return;
      }

      const candidateProjectMap =
        await this.prisma.candidateProjects.findUnique({
          where: { id: candidateProjectMapId },
          include: {
            project: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        });

      if (!candidateProjectMap) {
        this.logger.error(
          `Candidate project mapping ${candidateProjectMapId} not found`,
        );
        return;
      }

      // Determine recipient for resubmission request. prefer recruiter if the candidate
      // project map has one; otherwise fall back to uploader (the original behaviour).
      const recruiterId = candidateProjectMap?.recruiterId;

      const uploader = await this.prisma.user.findUnique({
        where: { id: document.uploadedBy },
        select: { id: true, name: true },
      });

      const recipientId = recruiterId || uploader?.id;
      if (!recipientId) {
        this.logger.error(
          `No valid recipient found for document resubmission request event (${documentId})`,
        );
        return;
      }

      const idemKey = `${eventId}:${recipientId}:document_resubmission_requested`;

      const recipientIsRecruiter = recruiterId && recruiterId === recipientId;
      const message = recipientIsRecruiter
        ? `Resubmission requested for document "${document.fileName}" for candidate ${document.candidate.firstName} ${document.candidate.lastName} for project ${candidateProjectMap.project.title}.${reason ? ` Reason: ${reason}` : ''}`
        : `Resubmission requested for document "${document.fileName}" for candidate ${document.candidate.firstName} ${document.candidate.lastName} for project ${candidateProjectMap.project.title}.${reason ? ` Reason: ${reason}` : ''}`;

      await this.notificationsService.createNotification({
        userId: recipientId,
        type: 'document_resubmission_requested',
        title: 'Document Resubmission Requested',
        message,
        link: `/recruiter-docs/${candidateProjectMap.project.id}/${document.candidate.id}`,
        meta: {
          documentId,
          candidateId: document.candidate.id,
          projectId: candidateProjectMap.project.id,
          requestedBy,
          reason,
        },
        idemKey,
      });

      this.logger.log(
        `Document resubmission requested notification created for user ${recipientId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process document resubmission requested: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleDocumentResubmitted(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing document resubmitted event: ${eventId}`);

    try {
      const { documentId, resubmittedBy, candidateProjectMapId } = payload as {
        documentId: string;
        resubmittedBy: string;
        candidateProjectMapId: string;
      };

      // Load document with candidate details
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!document) {
        this.logger.error(`Document ${documentId} not found`);
        return;
      }

      const candidateProjectMap =
        await this.prisma.candidateProjects.findUnique({
          where: { id: candidateProjectMapId },
          include: {
            project: {
              select: {
                id: true,
                title: true,
              },
            },
            documentVerifications: {
              where: { documentId },
              include: {
                verificationHistory: {
                  where: { action: 'resubmission_required' },
                  orderBy: { performedAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        });

      if (!candidateProjectMap) {
        this.logger.error(
          `Candidate project mapping ${candidateProjectMapId} not found`,
        );
        return;
      }

      // Determine who should be notified when a document is resubmitted.
      // Ideally the recruiter should know; fall back to the original requester if no
      // recruiter is assigned.
      const recruiterId = candidateProjectMap?.recruiterId;

      // original requester tracking
      const verification = candidateProjectMap.documentVerifications[0];
      const requesterId = verification?.verificationHistory[0]?.performedBy;

      const recipientId = recruiterId || requesterId;
      if (!recipientId) {
        this.logger.warn(
          `No recipient found for document resubmitted event ${documentId}`,
        );
        return;
      }

      const idemKey = `${eventId}:${recipientId}:document_resubmitted`;

      await this.notificationsService.createNotification({
        userId: recipientId,
        type: 'document_resubmitted',
        title: 'Document Resubmitted',
        message: `Candidate ${document.candidate.firstName} ${document.candidate.lastName} has resubmitted the document "${document.fileName}" for project ${candidateProjectMap.project.title}.`,
        link: `/candidates/${document.candidate.id}/documents/${candidateProjectMap.project.id}`,
        meta: {
          documentId,
          candidateId: document.candidate.id,
          projectId: candidateProjectMap.project.id,
          resubmittedBy,
        },
        idemKey,
      });

      this.logger.log(
        `Document resubmitted notification created for user ${recipientId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process document resubmitted: ${error.message}`,
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

      if (!assignedToExecutive) {
        // Find all users with 'Documentation Executive' role
        const documentationExecutives = await this.prisma.user.findMany({
          where: {
            userRoles: {
              some: {
                role: {
                  name: 'Documentation Executive',
                },
              },
            },
          },
          select: { id: true },
        });

        if (documentationExecutives.length === 0) {
          this.logger.warn(
            `No Documentation Executives found to notify for candidateProjectMap ${candidateProjectMapId}`,
          );
          return;
        }

        // Notify all documentation executives
        await Promise.all(
          documentationExecutives.map((exec) =>
            this.notificationsService.createNotification({
              userId: exec.id,
              type: 'candidate_sent_for_verification',
              title: 'New Candidate for Document Verification',
              message: `Candidate ${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} is ready for document verification for project ${candidateProjectMap.project.title}.`,
              link: `/candidates/${candidateProjectMap.candidate.id}/documents/${candidateProjectMap.project.id}`,
              meta: {
                candidateProjectMapId,
                candidateId: candidateProjectMap.candidate.id,
                projectId: candidateProjectMap.project.id,
              },
              idemKey: `${eventId}:${exec.id}:candidate_sent_for_verification`,
            }),
          ),
        );

        this.logger.log(
          `Candidate sent for verification notification created for ${documentationExecutives.length} documentation executives`,
        );
      } else {
        await this.notificationsService.createNotification({
          userId: assignedToExecutive,
          type: 'candidate_sent_for_verification',
          title: 'New Candidate for Document Verification',
          message: `Candidate ${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} has been assigned to you for document verification for project ${candidateProjectMap.project.title}.`,
          link: `/candidates/${candidateProjectMap.candidate.id}/documents/${candidateProjectMap.project.id}`,
          meta: {
            candidateProjectMapId,
            candidateId: candidateProjectMap.candidate.id,
            projectId: candidateProjectMap.project.id,
          },
          idemKey,
        });
      }

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

  async handleCandidateRecruiterAssigned(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(
      `Processing candidate recruiter assignment event: ${eventId}`,
    );

    try {
      const { candidateId, recruiterId, assignedBy, reason } = payload as {
        candidateId: string;
        recruiterId: string;
        assignedBy: string;
        reason?: string;
      };

      // Load candidate and assigner details
      const [candidate, assigner] = await Promise.all([
        this.prisma.candidate.findUnique({
          where: { id: candidateId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        }),
        this.prisma.user.findUnique({
          where: { id: assignedBy },
          select: {
            id: true,
            name: true,
          },
        }),
      ]);

      if (!candidate || !assigner) {
        this.logger.warn(
          `Missing data for candidate recruiter assignment: candidate=${!!candidate}, assigner=${!!assigner}`,
        );
        return;
      }

      const idemKey = `${eventId}:${recruiterId}:candidate_transferred`;

      await this.notificationsService.createNotification({
        userId: recruiterId,
        type: 'candidate_transferred',
        title: 'Candidate Transferred to You',
        message: `${assigner.name} transferred candidate ${candidate.firstName} ${candidate.lastName} to you.${reason ? ` Reason: ${reason}` : ''}`,
        link: `/candidates/${candidateId}`,
        meta: {
          candidateId,
          assignedBy,
          reason,
        },
        idemKey,
      });

      // Also publish a sync event for real-time UI updates
      await this.prisma.outboxEvent.create({
        data: {
          type: 'DataSync',
          payload: {
            type: 'Candidate',
            candidateId,
            message: `New candidate assigned: ${candidate.firstName} ${candidate.lastName}`,
          },
        },
      });

      this.logger.log(
        `Candidate transferred notification created for recruiter ${recruiterId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process candidate recruiter assignment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleCandidateTransferredBack(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing candidate transfer back event: ${eventId}`);

    try {
      const { candidateId, recruiterId, transferredBy, reason } = payload as {
        candidateId: string;
        recruiterId: string;
        transferredBy: string;
        reason?: string;
      };

      const [candidate, transferrer] = await Promise.all([
        this.prisma.candidate.findUnique({
          where: { id: candidateId },
          select: { id: true, firstName: true, lastName: true },
        }),
        this.prisma.user.findUnique({
          where: { id: transferredBy },
          select: { id: true, name: true },
        }),
      ]);

      if (!candidate || !transferrer) {
        this.logger.warn(
          `Missing data for candidate transfer back: candidate=${!!candidate}, transferrer=${!!transferrer}`,
        );
        return;
      }

      await this.notificationsService.createNotification({
        userId: recruiterId,
        type: 'candidate_transferred',
        title: 'Candidate Transferred Back to You',
        message: `${transferrer.name} transferred candidate ${candidate.firstName} ${candidate.lastName} back to you.${reason ? ` Reason: ${reason}` : ''}`,
        link: `/candidates/${candidateId}`,
        meta: {
          candidateId,
          transferredBy,
          reason,
        },
        idemKey: `${eventId}:${recruiterId}:candidate_transferred_back`,
      });

      // Also publish a sync event for real-time UI updates
      await this.prisma.outboxEvent.create({
        data: {
          type: 'DataSync',
          payload: {
            type: 'Candidate',
            candidateId,
            message: `Candidate ${candidate.firstName} ${candidate.lastName} transferred back to you`,
          },
        },
      });

      this.logger.log(
        `Candidate transferred back notification created for recruiter ${recruiterId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process candidate transfer back: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleCandidateAssignedToScreeningAssignment(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing candidate assigned for screening event: ${eventId}`);

    try {
      const { candidateProjectMapId, coordinatorId, recruiterId, assignedBy } =
        payload as {
          candidateProjectMapId: string;
          coordinatorId: string;
          recruiterId: string | null;
          assignedBy: string;
        };

      // Load candidate project mapping with candidate and project details
      const cp = await this.prisma.candidateProjects.findUnique({
        where: { id: candidateProjectMapId },
        include: {
          candidate: { select: { id: true, firstName: true, lastName: true } },
          project: { select: { id: true, title: true } },
          roleNeeded: { select: { designation: true } },
        },
      });

      if (!cp) {
        this.logger.warn(
          `Candidate project mapping ${candidateProjectMapId} not found`,
        );
        return;
      }

      const sender = await this.prisma.user.findUnique({
        where: { id: assignedBy },
        select: { name: true },
      });

      // Notify Coordinator/Trainer
      const coordinator = await this.prisma.user.findUnique({
        where: { id: coordinatorId },
      });
      if (coordinator) {
        const idemKey = `${eventId}:${coordinator.id}:assignment`;

        await this.notificationsService.createNotification({
          userId: coordinator.id,
          type: 'candidate_assigned_screening',
          title: 'New Screening Assignment',
          message: `Candidate ${cp.candidate.firstName} ${cp.candidate.lastName} has been assigned to you for screening for project ${cp.project.title} (${cp.roleNeeded?.designation}).`,
          link: `/screenings/assigned`,
          meta: { candidateProjectMapId },
          idemKey,
        });
      }

      // Notify Recruiter
      if (recruiterId && recruiterId !== assignedBy) {
        const idemKey = `${eventId}:${recruiterId}:assignment`;

        await this.notificationsService.createNotification({
          userId: recruiterId,
          type: 'candidate_assigned_screening',
          title: 'Candidate Sent to Screening',
          message: `Candidate ${cp.candidate.firstName} ${cp.candidate.lastName} has been sent to the screening team by ${sender?.name || 'Recruiter'}.`,
          link: `/candidates/${cp.candidate.id}?projectId=${cp.project.id}`,
          meta: { candidateProjectMapId },
          idemKey,
        });
      }

      this.logger.log(`Screening assignment notifications processed`);
    } catch (error) {
      this.logger.error(
        `Failed to handle screening assignment: ${error.message}`,
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
          recruiterId: string | null;
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
            link: `/screenings/assigned`,
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
        recruiterId: string | null;
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
  async handleCandidateTransferredToProcessing(
    job: Job<NotificationJobData>,
  ) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing candidate transferred to processing event: ${eventId}`);

    try {
      const {
        processingCandidateId,
        candidateId,
        projectId,
        assignedProcessingTeamUserId,
        transferredBy,
      } = payload as {
        processingCandidateId: string;
        candidateId: string;
        projectId: string;
        assignedProcessingTeamUserId: string;
        transferredBy: string;
      };

      // Load candidate and project details for the notification message
      const [candidate, project, transferer] = await Promise.all([
        this.prisma.candidate.findUnique({
          where: { id: candidateId },
          select: { firstName: true, lastName: true },
        }),
        this.prisma.project.findUnique({
          where: { id: projectId },
          select: { title: true },
        }),
        this.prisma.user.findUnique({
          where: { id: transferredBy },
          select: { name: true },
        }),
      ]);

      if (!candidate || !project) {
        this.logger.warn(`Candidate or project not found for event ${eventId}`);
        return;
      }

      const idemKey = `${eventId}:transfer_to_processing`;

      await this.notificationsService.createNotification({
        userId: assignedProcessingTeamUserId,
        type: 'processing_assignment',
        title: 'New Candidate Assigned for Processing',
        message: `Candidate ${candidate.firstName} ${candidate.lastName} has been assigned to you for processing for project "${project.title}" by ${transferer?.name || 'System'}.`,
        link: `/processingCandidateDetails/${processingCandidateId}`,
        meta: payload,
        idemKey,
      });

      this.logger.log(
        `Candidate transfer notification created for user ${assignedProcessingTeamUserId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process candidate transfer to processing: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Notify recruiter when a candidate is hired (created from CandidateHired outbox event).
   */
  async handleCandidateHired(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing candidate hired event: ${eventId}`);

    try {
      const {
        processingCandidateId,
        candidateId,
        projectId,
        candidateProjectMapId,
        recruiterId,
        changedBy,
        notes,
      } = payload as {
        processingCandidateId: string;
        candidateId: string;
        projectId: string;
        candidateProjectMapId: string;
        recruiterId?: string | null;
        changedBy?: string | null;
        notes?: string | null;
      };

      if (!recruiterId) {
        this.logger.log(`No recruiter configured for candidateProjectMap ${candidateProjectMapId}; skipping recruiter notification`);
        return;
      }

      const [candidate, project, actor] = await Promise.all([
        this.prisma.candidate.findUnique({ where: { id: candidateId }, select: { firstName: true, lastName: true } }),
        this.prisma.project.findUnique({ where: { id: projectId }, select: { title: true } }),
        changedBy ? this.prisma.user.findUnique({ where: { id: changedBy }, select: { name: true } }) : Promise.resolve(null),
      ]);

      if (!candidate || !project) {
        this.logger.warn(`Candidate or project missing for CandidateHired event ${eventId}`);
        return;
      }

      const idemKey = `${eventId}:candidate_hired:${candidateProjectMapId}:${recruiterId}`;

      await this.notificationsService.createNotification({
        userId: recruiterId,
        type: 'candidate_hired',
        title: 'Candidate Marked Hired',
        message: `${candidate.firstName} ${candidate.lastName} has been marked hired for "${project.title}" by ${actor?.name || 'System'}. ${notes ? `Notes: ${notes}` : ''}`.trim(),
        link: `/candidate-projects/${candidateProjectMapId}`,
        meta: { processingCandidateId, candidateId, projectId, candidateProjectMapId, notes },
        idemKey,
      });

      this.logger.log(`Candidate hired notification created for recruiter ${recruiterId}`);
    } catch (err) {
      this.logger.error(`Failed to process CandidateHired event ${eventId}: ${err?.message || err}`, err?.stack);
      throw err;
    }
  }

  async handleCandidateReadyForProcessing(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing candidate ready for processing event: ${eventId}`);

    try {
      const { candidateProjectMapId, candidateName, projectName, projectId, changedBy } =
        payload as {
          candidateProjectMapId: string;
          candidateName: string;
          projectName: string;
          projectId: string;
          changedBy?: string | null;
        };

      // Get target roles (Admin, Manager, Team Lead, System Administrator)
      const targetRoles = [
        'Admin',
        'Manager',
        'Team Lead',
        'System Administrator',
      ];
      const targetUsers = await this.prisma.user.findMany({
        where: {
          userRoles: {
            some: {
              role: {
                name: { in: targetRoles },
              },
            },
          },
        },
        select: { id: true },
      });

      this.logger.log(`Found ${targetUsers.length} users to notify for Ready for Processing`);

      for (const user of targetUsers) {
        const idemKey = `${eventId}:ready_processing:${candidateProjectMapId}:${user.id}`;
        
        await this.notificationsService.createNotification({
          userId: user.id,
          type: 'candidate_ready_for_processing',
          title: 'Candidate Ready for Processing',
          message: `${candidateName} is now ready for processing for project "${projectName}"${changedBy ? ` (marked by ${changedBy})` : ''}`,
          link: '/ready-for-processing',
          meta: { candidateProjectMapId, projectId },
          idemKey,
        });
      }

      this.logger.log(`Ready for processing notifications created for ${targetUsers.length} users`);
    } catch (err) {
      this.logger.error(`Failed to process CandidateReadyForProcessing event ${eventId}: ${err?.message || err}`, err?.stack);
      throw err;
    }
  }

  async handleDocumentsForwardedToClient(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing documents forwarded event: ${eventId}`);

    try {
      const { candidateId, projectId, senderId, recipientEmail } = payload as any;

      // 1. Load candidate name
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
        select: { firstName: true, lastName: true },
      });
      const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Unknown';

      // 2. Load project title
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { title: true },
      });
      const projectTitle = project?.title || 'Unknown Project';

      // 3. Find Interview Coordinators, Directors, and CEOs
      const recipients = await this.prisma.user.findMany({
        where: {
          userRoles: {
            some: {
              role: {
                name: { in: ['Interview Coordinator', 'Director', 'CEO', 'Manager', 'System Admin'] }
              }
            }
          }
        },
        select: { id: true },
      });

      this.logger.log(`Found ${recipients.length} users to notify for documents forwarding`);

      // 4. Create notifications for each
      for (const recipient of recipients) {
        const idemKey = `${eventId}:${recipient.id}:docs_forwarded`;
        
        await this.notificationsService.createNotification({
          userId: recipient.id,
          type: 'documents_forwarded',
          title: 'Documents Forwarded to Client',
          message: `${candidateName}'s documents for project "${projectTitle}" have been forwarded to ${recipientEmail}.`,
          link: `/interviews/shortlist-pending?search=${encodeURIComponent(candidateName)}`,
          meta: { candidateId, projectId },
          idemKey,
        });
      }

      return { success: true, count: recipients.length };
    } catch (error) {
      this.logger.error(
        `Failed to process documents forwarded notification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

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
        recruiterId: string | null;
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

  async handleRecruiterNotification(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing recruiter notification event: ${eventId}`);

    try {
      const { recruiterId, message, title, link, meta } = payload as any;

      const idemKey = `${eventId}:${recruiterId}:recruiter_notification`;

      await this.notificationsService.createNotification({
        userId: recruiterId as string,
        type: 'recruiter_notification',
        title: (title as string) || 'Notification',
        message: message as string,
        link: typeof link === 'string' ? link : undefined,
        meta: meta || undefined,
        idemKey,
      });

      this.logger.log(
        `Recruiter notification created for user ${recruiterId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process recruiter notification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleDocumentationNotification(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing documentation notification event: ${eventId}`);

    try {
      const { recipientId, message, title, link, meta } = payload as any;

      const idemKey = `${eventId}:${recipientId}:documentation_notification`;

      await this.notificationsService.createNotification({
        userId: recipientId as string,
        type: 'documentation_notification',
        title: (title as string) || 'Documentation Notification',
        message: message as string,
        link: typeof link === 'string' ? link : undefined,
        meta: meta || undefined,
        idemKey,
      });

      this.logger.log(
        `Documentation notification created for user ${recipientId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process documentation notification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle generic DataSync events for real-time UI updates
   */
  async handleDataSyncJob(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing DataSync event: ${eventId}`);

    try {
      const { userId, type, message, ...rest } = payload as any;

      if (userId) {
        // Targeted sync for a specific user
        await this.notificationsGateway.emitToUser(userId, 'data:sync', {
          type,
          message,
          ...rest,
        });
      } else {
        // Global sync or logic-based sync (could be improved by adding rooms)
        // For now, emit to all connected users if no specific userId
        this.notificationsGateway.server.emit('data:sync', {
          type,
          message,
          ...rest,
        });
      }

      this.logger.debug(`DataSync event processed for type: ${type}`);
    } catch (error) {
      this.logger.error(
        `Failed to process DataSync event: ${error.message}`,
        error.stack,
      );
    }
  }
}
