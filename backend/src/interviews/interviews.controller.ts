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
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { QueryInterviewsDto } from './dto/query-interviews.dto';
import { QueryAssignedInterviewsDto } from './dto/query-assigned-interviews.dto';
import { QueryUpcomingInterviewsDto } from './dto/query-upcoming-interviews.dto';
import { UpdateInterviewStatusDto } from './dto/update-interview-status.dto';
import { Permissions } from '../auth/rbac/permissions.decorator';

@ApiTags('Interviews')
@ApiBearerAuth()
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) { }

  @Post()
  @Permissions('schedule:interviews')
  @ApiOperation({
    summary: 'Schedule a new interview',
    description: 'Schedule an interview tied to a candidate-project mapping. Requires `candidateProjectMapId` and `scheduledTime`.',
  })
  @ApiResponse({
    status: 201,
    description: 'Interview scheduled successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            scheduledTime: { type: 'string', format: 'date-time' },
            duration: { type: 'number' },
            type: { type: 'string' },
            mode: { type: 'string' },
            meetingLink: { type: 'string' },
            // Example value shown when meetingLink is present
            // (optional; generated automatically for video mode if not provided)
            interviewer: { type: 'string' },
            interviewerEmail: { type: 'string' },
            candidateProjectMapId: { type: 'string' },
          },
        },
        message: {
          type: 'string',
          example: 'Interview scheduled successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createInterviewDto: CreateInterviewDto,
    @Request() req,
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const interview = await this.interviewsService.create(
      createInterviewDto,
      req.user.id,
    );

    return {
      success: true,
      data: interview,
      message: 'Interview scheduled successfully',
    };
  }

  @Get()
  @Permissions('read:interviews')
  @ApiOperation({
    summary: 'Get all interviews with pagination and filtering',
    description:
      'Retrieve a paginated list of interviews with optional search, filtering, and sorting.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for candidate name or project title',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by interview type',
    enum: ['technical', 'hr', 'managerial', 'final'],
  })
  @ApiQuery({
    name: 'mode',
    required: false,
    description: 'Filter by interview mode',
    enum: ['video', 'phone', 'in-person'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: "Filter by interview status — matches the interview's `outcome` column only. Examples: 'pending' (no outcome yet), 'scheduled', 'completed', 'passed', 'failed'",
    enum: ['pending', 'scheduled', 'completed', 'complete', 'cancelled', 'rescheduled', 'passed', 'failed', 'no-show'],
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter by project ID',
  })
  @ApiQuery({
    name: 'candidateId',
    required: false,
    description: 'Filter by candidate ID',
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
    description: 'Interviews retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            interviews: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  scheduledTime: { type: 'string', format: 'date-time' },
                  duration: { type: 'number' },
                  type: { type: 'string' },
                  mode: { type: 'string' },
                  meetingLink: { type: 'string' },
                  // Example meeting link (optional)
                  // meetingLink: { type: 'string', example: 'https://meet.affiniks.com/abc123' },
                  interviewer: { type: 'string' },
                  interviewerEmail: { type: 'string' },
                  expired: { type: 'boolean' },
                  outcome: { type: 'string' },
                  notes: { type: 'string' },
                  candidateProjectMap: {
                    type: 'object',
                    properties: {
                      candidate: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          email: { type: 'string' },
                        },
                      },
                      project: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          title: { type: 'string' },
                        },
                      },
                      roleNeeded: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          designation: { type: 'string' },
                        },
                      },
                    },
                  },
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
          example: 'Interviews retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() query: QueryInterviewsDto): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const result = await this.interviewsService.findAll(query);

    return {
      success: true,
      data: result,
      message: 'Interviews retrieved successfully',
    };
  }

  @Get('assigned-interviews')
  @Permissions('read:interviews')
  @ApiOperation({
    summary: 'List candidate-project assignments with sub-status interview_assigned ordered by latest assignment',
    description: 'Return candidate-projects that have been assigned to client interviews (latest assignments first). Supports pagination and optional filters.',
  })
  @ApiResponse({ status: 200, description: 'Assigned interview retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter by project ID' })
  @ApiQuery({ name: 'candidateId', required: false, description: 'Filter by candidate ID' })
  @ApiQuery({ name: 'recruiterId', required: false, description: 'Filter by recruiter/assignee ID' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term: candidate name/email/project title/role designation' })
  @ApiQuery({ name: 'subStatus', required: false, description: "Sub-status to filter by (defaults to 'interview_assigned')" })
  @ApiQuery({ name: 'includeScheduled', required: false, description: 'Include sub-status interview_scheduled as well (boolean)', example: false })
  async getAssigned(@Query() query: QueryAssignedInterviewsDto): Promise<any> {
    const assignedInterview = await this.interviewsService.getAssignedCandidateProjects(query);

    return {
      success: true,
      data: assignedInterview,
      message: 'Assigned interview retrieved successfully',
    };
  }

  @Get('upcoming')
  @Permissions('read:interviews')
  @ApiOperation({
    summary: "Get upcoming client interviews (substatus 'interview_scheduled')",
    description: 'Return interviews that are scheduled and upcoming (candidate-project subStatus of interview_scheduled). Supports pagination, search, roleNeeded filter, and date range filters.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter by project ID' })
  @ApiQuery({ name: 'candidateId', required: false, description: 'Filter by candidate ID' })
  @ApiQuery({ name: 'recruiterId', required: false, description: 'Filter by recruiter/assignee ID' })
  @ApiQuery({ name: 'roleNeeded', required: false, description: 'Filter by role needed designation or id' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term: candidate name/email/project title/role designation' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (inclusive) ISO format to filter scheduledTime' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (inclusive) ISO format to filter scheduledTime' })
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
            interviews: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  scheduledTime: { type: 'string', format: 'date-time' },
                  duration: { type: 'number' },
                  type: { type: 'string' },
                  mode: { type: 'string' },
                  meetingLink: { type: 'string' },
                  interviewer: { type: 'string' },
                  interviewerEmail: { type: 'string' },
                  outcome: { type: 'string' },
                  notes: { type: 'string' },
                  candidateProjectMap: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      candidate: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          firstName: { type: 'string' },
                          lastName: { type: 'string' },
                          email: { type: 'string' },
                        },
                      },
                      project: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          title: { type: 'string' },
                        },
                      },
                      roleNeeded: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          designation: { type: 'string' },
                        },
                      },
                      recruiter: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          email: { type: 'string' },
                        },
                      },
                      mainStatus: { type: 'object' },
                      subStatus: { type: 'object' },
                    },
                  },
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
        message: { type: 'string', example: 'Upcoming interviews retrieved successfully' },
      },
    },
  })
  async getUpcoming(@Query() query: QueryUpcomingInterviewsDto): Promise<any> {
    const upcoming = await this.interviewsService.getUpcomingInterviews(query);

    return {
      success: true,
      data: upcoming,
      message: "Upcoming interviews retrieved successfully",
    };
  }

  @Patch(':id/status')
  @Permissions('write:interviews')
  @ApiOperation({
    summary: 'Update interview status and candidate-project subStatus',
    description: 'Update interview outcome, create InterviewStatusHistory and optionally update the candidate-project subStatus and create CandidateProjectStatusHistory.',
  })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiBody({ type: UpdateInterviewStatusDto })
  @ApiQuery({ name: 'reason', required: false, description: 'Reason for status change (in body as well)' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 200, description: 'Interview status updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateInterviewStatusDto,
    @Request() req,
  ): Promise<any> {
    const updated = await this.interviewsService.updateInterviewStatus(id, body, req.user?.id);
    return {
      success: true,
      data: updated,
      message: 'Interview status updated successfully',
    };
  }

  @Get(':id')
  @Permissions('read:interviews')
  @ApiOperation({
    summary: 'Get interview by ID',
    description: 'Retrieve a specific interview with all related data.',
  })
  @ApiQuery({ name: 'includeHistory', required: false, description: 'If true, include interview history in the response (boolean)' })
  @ApiParam({
    name: 'id',
    description: 'Interview ID',
    example: 'interview123',
  })
  @ApiResponse({
    status: 200,
    description: 'Interview retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Not Found - Interview not found' })
  async findOne(@Param('id') id: string, @Query('includeHistory') includeHistory?: string): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const interview = await this.interviewsService.findOne(id);
    if (includeHistory && includeHistory !== 'false') {
      const history = await this.interviewsService.getInterviewHistory(id);
      // attach history to the returned interview object under `history`
      (interview as any).history = history;
    }
    return {
      success: true,
      data: interview,
      message: 'Interview retrieved successfully',
    };
  }

  @Get(':id/history')
  @Permissions('read:interviews')
  @ApiOperation({
    summary: 'Get interview history',
    description: 'Retrieve history events for a specific client interview (status changes, reasons, actor, timestamps).',
  })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiResponse({ status: 200, description: 'Interview history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  async getHistory(@Param('id') id: string): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const history = await this.interviewsService.getInterviewHistory(id);

    return {
      success: true,
      data: history,
      message: 'Interview history retrieved successfully',
    };
  }

  @Patch(':id')
  @Permissions('write:interviews')
  @ApiOperation({
    summary: 'Update interview',
    description: 'Update interview details.',
  })
  @ApiParam({
    name: 'id',
    description: 'Interview ID',
    example: 'interview123',
  })
  @ApiResponse({
    status: 200,
    description: 'Interview updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Not Found - Interview not found' })
  async update(
    @Param('id') id: string,
    @Body() updateInterviewDto: UpdateInterviewDto,
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const interview = await this.interviewsService.update(
      id,
      updateInterviewDto,
    );
    return {
      success: true,
      data: interview,
      message: 'Interview updated successfully',
    };
  }

  @Delete(':id')
  @Permissions('write:interviews')
  @ApiOperation({
    summary: 'Cancel interview',
    description: 'Cancel a scheduled interview.',
  })
  @ApiParam({
    name: 'id',
    description: 'Interview ID',
    example: 'interview123',
  })
  @ApiResponse({
    status: 200,
    description: 'Interview cancelled successfully',
  })
  @ApiResponse({ status: 404, description: 'Not Found - Interview not found' })
  async remove(@Param('id') id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.interviewsService.remove(id);
    return {
      success: true,
      message: 'Interview cancelled successfully',
    };
  }
}
