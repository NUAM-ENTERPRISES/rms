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
import { NominateCandidateDto } from './dto/nominate-candidate.dto';
import { ApproveCandidateDto } from './dto/approve-candidate.dto';
import { SendForVerificationDto } from './dto/send-for-verification.dto';
import { UpdateCandidateStatusDto } from './dto/update-candidate-status.dto';
import { AssignRecruiterDto } from './dto/assign-recruiter.dto';
import { RnrCreAssignmentService } from './services/rnr-cre-assignment.service';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import {
  CandidateWithRelations,
  PaginatedCandidates,
  CandidateStats,
} from './types';

@ApiTags('Candidates')
@ApiBearerAuth()
@Controller('candidates')
export class CandidatesController {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly rnrCreAssignmentService: RnrCreAssignmentService,
  ) {}

  @Post()
  @Permissions('write:candidates')
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
            currentStatusId: { type: 'number', example: 1 },
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

  @Get('my-assigned')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get candidates assigned to logged-in CRE user',
    description:
      'Retrieve all candidates that are currently assigned to the logged-in CRE user. This is specifically for CRE dashboard.',
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
    name: 'search',
    required: false,
    description: 'Search by candidate name, email, or mobile',
  })
  @ApiQuery({
    name: 'currentStatus',
    required: false,
    description: 'Filter by candidate status (e.g., RNR)',
  })
  @ApiResponse({
    status: 200,
    description: 'CRE assigned candidates retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getMyCREAssignedCandidates(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('currentStatus') currentStatus?: string,
  ): Promise<{
    success: boolean;
    data: {
      candidates: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
    message: string;
  }> {
    const userId = req.user.id; // Get logged-in CRE user ID
    
    const result = await this.candidatesService.getCREAssignedCandidates(
      userId,
      {
        page: Number(page),
        limit: Number(limit),
        search,
        currentStatus,
      },
    );

    return {
      success: true,
      data: result,
      message: 'CRE assigned candidates retrieved successfully',
    };
  }

  @Get('status-config')
  @Public()
  @ApiOperation({
    summary: 'Get candidate status configuration',
    description:
      'Get the configuration for all candidate statuses including labels, descriptions, colors, and priorities',
  })
  @ApiResponse({
    status: 200,
    description: 'Status configuration retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              description: { type: 'string' },
              color: { type: 'string' },
              badgeClass: { type: 'string' },
              icon: { type: 'string' },
              priority: { type: 'string' },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async getStatusConfig() {
    const { CANDIDATE_STATUS_CONFIG } = await import(
      '../common/constants/statuses.js'
    );
    return {
      success: true,
      data: CANDIDATE_STATUS_CONFIG,
      message: 'Status configuration retrieved successfully',
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
  @Permissions('write:candidates')
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
  @Permissions('write:candidates')
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

  @Post(':id/nominate')
  @Permissions('nominate:candidates')
  @ApiOperation({
    summary: 'Nominate candidate for a project',
    description:
      'Nominate a candidate for a specific project. This starts the document verification workflow.',
  })
  @ApiParam({
    name: 'id',
    description: 'Candidate ID',
    example: 'cand_123abc',
  })
  @ApiResponse({
    status: 201,
    description: 'Candidate nominated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate or Project not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Candidate already nominated for this project',
  })
  async nominateCandidate(
    @Param('id') id: string,
    @Body() nominateDto: NominateCandidateDto,
    @Request() req,
  ) {
    const nomination = await this.candidatesService.nominateCandidate(
      id,
      nominateDto,
      req.user.sub,
    );
    return {
      success: true,
      data: nomination,
      message: 'Candidate nominated for project successfully',
    };
  }

  @Post('project-mapping/:id/approve')
  @Permissions('approve:candidates')
  @ApiOperation({
    summary: 'Approve or reject candidate after document verification',
    description:
      'Approve or reject a candidate for a project after all documents are verified.',
  })
  @ApiParam({
    name: 'id',
    description: 'Candidate Project Map ID',
    example: 'cpm_123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate approved/rejected successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Documents not verified or invalid status',
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate project mapping not found',
  })
  async approveOrRejectCandidate(
    @Param('id') id: string,
    @Body() approveDto: ApproveCandidateDto,
    @Request() req,
  ) {
    const result = await this.candidatesService.approveOrRejectCandidate(
      id,
      approveDto,
      req.user.sub,
    );
    return {
      success: true,
      data: result,
      message: `Candidate ${approveDto.action === 'approve' ? 'approved' : 'rejected'} successfully`,
    };
  }

  @Post('send-for-verification')
  @Permissions('write:candidates')
  @ApiOperation({
    summary: 'Send candidate for document verification',
    description:
      'Send a nominated candidate for document verification. Assigns to document executive with least tasks.',
  })
  @ApiResponse({
    status: 201,
    description: 'Candidate sent for verification successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            assignedTo: { type: 'string' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async sendForVerification(
    @Body() sendForVerificationDto: SendForVerificationDto,
    @Request() req,
  ) {
    const result = await this.candidatesService.sendForVerification(
      sendForVerificationDto,
      req.user.sub,
    );
    return {
      success: true,
      data: result,
      message: 'Candidate sent for verification successfully',
    };
  }

  @Patch(':id/status')
  @Permissions('write:candidates')
  @ApiOperation({
    summary: 'Update candidate status',
    description:
      'Update the current status of a candidate (untouched, interested, not_interested, etc.)',
  })
  @ApiParam({
    name: 'id',
    description: 'Candidate ID',
    example: 'clx1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate status updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate not found',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateCandidateStatusDto,
    @Request() req: any,
  ) {
    const result = await this.candidatesService.updateStatus(
      id,
      updateStatusDto,
      req.user.sub,
    );
    return {
      success: true,
      data: result,
      message: 'Candidate status updated successfully',
    };
  }

  @Post(':id/assign-recruiter')
  @Permissions('write:candidates')
  @ApiOperation({
    summary: 'Assign recruiter to candidate',
    description:
      'Assign a recruiter to handle a candidate and track assignment history',
  })
  @ApiParam({
    name: 'id',
    description: 'Candidate ID',
    example: 'clx1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Recruiter assigned successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate or recruiter not found',
  })
  async assignRecruiter(
    @Param('id') id: string,
    @Body() assignRecruiterDto: AssignRecruiterDto,
    @Request() req: any,
  ) {
    const result = await this.candidatesService.assignRecruiter(
      id,
      assignRecruiterDto,
      req.user.sub,
    );
    return {
      success: true,
      data: result,
      message: 'Recruiter assigned successfully',
    };
  }

  @Get(':id/recruiter-assignment')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get current recruiter assignment',
    description: 'Get the current active recruiter assignment for a candidate',
  })
  @ApiParam({
    name: 'id',
    description: 'Candidate ID',
    example: 'clx1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Current recruiter assignment retrieved successfully',
  })
  async getCurrentRecruiterAssignment(@Param('id') id: string) {
    const assignment =
      await this.candidatesService.getCurrentRecruiterAssignment(id);
    return {
      success: true,
      data: assignment,
      message: 'Current recruiter assignment retrieved successfully',
    };
  }

  @Get(':id/recruiter-assignment-history')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get recruiter assignment history',
    description:
      'Get the complete history of recruiter assignments for a candidate',
  })
  @ApiParam({
    name: 'id',
    description: 'Candidate ID',
    example: 'clx1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Recruiter assignment history retrieved successfully',
  })
  async getRecruiterAssignmentHistory(@Param('id') id: string) {
    const history =
      await this.candidatesService.getRecruiterAssignmentHistory(id);
    return {
      success: true,
      data: history,
      message: 'Recruiter assignment history retrieved successfully',
    };
  }

  @Post('rnr-cre-assignment/trigger')
  @Permissions('manage:candidates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually trigger RNR → CRE assignment',
    description:
      'Manually trigger the assignment of CREs to RNR candidates who have been in RNR status for 3+ days',
  })
  @ApiResponse({
    status: 200,
    description: 'RNR → CRE assignment triggered successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            processed: { type: 'number' },
            assigned: { type: 'number' },
            errors: { type: 'number' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async triggerRnrCreAssignment() {
    const results =
      await this.rnrCreAssignmentService.triggerRnrCreAssignment();
    return {
      success: true,
      data: results,
      message: `RNR → CRE assignment completed. Processed: ${results.processed}, Assigned: ${results.assigned}, Errors: ${results.errors}`,
    };
  }

  @Get('rnr-cre-assignment/statistics')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get RNR CRE assignment statistics',
    description: 'Get statistics about RNR candidates and CRE assignments',
  })
  @ApiResponse({
    status: 200,
    description: 'RNR CRE assignment statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            totalRnrCandidates: { type: 'number' },
            candidatesNeedingCre: { type: 'number' },
            candidatesWithCre: { type: 'number' },
            averageDaysInRnr: { type: 'number' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async getRnrStatistics() {
    const statistics = await this.rnrCreAssignmentService.getRnrStatistics();
    return {
      success: true,
      data: statistics,
      message: 'RNR CRE assignment statistics retrieved successfully',
    };
  }
}
