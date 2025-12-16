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
} from '@nestjs/swagger';
import { MockInterviewsService } from './mock-interviews.service';
import { CreateMockInterviewDto } from './dto/create-mock-interview.dto';
import { UpdateMockInterviewDto } from './dto/update-mock-interview.dto';
import { CompleteMockInterviewDto } from './dto/complete-mock-interview.dto';
import { QueryMockInterviewsDto } from './dto/query-mock-interviews.dto';
import { QueryAssignedMockInterviewsDto } from './dto/query-assigned-mock-interviews.dto';
import { QueryUpcomingMockInterviewsDto } from './dto/query-upcoming-mock-interviews.dto';
import { UpdateMockInterviewTemplateDto } from './dto/update-mock-interview-template.dto';
import { Permissions } from '../../auth/rbac/permissions.decorator';
import { AssignToMainInterviewDto } from './dto/assign-to-main-interview.dto';

@ApiTags('Mock Interviews')
@ApiBearerAuth()
@Controller('mock-interviews')
export class MockInterviewsController {
  constructor(private readonly mockInterviewsService: MockInterviewsService) {}

  @Post()
  @Permissions('write:mock_interviews')
  @ApiOperation({
    summary: 'Schedule a new mock interview',
    description:
      'Create and schedule a mock interview for a candidate-project. Interview Coordinators and Recruiters can schedule.',
  })
  @ApiResponse({
    status: 201,
    description: 'Mock interview scheduled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate-project or coordinator not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Candidate already has a pending mock interview',
  })
  create(@Body() createDto: CreateMockInterviewDto, @Request() req: any) {
    return this.mockInterviewsService.create(createDto, req.user?.userId ?? null);
  }

  @Get()
  @Permissions('read:mock_interviews')
  @ApiOperation({
    summary: 'Get all mock interviews',
    description:
      'Retrieve all mock interviews with optional filtering by candidate, coordinator, or decision.',
  })
  @ApiResponse({
    status: 200,
    description: 'Mock interviews retrieved successfully',
  })
  findAll(@Query() query: QueryMockInterviewsDto) {
    return this.mockInterviewsService.findAll(query);
  }

