import { Injectable } from '@nestjs/common';
import { CANDIDATE_PROJECT_STATUS } from '../common/constants/statuses';
import { CandidateProjectMap, User, Project } from '@prisma/client';

export interface PipelineStage {
  stage: string;
  isCurrent: boolean;
  isCompleted: boolean;
  title: string;
  description: string;
  date?: string;
  icon?: string;
  color?: string;
}

export interface ProjectPipeline {
  projectId: string;
  projectTitle: string;
  stages: PipelineStage[];
  currentStage: string;
  overallProgress: number;
}

@Injectable()
export class PipelineService {
  /**
   * Generate pipeline stages for a candidate-project combination
   */
  generatePipelineForProject(
    projectMap: CandidateProjectMap & {
      project: Project;
    },
  ): ProjectPipeline {
    const status = projectMap.status as keyof typeof CANDIDATE_PROJECT_STATUS;
    const allStages = this.getAllPipelineStages();

    // Find current stage index
    const currentStageIndex = this.getCurrentStageIndex(status);

    // Generate stages with completion status
    const stages: PipelineStage[] = allStages.map((stage, index) => ({
      ...stage,
      isCurrent: index === currentStageIndex,
      isCompleted: index < currentStageIndex,
      date: this.getStageDate(projectMap, stage.stage),
    }));

    return {
      projectId: projectMap.project.id,
      projectTitle: projectMap.project.title,
      stages,
      currentStage: status,
      overallProgress: Math.round(
        (currentStageIndex / (allStages.length - 1)) * 100,
      ),
    };
  }

  /**
   * Generate pipeline for multiple projects
   */
  generatePipelinesForCandidate(
    projects: Array<
      CandidateProjectMap & {
        project: Project;
      }
    >,
  ): ProjectPipeline[] {
    return projects.map((project) => this.generatePipelineForProject(project));
  }

  /**
   * Get all pipeline stages in order
   */
  private getAllPipelineStages(): Omit<
    PipelineStage,
    'isCurrent' | 'isCompleted' | 'date'
  >[] {
    return [
      {
        stage: CANDIDATE_PROJECT_STATUS.NOMINATED,
        title: 'Nominated',
        description: 'Candidate has been nominated for this project',
        icon: 'User',
        color: 'blue',
      },
      {
        stage: CANDIDATE_PROJECT_STATUS.PENDING_DOCUMENTS,
        title: 'Document Verification',
        description: 'Awaiting document submission',
        icon: 'FileText',
        color: 'orange',
      },
      {
        stage: CANDIDATE_PROJECT_STATUS.DOCUMENTS_SUBMITTED,
        title: 'Documents Submitted',
        description: 'Documents have been submitted for verification',
        icon: 'FileText',
        color: 'orange',
      },
      {
        stage: CANDIDATE_PROJECT_STATUS.VERIFICATION_IN_PROGRESS,
        title: 'Verification in Progress',
        description: 'Documents are being verified',
        icon: 'FileText',
        color: 'orange',
      },
      {
        stage: CANDIDATE_PROJECT_STATUS.DOCUMENTS_VERIFIED,
        title: 'Documents Verified',
        description: 'All documents have been verified',
        icon: 'CheckCircle',
        color: 'green',
      },
      {
        stage: CANDIDATE_PROJECT_STATUS.APPROVED,
        title: 'Approved',
        description: 'Candidate has been approved for interview',
        icon: 'CheckCircle',
        color: 'green',
      },
      {
        stage: CANDIDATE_PROJECT_STATUS.INTERVIEW_SCHEDULED,
        title: 'Interview Scheduled',
        description: 'Interview has been scheduled',
        icon: 'Calendar',
        color: 'blue',
      },
      {
        stage: CANDIDATE_PROJECT_STATUS.INTERVIEW_COMPLETED,
        title: 'Interview Completed',
        description: 'Interview has been completed',
        icon: 'Calendar',
        color: 'blue',
      },
      {
        stage: CANDIDATE_PROJECT_STATUS.INTERVIEW_PASSED,
        title: 'Interview Passed',
        description: 'Candidate passed the interview',
        icon: 'CheckCircle',
        color: 'green',
      },
      {
        stage: CANDIDATE_PROJECT_STATUS.SELECTED,
        title: 'Selected',
        description: 'Candidate has been selected',
        icon: 'Target',
        color: 'purple',
      },
      {
        stage: CANDIDATE_PROJECT_STATUS.PROCESSING,
        title: 'Processing',
        description: 'Final processing and onboarding',
        icon: 'Briefcase',
        color: 'indigo',
      },
      {
        stage: CANDIDATE_PROJECT_STATUS.HIRED,
        title: 'Hired',
        description: 'Candidate has been hired',
        icon: 'Award',
        color: 'emerald',
      },
    ];
  }

  /**
   * Get current stage index based on status
   */
  private getCurrentStageIndex(status: string): number {
    const stageOrder = [
      CANDIDATE_PROJECT_STATUS.NOMINATED,
      CANDIDATE_PROJECT_STATUS.PENDING_DOCUMENTS,
      CANDIDATE_PROJECT_STATUS.DOCUMENTS_SUBMITTED,
      CANDIDATE_PROJECT_STATUS.VERIFICATION_IN_PROGRESS,
      CANDIDATE_PROJECT_STATUS.DOCUMENTS_VERIFIED,
      CANDIDATE_PROJECT_STATUS.APPROVED,
      CANDIDATE_PROJECT_STATUS.INTERVIEW_SCHEDULED,
      CANDIDATE_PROJECT_STATUS.INTERVIEW_COMPLETED,
      CANDIDATE_PROJECT_STATUS.INTERVIEW_PASSED,
      CANDIDATE_PROJECT_STATUS.SELECTED,
      CANDIDATE_PROJECT_STATUS.PROCESSING,
      CANDIDATE_PROJECT_STATUS.HIRED,
    ];

    const index = stageOrder.indexOf(status as any);
    return index >= 0 ? index : 0;
  }

  /**
   * Get stage date based on project map data
   */
  private getStageDate(
    projectMap: CandidateProjectMap,
    stage: string,
  ): string | undefined {
    switch (stage) {
      case CANDIDATE_PROJECT_STATUS.NOMINATED:
        return projectMap.nominatedDate?.toISOString();
      case CANDIDATE_PROJECT_STATUS.DOCUMENTS_SUBMITTED:
        return projectMap.documentsSubmittedDate?.toISOString();
      case CANDIDATE_PROJECT_STATUS.DOCUMENTS_VERIFIED:
        return projectMap.documentsVerifiedDate?.toISOString();
      case CANDIDATE_PROJECT_STATUS.APPROVED:
        return projectMap.approvedDate?.toISOString();
      case CANDIDATE_PROJECT_STATUS.SELECTED:
        return projectMap.selectedDate?.toISOString();
      case CANDIDATE_PROJECT_STATUS.HIRED:
        return projectMap.hiredDate?.toISOString();
      default:
        return undefined;
    }
  }
}
