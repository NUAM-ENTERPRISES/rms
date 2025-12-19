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
  ): Promise<void> {
    try {
      await this.prisma.outboxEvent.create({
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
  ): Promise<void> {
    await this.publishEvent('CandidateDocumentsRejected', {
      candidateProjectMapId,
      verifiedBy,
    });
  }


  /**
   * Publish candidate documents verified event
   */
  async publishCandidateDocumentsVerified(
    candidateProjectMapId: string,
    verifiedBy: string,
  ): Promise<void> {
    await this.publishEvent('CandidateDocumentsVerified', {
      candidateProjectMapId,
      verifiedBy,
    });
  }

  /**
   * Publish candidate sent for verification event
   */
  async publishCandidateSentForVerification(
    candidateProjectMapId: string,
    assignedToExecutive: string,
  ): Promise<void> {
    await this.publishEvent('CandidateSentForVerification', {
      candidateProjectMapId,
      assignedToExecutive,
    });
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
  ): Promise<void> {
    await this.publishEvent('MemberTransferRequested', {
      transferId,
      userId,
      fromTeamId,
      toTeamId,
      requestedBy,
    });
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
  ): Promise<void> {
    await this.publishEvent('CandidateSentToScreening', {
      candidateProjectMapId,
      screeningId,
      coordinatorId,
      recruiterId,
    });
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
  ): Promise<void> {
    await this.publishEvent('CandidateApprovedForClientInterview', {
      candidateProjectMapId,
      screeningId,
      coordinatorId,
      recruiterId,
      teamHeadId,
    });
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
  ): Promise<void> {
    await this.publishEvent('CandidateFailedScreening', {
      candidateProjectMapId,
      screeningId,
      coordinatorId,
      recruiterId,
      decision,
      teamHeadId,
    });
  }
}