  @Get('coordinator/:coordinatorId/stats')
  @Permissions('read:mock_interviews')
  @ApiOperation({
    summary: 'Get coordinator statistics',
    description:
      'Get mock interview statistics for a specific Interview Coordinator.',
  })
  @ApiParam({
    name: 'coordinatorId',
    description: 'Interview Coordinator user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  getCoordinatorStats(@Param('coordinatorId') coordinatorId: string) {
    return this.mockInterviewsService.getCoordinatorStats(coordinatorId);
  }

  @Get('assigned-mock-interviews')
  @Permissions('read:mock_interviews')
  @ApiOperation({
    summary: 'List candidate-project assignments with sub-status mock_interview_assigned ordered by latest assignment',
    description: 'Return candidate-projects that have been assigned to mock interviews (latest assignments first). Supports pagination and optional filters.',
  })
  @ApiResponse({ status: 200, description: 'Assigned mock interview candidate-projects retrieved' })
  getAssignedMock(@Query() query: QueryAssignedMockInterviewsDto) {
    return this.mockInterviewsService.getAssignedCandidateProjects(query);
  }

  @Get('upcoming')
  @Permissions('read:mock_interviews')
  @ApiOperation({
    summary: 'List upcoming mock interviews (scheduled)',
    description:
      'Return mock interviews that are scheduled and upcoming. Ordered by scheduledTime (soonest first). Supports pagination and filters.',
  })
  @ApiResponse({ status: 200, description: 'Upcoming mock interviews retrieved' })
  getUpcoming(@Query() query: QueryUpcomingMockInterviewsDto) {
    return this.mockInterviewsService.getUpcoming(query);
  }

  @Get('candidate-project/:candidateProjectMapId/history')
  @Permissions('read:mock_interviews')
  @ApiOperation({
    summary: 'Get mock interview history for a candidate-project',
    description:
      'Retrieve interview-level history events for mock interviews linked to a candidate-project. Supports pagination via query params page & limit.',
  })
  @ApiParam({ name: 'candidateProjectMapId', description: 'Candidate-Project map ID' })
  @ApiResponse({ status: 200, description: 'Mock interview history retrieved' })
  @ApiResponse({ status: 404, description: 'Candidate-project not found' })
  getMockInterviewHistory(
    @Param('candidateProjectMapId') candidateProjectMapId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const q = { page: Number(page), limit: Number(limit) };
    return this.mockInterviewsService.getMockInterviewHistory(candidateProjectMapId, q);
  }

  @Get(':id')
  @Permissions('read:mock_interviews')
  @ApiOperation({
    summary: 'Get a single mock interview',
    description:
      'Retrieve a specific mock interview with all details including checklist items.',
  })
  @ApiParam({
    name: 'id',
    description: 'Mock Interview ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Mock interview retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Mock interview not found',
  })
  findOne(@Param('id') id: string) {
    return this.mockInterviewsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('write:mock_interviews')
  @ApiOperation({
    summary: 'Update mock interview scheduling details',
    description:
      'Update scheduling details (time, duration, link, mode) for a pending mock interview. Cannot update completed interviews (determined by interview status or decision).',
  })
  @ApiParam({
    name: 'id',
    description: 'Mock Interview ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Mock interview updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot update completed interview',
  })
  @ApiResponse({
    status: 404,
    description: 'Mock interview not found',
  })
  update(@Param('id') id: string, @Body() updateDto: UpdateMockInterviewDto) {
    return this.mockInterviewsService.update(id, updateDto);
  }

  @Post(':id/complete')
  @Permissions('conduct:mock_interviews')
  @ApiOperation({
    summary: 'Complete a mock interview with assessment',
    description:
      'Mark a mock interview as completed and record the assessment results, checklist items, and decision. Interview Coordinators only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Mock Interview ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Mock interview completed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Interview already completed',
  })
  @ApiResponse({
    status: 404,
    description: 'Mock interview not found',
  })
  complete(
    @Param('id') id: string,
    @Body() completeDto: CompleteMockInterviewDto,
    @Request() req: any,
  ) {
    return this.mockInterviewsService.complete(
      id,
      completeDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @Permissions('manage:mock_interviews')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a mock interview',
    description:
      'Delete a pending mock interview. Cannot delete completed interviews. Interview Coordinators only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Mock Interview ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Mock interview deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete completed interview',
  })
  @ApiResponse({
    status: 404,
    description: 'Mock interview not found',
  })
  remove(@Param('id') id: string) {
    return this.mockInterviewsService.remove(id);
  }

  @Patch(':id/template')
  @Permissions('write:mock_interviews')
  @ApiOperation({
    summary: 'Update template for a mock interview',
    description: 'Change or assign a template for an existing mock interview (Interview Coordinators only).',
  })
  @ApiParam({ name: 'id', description: 'Mock Interview ID' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot change template for completed mock interview or template role mismatch' })
  @ApiResponse({ status: 404, description: 'Mock interview or template not found' })
  updateTemplate(@Param('id') id: string, @Body() body: UpdateMockInterviewTemplateDto) {
    return this.mockInterviewsService.updateTemplate(id, body.templateId);
  }

  @Post('assign-to-main-interview')
  @Permissions('manage:candidates', 'schedule:interviews')
  @ApiOperation({
    summary: 'Assign candidate to main interview',
    description:
      "Assign a candidate to the main interview flow (sets main status to 'interview' and sub-status to 'interview_assigned'). This mirrors the candidate-projects send-for-interview API but is available on the Mock Interviews module.",
  })
  @ApiResponse({ status: 201, description: 'Candidate assigned to interview successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Candidate or project not found' })
  assignToMainInterview(@Body() body: AssignToMainInterviewDto, @Request() req: any) {
    return this.mockInterviewsService.assignToMainInterview(body, req.user?.sub ?? req.user?.userId ?? null);
  }
}
