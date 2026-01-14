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
   * Publish candidate sent to screening event
   * Notifies the selected Interview Coordinator
   */
  async publishCandidateSentToScreening(
    candidateProjectMapId: string,
    screeningId: string,
    coordinatorId: string,
    recruiterId: string,
    tx?: any,
  ): Promise<void> {
    await this.publishEvent(
      'CandidateSentToScreening',
      {
        candidateProjectMapId,
        screeningId,
        coordinatorId,
        recruiterId,
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
    recruiterId: string,
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
   * Publish candidate failed screening event
   * Notifies recruiter and team head when candidate fails screening
   */
  async publishCandidateFailedScreening(
    candidateProjectMapId: string,
    screeningId: string,
    coordinatorId: string,
    recruiterId: string,
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
}
