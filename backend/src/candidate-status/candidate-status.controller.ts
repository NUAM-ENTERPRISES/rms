import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CandidateStatusService } from './candidate-status.service';

@ApiTags('Candidate Status')
@ApiBearerAuth()
@Controller('candidate-status')
export class CandidateStatusController {
  constructor(
    private readonly candidateStatusService: CandidateStatusService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all candidate statuses',
    description: 'Retrieve a list of all available candidate statuses',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate statuses retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              statusName: { type: 'string', example: 'Untouched' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        message: { type: 'string', example: 'Candidate statuses retrieved successfully' },
      },
    },
  })
  async findAll() {
    return this.candidateStatusService.findAll();
  }

  @Get('counts')
  @ApiOperation({
    summary: 'Get candidate counts per status',
    description: 'Retrieve all statuses with the count of candidates in each status',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate status counts retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              statusName: { type: 'string', example: 'Untouched' },
              candidateCount: { type: 'number', example: 25 },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        message: { type: 'string', example: 'Candidate status counts retrieved successfully' },
      },
    },
  })
  async getStatusCounts() {
    return this.candidateStatusService.getStatusCounts();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get candidate status by ID',
    description: 'Retrieve a specific candidate status by its ID',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Candidate status ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            statusName: { type: 'string', example: 'Untouched' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string', example: 'Candidate status retrieved successfully' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate status not found',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.candidateStatusService.findOne(id);
  }

  @Get('name/:statusName')
  @ApiOperation({
    summary: 'Get candidate status by name',
    description: 'Retrieve a specific candidate status by its status name',
  })
  @ApiParam({
    name: 'statusName',
    type: 'string',
    description: 'Candidate status name',
    example: 'Untouched',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            statusName: { type: 'string', example: 'Untouched' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string', example: 'Candidate status retrieved successfully' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate status not found',
  })
  async findByName(@Param('statusName') statusName: string) {
    return this.candidateStatusService.findByName(statusName);
  }
}
