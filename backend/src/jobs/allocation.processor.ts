import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  CandidateAllocationService,
  AllocationJobData,
} from '../candidate-allocation/candidate-allocation.service';

@Processor('allocation')
export class AllocationProcessor extends WorkerHost {
  private readonly logger = new Logger(AllocationProcessor.name);

  constructor(
    private readonly candidateAllocationService: CandidateAllocationService,
  ) {
    super();
  }

  async process(job: Job<AllocationJobData>): Promise<any> {
    const { projectId, roleNeededId, batchSize } = job.data;
    this.logger.log(
      `Processing allocation job: project ${projectId}, role ${roleNeededId || 'all roles'}`,
    );

    try {
      if (roleNeededId) {
        // Process single role allocation
        if (!roleNeededId) {
          throw new Error('Role needed ID is required for role allocation job');
        }

        // Get recruiters for this project
        const recruiters =
          await this.candidateAllocationService.getProjectRecruiters(projectId);

        const result = await this.candidateAllocationService.allocateForRole(
          projectId,
          roleNeededId,
          recruiters,
        );

        this.logger.log(
          `Role allocation completed: ${result.assigned} assigned, ${result.skippedDuplicates} skipped, ${result.errors.length} errors`,
        );

        return result;
      } else {
        // Get recruiters for this project
        const recruiters =
          await this.candidateAllocationService.getProjectRecruiters(projectId);

        // Process entire project allocation
        const results =
          await this.candidateAllocationService.allocateForProject(
            projectId,
            recruiters,
          );

        const totalAssigned = Object.values(results).reduce(
          (sum, result) => sum + result.assigned,
          0,
        );
        const totalSkipped = Object.values(results).reduce(
          (sum, result) => sum + result.skippedDuplicates,
          0,
        );
        const totalErrors = Object.values(results).reduce(
          (sum, result) => sum + result.errors.length,
          0,
        );

        this.logger.log(
          `Project allocation completed: ${totalAssigned} assigned, ${totalSkipped} skipped, ${totalErrors} errors`,
        );

        return results;
      }
    } catch (error) {
      this.logger.error(
        `Allocation failed for project ${projectId}, role ${roleNeededId || 'all'}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
