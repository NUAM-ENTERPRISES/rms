import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface RecruiterInfo {
  id: string;
  name: string;
  email: string;
  workload: number; // Number of active candidates
}

@Injectable()
export class RecruiterPoolService {
  private readonly logger = new Logger(RecruiterPoolService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all available recruiters (users with Recruiter role)
   */
  async getRecruiters(): Promise<RecruiterInfo[]> {
    this.logger.debug('Fetching recruiter pool');

    const recruiters = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: 'Recruiter',
            },
          },
        },
      },
      include: {
        _count: {
          select: {
            candidateProjectMaps: {
              where: {
                status: {
                  in: [
                    'nominated',
                    'verification_in_progress',
                    'pending_documents',
                  ],
                },
              },
            },
          },
        },
      },
      orderBy: {
        id: 'asc', // Deterministic order
      },
    });

    const recruiterInfos: RecruiterInfo[] = recruiters.map((recruiter) => ({
      id: recruiter.id,
      name: recruiter.name,
      email: recruiter.email,
      workload: recruiter._count.candidateProjectMaps,
    }));

    this.logger.log(`Found ${recruiterInfos.length} recruiters in pool`);
    return recruiterInfos;
  }

  /**
   * Get recruiters sorted by workload (ascending)
   */
  async getRecruitersByWorkload(): Promise<RecruiterInfo[]> {
    const recruiters = await this.getRecruiters();
    return recruiters.sort((a, b) => a.workload - b.workload);
  }

  /**
   * Check if recruiter pool is empty
   */
  async isEmpty(): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        userRoles: {
          some: {
            role: {
              name: 'Recruiter',
            },
          },
        },
      },
    });

    return count === 0;
  }

  /**
   * Get recruiter by ID
   */
  async getRecruiterById(recruiterId: string): Promise<RecruiterInfo | null> {
    const recruiter = await this.prisma.user.findFirst({
      where: {
        id: recruiterId,
        userRoles: {
          some: {
            role: {
              name: 'Recruiter',
            },
          },
        },
      },
      include: {
        _count: {
          select: {
            candidateProjectMaps: {
              where: {
                status: {
                  in: [
                    'nominated',
                    'verification_in_progress',
                    'pending_documents',
                  ],
                },
              },
            },
          },
        },
      },
    });

    if (!recruiter) {
      return null;
    }

    return {
      id: recruiter.id,
      name: recruiter.name,
      email: recruiter.email,
      workload: recruiter._count.candidateProjectMaps,
    };
  }
}
