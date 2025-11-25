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
   * Publish candidate sent to mock interview event
   * Notifies the selected Interview Coordinator
   */
  async publishCandidateSentToMockInterview(
    candidateProjectMapId: string,
    mockInterviewId: string,
    coordinatorId: string,
    recruiterId: string,
  ): Promise<void> {
    await this.publishEvent('CandidateSentToMockInterview', {
      candidateProjectMapId,
      mockInterviewId,
      coordinatorId,
      recruiterId,
    });
  }

  /**
   * Publish candidate approved for client interview event
   * Notifies recruiter and team head after passing mock interview
   */
  async publishCandidateApprovedForClientInterview(
    candidateProjectMapId: string,
    mockInterviewId: string,
    coordinatorId: string,
    recruiterId: string,
    teamHeadId?: string,
  ): Promise<void> {
    await this.publishEvent('CandidateApprovedForClientInterview', {
      candidateProjectMapId,
      mockInterviewId,
      coordinatorId,
      recruiterId,
      teamHeadId,
    });
  }

  /**
   * Publish candidate failed mock interview event
   * Notifies recruiter and team head when candidate fails mock interview
   */
  async publishCandidateFailedMockInterview(
    candidateProjectMapId: string,
    mockInterviewId: string,
    coordinatorId: string,
    recruiterId: string,
    decision: string,
    teamHeadId?: string,
  ): Promise<void> {
    await this.publishEvent('CandidateFailedMockInterview', {
      candidateProjectMapId,
      mockInterviewId,
      coordinatorId,
      recruiterId,
      decision,
      teamHeadId,
    });
  }
}
