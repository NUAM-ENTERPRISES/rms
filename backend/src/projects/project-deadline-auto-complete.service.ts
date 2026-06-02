import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { buildExpiredActiveProjectsWhere } from './utils/project-deadline.util';

@Injectable()
export class ProjectDeadlineAutoCompleteService {
  private readonly logger = new Logger(ProjectDeadlineAutoCompleteService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Marks active projects with a past deadline as completed. Returns rows updated. */
  async autoCompleteExpiredProjects(now = new Date()): Promise<number> {
    const result = await this.prisma.project.updateMany({
      where: buildExpiredActiveProjectsWhere(now),
      data: { status: 'completed' },
    });

    if (result.count > 0) {
      this.logger.log(
        `Auto-completed ${result.count} project(s) with expired deadline`,
      );
    }

    return result.count;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredProjectDeadlines(): Promise<void> {
    await this.autoCompleteExpiredProjects();
  }
}
