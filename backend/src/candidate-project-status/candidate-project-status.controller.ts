import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
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
    summary: 'Get all candidate project statuses',
    description:
      'Retrieve candidate project statuses with pagination, search, and filtering by stage or terminal status.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for status name, label, or description',
  })
  @ApiQuery({
    name: 'stage',
    required: false,
    description: 'Filter by workflow stage',
  })
  @ApiQuery({
    name: 'isTerminal',
    required: false,
    description: 'Filter by terminal status (true/false)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate project statuses retrieved successfully',
  })
  async findAll(@Query() query: QueryCandidateProjectStatusDto) {
    return this.candidateProjectStatusService.findAll(query);
  }

  @Get('by-stage')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get statuses grouped by stage',
    description: 'Retrieve all candidate project statuses grouped by workflow stage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statuses grouped by stage retrieved successfully',
  })
  async getStatusesByStage() {
    return this.candidateProjectStatusService.getStatusesByStage();
  }

  @Get('terminal')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get all terminal statuses',
    description: 'Retrieve all terminal (final) candidate project statuses.',
  })
  @ApiResponse({
    status: 200,
    description: 'Terminal statuses retrieved successfully',
  })
  async getTerminalStatuses() {
    return this.candidateProjectStatusService.getTerminalStatuses();
  }

  @Get(':id')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get candidate project status by ID',
    description: 'Retrieve a specific candidate project status using its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Candidate project status ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate project status retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Status not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.candidateProjectStatusService.findOne(id);
  }

  @Get('name/:statusName')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get candidate project status by status name',
    description: 'Retrieve a specific candidate project status using its status name.',
  })
  @ApiParam({
    name: 'statusName',
    description: 'Status name (e.g., nominated, hired)',
    example: 'nominated',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate project status retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Status not found' })
  async findByStatusName(@Param('statusName') statusName: string) {
    return this.candidateProjectStatusService.findByStatusName(statusName);
  }
}
