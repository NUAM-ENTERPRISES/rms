import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RecruiterAnalyticsService } from './recruiter-analytics.service';
import { Permissions } from '../../auth/rbac/permissions.decorator';

@ApiTags('Recruiter Analytics')
@ApiBearerAuth()
@Controller('analytics/recruiter')
export class RecruiterAnalyticsController {
  constructor(
    private readonly recruiterAnalyticsService: RecruiterAnalyticsService,
  ) {}

  @Get('list')
  @ApiOperation({
    summary: 'Get all recruiters for selector',
    description: 'Returns list of all users with Recruiter role for the analytics selector dropdown.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recruiters list retrieved successfully',
  })
  async getRecruiters() {
    return this.recruiterAnalyticsService.getRecruiters();
  }

  @Get('activity-breakdown')
  @ApiOperation({
    summary: 'Get recruiter activity breakdown',
    description:
      'Returns counts for Registered (nominated), Document Verified, Interview Scheduled, Interview Passed, and Hired candidates for a given recruiter.',
  })
  @ApiQuery({
    name: 'recruiterId',
    required: true,
    type: String,
    description: 'The recruiter user ID',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year to filter (defaults to current year)',
    example: 2026,
  })
  @ApiResponse({
    status: 200,
    description: 'Recruiter activity breakdown retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            recruiter: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string', example: 'Aarav Sharma' },
                email: { type: 'string' },
              },
            },
            placements: { type: 'number', example: 34 },
            activityBreakdown: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  activity: { type: 'string', example: 'Registered' },
                  value: { type: 'number', example: 145 },
                },
              },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async getActivityBreakdown(
    @Query('recruiterId') recruiterId: string,
    @Query('year') year?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.recruiterAnalyticsService.getActivityBreakdown(
      recruiterId,
      yearNum,
    );
  }

  @Get('followup-status')
  @ApiOperation({
    summary: 'Get recruiter follow-up status overview',
    description:
      'Returns distribution of candidates by follow-up status (Untouched, Interested, Not Interested, Not Eligible, Other Enquiry, Future, On Hold, RNR, Qualified, Deployed) for a given recruiter.',
  })
  @ApiQuery({
    name: 'recruiterId',
    required: true,
    type: String,
    description: 'The recruiter user ID',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year to filter (defaults to current year)',
    example: 2026,
  })
  @ApiResponse({
    status: 200,
    description: 'Recruiter follow-up status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            recruiter: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
              },
            },
            followupStatuses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'Untouched' },
                  count: { type: 'number', example: 35 },
                },
              },
            },
            total: { type: 'number', example: 129 },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async getFollowupStatus(
    @Query('recruiterId') recruiterId: string,
    @Query('year') year?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.recruiterAnalyticsService.getFollowupStatus(
      recruiterId,
      yearNum,
    );
  }

  @Get('performance-stages')
  @ApiOperation({
    summary: 'Get recruiter performance stages (weekly/monthly)',
    description:
      'Returns counts of status changes per recruitment stage grouped by day-of-week or month for a given recruiter.',
  })
  @ApiQuery({
    name: 'recruiterId',
    required: true,
    type: String,
    description: 'The recruiter user ID',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    type: String,
    enum: ['weekly', 'monthly'],
    description: 'Period grouping: weekly (default) or monthly',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance stages retrieved successfully',
  })
  async getPerformanceStages(
    @Query('recruiterId') recruiterId: string,
    @Query('period') period?: string,
  ) {
    const validPeriod =
      period === 'monthly' ? 'monthly' : 'weekly';
    return this.recruiterAnalyticsService.getPerformanceStages(
      recruiterId,
      validPeriod,
    );
  }

  @Get('candidates')
  @ApiOperation({
    summary: 'Get recruiter candidates list',
    description:
      'Returns paginated list of candidates assigned to a recruiter with search support.',
  })
  @ApiQuery({
    name: 'recruiterId',
    required: true,
    type: String,
    description: 'The recruiter user ID',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by candidate name, email or phone',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Recruiter candidates retrieved successfully',
  })
  async getRecruiterCandidates(
    @Query('recruiterId') recruiterId: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.recruiterAnalyticsService.getRecruiterCandidates(recruiterId, {
      search: search || undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
