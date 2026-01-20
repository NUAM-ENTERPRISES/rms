import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Permissions } from '../auth/rbac/permissions.decorator';

@ApiTags('Recruiters')
@ApiBearerAuth()
@Controller('recruiters')
export class RecruitersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('stats')
  @Permissions('read:users')
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
  async getRecruiterStats(@Query('year') year?: string): Promise<{
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
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const data = await this.usersService.getRecruiterStats(yearNum);
    return {
      success: true,
      data,
      message: 'Recruiter statistics retrieved successfully',
    };
  }

  @Get('performance')
  @Permissions('read:users')
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
    @Query('recruiterId') recruiterId: string,
    @Query('year') year?: string,
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
    }>;
    message: string;
  }> {
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const data = await this.usersService.getRecruiterPerformance(
      recruiterId,
      yearNum,
    );
    return {
      success: true,
      data,
      message: 'Recruiter performance data retrieved successfully',
    };
  }
}

