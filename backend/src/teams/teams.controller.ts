import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { QueryTeamsDto } from './dto/query-teams.dto';
import { AssignUserDto } from './dto/assign-user.dto';
import { TeamWithRelations, PaginatedTeams, TeamStats } from './types';

@ApiTags('Teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @Permissions('manage:teams')
  @ApiOperation({
    summary: 'Create a new team',
    description:
      'Create a new team with leadership positions and member assignments.',
  })
  @ApiResponse({
    status: 201,
    description: 'Team created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/TeamWithRelations' },
        message: { type: 'string', example: 'Team created successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Team name already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async create(
    @Body() createTeamDto: CreateTeamDto,
    @Request() req,
  ): Promise<{ success: boolean; data: TeamWithRelations; message: string }> {
    const team = await this.teamsService.create(createTeamDto, req.user.id);
    return { success: true, data: team, message: 'Team created successfully' };
  }

  @Get()
  @Permissions('read:teams')
  @ApiOperation({
    summary: 'Get all teams with pagination and filtering',
    description:
      'Retrieve teams with optional filtering by search, leadership, and pagination.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for team name',
  })
  @ApiQuery({
    name: 'leadId',
    required: false,
    description: 'Filter by team lead ID',
  })
  @ApiQuery({
    name: 'headId',
    required: false,
    description: 'Filter by team head ID',
  })
  @ApiQuery({
    name: 'managerId',
    required: false,
    description: 'Filter by team manager ID',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID (teams that include this user)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort field',
    enum: ['name', 'createdAt', 'updatedAt'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    enum: ['asc', 'desc'],
  })
  @ApiResponse({
    status: 200,
    description: 'Teams retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/PaginatedTeams' },
        message: { type: 'string', example: 'Teams retrieved successfully' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findAll(
    @Query() queryDto: QueryTeamsDto,
  ): Promise<{ success: boolean; data: PaginatedTeams; message: string }> {
    const teams = await this.teamsService.findAll(queryDto);
    return {
      success: true,
      data: teams,
      message: 'Teams retrieved successfully',
    };
  }

  @Get('stats')
  @Permissions('read:teams')
  @ApiOperation({
    summary: 'Get team statistics',
    description:
      'Retrieve comprehensive statistics about teams, members, and performance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Team statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/TeamStats' },
        message: {
          type: 'string',
          example: 'Team statistics retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getStats(): Promise<{
    success: boolean;
    data: TeamStats;
    message: string;
  }> {
    const stats = await this.teamsService.getTeamStats();
    return {
      success: true,
      data: stats,
      message: 'Team statistics retrieved successfully',
    };
  }

  @Get(':id')
  @Permissions('read:teams')
  @ApiOperation({
    summary: 'Get team by ID',
    description:
      'Retrieve a specific team with all its relations including members, projects, and candidates.',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team123' })
  @ApiResponse({
    status: 200,
    description: 'Team retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/TeamWithRelations' },
        message: { type: 'string', example: 'Team retrieved successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not Found - Team not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findOne(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: TeamWithRelations; message: string }> {
    const team = await this.teamsService.findOne(id);
    return {
      success: true,
      data: team,
      message: 'Team retrieved successfully',
    };
  }

  @Patch(':id')
  @Permissions('manage:teams')
  @ApiOperation({
    summary: 'Update team',
    description:
      'Update team information including name and leadership positions.',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team123' })
  @ApiResponse({
    status: 200,
    description: 'Team updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/TeamWithRelations' },
        message: { type: 'string', example: 'Team updated successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({ status: 404, description: 'Not Found - Team not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Team name already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async update(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
    @Request() req,
  ): Promise<{ success: boolean; data: TeamWithRelations; message: string }> {
    const team = await this.teamsService.update(id, updateTeamDto, req.user.id);
    return { success: true, data: team, message: 'Team updated successfully' };
  }

  @Delete(':id')
  @Permissions('manage:teams')
  @ApiOperation({
    summary: 'Delete team',
    description:
      'Delete a team. Cannot delete teams with assigned projects or candidates.',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team123' })
  @ApiResponse({
    status: 200,
    description: 'Team deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'team123' },
            message: { type: 'string', example: 'Team deleted successfully' },
          },
        },
        message: { type: 'string', example: 'Team deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not Found - Team not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Team has projects or candidates',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async remove(
    @Param('id') id: string,
    @Request() req,
  ): Promise<{
    success: boolean;
    data: { id: string; message: string };
    message: string;
  }> {
    const result = await this.teamsService.remove(id, req.user.id);
    return {
      success: true,
      data: result,
      message: 'Team deleted successfully',
    };
  }

  @Get(':id/members')
  @Permissions('read:teams')
  @ApiOperation({
    summary: 'Get team members',
    description: 'Retrieve all members of a specific team.',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team123' })
  @ApiResponse({
    status: 200,
    description: 'Team members retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  dateOfBirth: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
        message: {
          type: 'string',
          example: 'Team members retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not Found - Team not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getTeamMembers(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: any[]; message: string }> {
    const members = await this.teamsService.getTeamMembers(id);
    return {
      success: true,
      data: members,
      message: 'Team members retrieved successfully',
    };
  }

  @Post(':id/assign-user')
  @Permissions('manage:teams')
  @ApiOperation({
    summary: 'Assign user to team',
    description:
      'Assign a user to a team. User must not already be assigned to this team.',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team123' })
  @ApiResponse({
    status: 201,
    description: 'User assigned to team successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'User assigned to team successfully',
            },
          },
        },
        message: {
          type: 'string',
          example: 'User assigned to team successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Team or user not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - User already assigned to team',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async assignUser(
    @Param('id') id: string,
    @Body() assignUserDto: AssignUserDto,
    @Request() req,
  ): Promise<{ success: boolean; data: { message: string }; message: string }> {
    const result = await this.teamsService.assignUser(
      id,
      assignUserDto,
      req.user.id,
    );
    return {
      success: true,
      data: result,
      message: 'User assigned to team successfully',
    };
  }

  @Delete(':id/remove-user/:userId')
  @Permissions('manage:teams')
  @ApiOperation({
    summary: 'Remove user from team',
    description: 'Remove a user from a team.',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team123' })
  @ApiParam({
    name: 'userId',
    description: 'User ID to remove',
    example: 'user123',
  })
  @ApiResponse({
    status: 200,
    description: 'User removed from team successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'User removed from team successfully',
            },
          },
        },
        message: {
          type: 'string',
          example: 'User removed from team successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Team or user not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async removeUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req,
  ): Promise<{ success: boolean; data: { message: string }; message: string }> {
    const result = await this.teamsService.removeUser(id, userId, req.user.id);
    return {
      success: true,
      data: result,
      message: 'User removed from team successfully',
    };
  }

  @Get(':id/projects')
  @Permissions('read:teams')
  @ApiOperation({
    summary: 'Get team projects',
    description: 'Retrieve all projects assigned to team members.',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team123' })
  @ApiResponse({
    status: 200,
    description: 'Team projects retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              status: {
                type: 'string',
                enum: ['active', 'completed', 'cancelled'],
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'urgent'],
              },
              deadline: { type: 'string' },
              client: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string' },
                },
              },
              candidatesAssigned: { type: 'number' },
              rolesNeeded: { type: 'number' },
              progress: { type: 'number' },
            },
          },
        },
        message: {
          type: 'string',
          example: 'Team projects retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not Found - Team not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getTeamProjects(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: any[]; message: string }> {
    const projects = await this.teamsService.getTeamProjects(id);
    return {
      success: true,
      data: projects,
      message: 'Team projects retrieved successfully',
    };
  }

  @Get(':id/candidates')
  @Permissions('read:teams')
  @ApiOperation({
    summary: 'Get team candidates',
    description:
      'Retrieve candidates assigned to projects worked on by team members.',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team123' })
  @ApiResponse({
    status: 200,
    description: 'Team candidates retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              contact: { type: 'string' },
              email: { type: 'string' },
              currentStatus: { type: 'string' },
              experience: { type: 'number' },
              skills: { type: 'array', items: { type: 'string' } },
              assignedProject: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  client: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
              assignedBy: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                },
              },
              lastActivity: { type: 'string' },
              nextInterview: { type: 'string' },
            },
          },
        },
        message: {
          type: 'string',
          example: 'Team candidates retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not Found - Team not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getTeamCandidates(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: any[]; message: string }> {
    const candidates = await this.teamsService.getTeamCandidates(id);
    return {
      success: true,
      data: candidates,
      message: 'Team candidates retrieved successfully',
    };
  }

  @Get(':id/stats')
  @Permissions('read:teams')
  @ApiOperation({
    summary: 'Get team statistics',
    description: 'Retrieve comprehensive statistics for a specific team.',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team123' })
  @ApiResponse({
    status: 200,
    description: 'Team statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            totalMembers: { type: 'number' },
            activeProjects: { type: 'number' },
            totalCandidates: { type: 'number' },
            averageSuccessRate: { type: 'number' },
            totalRevenue: { type: 'number' },
            monthlyGrowth: { type: 'number' },
            completionRate: { type: 'number' },
            totalProjects: { type: 'number' },
            completedProjects: { type: 'number' },
          },
        },
        message: {
          type: 'string',
          example: 'Team statistics retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not Found - Team not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getTeamStats(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: any; message: string }> {
    const stats = await this.teamsService.getTeamStatsById(id);
    return {
      success: true,
      data: stats,
      message: 'Team statistics retrieved successfully',
    };
  }

  @Get(':id/analytics/performance')
  @Permissions('read:teams')
  @ApiOperation({
    summary: 'Get team performance analytics',
    description: 'Retrieve monthly performance data for charts and analytics.',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team123' })
  @ApiResponse({
    status: 200,
    description: 'Team performance analytics retrieved successfully',
  })
  async getTeamPerformanceAnalytics(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: any; message: string }> {
    const analytics = await this.teamsService.getTeamPerformanceAnalytics(id);
    return {
      success: true,
      data: analytics,
      message: 'Team performance analytics retrieved successfully',
    };
  }

  @Get(':id/analytics/success-rate')
  @Permissions('read:teams')
  @ApiOperation({
    summary: 'Get team success rate distribution',
    description: 'Retrieve success rate distribution data for pie charts.',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team123' })
  @ApiResponse({
    status: 200,
    description: 'Team success rate distribution retrieved successfully',
  })
  async getTeamSuccessRateDistribution(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: any; message: string }> {
    const distribution =
      await this.teamsService.getTeamSuccessRateDistribution(id);
    return {
      success: true,
      data: distribution,
      message: 'Team success rate distribution retrieved successfully',
    };
  }
}
