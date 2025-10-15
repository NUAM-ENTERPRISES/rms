import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CandidateAllocationService } from './candidate-allocation.service';
import { RunAllocationDto } from './dto/run-allocation.dto';
import {
  AllocationStatusDto,
  AllocationResultDto,
  RecruiterWorkloadDto,
} from './dto/allocation-status.dto';
import { Permissions } from '../auth/rbac/permissions.decorator';

@ApiTags('Candidate Allocation')
@ApiBearerAuth()
@Controller('allocations')
export class CandidateAllocationController {
  constructor(
    private readonly candidateAllocationService: CandidateAllocationService,
  ) {}

  @Post('run')
  @Permissions('manage:candidates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run candidate allocation',
    description:
      'Allocate eligible candidates to recruiters for a project or specific role using round-robin distribution.',
  })
  @ApiResponse({
    status: 200,
    description: 'Allocation completed successfully',
    type: AllocationResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters or no recruiters available',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or role not found',
  })
  async runAllocation(@Body() runAllocationDto: RunAllocationDto): Promise<{
    success: boolean;
    data: AllocationResultDto | Record<string, AllocationResultDto>;
    message: string;
  }> {
    const { projectId, roleNeededId, batchSize } = runAllocationDto;

    let data: AllocationResultDto | Record<string, AllocationResultDto>;

    // Get recruiters for this project
    const recruiters =
      await this.candidateAllocationService.getProjectRecruiters(projectId);

    if (roleNeededId) {
      // Allocate for specific role
      data = await this.candidateAllocationService.allocateForRole(
        projectId,
        roleNeededId,
        recruiters,
      );
    } else {
      // Allocate for entire project
      data = await this.candidateAllocationService.allocateForProject(
        projectId,
        recruiters,
      );
    }

    return {
      success: true,
      data,
      message: 'Allocation completed successfully',
    };
  }

  @Get('status')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get allocation status',
    description:
      'Get current allocation status for a project showing per-role statistics.',
  })
  @ApiQuery({
    name: 'projectId',
    description: 'Project ID to get status for',
    example: 'proj_123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Allocation status retrieved successfully',
    type: [AllocationStatusDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async getAllocationStatus(@Query('projectId') projectId: string): Promise<{
    success: boolean;
    data: AllocationStatusDto[];
    message: string;
  }> {
    const data =
      await this.candidateAllocationService.getAllocationStatus(projectId);

    return {
      success: true,
      data,
      message: 'Allocation status retrieved successfully',
    };
  }

  @Get('recruiter/:recruiterId/workload')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get recruiter workload',
    description:
      'Get current workload and allocation statistics for a specific recruiter.',
  })
  @ApiParam({
    name: 'recruiterId',
    description: 'Recruiter ID',
    example: 'user_123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Recruiter workload retrieved successfully',
    type: RecruiterWorkloadDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Recruiter not found',
  })
  async getRecruiterWorkload(
    @Param('recruiterId') recruiterId: string,
  ): Promise<{
    success: boolean;
    data: RecruiterWorkloadDto;
    message: string;
  }> {
    const data =
      await this.candidateAllocationService.getRecruiterWorkload(recruiterId);

    return {
      success: true,
      data,
      message: 'Recruiter workload retrieved successfully',
    };
  }
}
