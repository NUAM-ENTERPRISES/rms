import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { WhatsAppNotificationService } from '../notifications/whatsapp-notification.service';
import { isOperationsRole, ROLE_NAMES } from '../common/constants/role-ids';
import { OFFER_LETTER_UPLOAD_LEADERSHIP_ROLES } from '../common/constants/offer-letter-notifications';
import { withActiveAccountStatus } from '../users/user-account-status.filter';

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
    private readonly whatsappNotificationService: WhatsAppNotificationService,
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
        case 'IntroductionVideoRejected':
          return await this.handleIntroductionVideoRejected(job);
        case 'IntroductionVideoResubmissionRequested':
          return await this.handleIntroductionVideoResubmissionRequested(job);
        case 'IntroductionVideoResubmitted':
          return await this.handleIntroductionVideoResubmitted(job);
        case 'IntroductionVideoVerified':
          return await this.handleIntroductionVideoVerified(job);
        case 'CandidateSentForVerification':
          return await this.handleCandidateSentForVerification(job);
        case 'CandidateAssignedToRecruiter':
          return await this.handleCandidateAssignedToRecruiter(job);
        case 'CandidateRecruiterAssigned':
          return await this.handleCandidateRecruiterAssigned(job);
        case 'CandidateTransferred':
          return await this.handleCandidateTransferred(job);
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
        case 'RoleNotification':
          return await this.handleRoleNotification(job);
        case 'AgentCandidateRequestCreated':
          return await this.handleAgentCandidateRequestCreated(job);
        case 'OfferLetterUploaded':
          return await this.handleOfferLetterUploaded(job);
        case 'OfferLetterUploadRequested':
          return await this.handleOfferLetterUploadRequested(job);
        case 'CandidateProjectStatusChangeRequested':
          return await this.handleCandidateProjectStatusChangeRequested(job);
        case 'CandidateProjectStatusChangeReviewed':
          return await this.handleCandidateProjectStatusChangeReviewed(job);
        case 'CourierShipmentReceived':
          return await this.handleCourierShipmentReceived(job);
        case 'DataSync':
          return await this.handleDataSyncJob(job);
        default:
          this.logger.warn(`Unknown notification type: ${type}`);
          return { success: false, message: `Unknown type: ${type}` };
      }
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error(String(error ?? 'Unknown'));
      this.logger.error(
        `Failed to process notification ${type}: ${err.message}`,
        err.stack,
      );
      throw err;
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
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error(String(error ?? 'Unknown'));
      this.logger.error(
        `Failed to process transfer request: ${err.message}`,
        err.stack,
      );
      throw err;
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

  private async loadIntroductionVideoNotificationContext(
    documentId: string,
    candidateProjectMapId: string,
  ) {
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
      return null;
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
      return null;
    }

    return { document, candidateProjectMap };
  }

  async handleIntroductionVideoRejected(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing introduction video rejected event: ${eventId}`);

    try {
      const { documentId, rejectedBy, candidateProjectMapId, reason } =
        payload as {
          documentId: string;
          rejectedBy: string;
          candidateProjectMapId: string;
          reason?: string;
        };

      const context = await this.loadIntroductionVideoNotificationContext(
        documentId,
        candidateProjectMapId,
      );
      if (!context) {
        this.logger.error(
          `Introduction video context not found for document ${documentId}`,
        );
        return;
      }

      const { document, candidateProjectMap } = context;
      const recruiterId = candidateProjectMap.recruiterId;
      const uploader = await this.prisma.user.findUnique({
        where: { id: document.uploadedBy },
        select: { id: true },
      });
      const recipientId = recruiterId || uploader?.id;

      if (!recipientId) {
        this.logger.error(
          `No valid recipient found for introduction video rejected event (${documentId})`,
        );
        return;
      }

      const messageBase = `Introduction video "${document.fileName}" for candidate ${document.candidate.firstName} ${document.candidate.lastName} has been rejected for project ${candidateProjectMap.project.title}.`;
      const message = reason ? `${messageBase} Reason: ${reason}` : messageBase;

      await this.notificationsService.createNotification({
        userId: recipientId,
        type: 'introduction_video_rejected',
        title: 'Introduction Video Rejected',
        message,
        link: `/recruiter-docs/${candidateProjectMap.project.id}/${document.candidate.id}`,
        meta: {
          documentId,
          candidateId: document.candidate.id,
          projectId: candidateProjectMap.project.id,
          rejectedBy,
          reason,
        },
        idemKey: `${eventId}:${recipientId}:introduction_video_rejected`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to process introduction video rejected: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleIntroductionVideoResubmissionRequested(
    job: Job<NotificationJobData>,
  ) {
    const { eventId, payload } = job.data;
    this.logger.log(
      `Processing introduction video resubmission requested event: ${eventId}`,
    );

    try {
      const { documentId, requestedBy, candidateProjectMapId, reason } =
        payload as {
          documentId: string;
          requestedBy: string;
          candidateProjectMapId: string;
          reason?: string;
        };

      const context = await this.loadIntroductionVideoNotificationContext(
        documentId,
        candidateProjectMapId,
      );
      if (!context) {
        this.logger.error(
          `Introduction video context not found for document ${documentId}`,
        );
        return;
      }

      const { document, candidateProjectMap } = context;
      const recruiterId = candidateProjectMap.recruiterId;
      const uploader = await this.prisma.user.findUnique({
        where: { id: document.uploadedBy },
        select: { id: true },
      });
      const recipientId = recruiterId || uploader?.id;

      if (!recipientId) {
        this.logger.error(
          `No valid recipient found for introduction video resubmission request (${documentId})`,
        );
        return;
      }

      const messageBase = `Resubmission requested for introduction video "${document.fileName}" for candidate ${document.candidate.firstName} ${document.candidate.lastName} for project ${candidateProjectMap.project.title}.`;
      const message = reason ? `${messageBase} Reason: ${reason}` : messageBase;

      await this.notificationsService.createNotification({
        userId: recipientId,
        type: 'introduction_video_resubmission_requested',
        title: 'Introduction Video Resubmission Required',
        message,
        link: `/recruiter-docs/${candidateProjectMap.project.id}/${document.candidate.id}`,
        meta: {
          documentId,
          candidateId: document.candidate.id,
          projectId: candidateProjectMap.project.id,
          requestedBy,
          reason,
        },
        idemKey: `${eventId}:${recipientId}:introduction_video_resubmission_requested`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to process introduction video resubmission requested: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleIntroductionVideoResubmitted(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(
      `Processing introduction video resubmitted event: ${eventId}`,
    );

    try {
      const { documentId, resubmittedBy, candidateProjectMapId } = payload as {
        documentId: string;
        resubmittedBy: string;
        candidateProjectMapId: string;
      };

      const context = await this.loadIntroductionVideoNotificationContext(
        documentId,
        candidateProjectMapId,
      );
      if (!context) {
        this.logger.error(
          `Introduction video context not found for document ${documentId}`,
        );
        return;
      }

      const { document, candidateProjectMap } = context;

      const verification =
        await this.prisma.candidateProjectDocumentVerification.findFirst({
          where: {
            candidateProjectMapId,
            documentId,
          },
          include: {
            verificationHistory: {
              where: { action: 'resubmission_required' },
              orderBy: { performedAt: 'desc' },
              take: 1,
            },
          },
        });

      const requesterId =
        verification?.verificationHistory[0]?.performedBy ?? null;
      if (!requesterId) {
        this.logger.warn(
          `No documentation requester found for introduction video resubmitted event ${documentId}`,
        );
        return;
      }

      await this.notificationsService.createNotification({
        userId: requesterId,
        type: 'introduction_video_resubmitted',
        title: 'Introduction Video Resubmitted',
        message: `Recruiter has re-uploaded the introduction video "${document.fileName}" for candidate ${document.candidate.firstName} ${document.candidate.lastName} in project ${candidateProjectMap.project.title}.`,
        link: `/candidates/${document.candidate.id}/documents/${candidateProjectMap.project.id}`,
        meta: {
          documentId,
          candidateId: document.candidate.id,
          projectId: candidateProjectMap.project.id,
          resubmittedBy,
        },
        idemKey: `${eventId}:${requesterId}:introduction_video_resubmitted`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to process introduction video resubmitted: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleIntroductionVideoVerified(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing introduction video verified event: ${eventId}`);

    try {
      const { documentId, verifiedBy, candidateProjectMapId } = payload as {
        documentId: string;
        verifiedBy: string;
        candidateProjectMapId: string;
      };

      const context = await this.loadIntroductionVideoNotificationContext(
        documentId,
        candidateProjectMapId,
      );
      if (!context) {
        this.logger.error(
          `Introduction video context not found for document ${documentId}`,
        );
        return;
      }

      const { document, candidateProjectMap } = context;
      const recruiterId = candidateProjectMap.recruiterId;
      const uploader = await this.prisma.user.findUnique({
        where: { id: document.uploadedBy },
        select: { id: true },
      });
      const recipientId = recruiterId || uploader?.id;

      if (!recipientId) {
        this.logger.error(
          `No valid recipient found for introduction video verified event (${documentId})`,
        );
        return;
      }

      const verifierUser = await this.prisma.user.findUnique({
        where: { id: verifiedBy },
        select: { name: true },
      });
      const verifierName = verifierUser?.name || 'Documentation team';

      await this.notificationsService.createNotification({
        userId: recipientId,
        type: 'introduction_video_verified',
        title: 'Introduction Video Verified',
        message: `Introduction video "${document.fileName}" for candidate ${document.candidate.firstName} ${document.candidate.lastName} has been verified by ${verifierName} for project ${candidateProjectMap.project.title}.`,
        link: `/recruiter-docs/${candidateProjectMap.project.id}/${document.candidate.id}`,
        meta: {
          documentId,
          candidateId: document.candidate.id,
          projectId: candidateProjectMap.project.id,
          verifiedBy,
        },
        idemKey: `${eventId}:${recipientId}:introduction_video_verified`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to process introduction video verified: ${error.message}`,
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
          where: withActiveAccountStatus({
            userRoles: {
              some: {
                role: {
                  name: 'Documentation Executive',
                },
              },
            },
          }),
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
      const { candidateId, recruiterId, assignedBy, reason, previousRecruiterId, createdBy, isRoundRobin } = payload as {
        candidateId: string;
        recruiterId: string;
        assignedBy: string;
        createdBy?: string;
        reason?: string;
        previousRecruiterId?: string;
        isRoundRobin?: boolean;
      };

      // Load candidate and assigner details
      const [candidate, assigner, newRecruiter] = await Promise.all([
        this.prisma.candidate.findUnique({
          where: { id: candidateId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        }),
        this.prisma.user.findUnique({
          where: { id: assignedBy === 'system' ? recruiterId : assignedBy },
          select: {
            id: true,
            name: true,
          },
        }),
        this.prisma.user.findUnique({
          where: { id: recruiterId },
          select: {
            id: true,
            name: true,
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        }),
      ]);

      if (!candidate) {
        this.logger.warn(`Candidate ${candidateId} not found for assignment notification`);
        return;
      }

      const creatingUserId = createdBy || assignedBy;
      const creatingUser = creatingUserId === 'system' ? null : await this.prisma.user.findUnique({
        where: { id: creatingUserId },
        select: { name: true },
      });
      const assignerName = creatingUserId === 'system' ? 'System' : (creatingUser?.name || 'A team member');
      const isCreAssignment = newRecruiter?.userRoles.some((ur) =>
        isOperationsRole(ur.role.name),
      );
      const isNewAssignment = !previousRecruiterId;

      // 1. Notify the NEW recruiter (CRE or primary recruiter)
      const idemKeyNew = `${eventId}:${recruiterId}:candidate_transferred`;

      let notificationTitle = isCreAssignment
        ? 'New RNR Candidate Assigned'
        : isNewAssignment
          ? 'Candidate Created Successfully'
          : 'Candidate Ready from Operations';

      let notificationMessage = isCreAssignment
        ? `Candidate ${candidate.firstName} ${candidate.lastName} has been assigned to you for RNR handling.`
        : isNewAssignment
          ? `Candidate ${candidate.firstName} ${candidate.lastName} has been created and assigned to you by ${assignerName}.`
          : `${assignerName} processed candidate ${candidate.firstName} ${candidate.lastName} and it's now back in your list.${reason ? ` Notes: ${reason}` : ''}`;

      // Custom requirement: Handle Round Robin vs Direct Assignment for new recruiters
      if (isNewAssignment && !isCreAssignment) {
        if (isRoundRobin) {
          notificationTitle = 'A candidate is transferred to you';
          notificationMessage = 'A candidate is transferred to you';
        } else {
          notificationTitle = 'Candidate Created Successfully';
          notificationMessage = `Candidate ${candidate.firstName} ${candidate.lastName} created successfully and assigned to ${newRecruiter?.name || 'you'}.`;
        }
      }

      await this.notificationsService.createNotification({
        userId: recruiterId,
        type: 'candidate_transferred',
        title: notificationTitle,
        message: notificationMessage,
        link: `/candidates/${candidateId}`,
        meta: { candidateId, assignedBy, reason },
        idemKey: idemKeyNew,
      });

      // 1.5 Notify the CREATOR if they are different from the recruiter
      if (isNewAssignment && !isCreAssignment && creatingUserId !== recruiterId && creatingUserId !== 'system') {
        const creatorId = creatingUserId;
        const idemKeyCreator = `${eventId}:${creatorId}:candidate_created_success`;
        
        await this.notificationsService.createNotification({
          userId: creatorId,
          type: 'candidate_transferred', // Reusing type or using a generic one
          title: 'Candidate Created Successfully',
          message: `Candidate ${candidate.firstName} ${candidate.lastName} created successfully and assigned to ${newRecruiter?.name || 'recruiter'}.`,
          link: `/candidates/${candidateId}`,
          meta: { candidateId, assignedBy, recruiterId },
          idemKey: idemKeyCreator,
        });
      }

      // 2. Notify the PREVIOUS recruiter or Handler
      // If moving TO CRE, notify primary with "In CRE Handling"
      // If moving FROM CRE back, notify the CRE of successful handoff
      if (previousRecruiterId && previousRecruiterId !== recruiterId) {
        if (isCreAssignment) {
          const idemKeyPrev = `${eventId}:${previousRecruiterId}:candidate_moved_to_cre`;
          await this.notificationsService.createNotification({
            userId: previousRecruiterId,
            type: 'candidate_moved_to_cre',
            title: 'Candidate in Operations Handling',
            message: `Your candidate ${candidate.firstName} ${candidate.lastName} is now being handled by Operations ${newRecruiter?.name || 'team'} for RNR follow-up.`,
            link: `/candidates/${candidateId}`,
            meta: { candidateId, creId: recruiterId },
            idemKey: idemKeyPrev,
          });
        } else {
          // Check if previous was CRE 
          const prevUser = await this.prisma.user.findUnique({
            where: { id: previousRecruiterId },
            include: { userRoles: { include: { role: true } } }
          });
          const wasPrevCre = prevUser?.userRoles.some((ur) =>
            isOperationsRole(ur.role.name),
          );

          if (wasPrevCre) {
            const idemKeyPrev = `${eventId}:${previousRecruiterId}:candidate_transferred_back`;
            await this.notificationsService.createNotification({
              userId: previousRecruiterId,
              type: 'candidate_transferred',
              title: 'Operations Handoff Successful',
              message: `Candidate ${candidate.firstName} ${candidate.lastName} has been successfully handed back to recruiter ${newRecruiter?.name || 'team'}.`,
              link: `/candidates/${candidateId}`,
              meta: { candidateId, recruiterId: recruiterId },
              idemKey: idemKeyPrev,
            });
          }
        }
      }

      // Also publish a sync event for real-time UI updates
      await this.prisma.outboxEvent.create({
        data: {
          type: 'DataSync',
          payload: {
            type: 'Candidate',
            candidateId,
            message: `Candidate assignment updated: ${candidate.firstName} ${candidate.lastName}`,
          },
        },
      });

      this.logger.log(
        `Candidate assignment notifications created for candidate ${candidateId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process candidate recruiter assignment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleCandidateTransferred(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing candidate transfer notification event: ${eventId}`);

    try {
      const { candidateId, targetRecruiterId, transferredBy, reason, previousRecruiterId } = payload as {
        candidateId: string;
        targetRecruiterId: string;
        transferredBy: string;
        reason?: string;
        previousRecruiterId?: string | null;
      };

      const [candidate, sender, targetRecruiter] = await Promise.all([
        this.prisma.candidate.findUnique({
          where: { id: candidateId },
          select: { id: true, firstName: true, lastName: true },
        }),
        this.prisma.user.findUnique({
          where: { id: transferredBy },
          select: { id: true, name: true },
        }),
        this.prisma.user.findUnique({
          where: { id: targetRecruiterId },
          select: { id: true, name: true },
        }),
      ]);

      if (!candidate) {
        this.logger.warn(`Candidate ${candidateId} not found for transfer notification`);
        return;
      }

      const candidateName = `${candidate.firstName} ${candidate.lastName}`;
      const reasonText = reason ? ` Reason: ${reason}` : '';

      // Notify the SENDER — "Transferred successfully"
      if (transferredBy && transferredBy !== 'system') {
        await this.notificationsService.createNotification({
          userId: transferredBy,
          type: 'candidate_transferred',
          title: 'Candidate Transferred Successfully',
          message: `Candidate ${candidateName} has been successfully transferred to ${targetRecruiter?.name ?? 'recruiter'}.${reasonText}`,
          link: `/candidates/${candidateId}`,
          meta: { candidateId, targetRecruiterId, reason },
          idemKey: `${eventId}:${transferredBy}:transfer_sender`,
        });
      }

      // Notify the RECEIVER — "Candidate has been transferred to you"
      await this.notificationsService.createNotification({
        userId: targetRecruiterId,
        type: 'candidate_transferred',
        title: 'Candidate Transferred to You',
        message: `Candidate ${candidateName} has been transferred to you by ${sender?.name ?? 'a team member'}.${reasonText}`,
        link: `/candidates/${candidateId}`,
        meta: { candidateId, transferredBy, reason },
        idemKey: `${eventId}:${targetRecruiterId}:transfer_receiver`,
      });

      // Notify the PREVIOUS recruiter if different from sender
      if (
        previousRecruiterId &&
        previousRecruiterId !== targetRecruiterId &&
        previousRecruiterId !== transferredBy
      ) {
        await this.notificationsService.createNotification({
          userId: previousRecruiterId,
          type: 'candidate_transferred',
          title: 'Candidate Reassigned',
          message: `Candidate ${candidateName} has been transferred from you to ${targetRecruiter?.name ?? 'another recruiter'} by ${sender?.name ?? 'a team member'}.${reasonText}`,
          link: `/candidates/${candidateId}`,
          meta: { candidateId, targetRecruiterId, reason },
          idemKey: `${eventId}:${previousRecruiterId}:transfer_previous`,
        });
      }

      // Real-time UI sync
      await this.prisma.outboxEvent.create({
        data: {
          type: 'DataSync',
          payload: {
            type: 'Candidate',
            candidateId,
            message: `Candidate ${candidateName} transferred to ${targetRecruiter?.name ?? 'recruiter'}`,
          },
        },
      });

      this.logger.log(`Transfer notifications created for candidate ${candidateId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process candidate transfer notification: ${error.message}`,
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
      if (recruiterId) {
        const idemKeyRecruiter = `${eventId}:${recruiterId}:assignment_to_screening`;

        await this.notificationsService.createNotification({
          userId: recruiterId,
          type: 'candidate_assigned_screening',
          title: 'Candidate Assigned to Screening Coordinator',
          message: `Your candidate ${cp.candidate.firstName} ${cp.candidate.lastName} has been assigned to coordinator ${coordinator?.name || 'a coordinator'} for screening for project ${cp.project.title}.`,
          link: `/recruiter-candidates`, // Assuming recruiter has a list
          meta: { candidateProjectMapId },
          idemKey: idemKeyRecruiter,
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
        const { candidateProjectMapId, screeningId, coordinatorId, recruiterId, scheduledBy } = payload as {
          candidateProjectMapId: string;
          screeningId: string;
          coordinatorId: string;
          recruiterId: string | null;
          scheduledBy?: string;
        };

        // Load candidate project mapping with candidate and project details
        const candidateProjectMap = await this.prisma.candidateProjects.findUnique({
          where: { id: candidateProjectMapId },
          include: {
            candidate: { select: { firstName: true, lastName: true, id: true, countryCode: true, mobileNumber: true } },
            project: { select: { id: true, title: true } },
            roleNeeded: { select: { designation: true } },
          },
        });

        if (!candidateProjectMap) {
          this.logger.warn(`Candidate project mapping ${candidateProjectMapId} not found`);
          return;
        }

        const screening = await this.prisma.screening.findUnique({
          where: { id: screeningId },
          select: { scheduledTime: true },
        });

        // Notify assigned Trainer/Coordinator (if different from the person who scheduled)
        const coordinator = await this.prisma.user.findUnique({ where: { id: coordinatorId } });
        if (coordinator && coordinator.id !== scheduledBy) {
          const idemKey = `${eventId}:${coordinator.id}:candidate_sent_to_screening`;

          const isInitialAssignment = !screening?.scheduledTime;
          const title = isInitialAssignment ? 'Screening Assigned' : 'New Screening Scheduled';
          const message = isInitialAssignment 
            ? `You have been assigned to conduct a screening for candidate ${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} in project ${candidateProjectMap.project.title}.`
            : `Candidate ${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} has been scheduled for a screening for project ${candidateProjectMap.project.title}.`;

          await this.notificationsService.createNotification({
            userId: coordinator.id,
            type: 'candidate_sent_to_screening',
            title,
            message,
            link: isInitialAssignment ? `/screenings` : `/screenings/assigned`,
            meta: { candidateProjectMapId, screeningId },
            idemKey,
          });
        }

        // Notify all Interview Coordinators (if different from the person who scheduled)
        const allInterviewCoordinators = await this.prisma.user.findMany({
          where: withActiveAccountStatus({
            userRoles: {
              some: {
                role: {
                  name: 'Interview Coordinator',
                },
              },
            },
          }),
        });

        for (const ic of allInterviewCoordinators) {
          if (ic.id !== scheduledBy && ic.id !== coordinatorId) {
            const isInitialAssignment = !screening?.scheduledTime;
            const icIdemKey = `${eventId}:${ic.id}:ic_sent_to_screening`;
            const icTitle = isInitialAssignment ? 'Screening Assigned' : 'New Screening Scheduled';
            const icMessage = isInitialAssignment 
              ? `A screening has been assigned for candidate ${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} in project ${candidateProjectMap.project.title}.`
              : `A screening has been scheduled for candidate ${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} in project ${candidateProjectMap.project.title}.`;

            await this.notificationsService.createNotification({
              userId: ic.id,
              type: 'candidate_sent_to_screening',
              title: icTitle,
              message: icMessage,
              link: isInitialAssignment ? `/screenings` : `/screenings/assigned`,
              meta: { candidateProjectMapId, screeningId },
              idemKey: icIdemKey,
            });
          }
        }

        // Notify recruiter
        if (recruiterId && recruiterId !== scheduledBy) {
          const idemKeyRecruiter = `${eventId}:${recruiterId}:candidate_sent_to_screening`;
          const isInitialAssignment = !screening?.scheduledTime;
          const title = 'Screening Scheduled for Candidate';
          const message = `Screening scheduled for candidate ${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName}; please also complete candidate document upload.`;

          await this.notificationsService.createNotification({
            userId: recruiterId,
            type: 'candidate_sent_to_screening',
            title,
            message,
            link: `/recruiter-docs/${candidateProjectMap.project.id}/${candidateProjectMap.candidate.id}`,
            meta: { candidateProjectMapId, screeningId },
            idemKey: idemKeyRecruiter,
          });
        }

        // Notify Candidate via WhatsApp (Only if scheduledTime is set)
        if (candidateProjectMap.candidate.mobileNumber && screening?.scheduledTime) {
          const fullPhone = `${candidateProjectMap.candidate.countryCode}${candidateProjectMap.candidate.mobileNumber}`.replace('+', '');
          const candidateFullName = `${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName}`;
          
          const date = new Date(screening.scheduledTime);
          const formattedTime = date.toLocaleString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          await this.whatsappNotificationService.sendScreeningScheduled(
            candidateFullName,
            fullPhone,
            candidateProjectMap.project.title,
            candidateProjectMap.roleNeeded?.designation || 'Specialist',
            formattedTime,
          );
        }

        // Emit realtime sync for all clients so dashboards and screens update instantly
        this.notificationsGateway.server.emit('data:sync', {
          type: 'Screening',
          message: 'Screening scheduled, refresh upcoming screenings and summary stats.',
        });

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

      const approvedTitle = 'Candidate Screening Approved';
      const approvedMessage = `${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} has successfully passed the screening for ${candidateProjectMap.project.title} (${roleDesignation}).`;
      const approvedLink = `/candidate-projects/${candidateProjectMapId}/screening/${screeningId}`;

      // Notify coordinator/trainer who completed the screening (if present)
      if (coordinatorId) {
        const idemKeyCoordinator = `${eventId}:${coordinatorId}:screening_passed`;

        await this.notificationsService.createNotification({
          userId: coordinatorId,
          type: 'screening_passed',
          title: approvedTitle,
          message: approvedMessage,
          link: approvedLink,
          meta: {
            candidateProjectMapId,
            screeningId,
            candidateId: candidateProjectMap.candidate.id,
            projectId: candidateProjectMap.project.id,
          },
          idemKey: idemKeyCoordinator,
        });

        this.logger.log(`Screening passed notification created for coordinator ${coordinatorId}`);
      }

      // Candidate approved notifications should go to Interview Coordinators.
      // Also notify recruiter so they can track converted profile state.
      if (recruiterId) {
        const idemKeyRecruiter = `${eventId}:${recruiterId}:screening_passed`;

        await this.notificationsService.createNotification({
          userId: recruiterId,
          type: 'screening_passed',
          title: approvedTitle,
          message: approvedMessage,
          link: approvedLink,
          meta: {
            candidateProjectMapId,
            screeningId,
            candidateId: candidateProjectMap.candidate.id,
            projectId: candidateProjectMap.project.id,
          },
          idemKey: idemKeyRecruiter,
        });

        this.logger.log(`Screening passed notification created for recruiter ${recruiterId}`);
      }

      // Notify all Interview Coordinator role members (case-insensitive match)
      const coordinatorUsers = await this.prisma.user.findMany({
        where: withActiveAccountStatus({
          userRoles: {
            some: {
              role: {
                name: {
                  contains: 'Interview Coordinator',
                  mode: 'insensitive',
                },
              },
            },
          },
        }),
        select: { id: true },
      });

      for (const coord of coordinatorUsers) {
        const idemKeyCoord = `${eventId}:${coord.id}:screening_passed`;

        await this.notificationsService.createNotification({
          userId: coord.id,
          type: 'screening_passed',
          title: 'Candidate Passed Screening',
          message: `${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} has successfully passed the screening for ${candidateProjectMap.project.title} (${roleDesignation}).`,
          link: `/candidate-projects/${candidateProjectMapId}/screening/${screeningId}`,
          meta: {
            candidateProjectMapId,
            screeningId,
            candidateId: candidateProjectMap.candidate.id,
            projectId: candidateProjectMap.project.id,
          },
          idemKey: idemKeyCoord,
        });
      }

      // Notify team head if present
      if (teamHeadId) {
        const idemKeyTeamHead = `${eventId}:${teamHeadId}:screening_passed`;

        await this.notificationsService.createNotification({
          userId: teamHeadId,
          type: 'screening_passed',
          title: 'Candidate Passed Screening',
          message: `${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} has passed the screening for ${candidateProjectMap.project.title} (${roleDesignation}).`,
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

      // Notify all Documentation role members
      const documentationUsers = await this.prisma.user.findMany({
        where: withActiveAccountStatus({
          userRoles: {
            some: {
              role: {
                name: {
                  equals: 'Documentation',
                  mode: 'insensitive',
                },
              },
            },
          },
        }),
        select: { id: true },
      });

      for (const docUser of documentationUsers) {
        const idemKeyDoc = `${eventId}:${docUser.id}:screening_passed_doc`;

        await this.notificationsService.createNotification({
          userId: docUser.id,
          type: 'screening_passed',
          title: 'Candidate Screening Passed - Verify Documents',
          message: `${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} has passed the screening for ${candidateProjectMap.project.title}. Please verify the documents.`,
          link: `/candidates/${candidateProjectMap.candidate.id}/documents/${candidateProjectMap.project.id}`,
          meta: {
            candidateProjectMapId,
            screeningId,
            candidateId: candidateProjectMap.candidate.id,
            projectId: candidateProjectMap.project.id,
          },
          idemKey: idemKeyDoc,
        });
      }

      // Notify all Documentation Executive role members
      const documentationExecutives = await this.prisma.user.findMany({
        where: withActiveAccountStatus({
          userRoles: {
            some: {
              role: {
                name: {
                  equals: 'Documentation Executive',
                  mode: 'insensitive',
                },
              },
            },
          },
        }),
        select: { id: true },
      });

      for (const docExec of documentationExecutives) {
        const idemKeyExec = `${eventId}:${docExec.id}:screening_passed_exec`;

        await this.notificationsService.createNotification({
          userId: docExec.id,
          type: 'screening_passed',
          title: 'Candidate Screening Passed - Verify Documents',
          message: `${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} has passed the screening for ${candidateProjectMap.project.title}. Please verify the documents.`,
          link: `/candidates/${candidateProjectMap.candidate.id}/documents/${candidateProjectMap.project.id}`,
          meta: {
            candidateProjectMapId,
            screeningId,
            candidateId: candidateProjectMap.candidate.id,
            projectId: candidateProjectMap.project.id,
          },
          idemKey: idemKeyExec,
        });
      }

      // NOTE: We intentionally avoid notifying the raw coordinatorId (trainer) here.
      // All Interview Coordinator role members are already being notified above.
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

      // Broadcast processing summary refresh to all connected clients in real-time
      await this.notificationsGateway.broadcastEvent("data:sync", {
        type: "ProcessingSummary",
        message: `Candidate ${candidate.firstName} ${candidate.lastName} assigned to processing`,
      });
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
    const { eventId } = job.data;
    this.logger.log(
      `Candidate ready for processing event ${eventId} acknowledged; leadership notifications are dispatched via RoleNotification from outbox`,
    );
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
        where: withActiveAccountStatus({
          userRoles: {
            some: {
              role: {
                name: { in: ['Interview Coordinator', 'Director', 'CEO', 'Manager', 'System Admin'] }
              }
            }
          }
        }),
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

      // 5. Broadcast refresh event for Summary Stats
      await this.notificationsGateway.broadcastEvent('INTERVIEW_STATS_UPDATE', {
        type: 'documents_forwarded',
        candidateId: payload.candidateId,
        projectId: payload.projectId,
      });

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
          title: 'Screening Failed',
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

      // Notify all Interview Coordinator role members (case-insensitive match)
      const coordinatorUsers = await this.prisma.user.findMany({
        where: withActiveAccountStatus({
          userRoles: {
            some: {
              role: {
                name: {
                  contains: 'Interview Coordinator',
                  mode: 'insensitive',
                },
              },
            },
          },
        }),
        select: { id: true },
      });

      for (const coord of coordinatorUsers) {
        const idemKeyCoord = `${eventId}:${coord.id}:candidate_failed_screening`;

        await this.notificationsService.createNotification({
          userId: coord.id,
          type: 'candidate_failed_screening',
          title: 'Screening Result - Interview Failed',
          message: `${candidateProjectMap.candidate.firstName} ${candidateProjectMap.candidate.lastName} failed the screening for ${candidateProjectMap.project.title} (${roleDesignation}). Decision: ${decisionText}.`,
          link: `/candidate-projects/${candidateProjectMapId}/screening/${screeningId}`,
          meta: {
            candidateProjectMapId,
            screeningId,
            candidateId: candidateProjectMap.candidate.id,
            projectId: candidateProjectMap.project.id,
            decision,
          },
          idemKey: idemKeyCoord,
        });
      }

      // NOTE: We intentionally avoid notifying the raw coordinatorId (trainer) here.
      // All Interview Coordinator role members are already being notified above.
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

  async handleRoleNotification(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing role notification event: ${eventId}`);

    try {
      const { roleName, message, title, link, meta } = payload as any;

      // Find all users with this role
      const users = await this.prisma.user.findMany({
        where: withActiveAccountStatus({
          userRoles: {
            some: {
              role: {
                name: roleName,
              },
            },
          },
        }),
        select: {
          id: true,
        },
      });

      if (users.length === 0) {
        this.logger.warn(`No users found with role ${roleName}`);
        return;
      }

      const excludeUserId =
        meta && typeof meta === 'object' && 'excludeUserId' in meta
          ? (meta as { excludeUserId?: string }).excludeUserId
          : undefined;

      // Create notifications for each user
      for (const user of users) {
        if (excludeUserId && user.id === excludeUserId) {
          continue;
        }

        const idemKey = `${eventId}:${user.id}:role_notification`;

        await this.notificationsService.createNotification({
          userId: user.id,
          type:
            meta &&
            typeof meta === 'object' &&
            'type' in meta &&
            typeof (meta as { type?: string }).type === 'string'
              ? (meta as { type: string }).type
              : 'role_notification',
          title: (title as string) || 'Notification',
          message: message as string,
          link: typeof link === 'string' ? link : undefined,
          meta: meta || undefined,
          idemKey,
        });
      }

      this.logger.log(
        `Role notification created for ${users.length} users with role ${roleName}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to process role notification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleOfferLetterUploadRequested(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing offer letter upload requested event: ${eventId}`);

    try {
      const {
        recruiterId,
        candidateId,
        projectId,
        candidateProjectMapId,
        roleCatalogId,
        candidateName,
        projectTitle,
        requestedBy,
        requestedByName,
        reason,
      } = payload as {
        recruiterId: string;
        candidateId: string;
        projectId: string;
        candidateProjectMapId: string;
        roleCatalogId?: string | null;
        candidateName: string;
        projectTitle: string;
        requestedBy: string;
        requestedByName?: string | null;
        reason: string;
      };

      const link = `/recruiter-docs/${projectId}/${candidateId}`;
      const meta = {
        type: 'offer_letter_upload_requested',
        docType: 'offer_letter',
        candidateId,
        projectId,
        candidateProjectMapId,
        roleCatalogId: roleCatalogId ?? null,
        requestedBy,
        requestedByName,
        candidateName,
        projectName: projectTitle,
        reason,
        syncTags: ['Interview', 'ProcessingSummary', 'Candidate', 'Document'],
      };

      const idemKey = `${eventId}:offer_letter_upload_requested:${candidateProjectMapId}:${recruiterId}`;
      await this.notificationsService.createNotification({
        userId: recruiterId,
        type: 'offer_letter_upload_requested',
        title: 'Offer Letter Upload Required',
        message: reason,
        link,
        meta,
        idemKey,
      });

      this.logger.log(
        `Offer letter upload requested notification created for recruiter ${recruiterId}`,
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to process OfferLetterUploadRequested event ${eventId}: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async handleOfferLetterUploaded(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing offer letter uploaded event: ${eventId}`);

    try {
      const {
        candidateId,
        projectId,
        candidateProjectMapId,
        documentId,
        recruiterId,
        candidateName,
        projectTitle,
        roleDesignation,
        uploadedBy,
        uploadedByName,
      } = payload as {
        candidateId: string;
        projectId: string;
        candidateProjectMapId: string;
        documentId: string;
        recruiterId?: string | null;
        candidateName: string;
        projectTitle: string;
        roleDesignation: string;
        uploadedBy: string;
        uploadedByName?: string | null;
      };

      const targetRoles = [
        ...OFFER_LETTER_UPLOAD_LEADERSHIP_ROLES,
        ROLE_NAMES.INTERVIEW_COORDINATOR,
        ROLE_NAMES.PROCESSING_EXECUTIVE,
      ];

      const roleUsers = await this.prisma.user.findMany({
        where: withActiveAccountStatus({
          userRoles: {
            some: {
              role: {
                name: { in: [...targetRoles] },
              },
            },
          },
        }),
        select: { id: true },
      });

      const recipientIds = new Set<string>();
      for (const user of roleUsers) {
        if (user.id !== uploadedBy) {
          recipientIds.add(user.id);
        }
      }
      if (recruiterId && recruiterId !== uploadedBy) {
        recipientIds.add(recruiterId);
      }

      const uploaderSuffix = uploadedByName ? ` by ${uploadedByName}` : '';
      const message = `Offer letter uploaded for ${candidateName} (${roleDesignation}) on project "${projectTitle}"${uploaderSuffix}.`;
      const link = `/recruiter-docs/${projectId}/${candidateId}`;
      const meta = {
        type: 'offer_letter_uploaded',
        candidateId,
        projectId,
        candidateProjectMapId,
        documentId,
        syncTags: ['Interview', 'ProcessingSummary', 'Candidate', 'Document'],
      };

      for (const userId of recipientIds) {
        const idemKey = `${eventId}:offer_letter_uploaded:${candidateProjectMapId}:${userId}`;
        await this.notificationsService.createNotification({
          userId,
          type: 'offer_letter_uploaded',
          title: 'Offer Letter Uploaded',
          message,
          link,
          meta,
          idemKey,
        });
      }

      this.logger.log(
        `Offer letter uploaded notifications created for ${recipientIds.size} users`,
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to process OfferLetterUploaded event ${eventId}: ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  async handleAgentCandidateRequestCreated(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(
      `Processing agent candidate request created event: ${eventId}`,
    );

    try {
      const {
        requestId,
        projectId,
        projectTitle,
        requestedById,
        items,
        notes,
        link,
      } = payload as {
        requestId: string;
        projectId: string;
        projectTitle: string;
        requestedById: string;
        items: Array<{
          roleNeededId: string;
          requestedCount: number;
          roleDesignation: string;
        }>;
        notes?: string | null;
        link?: string;
      };

      const requestedBy = await this.prisma.user.findUnique({
        where: { id: requestedById },
        select: { name: true },
      });

      const recipients = await this.prisma.user.findMany({
        where: withActiveAccountStatus({
          userRoles: {
            some: {
              role: {
                name: 'Agent Coordinator',
              },
            },
          },
        }),
        select: { id: true },
      });

      if (recipients.length === 0) {
        this.logger.warn('No Agent Coordinator users found for notification');
        return;
      }

      const roleSummary = items
        .map((item) => `${item.roleDesignation}: ${item.requestedCount}`)
        .join(', ');
      const requesterName = requestedBy?.name || 'A manager';

      for (const recipient of recipients) {
        await this.notificationsService.createNotification({
          userId: recipient.id,
          type: 'agent_candidate_request_created',
          title: 'New Agent Candidate Request',
          message: `${requesterName} requested agent candidates for ${projectTitle} (${roleSummary})${notes ? `. Notes: ${notes}` : ''}`,
          link: link || `/projects/${projectId}`,
          meta: {
            requestId,
            projectId,
            requestedById,
            routeTarget: `/projects/${projectId}`,
            roleSummary,
          },
          idemKey: `${eventId}:${recipient.id}:agent_candidate_request_created`,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to process agent candidate request created: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle generic DataSync events for real-time UI updates
   */
  async handleCandidateProjectStatusChangeRequested(
    job: Job<NotificationJobData>,
  ) {
    const { eventId, payload } = job.data;
    this.logger.log(
      `Processing candidate project status change request event: ${eventId}`,
    );

    try {
      const {
        requestId,
        candidateProjectMapId,
        candidateId,
        projectId,
        candidateName,
        projectTitle,
        requestType,
        requestedStatus,
        requesterName,
        reason,
        processingCandidateId,
        stepKey,
        countryCode,
        countryName,
      } = payload as {
        requestId: string;
        candidateProjectMapId: string;
        candidateId: string;
        projectId: string;
        candidateName: string;
        projectTitle: string;
        requestType: string;
        requestedStatus?: string;
        requesterName: string;
        reason: string;
        processingCandidateId?: string;
        stepKey?: string;
        countryCode?: string;
        countryName?: string;
      };

      const isProcessingRequest =
        requestType === 'processing_cancel' || requestType === 'processing_hold';

      if (isProcessingRequest) {
        const actionLabel =
          requestType === 'processing_cancel' ? 'cancellation' : 'hold';
        const countrySuffix =
          countryName || countryCode
            ? ` (${countryName ?? countryCode})`
            : '';
        const stepSuffix = stepKey ? ` at step ${stepKey.replace(/_/g, ' ')}` : '';

        const targetUsers = await this.prisma.user.findMany({
          where: withActiveAccountStatus({
            userRoles: {
              some: {
                role: {
                  name: { in: ['Manager', 'Processing Manager'] },
                },
              },
            },
          }),
          select: { id: true },
        });

        const link = processingCandidateId
          ? `/processingCandidateDetails/${processingCandidateId}?reviewRequest=${requestId}`
          : `/processing-admin?filter=awaiting_requests`;

        for (const user of targetUsers) {
          const idemKey = `${eventId}:processing_status_change_request:${requestId}:${user.id}`;
          await this.notificationsService.createNotification({
            userId: user.id,
            type: 'processing_status_change_request',
            title: `Processing ${actionLabel} request`,
            message: `${requesterName} requested processing ${actionLabel} for ${candidateName} — ${projectTitle}${countrySuffix}${stepSuffix}. Reason: ${reason}`,
            link,
            meta: {
              requestId,
              candidateProjectMapId,
              candidateId,
              projectId,
              requestType,
              requestedStatus,
              processingCandidateId,
              stepKey,
              countryCode,
            },
            idemKey,
          });
        }

        this.logger.log(
          `Processing status change request notifications created for ${targetUsers.length} approvers`,
        );
        return;
      }

      const statusLabel =
        requestedStatus === 'on_hold' ? 'On Hold' : 'Withdrawn';

      const targetRoles = [
        'Manager',
        'Recruiter Manager',
        'System Admin',
        'Admin',
        'CEO',
        'Director',
      ];

      const targetUsers = await this.prisma.user.findMany({
        where: withActiveAccountStatus({
          userRoles: {
            some: {
              role: {
                name: { in: targetRoles },
              },
            },
          },
        }),
        select: { id: true },
      });

      const link = `/candidate-project/${candidateId}/projects/${projectId}?statusRequest=${requestId}`;

      for (const user of targetUsers) {
        const idemKey = `${eventId}:status_change_request:${requestId}:${user.id}`;
        await this.notificationsService.createNotification({
          userId: user.id,
          type: 'candidate_project_status_change_request',
          title: `Candidate Project ${statusLabel} Request`,
          message: `${requesterName} requested to mark ${candidateName} as ${statusLabel} for project "${projectTitle}". Remarks: ${reason}`,
          link,
          meta: {
            requestId,
            candidateProjectMapId,
            candidateId,
            projectId,
            requestedStatus,
          },
          idemKey,
        });
      }

      this.logger.log(
        `Status change request notifications created for ${targetUsers.length} approvers`,
      );
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error(String(error ?? 'Unknown'));
      this.logger.error(
        `Failed to process status change request: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  async handleCandidateProjectStatusChangeReviewed(
    job: Job<NotificationJobData>,
  ) {
    const { eventId, payload } = job.data;
    this.logger.log(
      `Processing candidate project status change reviewed event: ${eventId}`,
    );

    try {
      const {
        requestId,
        candidateProjectMapId,
        candidateId,
        projectId,
        candidateName,
        projectTitle,
        requestType,
        requestedStatus,
        requestedBy,
        outcome,
        reviewNotes,
        processingCandidateId,
      } = payload as {
        requestId: string;
        candidateProjectMapId: string;
        candidateId: string;
        projectId: string;
        candidateName: string;
        projectTitle: string;
        requestType?: string;
        requestedStatus?: string;
        requestedBy: string;
        outcome: 'approved' | 'rejected';
        reviewNotes?: string | null;
        processingCandidateId?: string;
      };

      const isProcessingRequest =
        requestType === 'processing_cancel' || requestType === 'processing_hold';

      if (isProcessingRequest) {
        const actionLabel =
          requestType === 'processing_cancel' ? 'cancellation' : 'hold';
        const link = processingCandidateId
          ? `/processingCandidateDetails/${processingCandidateId}?actionOutcome=${requestId}`
          : `/processing-admin?filter=awaiting_requests`;

        const notifyUserIds = new Set<string>([requestedBy]);
        if (processingCandidateId) {
          const pc = await this.prisma.processingCandidate.findUnique({
            where: { id: processingCandidateId },
            select: { assignedProcessingTeamUserId: true },
          });
          if (pc?.assignedProcessingTeamUserId) {
            notifyUserIds.add(pc.assignedProcessingTeamUserId);
          }
        }

        for (const userId of notifyUserIds) {
          const idemKey = `${eventId}:processing_status_change_reviewed:${requestId}:${userId}`;
          await this.notificationsService.createNotification({
            userId,
            type: 'processing_status_change_reviewed',
            title:
              outcome === 'approved'
                ? `Processing ${actionLabel} approved`
                : `Processing ${actionLabel} rejected`,
            message:
              outcome === 'approved'
                ? `Processing ${actionLabel} for ${candidateName} (${projectTitle}) was approved.${reviewNotes ? ` Remarks: ${reviewNotes}` : ''}`
                : `Processing ${actionLabel} for ${candidateName} (${projectTitle}) was rejected.${reviewNotes ? ` Remarks: ${reviewNotes}` : ''}`,
            link,
            meta: {
              requestId,
              candidateProjectMapId,
              candidateId,
              projectId,
              requestedStatus,
              outcome,
              processingCandidateId,
              requestType,
            },
            idemKey,
          });
        }
        return;
      }

      const statusLabel =
        requestedStatus === 'on_hold' ? 'On Hold' : 'Withdrawn';
      const link = `/candidate-project/${candidateId}/projects/${projectId}`;

      const idemKey = `${eventId}:status_change_reviewed:${requestId}:${requestedBy}`;
      await this.notificationsService.createNotification({
        userId: requestedBy,
        type: 'candidate_project_status_change_reviewed',
        title:
          outcome === 'approved'
            ? `${statusLabel} Request Approved`
            : `${statusLabel} Request Rejected`,
        message:
          outcome === 'approved'
            ? `Your request to mark ${candidateName} as ${statusLabel} for project "${projectTitle}" was approved.`
            : `Your request to mark ${candidateName} as ${statusLabel} for project "${projectTitle}" was rejected.`,
        link,
        meta: {
          requestId,
          candidateProjectMapId,
          candidateId,
          projectId,
          requestedStatus,
          outcome,
        },
        idemKey,
      });
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error(String(error ?? 'Unknown'));
      this.logger.error(
        `Failed to process status change reviewed: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

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
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error(String(error ?? 'Unknown'));
      this.logger.error(
        `Failed to process DataSync event: ${err.message}`,
        err.stack,
      );
    }
  }

  async handleCourierShipmentReceived(job: Job<NotificationJobData>) {
    const { eventId, payload } = job.data;
    this.logger.log(`Processing courier shipment received event: ${eventId}`);

    const { shipmentId, receivedByUserId } = payload as {
      shipmentId: string;
      receivedByUserId: string;
    };

    const shipment = await this.prisma.courierShipment.findUnique({
      where: { id: shipmentId },
      include: {
        candidate: {
          select: { firstName: true, lastName: true, candidateCode: true },
        },
        receivedBy: { select: { name: true } },
      },
    });

    if (!shipment) {
      this.logger.warn(`Courier shipment ${shipmentId} not found for notification`);
      return;
    }

    const candidateName = `${shipment.candidate.firstName} ${shipment.candidate.lastName}`;
    const code = shipment.candidate.candidateCode ?? '';
    const receiverName = shipment.receivedBy?.name ?? 'Office team';
    const title = 'Courier documents received';
    const message = `Original documents for ${candidateName}${code ? ` (${code})` : ''} were received by ${receiverName} (Leg ${shipment.legNumber}).`;
    const link = `/courier-management/candidates/${shipment.candidateId}?leg=${shipmentId}`;

    const recipientIds = new Set<string>();
    if (shipment.sentByUserId) recipientIds.add(shipment.sentByUserId);
    if (shipment.createdByUserId) recipientIds.add(shipment.createdByUserId);
    recipientIds.delete(receivedByUserId);

    const processingManagers = await this.prisma.user.findMany({
      where: withActiveAccountStatus({
        userRoles: {
          some: { role: { name: 'Processing Manager' } },
        },
      }),
      select: { id: true },
    });

    for (const pm of processingManagers) {
      recipientIds.add(pm.id);
    }

    for (const userId of recipientIds) {
      await this.notificationsService.createNotification({
        userId,
        type: 'courier_shipment_received',
        title,
        message,
        link,
        meta: {
          shipmentId,
          candidateId: shipment.candidateId,
          legNumber: shipment.legNumber,
        },
        idemKey: `${eventId}:${userId}:courier_received`,
      });
    }

    this.logger.log(
      `Courier received notifications sent to ${recipientIds.size} users for shipment ${shipmentId}`,
    );
  }
}
