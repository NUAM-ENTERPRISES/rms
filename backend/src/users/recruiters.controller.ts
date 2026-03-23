import { Controller, Get, Query, Request, ForbiddenException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { RbacUtil } from '../auth/rbac/rbac.util';

@ApiTags('Recruiters')
@ApiBearerAuth()
@Controller('recruiters')
export class RecruitersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly rbacUtil: RbacUtil,
  ) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get recruiter statistics for analytics',
    description: 'Retrieve statistics for all recruiters for a given year.',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year to get statistics for',
    example: 2024,
  })
  @ApiResponse({
    status: 200,
    description: 'Recruiter statistics retrieved successfully',
  })
  async getRecruiterStats(
    @Request() req,
    @Query('year') year?: string,
  ): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      name: string;
      email: string;
      // Project-level metrics
      assigned: number;
      screening: number;
      interview: number;
      selected: number;
      joined: number;
      untouched: number;
      // Candidate-level metrics
      totalCandidates: number;
      candidatesUntouched: number;
      candidatesInterested: number;
      candidatesNotInterested: number;
      candidatesRNR: number;
      candidatesQualified: number;
      candidatesWorking: number;
      candidatesOnHold: number;
      candidatesOtherEnquiry: number;
      candidatesFuture: number;
      candidatesNotEligible: number;
      // Average time metrics
      avgScreeningDays: number;
      avgTimeToFirstTouch: number;
      avgDaysToInterested: number;
      avgDaysToNotInterested: number;
      avgDaysToNotEligible: number;
      avgDaysToOtherEnquiry: number;
      avgDaysToFuture: number;
      avgDaysToOnHold: number;
      avgDaysToRNR: number;
      avgDaysToQualified: number;
      avgDaysToWorking: number;
    }>;
    message: string;
  }> {
    const userId = req.user.id;
    const hasReadUsers = await this.rbacUtil.hasPermission(userId, [
      'read:users',
    ]);

    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    let data = await this.usersService.getRecruiterStats(yearNum);

    // If user doesn't have 'read:users' permission, only show their own stats
    if (!hasReadUsers) {
      data = data.filter((recruiter) => recruiter.id === userId);

      if (data.length === 0) {
        throw new ForbiddenException(
          'Insufficient permissions. You do not have access to recruiter statistics.',
        );
      }
    }

    return {
      success: true,
      data,
      message: 'Recruiter statistics retrieved successfully',
    };
  }

  @Get('performance')
  @ApiOperation({
    summary: 'Get recruiter monthly performance data',
    description: 'Retrieve monthly performance metrics for a specific recruiter.',
  })
  @ApiQuery({
    name: 'recruiterId',
    required: true,
    type: String,
    description: 'Recruiter user ID',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year to get performance data for',
    example: 2024,
  })
  @ApiResponse({
    status: 200,
    description: 'Recruiter performance data retrieved successfully',
  })
  async getRecruiterPerformance(
    @Request() req,
    @Query('recruiterId') recruiterId: string,
    @Query('year') year?: string,
    @Query('filterBy') filterBy?: 'year' | 'month' | 'today' | 'custom',
    @Query('month') month?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<{
    success: boolean;
    data: Array<{
      month: string;
      year: number;
      assigned: number;
      screening: number;
      interview: number;
      selected: number;
      joined: number;
      deployed: number;
      hired: number;
      registered: number;
      documentVerified: number;
      shortlisted: number;
      interviewPassed: number;
    }>;
    message: string;
  }> {
    const userId = req.user.id;
    const hasReadUsers = await this.rbacUtil.hasPermission(userId, [
      'read:users',
    ]);

    // Only allow if user has 'read:users' permission OR they are requesting their own performance
    if (!hasReadUsers && userId !== recruiterId) {
      throw new ForbiddenException(
        'Insufficient permissions. You can only view your own performance data.',
      );
    }

    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const filter = filterBy || 'year';
    const monthNum = month ? parseInt(month, 10) : undefined;

    const data = await this.usersService.getRecruiterPerformance(
      recruiterId,
      yearNum,
      filter,
      monthNum,
      fromDate,
      toDate,
    );
    return {
      success: true,
      data,
      message: 'Recruiter performance data retrieved successfully',
    };
  }
}

