import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  UnifiedEligibilityService,
  EligibilityResult,
} from './unified-eligibility.service';

@ApiTags('Eligibility')
@Controller('eligibility')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EligibilityController {
  constructor(private readonly eligibilityService: UnifiedEligibilityService) {}

  @Get('candidate/:candidateId/project/:projectId/role/:roleId')
  @ApiOperation({
    summary: 'Get candidate eligibility for specific role',
    description:
      'Returns detailed eligibility analysis for a candidate-role combination',
  })
  @ApiResponse({
    status: 200,
    description: 'Eligibility analysis retrieved successfully',
  })
  async getCandidateEligibility(
    @Param('candidateId') candidateId: string,
    @Param('projectId') projectId: string,
    @Param('roleId') roleId: string,
  ): Promise<{ success: boolean; data: EligibilityResult; message: string }> {
    const eligibility = await this.eligibilityService.checkEligibility({
      candidateId,
      projectId,
      roleNeededId: roleId,
    });

    return {
      success: true,
      data: eligibility,
      message: 'Eligibility analysis retrieved successfully',
    };
  }

  @Get('candidate/:candidateId/project/:projectId/matchmaking')
  @ApiOperation({
    summary: 'Get matchmaking process for candidate',
    description:
      'Returns detailed matchmaking analysis showing how candidate became eligible',
  })
  @ApiResponse({
    status: 200,
    description: 'Matchmaking analysis retrieved successfully',
  })
  async getMatchmakingProcess(
    @Param('candidateId') candidateId: string,
    @Param('projectId') projectId: string,
  ): Promise<{ success: boolean; data: any; message: string }> {
    // Get project with role requirements
    const project =
      await this.eligibilityService.getProjectWithRequirements(projectId);

    // Get candidate with all data
    const candidate =
      await this.eligibilityService.getCandidateWithData(candidateId);

    // Get matchmaking analysis
    const matchmaking = await this.eligibilityService.getMatchmakingAnalysis(
      candidate,
      project,
    );

    return {
      success: true,
      data: matchmaking,
      message: 'Matchmaking analysis retrieved successfully',
    };
  }
}
