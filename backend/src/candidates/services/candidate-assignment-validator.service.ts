import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CandidateAssignmentValidatorService {
  private readonly logger = new Logger(
    CandidateAssignmentValidatorService.name,
  );

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate that all candidate assignments are to recruiters only
   */
  async validateRecruiterAssignments(): Promise<{
    valid: number;
    invalid: number;
    invalidAssignments: Array<{
      candidateId: string;
      candidateName: string;
      projectId: string;
      projectName: string;
      recruiterId: string;
      recruiterName: string;
      roles: string[];
    }>;
  }> {
    this.logger.log(
      'Validating candidate assignments to ensure only recruiters are assigned',
    );

    // Get all candidate project assignments with recruiter information
    const assignments = await this.prisma.candidateProjectMap.findMany({
      where: {
        recruiterId: { not: null },
      },
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
        recruiter: {
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    let valid = 0;
    let invalid = 0;
    const invalidAssignments: Array<{
      candidateId: string;
      candidateName: string;
      projectId: string;
      projectName: string;
      recruiterId: string;
      recruiterName: string;
      roles: string[];
    }> = [];

    for (const assignment of assignments) {
      if (!assignment.recruiter) {
        invalid++;
        invalidAssignments.push({
          candidateId: assignment.candidate.id,
          candidateName: `${assignment.candidate.firstName} ${assignment.candidate.lastName}`,
          projectId: assignment.project.id,
          projectName: assignment.project.title,
          recruiterId: assignment.recruiterId!,
          recruiterName: 'Unknown',
          roles: [],
        });
        continue;
      }

      const roles = assignment.recruiter.userRoles.map((ur) => ur.role.name);
      const isRecruiter = roles.includes('Recruiter');

      if (isRecruiter) {
        valid++;
      } else {
        invalid++;
        invalidAssignments.push({
          candidateId: assignment.candidate.id,
          candidateName: `${assignment.candidate.firstName} ${assignment.candidate.lastName}`,
          projectId: assignment.project.id,
          projectName: assignment.project.title,
          recruiterId: assignment.recruiterId!,
          recruiterName: assignment.recruiter.name,
          roles,
        });
      }
    }

    this.logger.log(
      `Validation complete: ${valid} valid assignments, ${invalid} invalid assignments`,
    );

    return {
      valid,
      invalid,
      invalidAssignments,
    };
  }

  /**
   * Fix invalid candidate assignments by reassigning to recruiters
   */
  async fixInvalidAssignments(): Promise<{
    fixed: number;
    errors: string[];
  }> {
    this.logger.log('Fixing invalid candidate assignments');

    // Get validation results
    const validation = await this.validateRecruiterAssignments();

    if (validation.invalid === 0) {
      this.logger.log('No invalid assignments found');
      return { fixed: 0, errors: [] };
    }

    // Get available recruiters
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
    });

    if (recruiters.length === 0) {
      this.logger.error('No recruiters found in the system');
      return {
        fixed: 0,
        errors: ['No recruiters found in the system'],
      };
    }

    let fixed = 0;
    const errors: string[] = [];

    // Fix each invalid assignment using round-robin
    let recruiterIndex = 0;

    for (const assignment of validation.invalidAssignments) {
      try {
        // Select next recruiter in round-robin fashion
        const selectedRecruiter =
          recruiters[recruiterIndex % recruiters.length];

        this.logger.log(
          `Reassigning ${assignment.candidateName} in project ${assignment.projectName} from ${assignment.recruiterName} to ${selectedRecruiter.name}`,
        );

        // Update candidate project assignment
        await this.prisma.candidateProjectMap.updateMany({
          where: {
            candidateId: assignment.candidateId,
            projectId: assignment.projectId,
          },
          data: {
            recruiterId: selectedRecruiter.id,
          },
        });

        fixed++;
        recruiterIndex++;
      } catch (error) {
        const errorMessage = `Failed to reassign candidate ${assignment.candidateName} in project ${assignment.projectName}: ${error}`;
        this.logger.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    this.logger.log(`Fixed ${fixed} invalid assignments`);

    return { fixed, errors };
  }

  /**
   * Get recruiter workload statistics
   */
  async getRecruiterWorkload(): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      totalCandidates: number;
      activeCandidates: number;
      roles: string[];
    }>
  > {
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
        userRoles: {
          include: {
            role: true,
          },
        },
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

    return recruiters.map((recruiter) => ({
      id: recruiter.id,
      name: recruiter.name,
      email: recruiter.email,
      totalCandidates: recruiter._count.candidateProjectMaps,
      activeCandidates: recruiter._count.candidateProjectMaps, // All current assignments are considered active
      roles: recruiter.userRoles.map((ur) => ur.role.name),
    }));
  }
}
