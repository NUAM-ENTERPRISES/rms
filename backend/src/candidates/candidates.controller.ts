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
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { QueryCandidatesDto } from './dto/query-candidates.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { Permissions } from '../auth/rbac/permissions.decorator';
import {
  CandidateWithRelations,
  PaginatedCandidates,
  CandidateStats,
} from './types';

@ApiTags('Candidates')
@ApiBearerAuth()
@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post()
  @Permissions('manage:candidates')
  @ApiOperation({
    summary: 'Create a new candidate',
    description:
      'Create a new candidate with personal information, skills, and team assignment.',
  })
  @ApiResponse({
    status: 201,
    description: 'Candidate created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'candidate123' },
            name: { type: 'string', example: 'John Doe' },
            contact: { type: 'string', example: '+1234567890' },
            email: { type: 'string', example: 'john.doe@example.com' },
            currentStatus: { type: 'string', example: 'new' },
            experience: { type: 'number', example: 5 },
            skills: { type: 'array', items: { type: 'string' } },
            expectedSalary: { type: 'number', example: 50000 },
            recruiter: {
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
            projects: { type: 'array' },
          },
        },
        message: { type: 'string', example: 'Candidate created successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({ status: 404, description: 'Not Found - Team not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Contact already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async create(
    @Body() createCandidateDto: CreateCandidateDto,
    @Request() req,
  ): Promise<{
    success: boolean;
    data: CandidateWithRelations;
    message: string;
  }> {
    const candidate = await this.candidatesService.create(
      createCandidateDto,
      req.user.id,
    );
    return {
      success: true,
      data: candidate,
      message: 'Candidate created successfully',
    };
  }

  @Get()
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get all candidates with pagination and filtering',
    description:
      'Retrieve a paginated list of candidates with optional search, filtering, and sorting.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for candidate name, contact, or email',
  })
  @ApiQuery({
    name: 'currentStatus',
    required: false,
    description: 'Filter by candidate status',
    enum: ['new', 'shortlisted', 'selected', 'rejected', 'hired'],
  })
  @ApiQuery({
    name: 'source',
    required: false,
    description: 'Filter by source',
    enum: ['manual', 'meta', 'referral'],
  })
  @ApiQuery({
    name: 'teamId',
    required: false,
    description: 'Filter by team ID',
  })
  @ApiQuery({
    name: 'assignedTo',
    required: false,
    description: 'Filter by assigned recruiter ID',
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
    description: 'Candidates retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            candidates: {
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
                  skills: { type: 'array' },
                  expectedSalary: { type: 'number' },
                  recruiter: { type: 'object' },
                  team: { type: 'object' },
                  projects: { type: 'array' },
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
        message: {
          type: 'string',
          example: 'Candidates retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findAll(@Query() query: QueryCandidatesDto): Promise<{
    success: boolean;
    data: PaginatedCandidates;
    message: string;
  }> {
    const result = await this.candidatesService.findAll(query);
    return {
      success: true,
      data: result,
      message: 'Candidates retrieved successfully',
    };
  }

  @Get('stats')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get candidate statistics',
    description:
      'Retrieve comprehensive statistics about candidates including counts, status breakdown, and averages.',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            totalCandidates: { type: 'number', example: 150 },
            newCandidates: { type: 'number', example: 50 },
            shortlistedCandidates: { type: 'number', example: 30 },
            selectedCandidates: { type: 'number', example: 20 },
            rejectedCandidates: { type: 'number', example: 30 },
            hiredCandidates: { type: 'number', example: 20 },
            candidatesByStatus: {
              type: 'object',
              properties: {
                new: { type: 'number' },
                shortlisted: { type: 'number' },
                selected: { type: 'number' },
                rejected: { type: 'number' },
                hired: { type: 'number' },
              },
            },
            candidatesBySource: {
              type: 'object',
              properties: {
                manual: { type: 'number' },
                meta: { type: 'number' },
                referral: { type: 'number' },
              },
            },
            candidatesByTeam: {
              type: 'object',
              additionalProperties: { type: 'number' },
            },
            averageExperience: { type: 'number', example: 5.2 },
            averageExpectedSalary: { type: 'number', example: 45000 },
          },
        },
        message: {
          type: 'string',
          example: 'Candidate statistics retrieved successfully',
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
    data: CandidateStats;
    message: string;
  }> {
    const stats = await this.candidatesService.getCandidateStats();
    return {
      success: true,
      data: stats,
      message: 'Candidate statistics retrieved successfully',
    };
  }

  @Get(':id')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get candidate by ID',
    description:
      'Retrieve a specific candidate with all related data including recruiter, team, and project assignments.',
  })
  @ApiParam({
    name: 'id',
    description: 'Candidate ID',
    example: 'candidate123',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
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
            recruiter: { type: 'object' },
            team: { type: 'object' },
            projects: { type: 'array' },
          },
        },
        message: {
          type: 'string',
          example: 'Candidate retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not Found - Candidate not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findOne(@Param('id') id: string): Promise<{
    success: boolean;
    data: CandidateWithRelations;
    message: string;
  }> {
    const candidate = await this.candidatesService.findOne(id);
    return {
      success: true,
      data: candidate,
      message: 'Candidate retrieved successfully',
    };
  }

  @Patch(':id')
  @Permissions('manage:candidates')
  @ApiOperation({
    summary: 'Update candidate',
    description:
      'Update a candidate with new information. All fields are optional for partial updates.',
  })
  @ApiParam({
    name: 'id',
    description: 'Candidate ID',
    example: 'candidate123',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
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
            recruiter: { type: 'object' },
            team: { type: 'object' },
            projects: { type: 'array' },
          },
        },
        message: { type: 'string', example: 'Candidate updated successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({ status: 404, description: 'Not Found - Candidate not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Contact already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async update(
    @Param('id') id: string,
    @Body() updateCandidateDto: UpdateCandidateDto,
    @Request() req,
  ): Promise<{
    success: boolean;
    data: CandidateWithRelations;
    message: string;
  }> {
    const candidate = await this.candidatesService.update(
      id,
      updateCandidateDto,
      req.user.id,
    );
    return {
      success: true,
      data: candidate,
      message: 'Candidate updated successfully',
    };
  }

  @Delete(':id')
  @Permissions('manage:candidates')
  @ApiOperation({
    summary: 'Delete candidate',
    description:
      'Delete a candidate. Cannot delete candidates with project assignments.',
  })
  @ApiParam({
    name: 'id',
    description: 'Candidate ID',
    example: 'candidate123',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate deleted successfully',
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
        message: { type: 'string', example: 'Candidate deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Candidate has project assignments',
  })
  @ApiResponse({ status: 404, description: 'Not Found - Candidate not found' })
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
    const result = await this.candidatesService.remove(id, req.user.id);
    return {
      success: true,
      data: result,
      message: 'Candidate deleted successfully',
    };
  }

  @Get(':id/projects')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get candidate projects',
    description: 'Retrieve all projects assigned to a specific candidate.',
  })
  @ApiParam({
    name: 'id',
    description: 'Candidate ID',
    example: 'candidate123',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate projects retrieved successfully',
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
              project: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  status: { type: 'string' },
                  client: { type: 'object' },
                  team: { type: 'object' },
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
          example: 'Candidate projects retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not Found - Candidate not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getCandidateProjects(@Param('id') id: string): Promise<{
    success: boolean;
    data: any[];
    message: string;
  }> {
    const projects = await this.candidatesService.getCandidateProjects(id);
    return {
      success: true,
      data: projects,
      message: 'Candidate projects retrieved successfully',
    };
  }

  @Post(':id/assign-project')
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:candidates')
  @ApiOperation({
    summary: 'Assign candidate to project',
    description:
      'Assign a candidate to a specific project with optional notes.',
  })
  @ApiParam({
    name: 'id',
    description: 'Candidate ID',
    example: 'candidate123',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate assigned to project successfully',
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
        message: {
          type: 'string',
          example: 'Candidate assigned to project successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Candidate or project not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Candidate already assigned to project',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async assignProject(
    @Param('id') id: string,
    @Body() assignProjectDto: AssignProjectDto,
    @Request() req,
  ): Promise<{
    success: boolean;
    data: { message: string; assignment: any };
    message: string;
  }> {
    const result = await this.candidatesService.assignProject(
      id,
      assignProjectDto,
      req.user.id,
    );
    return {
      success: true,
      data: result,
      message: 'Candidate assigned to project successfully',
    };
  }
}
