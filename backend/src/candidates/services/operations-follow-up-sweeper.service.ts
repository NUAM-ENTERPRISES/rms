import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CandidatesService } from '../candidates.service';

@Injectable()
export class OperationsFollowUpSweeperService {
  private readonly logger = new Logger(OperationsFollowUpSweeperService.name);

  constructor(private readonly candidatesService: CandidatesService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweepOperationsFollowUp(): Promise<void> {
    try {
      await this.candidatesService.sweepOperationsFollowUp();
    } catch (error) {
      this.logger.error('Operations follow-up sweeper failed:', error);
    }
  }
}
