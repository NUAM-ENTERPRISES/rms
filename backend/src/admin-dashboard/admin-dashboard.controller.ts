import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
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

  @Get('project-role-hiring-status')
  @Permissions('read:admin-dashboard')
  @ApiOperation({
    summary: 'Get project role hiring status',
    description:
      'Get project roles with required and filled counts aggregated by hired/deployed status with pagination and search',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Optional project ID to filter by project',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by project name',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Project role hiring status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            projectRoles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  projectId: { type: 'string', example: 'proj-1' },
                  projectName: { type: 'string', example: 'Aster Hospital' },
                  roles: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        role: { type: 'string', example: 'ICU Nurse' },
                        required: { type: 'number', example: 5 },
                        filled: { type: 'number', example: 3 },
                      },
                    },
                  },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 50 },
                totalPages: { type: 'number', example: 5 },
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
              },
            },
          },
        },
        message: { type: 'string', example: 'Project role hiring status retrieved successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getProjectRoleHiringStatus(
    @Query('projectId') projectId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminDashboardService.getProjectRoleHiringStatus({
      projectId,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });
  }
  @Get('upcoming-interviews')
  @Permissions('read:admin-dashboard')
  @ApiOperation({
    summary: 'Get upcoming interviews (interview_scheduled)',
    description:
      'Get interviews that are scheduled (subStatus=interview_scheduled) with time and candidate breakdown for the dashboard.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Upcoming interviews retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            chartData: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  day: { type: 'string', example: 'Mon' },
                  interviews: { type: 'number', example: 3 },
                },
              },
            },
            interviews: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  day: { type: 'string', example: 'Mon' },
                  candidate: { type: 'string', example: 'Rahul Kumar' },
                  project: { type: 'string', example: 'Aster Hospital' },
                  role: { type: 'string', example: 'ICU Nurse' },
                  recruiter: { type: 'string', example: 'John Mathew' },
                  time: { type: 'string', example: '10:30 AM' },
                  status: { type: 'string', example: 'Scheduled' },
                  scheduledTime: { type: 'string', example: '2026-04-10T10:30:00.000Z' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 15 },
                totalPages: { type: 'number', example: 2 },
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
              },
            },
          },
        },
        message: { type: 'string', example: 'Upcoming interviews retrieved successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getUpcomingInterviews(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 10;
    return this.adminDashboardService.getUpcomingInterviews(pageNum, limitNum);
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

