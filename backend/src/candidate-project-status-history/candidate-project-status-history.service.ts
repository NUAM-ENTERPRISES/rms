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
        mainStatus: true,
        subStatus: true,
        roleNeeded: {
          include: {
            roleCatalog: true,
          },
        },
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
          include: {
            client: true,
            team: true,
            country: true,
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            documentRequirements: true,
          },
        },
      },
    });
    if (!mapping) {
      throw new NotFoundException('Candidate-project mapping not found');
    }

    // Fetch all main and sub statuses for pipeline logic
    const [allMainStatuses, allSubStatuses] = await Promise.all([
      this.prisma.candidateProjectMainStatus.findMany({ orderBy: { order: 'asc' } }),
      this.prisma.candidateProjectSubStatus.findMany({ orderBy: { order: 'asc' } }),
    ]);

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

    const historyMainStatusNames = history.map(h => h.mainStatus?.name).filter(Boolean);
    
    // Determine progress order scenario
    // Default happy path: Nomination -> Documents -> Interview -> Processing -> Final
    const happyPath = ['nominated', 'documents', 'interview', 'processing', 'final'];
    let progressOrderNames = [...happyPath];

    // Check if interview happened before documents in history
    const interviewIndex = historyMainStatusNames.indexOf('interview');
    const documentsIndex = historyMainStatusNames.indexOf('documents');

    if (interviewIndex !== -1 && documentsIndex !== -1 && interviewIndex < documentsIndex) {
      progressOrderNames = ['nominated', 'interview', 'documents', 'processing', 'final'];
    } else if (interviewIndex !== -1 && documentsIndex === -1) {
      // If they reached interview but not documents yet, assume interview comes first in this scenario
      progressOrderNames = ['nominated', 'interview', 'documents', 'processing', 'final'];
    }

    const progressOrder = progressOrderNames.map((name, index) => {
      const status = allMainStatuses.find(s => s.name === name);
      return {
        order: index + 1,
        name: name,
        label: status?.label || name,
        isCompleted: historyMainStatusNames.includes(name),
        isCurrent: mapping.mainStatus?.name === name
      };
    });

    // Application Progress Percentage
    const currentMainName = mapping.mainStatus?.name || 'nominated';
    const currentOrderIndex = progressOrderNames.indexOf(currentMainName);
    
    // If current status is not in happy path (e.g. rejected), use the last happy path status reached
    let effectiveIndex = currentOrderIndex;
    if (effectiveIndex === -1) {
      // Find the last happy path status in history
      for (let i = progressOrderNames.length - 1; i >= 0; i--) {
        if (historyMainStatusNames.includes(progressOrderNames[i])) {
          effectiveIndex = i;
          break;
        }
      }
    }
    
    const applicationProgress = effectiveIndex === -1 ? 0 : Math.round(((effectiveIndex + 1) / progressOrderNames.length) * 100);

    // Duration since nomination
    const firstEntry = history[0];
    const duration = firstEntry ? this.calculateDuration(new Date(firstEntry.statusChangedAt)) : '0 days';

    // Time in current status
    const lastEntry = history[history.length - 1];
    const timeInCurrentStatus = lastEntry ? this.calculateDuration(new Date(lastEntry.statusChangedAt)) : '0 days';

    // Next Step Logic
    let nextStep: { name: string; label: string; type: string } | null = null;
    const isTerminal = ['rejected', 'withdrawn'].includes(currentMainName);
    
    if (!isTerminal) {
      const currentSubStatus = mapping.subStatus;
      if (currentSubStatus) {
        const stageSubStatuses = allSubStatuses.filter(s => s.stageId === currentSubStatus.stageId);
        const currentSubIndex = stageSubStatuses.findIndex(s => s.id === currentSubStatus.id);
        
        if (currentSubIndex !== -1 && currentSubIndex < stageSubStatuses.length - 1) {
          const nextSub = stageSubStatuses[currentSubIndex + 1];
          nextStep = {
            name: nextSub.name,
            label: nextSub.label,
            type: 'sub_status'
          };
        } else {
          // Move to next main status in the determined progress order
          const nextMainIndex = currentOrderIndex + 1;
          if (nextMainIndex < progressOrderNames.length) {
            const nextMainName = progressOrderNames[nextMainIndex];
            const nextMain = allMainStatuses.find(s => s.name === nextMainName);
            nextStep = {
              name: nextMainName,
              label: nextMain?.label || nextMainName,
              type: 'main_status'
            };
          }
        }
      } else if (mapping.mainStatusId) {
        // If no sub-status, suggest the first sub-status of the current main status
        const stageSubStatuses = allSubStatuses.filter(s => s.stageId === mapping.mainStatusId);
        if (stageSubStatuses.length > 0) {
          nextStep = {
            name: stageSubStatuses[0].name,
            label: stageSubStatuses[0].label,
            type: 'sub_status'
          };
        }
      }
    }

    return {
      success: true,
      data: {
        candidate: mapping.candidate,
        project: mapping.project,
        nominatedRole: mapping.roleNeeded,
        currentStatus: {
          mainStatus: mapping.mainStatus,
          subStatus: mapping.subStatus,
          timeInStatus: timeInCurrentStatus,
        },
        pipeline: {
          progressOrder,
          applicationProgress,
          duration,
          nextStep,
        },
        history,
        totalEntries: history.length,
      },
      message: 'Project Pipeline retrieved successfully',
    };
  }

  private calculateDuration(startDate: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    
    const months = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;
    
    if (months < 12) {
      return `${months} month${months > 1 ? 's' : ''}${remainingDays > 0 ? ` ${remainingDays} day${remainingDays > 1 ? 's' : ''}` : ''}`;
    }
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
  }
}
