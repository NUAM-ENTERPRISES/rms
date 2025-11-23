import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CandidateProjectStatusService } from './candidate-project-status.service';
import { QueryCandidateProjectStatusDto } from './dto/query-candidate-project-status.dto';
import { Permissions } from '../auth/rbac/permissions.decorator';

@ApiTags('Candidate Project Status')
@ApiBearerAuth()
@Controller('candidate-project-status')
export class CandidateProjectStatusController {
  constructor(
    private readonly candidateProjectStatusService: CandidateProjectStatusService,
  ) {}

  @Get()
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get all candidate project statuses (main & sub)',
    description:
      'Retrieve statuses (sub-statuses) with optional filtering by stage (main status) and pagination. Returns sub-status records with parent main status included.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for status name or label' })
  @ApiQuery({ name: 'stage', required: false, description: 'Filter by main stage name (e.g., documents)' })
  @ApiQuery({ name: 'isTerminal', required: false, description: 'Filter terminal statuses (true/false). See docs.' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 50 })
  @ApiResponse({ status: 200, description: 'Candidate project statuses retrieved successfully' })
  async findAll(@Query() query: QueryCandidateProjectStatusDto) {
    return this.candidateProjectStatusService.findAll(query);
  }

  @Get('by-stage')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get statuses grouped by stage',
    description: 'Retrieve all workflow statuses grouped by main stage.',
  })
  @ApiResponse({ status: 200, description: 'Statuses grouped by stage retrieved successfully' })
  async getStatusesByStage() {
    return this.candidateProjectStatusService.getStatusesByStage();
  }

  @Get('terminal')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get terminal statuses',
    description:
      'Retrieve statuses considered terminal. If your DB has an explicit isTerminal field on sub-status, it will be used. Otherwise a heuristic is used (rejected_*, hired, withdrawn).',
  })
  @ApiResponse({ status: 200, description: 'Terminal statuses retrieved successfully' })
  async getTerminalStatuses() {
    return this.candidateProjectStatusService.getTerminalStatuses();
  }

  @Get(':id')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get candidate project status by ID (main or sub)',
    description:
      'Retrieve a specific status using its ID. ID will be matched against main-status id first, then sub-status id.',
  })
  @ApiParam({ name: 'id', description: 'Status ID (string cuid)', example: 'clxabc...' })
  @ApiResponse({ status: 200, description: 'Candidate project status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Status not found' })
  async findOne(@Param('id') id: string) {
    return this.candidateProjectStatusService.findOne(id);
  }

  @Get('name/:statusName')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get candidate project status by status name',
    description:
      'Look up a status by name. Will search sub-statuses first, then main-status name.',
  })
  @ApiParam({ name: 'statusName', description: 'Status name (e.g., verification_in_progress)', example: 'verification_in_progress' })
  @ApiResponse({ status: 200, description: 'Candidate project status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Status not found' })
  async findByStatusName(@Param('statusName') statusName: string) {
    return this.candidateProjectStatusService.findByStatusName(statusName);
  }
}
