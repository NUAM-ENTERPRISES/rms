import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Publish an event to the outbox for async processing
   */
  async publishEvent(
    type: string,
    payload: Record<string, unknown>,
    tx?: any,
  ): Promise<void> {
    try {
      const prisma = tx || this.prisma;
      await prisma.outboxEvent.create({
        data: {
          type,
          payload: payload as any, // Type assertion for Prisma Json type
        },
      });

      this.logger.debug(`Published event ${type} to outbox`);
    } catch (error) {
      this.logger.error(
        `Failed to publish event ${type}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }


  /**
   * Publish candidate documents verified event
   */
  async publishCandidateDocumentsRejected(
    candidateProjectMapId: string,
    verifiedBy: string,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'CandidateDocumentsRejected',
      {
        candidateProjectMapId,
        verifiedBy,
      },
      tx,
    );
  }

  /**
   * Publish specific document verified event
   */
  async publishDocumentVerified(
    documentId: string,
    verifiedBy: string,
    candidateProjectMapId: string,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'DocumentVerified',
      {
        documentId,
        verifiedBy,
        candidateProjectMapId,
      },
      tx,
    );
  }

  /**
   * Publish specific document rejected event
   */
  async publishDocumentRejected(
    documentId: string,
    rejectedBy: string,
    candidateProjectMapId: string,
    reason?: string,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'DocumentRejected',
      {
        documentId,
        rejectedBy,
        candidateProjectMapId,
        reason,
      },
      tx,
    );
  }

  /**
   * Publish document resubmission requested event
   */
  async publishDocumentResubmissionRequested(
    documentId: string,
    requestedBy: string,
    candidateProjectMapId: string,
    reason?: string,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'DocumentResubmissionRequested',
      {
        documentId,
        requestedBy,
        candidateProjectMapId,
        reason,
      },
      tx,
    );
  }

  /**
   * Publish document resubmitted event
   */
  async publishDocumentResubmitted(
    documentId: string,
    resubmittedBy: string,
    candidateProjectMapId: string,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'DocumentResubmitted',
      {
        documentId,
        resubmittedBy,
        candidateProjectMapId,
      },
      tx,
    );
  }

  /**
   * Publish candidate documents verified event
   */
  async publishCandidateDocumentsVerified(
    candidateProjectMapId: string,
    verifiedBy: string,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'CandidateDocumentsVerified',
      {
        candidateProjectMapId,
        verifiedBy,
      },
      tx,
    );
  }

  /**
   * Publish candidate sent for verification event
   */
  async publishCandidateSentForVerification(
    candidateProjectMapId: string,
    assignedToExecutive: string,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'CandidateSentForVerification',
      {
        candidateProjectMapId,
        assignedToExecutive,
      },
      tx,
    );
  }

  /**
   * Publish data sync event
   */
  async publishDataSync(
    payload: {
      userId?: string;
      type: string;
      id?: string;
      message?: string;
      [key: string]: any;
    },
    tx?: any,
  ): Promise<void> {
    await this.publishEvent('DataSync', payload, tx);
  }

  /**
   * Publish candidate transferred back event
   */
  async publishCandidateTransferredBack(
    candidateId: string,
    recruiterId: string,
    transferredBy: string,
    reason?: string,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'CandidateTransferredBack',
      {
        candidateId,
        recruiterId,
        transferredBy,
        reason,
      },
      tx,
    );
  }

  /**
   * Publish candidate recruiter assigned event (CRE assignment)
   */
  async publishCandidateRecruiterAssigned(
    candidateId: string,
    recruiterId: string,
    assignedBy: string,
    reason?: string,
    previousRecruiterId?: string,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'CandidateRecruiterAssigned',
      {
        candidateId,
        recruiterId,
        assignedBy,
        reason,
        previousRecruiterId,
      },
      tx,
    );
  }

  /**
   * Publish member transfer requested event
   */
  async publishMemberTransferRequested(
    transferId: string,
    userId: string,
    fromTeamId: string,
    toTeamId: string,
    requestedBy: string,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'MemberTransferRequested',
      {
        transferId,
        userId,
        fromTeamId,
        toTeamId,
        requestedBy,
      },
      tx,
    );
  }

  /**
   * Publish candidate assigned to screening event
   * Notifies the selected Interview Coordinator/Trainer when a candidate is first assigned
   */
  async publishCandidateAssignedToScreening(
    candidateProjectMapId: string,
    coordinatorId: string,
    recruiterId: string | null,
    assignedBy: string,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'CandidateAssignedToScreening',
      {
        candidateProjectMapId,
        coordinatorId,
        recruiterId,
        assignedBy,
      },
      tx,
    );
  }

  /**
   * Publish candidate sent to screening event
   * Notifies the selected Interview Coordinator when a screening is scheduled
   */
  async publishCandidateSentToScreening(
    candidateProjectMapId: string,
    screeningId: string,
    coordinatorId: string,
    recruiterId: string | null,
    scheduledBy?: string,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'CandidateSentToScreening',
      {
        candidateProjectMapId,
        screeningId,
        coordinatorId,
        recruiterId,
        scheduledBy,
      },
      tx,
    );
  }

  /**
   * Publish candidate approved for client interview event
   * Notifies recruiter and team head after passing screening
   */
  async publishCandidateApprovedForClientInterview(
    candidateProjectMapId: string,
    screeningId: string,
    coordinatorId: string,
    recruiterId: string | null,
    teamHeadId?: string,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'CandidateApprovedForClientInterview',
      {
        candidateProjectMapId,
        screeningId,
        coordinatorId,
        recruiterId,
        teamHeadId,
      },
      tx,
    );
  }

  /**
   * Publish candidate failed screening event
   * Notifies recruiter, team head and the coordinator
   */
  async publishCandidateFailedScreening(
    candidateProjectMapId: string,
    screeningId: string,
    coordinatorId: string,
    recruiterId: string | null,
    decision: string,
    teamHeadId?: string,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'CandidateFailedScreening',
      {
        candidateProjectMapId,
        screeningId,
        coordinatorId,
        recruiterId,
        decision,
        teamHeadId,
      },
      tx,
    );
  }

  /**
   * Publish candidate transferred to processing event
   */
  async publishCandidateTransferredToProcessing(
    processingCandidateId: string,
    candidateId: string,
    projectId: string,
    assignedProcessingTeamUserId: string,
    transferredBy: string,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'CandidateTransferredToProcessing',
      {
        processingCandidateId,
        candidateId,
        projectId,
        assignedProcessingTeamUserId,
        transferredBy,
      },
      tx,
    );
  }

  /**
   * Publish candidate hired event so notifications (and downstream integrations)
   * can react to a placement. Intended to be called inside the same DB transaction
   * that marks the candidate as hired (ensures consistency).
   */
  async publishCandidateHired(
    processingCandidateId: string,
    candidateId: string,
    projectId: string,
    candidateProjectMapId: string,
    recruiterId: string | null,
    changedBy: string | null,
    notes?: string | null,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'CandidateHired',
      {
        processingCandidateId,
        candidateId,
        projectId,
        candidateProjectMapId,
        recruiterId,
        changedBy,
        notes,
      },
      tx,
    );
  }

  /**
   * Publish generic recruiter notification event
   */
  async publishRecruiterNotification(
    recruiterId: string,
    message: string,
    title: string = 'Recruiter Notification',
    link?: string,
    meta?: Record<string, any>,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'RecruiterNotification',
      {
        recruiterId,
        message,
        title,
        link,
        meta,
      },
      tx,
    );
  }

  /**
   * Publish documentation notification event
   * Generic manual notification for documentation owners / coordinators
   */
  async publishDocumentationNotification(
    recipientId: string,
    message: string,
    title: string = 'Documentation Notification',
    link?: string,
    meta?: Record<string, any>,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'DocumentationNotification',
      {
        recipientId,
        message,
        title,
        link,
        meta,
      },
      tx,
    );
  }

  /**
   * Publish documents forwarded to client event
   */
  async publishDocumentsForwardedToClient(
    candidateId: string,
    projectId: string,
    senderId: string,
    recipientEmail: string,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'DocumentsForwardedToClient',
      {
        candidateId,
        projectId,
        senderId,
        recipientEmail,
      },
      tx,
    );
  }

}

