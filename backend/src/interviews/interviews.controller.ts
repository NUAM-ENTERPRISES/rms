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
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { QueryInterviewsDto } from './dto/query-interviews.dto';
import { Permissions } from '../auth/rbac/permissions.decorator';

@ApiTags('Interviews')
@ApiBearerAuth()
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post()
  @Permissions('schedule:interviews')
  @ApiOperation({
    summary: 'Schedule a new interview',
    description: 'Schedule an interview for a candidate-project combination.',
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
    description: 'Filter by interview status',
    enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
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
                  interviewer: { type: 'string' },
                  interviewerEmail: { type: 'string' },
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

  @Get(':id')
  @Permissions('read:interviews')
  @ApiOperation({
    summary: 'Get interview by ID',
    description: 'Retrieve a specific interview with all related data.',
  })
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
  async findOne(@Param('id') id: string): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const interview = await this.interviewsService.findOne(id);
    return {
      success: true,
      data: interview,
      message: 'Interview retrieved successfully',
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
