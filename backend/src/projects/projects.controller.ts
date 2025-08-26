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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { AssignCandidateDto } from './dto/assign-candidate.dto';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { ProjectWithRelations, PaginatedProjects, ProjectStats } from './types';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Permissions('manage:projects')
  @ApiOperation({
    summary: 'Create a new project',
    description:
      'Create a new project with client relationship, team assignment, and role requirements.',
  })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'project123' },
            title: { type: 'string', example: 'Emergency Department Staffing' },
            description: {
              type: 'string',
              example: 'Staffing for emergency department',
            },
            status: { type: 'string', example: 'active' },
            deadline: { type: 'string', format: 'date-time' },
            client: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                type: { type: 'string' },
              },
            },
            creator: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
              },
            },
            team: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
            rolesNeeded: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  designation: { type: 'string' },
                  quantity: { type: 'number' },
                  priority: { type: 'string' },
                },
              },
            },
          },
        },
        message: { type: 'string', example: 'Project created successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Client or team not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @Request() req,
  ): Promise<{
    success: boolean;
    data: ProjectWithRelations;
    message: string;
  }> {
    const project = await this.projectsService.create(
      createProjectDto,
      req.user.id,
    );
    return {
      success: true,
      data: project,
      message: 'Project created successfully',
    };
  }

  @Get()
  @Permissions('read:projects')
  @ApiOperation({
    summary: 'Get all projects with pagination and filtering',
    description:
      'Retrieve a paginated list of projects with optional search, filtering, and sorting.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for project title or description',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by project status',
    enum: ['active', 'completed', 'cancelled'],
  })
  @ApiQuery({
    name: 'clientId',
    required: false,
    description: 'Filter by client ID',
  })
  @ApiQuery({
    name: 'teamId',
    required: false,
    description: 'Filter by team ID',
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
    description: 'Projects retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            projects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string' },
                  deadline: { type: 'string', format: 'date-time' },
                  client: { type: 'object' },
                  creator: { type: 'object' },
                  team: { type: 'object' },
                  rolesNeeded: { type: 'array' },
                  candidateProjects: { type: 'array' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
        message: { type: 'string', example: 'Projects retrieved successfully' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findAll(@Query() query: QueryProjectsDto): Promise<{
    success: boolean;
    data: PaginatedProjects;
    message: string;
  }> {
    const result = await this.projectsService.findAll(query);
    return {
      success: true,
      data: result,
      message: 'Projects retrieved successfully',
    };
  }

  @Get('stats')
  @Permissions('read:projects')
  @ApiOperation({
    summary: 'Get project statistics',
    description:
      'Retrieve comprehensive statistics about projects including counts, status breakdown, and upcoming deadlines.',
  })
  @ApiResponse({
    status: 200,
    description: 'Project statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            totalProjects: { type: 'number', example: 150 },
            activeProjects: { type: 'number', example: 100 },
            completedProjects: { type: 'number', example: 40 },
            cancelledProjects: { type: 'number', example: 10 },
            projectsByStatus: {
              type: 'object',
              properties: {
                active: { type: 'number' },
                completed: { type: 'number' },
                cancelled: { type: 'number' },
              },
            },
            projectsByClient: {
              type: 'object',
              additionalProperties: { type: 'number' },
            },
            upcomingDeadlines: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
        message: {
          type: 'string',
          example: 'Project statistics retrieved successfully',
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
    data: ProjectStats;
    message: string;
  }> {
    const stats = await this.projectsService.getProjectStats();
    return {
      success: true,
      data: stats,
      message: 'Project statistics retrieved successfully',
    };
  }

  @Get(':id')
  @Permissions('read:projects')
  @ApiOperation({
    summary: 'Get project by ID',
    description:
      'Retrieve a specific project with all related data including client, team, roles needed, and assigned candidates.',
  })
  @ApiParam({ name: 'id', description: 'Project ID', example: 'project123' })
  @ApiResponse({
    status: 200,
    description: 'Project retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string' },
            deadline: { type: 'string', format: 'date-time' },
            client: { type: 'object' },
            creator: { type: 'object' },
            team: { type: 'object' },
            rolesNeeded: { type: 'array' },
            candidateProjects: { type: 'array' },
          },
        },
        message: { type: 'string', example: 'Project retrieved successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not Found - Project not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findOne(@Param('id') id: string): Promise<{
    success: boolean;
    data: ProjectWithRelations;
    message: string;
  }> {
    const project = await this.projectsService.findOne(id);
    return {
      success: true,
      data: project,
      message: 'Project retrieved successfully',
    };
  }

  @Patch(':id')
  @Permissions('manage:projects')
  @ApiOperation({
    summary: 'Update project',
    description:
      'Update a project with new information. All fields are optional for partial updates.',
  })
  @ApiParam({ name: 'id', description: 'Project ID', example: 'project123' })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string' },
            deadline: { type: 'string', format: 'date-time' },
            client: { type: 'object' },
            creator: { type: 'object' },
            team: { type: 'object' },
            rolesNeeded: { type: 'array' },
            candidateProjects: { type: 'array' },
          },
        },
        message: { type: 'string', example: 'Project updated successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({ status: 404, description: 'Not Found - Project not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req,
  ): Promise<{
    success: boolean;
    data: ProjectWithRelations;
    message: string;
  }> {
    const project = await this.projectsService.update(
      id,
      updateProjectDto,
      req.user.id,
    );
    return {
      success: true,
      data: project,
      message: 'Project updated successfully',
    };
  }

  @Delete(':id')
  @Permissions('manage:projects')
  @ApiOperation({
    summary: 'Delete project',
    description:
      'Delete a project. Cannot delete projects with assigned candidates.',
  })
  @ApiParam({ name: 'id', description: 'Project ID', example: 'project123' })
  @ApiResponse({
    status: 200,
    description: 'Project deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            message: { type: 'string' },
          },
        },
        message: { type: 'string', example: 'Project deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Project has assigned candidates',
  })
  @ApiResponse({ status: 404, description: 'Not Found - Project not found' })
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
    const result = await this.projectsService.remove(id, req.user.id);
    return {
      success: true,
      data: result,
      message: 'Project deleted successfully',
    };
  }

  @Get(':id/candidates')
  @Permissions('read:projects')
  @ApiOperation({
    summary: 'Get project candidates',
    description: 'Retrieve all candidates assigned to a specific project.',
  })
  @ApiParam({ name: 'id', description: 'Project ID', example: 'project123' })
  @ApiResponse({
    status: 200,
    description: 'Project candidates retrieved successfully',
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
              candidate: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  contact: { type: 'string' },
                  email: { type: 'string' },
                  currentStatus: { type: 'string' },
                  experience: { type: 'number' },
                  skills: { type: 'array' },
                  expectedSalary: { type: 'number' },
                },
              },
              assignedDate: { type: 'string', format: 'date-time' },
              verified: { type: 'boolean' },
              shortlisted: { type: 'boolean' },
              selected: { type: 'boolean' },
              notes: { type: 'string' },
            },
          },
        },
        message: {
          type: 'string',
          example: 'Project candidates retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not Found - Project not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getProjectCandidates(@Param('id') id: string): Promise<{
    success: boolean;
    data: any[];
    message: string;
  }> {
    const candidates = await this.projectsService.getProjectCandidates(id);
    return {
      success: true,
      data: candidates,
      message: 'Project candidates retrieved successfully',
    };
  }

  @Post(':id/assign-candidate')
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:projects')
  @ApiOperation({
    summary: 'Assign candidate to project',
    description:
      'Assign a candidate to a specific project with optional notes.',
  })
  @ApiParam({ name: 'id', description: 'Project ID', example: 'project123' })
  @ApiResponse({
    status: 200,
    description: 'Candidate assigned successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            assignment: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                candidateId: { type: 'string' },
                projectId: { type: 'string' },
                assignedDate: { type: 'string', format: 'date-time' },
                notes: { type: 'string' },
                candidate: { type: 'object' },
                project: { type: 'object' },
              },
            },
          },
        },
        message: { type: 'string', example: 'Candidate assigned successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Project or candidate not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Candidate already assigned',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async assignCandidate(
    @Param('id') id: string,
    @Body() assignCandidateDto: AssignCandidateDto,
    @Request() req,
  ): Promise<{
    success: boolean;
    data: { message: string; assignment: any };
    message: string;
  }> {
    const result = await this.projectsService.assignCandidate(
      id,
      assignCandidateDto,
      req.user.id,
    );
    return {
      success: true,
      data: result,
      message: 'Candidate assigned successfully',
    };
  }
}
