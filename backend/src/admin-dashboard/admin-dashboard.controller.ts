import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminDashboardService } from './admin-dashboard.service';
import { Permissions } from '../auth/rbac/permissions.decorator';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('stats')
  @Permissions('read:admin-dashboard')
  @ApiOperation({
    summary: 'Get admin dashboard stats',
    description:
      'Total candidates, active clients, open jobs (active projects), and placed candidates (hired/deployed).',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard stats retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            totalCandidates: { type: 'number', example: 256 },
            activeClients: { type: 'number', example: 17 },
            openJobs: { type: 'number', example: 85 },
            candidatesPlaced: { type: 'number', example: 110 },
          },
        },
        message: { type: 'string', example: 'Admin dashboard stats retrieved successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getStats() {
    return this.adminDashboardService.getDashboardStats();
  }

  @Get('hiring-trend')
  @Permissions('read:admin-dashboard')
  @ApiOperation({
    summary: 'Get hiring trend data',
    description: 'Get candidate placement count (hired + deployed) by daily, monthly, and yearly buckets.',
  })
  @ApiResponse({
    status: 200,
    description: 'Hiring trend data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            daily: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  period: { type: 'string', example: 'Mon' },
                  placed: { type: 'number', example: 3 },
                },
              },
            },
            monthly: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  period: { type: 'string', example: 'Jan' },
                  placed: { type: 'number', example: 12 },
                },
              },
            },
            yearly: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  period: { type: 'string', example: '2025' },
                  placed: { type: 'number', example: 210 },
                },
              },
            },
          },
        },
        message: { type: 'string', example: 'Hiring trend data retrieved successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getHiringTrend() {
    return this.adminDashboardService.getHiringTrend();
  }

  @Get('top-recruiter-stats')
  @Permissions('read:admin-dashboard')
  @ApiOperation({
    summary: 'Get top recruiter statistics',
    description: 'Get top recruiter, placements, and activity metrics for a time period.',
  })
  @ApiResponse({
    status: 200,
    description: 'Top recruiter stats retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            topRecruiter: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Emma' },
                role: { type: 'string', example: 'Senior IT Recruiter' },
                placementsThisMonth: { type: 'number', example: 4 },
                email: { type: 'string', example: 'emma@example.com' },
                phone: { type: 'string', example: '+912345678901' },
                avatarUrl: { type: 'string', example: 'https://example.com/avatar.png' },
              },
            },
            recruiterActivities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  activity: { type: 'string', example: 'Projects Assigned' },
                  value: { type: 'number', example: 20 },
                },
              },
            },
          },
        },
        message: { type: 'string', example: 'Top recruiter stats retrieved successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getTopRecruiterStats(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    const monthNum = month ? parseInt(month, 10) : undefined;
    return this.adminDashboardService.getTopRecruiterStats(yearNum, monthNum);
  }
}

