import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CandidateProjectStatusHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getCandidateProjectStatusHistory(candidateId: string, projectId: string) {
    // Check candidate-project mapping exists
    const mapping = await this.prisma.candidateProjects.findFirst({
      where: { candidateId, projectId },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobileNumber: true,
            countryCode: true,
            profileImage: true,
            dateOfBirth: true,
            gender: true,
            teamId: true,
            currentStatusId: true,
            currentStatus: { select: { id: true, statusName: true } },
            qualifications: {
              include: {
                qualification: true
              }
            },
            experience: true,
            expectedSalary: true,
            currentEmployer: true,
            currentRole: true,
            graduationYear: true,
            highestEducation: true,
            gpa: true,
            university: true,
            skills: true,
            source: true,
          }
        },
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            description: true,
            deadline: true,
            createdAt: true,
            updatedAt: true,
            priority: true,
            countryCode: true,
            projectType: true,
            resumeEditable: true,
            groomingRequired: true,
            hideContactInfo: true,
            clientId: true,
            teamId: true,
            client: true,
            team: true,
            rolesNeeded: true,
            documentRequirements: true,
            interviews: true,
          }
        },
      },
    });
    if (!mapping) {
      throw new NotFoundException('Candidate-project mapping not found');
    }
    // Get status history for this mapping, joining mainStatus/subStatus and changedBy
    const history = await this.prisma.candidateProjectStatusHistory.findMany({
      where: { candidateProjectMapId: mapping.id },
      orderBy: { statusChangedAt: 'asc' },
      include: {
        mainStatus: {
          select: {
            id: true,
            name: true,
            label: true,
            color: true,
          },
        },
        subStatus: {
          select: {
            id: true,
            name: true,
            label: true,
            color: true,
          },
        },
        changedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    return {
      success: true,
      data: {
        candidate: mapping.candidate,
        project: mapping.project,
        history,
        totalEntries: history.length,
      },
      message: 'Project Pipeline retrieved successfully',
    };
  }
}
