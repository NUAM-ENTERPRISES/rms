import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CandidateStatusHistoryService } from './candidate-status-history.service';

@ApiTags('Candidate Status History')
@ApiBearerAuth()
@Controller('candidate-status-history')
export class CandidateStatusHistoryController {
  constructor(
    private readonly candidateStatusHistoryService: CandidateStatusHistoryService,
  ) {}

  @Get('candidate/:candidateId')
  @ApiOperation({
    summary: 'Get status history for a candidate',
    description: 'Retrieve all status change history for a specific candidate',
  })
  @ApiParam({
    name: 'candidateId',
    type: 'string',
    description: 'Candidate ID',
    example: 'clx123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Status history retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            candidate: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'clx123abc' },
                name: { type: 'string', example: 'John Doe' },
                currentStatus: {
                  type: 'object',
                  properties: {
                    id: { type: 'number', example: 1 },
                    statusName: { type: 'string', example: 'Untouched' },
                  },
                },
              },
            },
            history: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'hist123' },
                  candidateId: { type: 'string', example: 'clx123abc' },
                  statusId: { type: 'number', example: 1 },
                  statusNameSnapshot: { type: 'string', example: 'Untouched' },
                  changedById: { type: 'string', example: 'user123' },
                  changedByName: { type: 'string', example: 'Admin User' },
                  reason: { 
                    type: 'string', 
                    example: 'Candidate showed interest in the position',
                    nullable: true 
                  },
                  statusUpdatedAt: {
                    type: 'string',
                    format: 'date-time',
                  },
                  notificationCount: { type: 'number', example: 0 },
                },
              },
            },
            totalEntries: { type: 'number', example: 5 },
          },
        },
        message: {
          type: 'string',
          example: 'Candidate status history retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  async getCandidateStatusHistory(@Param('candidateId') candidateId: string) {
    return this.candidateStatusHistoryService.getCandidateStatusHistory(
      candidateId,
    );
  }

  @Get('candidate/:candidateId/stats')
  @ApiOperation({
    summary: 'Get status change statistics for a candidate',
    description:
      'Get statistics about status changes including breakdown, totals, and notification counts',
  })
  @ApiParam({
    name: 'candidateId',
    type: 'string',
    description: 'Candidate ID',
    example: 'clx123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Status statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            candidate: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'clx123abc' },
                name: { type: 'string', example: 'John Doe' },
              },
            },
            totalStatusChanges: { type: 'number', example: 10 },
            uniqueStatuses: { type: 'number', example: 4 },
            statusBreakdown: {
              type: 'object',
              example: { Untouched: 5, RNR: 3, Selected: 2 },
            },
            firstStatusChange: { type: 'object' },
            lastStatusChange: { type: 'object' },
            totalNotifications: { type: 'number', example: 15 },
          },
        },
        message: {
          type: 'string',
          example: 'Candidate status statistics retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  async getCandidateStatusStats(@Param('candidateId') candidateId: string) {
    return this.candidateStatusHistoryService.getCandidateStatusStats(
      candidateId,
    );
  }

  @Get('candidate/:candidateId/pipeline')
  @ApiOperation({
    summary: 'Get candidate status pipeline',
    description:
      'Retrieve the status pipeline showing the journey of a candidate through different statuses with transitions, completion percentage, and detailed statistics',
  })
  @ApiParam({
    name: 'candidateId',
    type: 'string',
    description: 'Candidate ID',
    example: 'clx123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate status pipeline retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            candidate: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'clx123abc' },
                name: { type: 'string', example: 'John Doe' },
                currentStatus: {
                  type: 'object',
                  properties: {
                    id: { type: 'number', example: 3 },
                    statusName: { type: 'string', example: 'Qualified' },
                  },
                },
              },
            },
            pipeline: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step: { type: 'number', example: 1 },
                  statusId: { type: 'number', example: 1 },
                  statusName: { type: 'string', example: 'Untouched' },
                  stage: { type: 'string', example: 'initial' },
                  completionWeight: { type: 'number', example: 5 },
                  enteredAt: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-01-15T10:30:00Z',
                  },
                  exitedAt: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-01-20T14:45:00Z',
                    nullable: true,
                  },
                  durationInDays: { type: 'number', example: 5 },
                  changedBy: { type: 'string', example: 'Admin User' },
                  reason: {
                    type: 'string',
                    example: 'Initial status',
                    nullable: true,
                  },
                  notificationsSent: { type: 'number', example: 2 },
                  isCurrentStatus: { type: 'boolean', example: false },
                  isTerminalStatus: { type: 'boolean', example: false },
                },
              },
            },
            completionPercentage: {
              type: 'number',
              example: 70,
              description: 'Overall completion percentage (0-100)',
            },
            summary: {
              type: 'object',
              properties: {
                totalSteps: { type: 'number', example: 4 },
                totalDuration: { type: 'number', example: 45 },
                averageDurationPerStatus: { type: 'number', example: 11.25 },
                totalNotifications: { type: 'number', example: 8 },
              },
            },
            statistics: {
              type: 'object',
              properties: {
                progressStage: {
                  type: 'string',
                  example: 'Qualified',
                  description:
                    'Current progress stage: Not Started, Initial Contact, Engaged, In Progress, Qualified, Completed',
                },
                stagesCompleted: { type: 'number', example: 4 },
                totalStages: { type: 'number', example: 6 },
                isInTerminalStatus: { type: 'boolean', example: false },
                statusBreakdown: {
                  type: 'object',
                  description:
                    'Breakdown of time spent in each status with occurrences',
                },
                stageBreakdown: {
                  type: 'object',
                  description: 'Breakdown of time spent in each stage category',
                },
                timelineMetrics: {
                  type: 'object',
                  properties: {
                    firstStatusDate: {
                      type: 'string',
                      format: 'date-time',
                    },
                    lastStatusDate: { type: 'string', format: 'date-time' },
                    totalDaysInPipeline: { type: 'number', example: 45 },
                    averageDaysPerStatus: { type: 'number', example: 11.25 },
                    currentStatusDuration: { type: 'number', example: 10 },
                  },
                },
              },
            },
          },
        },
        message: {
          type: 'string',
          example: 'Candidate status pipeline retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  async getCandidateStatusPipeline(
    @Param('candidateId') candidateId: string,
  ) {
    return this.candidateStatusHistoryService.getCandidateStatusPipeline(
      candidateId,
    );
  }

  @Get('entry/:historyId')
  @ApiOperation({
    summary: 'Get a single status history entry',
    description: 'Retrieve details of a specific status history entry by ID',
  })
  @ApiParam({
    name: 'historyId',
    type: 'string',
    description: 'Status history entry ID',
    example: 'hist123',
  })
  @ApiResponse({
    status: 200,
    description: 'Status history entry retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'History entry not found' })
  async getHistoryEntry(@Param('historyId') historyId: string) {
    return this.candidateStatusHistoryService.getHistoryEntry(historyId);
  }

  @Get('status/:statusName')
  @ApiOperation({
    summary: 'Get history by status name',
    description: 'Retrieve all history entries for a specific status',
  })
  @ApiParam({
    name: 'statusName',
    type: 'string',
    description: 'Status name',
    example: 'Untouched',
  })
  @ApiResponse({
    status: 200,
    description: 'Status history retrieved successfully',
  })
  async getHistoryByStatus(@Param('statusName') statusName: string) {
    return this.candidateStatusHistoryService.getHistoryByStatus(statusName);
  }

  @Get('recent')
  @ApiOperation({
    summary: 'Get recent status changes',
    description: 'Retrieve status changes from the last N days (default: 7)',
  })
  @ApiQuery({
    name: 'days',
    type: 'number',
    required: false,
    description: 'Number of days to look back',
    example: 7,
  })
  @ApiResponse({
    status: 200,
    description: 'Recent status changes retrieved successfully',
  })
  async getRecentStatusChanges(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    return this.candidateStatusHistoryService.getRecentStatusChanges(
      days || 7,
    );
  }

  @Get('date-range')
  @ApiOperation({
    summary: 'Get history by date range',
    description: 'Retrieve status history within a specific date range',
  })
  @ApiQuery({
    name: 'startDate',
    type: 'string',
    required: true,
    description: 'Start date (ISO format)',
    example: '2025-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    type: 'string',
    required: true,
    description: 'End date (ISO format)',
    example: '2025-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Status history for date range retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid date format' })
  async getHistoryByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (start > end) {
      throw new BadRequestException('Start date must be before end date');
    }

    return this.candidateStatusHistoryService.getHistoryByDateRange(start, end);
  }
}
