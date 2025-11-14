import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { RecruiterAssignmentService } from './recruiter-assignment.service';
import { CANDIDATE_STATUS } from '../../common/constants/statuses';

@Injectable()
export class RnrCreAssignmentService {
  private readonly logger = new Logger(RnrCreAssignmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recruiterAssignmentService: RecruiterAssignmentService,
  ) {}

  /**
   * Run every hour to check for RNR candidates that need CRE assignment
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleRnrCreAssignment() {
    this.logger.log('Starting RNR → CRE assignment check');

    try {
      const rnrCandidates = await this.recruiterAssignmentService.getRNRCandidatesNeedingCREAssignment();
      
      if (rnrCandidates.length === 0) {
        this.logger.log('No RNR candidates need CRE assignment');
        return;
      }

      this.logger.log(`Found ${rnrCandidates.length} RNR candidates needing CRE assignment`);

      for (const candidate of rnrCandidates) {
        try {
          // Check if candidate already has a CRE assigned
          const hasActiveCRE = await this.prisma.candidateRecruiterAssignment.findFirst({
            where: {
              candidateId: candidate.candidateId,
              isActive: true,
              recruiter: {
                userRoles: {
                  some: {
                    role: {
                      name: 'CRE',
                    },
                  },
                },
              },
            },
          });

          if (hasActiveCRE) {
            this.logger.log(
              `Candidate ${candidate.candidateId} already has CRE assigned, skipping`,
            );
            continue;
          }

          // Assign CRE to the candidate
          await this.recruiterAssignmentService.assignCREToCandidate(
            candidate.candidateId,
            'system', // System user ID for automatic assignments
            `Automatic CRE assignment after ${candidate.daysInRNR} days in RNR status`,
          );

          this.logger.log(
            `Successfully assigned CRE to candidate ${candidate.candidateId} (${candidate.candidateName}) after ${candidate.daysInRNR} days in RNR`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to assign CRE to candidate ${candidate.candidateId}:`,
            error,
          );
        }
      }

      this.logger.log('Completed RNR → CRE assignment check');
    } catch (error) {
      this.logger.error('Error during RNR → CRE assignment check:', error);
    }
  }

  /**
   * Manually trigger RNR → CRE assignment check
   */
  async triggerRnrCreAssignment(): Promise<{
    processed: number;
    assigned: number;
    errors: number;
  }> {
    this.logger.log('Manually triggering RNR → CRE assignment check');

    const results = {
      processed: 0,
      assigned: 0,
      errors: 0,
    };

    try {
      const rnrCandidates = await this.recruiterAssignmentService.getRNRCandidatesNeedingCREAssignment();
      results.processed = rnrCandidates.length;

      for (const candidate of rnrCandidates) {
        try {
          // Check if candidate already has a CRE assigned
          const hasActiveCRE = await this.prisma.candidateRecruiterAssignment.findFirst({
            where: {
              candidateId: candidate.candidateId,
              isActive: true,
              recruiter: {
                userRoles: {
                  some: {
                    role: {
                      name: 'CRE',
                    },
                  },
                },
              },
            },
          });

          if (hasActiveCRE) {
            continue;
          }

          // Assign CRE to the candidate
          await this.recruiterAssignmentService.assignCREToCandidate(
            candidate.candidateId,
            'system',
            `Manual CRE assignment after ${candidate.daysInRNR} days in RNR status`,
          );

          results.assigned++;
        } catch (error) {
          this.logger.error(
            `Failed to assign CRE to candidate ${candidate.candidateId}:`,
            error,
          );
          results.errors++;
        }
      }

      this.logger.log(`Manual RNR → CRE assignment completed: ${JSON.stringify(results)}`);
      return results;
    } catch (error) {
      this.logger.error('Error during manual RNR → CRE assignment:', error);
      throw error;
    }
  }

  /**
   * Get statistics about RNR candidates
   */
  async getRnrStatistics(): Promise<{
    totalRnrCandidates: number;
    candidatesNeedingCre: number;
    candidatesWithCre: number;
    averageDaysInRnr: number;
  }> {
    const totalRnrCandidates = await this.prisma.candidate.count({
      where: {
        currentStatus: {
          statusName: CANDIDATE_STATUS.RNR,
        },
      },
    });

    const candidatesNeedingCre = await this.recruiterAssignmentService.getRNRCandidatesNeedingCREAssignment();

    const candidatesWithCre = await this.prisma.candidate.count({
      where: {
        currentStatus: {
          statusName: CANDIDATE_STATUS.RNR,
        },
        recruiterAssignments: {
          some: {
            isActive: true,
            recruiter: {
              userRoles: {
                some: {
                  role: {
                    name: 'CRE',
                  },
                },
              },
            },
          },
        },
      },
    });

    // Calculate average days in RNR
    const rnrCandidates = await this.prisma.candidate.findMany({
      where: {
        currentStatus: {
          statusName: CANDIDATE_STATUS.RNR,
        },
      },
      select: {
        updatedAt: true,
      },
    });

    const totalDays = rnrCandidates.reduce((sum, candidate) => {
      const daysInRnr = Math.floor(
        (Date.now() - candidate.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      return sum + daysInRnr;
    }, 0);

    const averageDaysInRnr = rnrCandidates.length > 0 ? totalDays / rnrCandidates.length : 0;

    return {
      totalRnrCandidates,
      candidatesNeedingCre: candidatesNeedingCre.length,
      candidatesWithCre,
      averageDaysInRnr: Math.round(averageDaysInRnr * 100) / 100,
    };
  }
}
