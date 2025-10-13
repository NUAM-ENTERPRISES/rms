import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RecruiterInfo } from '../recruiter-pool/recruiter-pool.service';

@Injectable()
export class RoundRobinService {
  private readonly logger = new Logger(RoundRobinService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get next recruiter using round-robin algorithm
   * Uses transactional cursor update for thread safety
   */
  async getNextRecruiter(
    projectId: string,
    roleNeededId: string,
    recruiters: RecruiterInfo[],
  ): Promise<RecruiterInfo> {
    if (recruiters.length === 0) {
      throw new BadRequestException('No recruiters available for allocation');
    }

    this.logger.debug(
      `Getting next recruiter for project ${projectId}, role ${roleNeededId}`,
    );

    // Use transaction to ensure atomic cursor update
    const result = await this.prisma.$transaction(async (tx) => {
      // Get or create cursor
      let cursor = await tx.allocationCursor.findUnique({
        where: {
          projectId_roleNeededId: {
            projectId,
            roleNeededId,
          },
        },
      });

      if (!cursor) {
        cursor = await tx.allocationCursor.create({
          data: {
            projectId,
            roleNeededId,
            lastIndex: 0,
          },
        });
      }

      // Calculate next index
      const nextIndex = (cursor.lastIndex + 1) % recruiters.length;

      // Update cursor
      await tx.allocationCursor.update({
        where: {
          projectId_roleNeededId: {
            projectId,
            roleNeededId,
          },
        },
        data: {
          lastIndex: nextIndex,
          updatedAt: new Date(),
        },
      });

      return {
        nextIndex,
        recruiter: recruiters[nextIndex],
      };
    });

    this.logger.debug(
      `Selected recruiter ${result.recruiter.name} (index: ${result.nextIndex})`,
    );
    return result.recruiter;
  }

  /**
   * Reset cursor for a project+role combination
   */
  async resetCursor(projectId: string, roleNeededId: string): Promise<void> {
    await this.prisma.allocationCursor.upsert({
      where: {
        projectId_roleNeededId: {
          projectId,
          roleNeededId,
        },
      },
      update: {
        lastIndex: 0,
        updatedAt: new Date(),
      },
      create: {
        projectId,
        roleNeededId,
        lastIndex: 0,
      },
    });

    this.logger.log(
      `Reset cursor for project ${projectId}, role ${roleNeededId}`,
    );
  }

  /**
   * Get current cursor position
   */
  async getCurrentCursor(
    projectId: string,
    roleNeededId: string,
  ): Promise<number> {
    const cursor = await this.prisma.allocationCursor.findUnique({
      where: {
        projectId_roleNeededId: {
          projectId,
          roleNeededId,
        },
      },
    });

    return cursor?.lastIndex ?? 0;
  }
}
