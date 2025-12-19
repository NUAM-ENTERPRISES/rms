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
import { ScreeningsService } from './screenings.service';
import { CreateScreeningDto } from './dto/create-screening.dto';
import { UpdateScreeningDto } from './dto/update-screening.dto';
import { CompleteScreeningDto } from './dto/complete-screening.dto';
import { QueryScreeningsDto } from './dto/query-screenings.dto';
import { QueryAssignedScreeningsDto } from './dto/query-assigned-screenings.dto';
import { QueryUpcomingScreeningsDto } from './dto/query-upcoming-screenings.dto';
import { UpdateScreeningTemplateDto } from './dto/update-screening-template.dto';
import { Permissions } from '../../auth/rbac/permissions.decorator';
import { AssignToMainInterviewDto } from './dto/assign-to-main-interview.dto';

@ApiTags('Screenings')
@ApiBearerAuth()
@Controller('screenings')
export class ScreeningsController {
  constructor(private readonly screeningsService: ScreeningsService) {}

  @Post()
  @Permissions('write:screenings')
  @ApiOperation({
    summary: 'Schedule a new screening',
    description:
      'Create and schedule a screening for a candidate-project. Interview Coordinators and Recruiters can schedule.',
  })
  @ApiResponse({
    status: 201,
    description: 'Screening scheduled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate-project or coordinator not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Candidate already has a pending screening',
  })
  create(@Body() createDto: CreateScreeningDto, @Request() req: any) {
    return this.screeningsService.create(createDto, req.user?.userId ?? null);
  }

  @Get()
  @Permissions('read:screenings')
  @ApiOperation({
    summary: 'Get all screenings',
    description:
      'Retrieve all screenings with optional filtering by candidate, coordinator, or decision.',
  })
  @ApiResponse({
    status: 200,
    description: 'Screenings retrieved successfully',
  })
  findAll(@Query() query: QueryScreeningsDto) {
    return this.screeningsService.findAll(query);
  }

  @Get('coordinator/:coordinatorId/stats')
  @Permissions('read:screenings')
  @ApiOperation({
    summary: 'Get coordinator statistics',
    description:
      'Get screening statistics for a specific Interview Coordinator.',
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
    return this.screeningsService.getCoordinatorStats(coordinatorId);
  }

  @Get('assigned-screenings')
  @Permissions('read:screenings')
  @ApiOperation({
    summary: 'List candidate-project assignments with sub-status screening_assigned ordered by latest assignment',
    description: 'Return candidate-projects that have been assigned to screenings (latest assignments first). Supports pagination and optional filters.',
  })
  @ApiResponse({ status: 200, description: 'Assigned screening candidate-projects retrieved' })
  getAssignedScreenings(@Query() query: QueryAssignedScreeningsDto) {
    return this.screeningsService.getAssignedCandidateProjects(query);
  }

  @Get('upcoming')
  @Permissions('read:screenings')
  @ApiOperation({
    summary: 'List upcoming screenings (scheduled)',
    description:
      'Return screenings that are scheduled and upcoming. Ordered by scheduledTime (soonest first). Supports pagination and filters.',
  })
  @ApiResponse({ status: 200, description: 'Upcoming screenings retrieved' })
  getUpcoming(@Query() query: QueryUpcomingScreeningsDto) {
    return this.screeningsService.getUpcoming(query);
  }

  @Get('candidate-project/:candidateProjectMapId/history')
  @Permissions('read:screenings')
  @ApiOperation({
    summary: 'Get screening history for a candidate-project',
    description:
      'Retrieve interview-level history events for screenings linked to a candidate-project. Supports pagination via query params page & limit.',
  })
  @ApiParam({ name: 'candidateProjectMapId', description: 'Candidate-Project map ID' })
  @ApiResponse({ status: 200, description: 'Screening history retrieved' })
  @ApiResponse({ status: 404, description: 'Candidate-project not found' })
  getScreeningHistory(
    @Param('candidateProjectMapId') candidateProjectMapId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const q = { page: Number(page), limit: Number(limit) };
    return this.screeningsService.getScreeningHistory(candidateProjectMapId, q);
  }

  @Get(':id')
  @Permissions('read:screenings')
  @ApiOperation({
    summary: 'Get a single screening',
    description:
      'Retrieve a specific screening with all details including checklist items.',
  })
  @ApiParam({
    name: 'id',
    description: 'Screening ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Screening retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Screening not found',
  })
  findOne(@Param('id') id: string) {
    return this.screeningsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('write:screenings')
  @ApiOperation({
    summary: 'Update screening scheduling details',
    description:
      'Update scheduling details (time, duration, link, mode) for a pending screening. Cannot update completed screenings (determined by interview status or decision).',
  })
  @ApiParam({
    name: 'id',
    description: 'Screening ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Screening updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot update completed screening',
  })
  @ApiResponse({
    status: 404,
    description: 'Screening not found',
  })
  update(@Param('id') id: string, @Body() updateDto: UpdateScreeningDto) {
    return this.screeningsService.update(id, updateDto);
  }

  @Post(':id/complete')
  @Permissions('conduct:screenings')
  @ApiOperation({
    summary: 'Complete a screening with assessment',
    description:
      'Mark a screening as completed and record the assessment results, checklist items, and decision. Interview Coordinators only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Screening ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Screening completed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Screening already completed',
  })
  @ApiResponse({
    status: 404,
    description: 'Screening not found',
  })
  complete(
    @Param('id') id: string,
    @Body() completeDto: CompleteScreeningDto,
    @Request() req: any,
  ) {
    return this.screeningsService.complete(
      id,
      completeDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @Permissions('manage:screenings')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a screening',
    description:
      'Delete a pending screening. Cannot delete completed screenings. Interview Coordinators only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Screening ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Screening deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete completed screening',
  })
  @ApiResponse({
    status: 404,
    description: 'Screening not found',
  })
  remove(@Param('id') id: string) {
    return this.screeningsService.remove(id);
  }

  @Patch(':id/template')
  @Permissions('write:screenings')
  @ApiOperation({
    summary: 'Update template for a screening',
    description: 'Change or assign a template for an existing screening (Interview Coordinators only).',
  })
  @ApiParam({ name: 'id', description: 'Screening ID' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot change template for completed screening or template role mismatch' })
  @ApiResponse({ status: 404, description: 'Screening or template not found' })
  updateTemplate(@Param('id') id: string, @Body() body: UpdateScreeningTemplateDto) {
    return this.screeningsService.updateTemplate(id, body.templateId);
  }

  @Post('assign-to-main-interview')
  @Permissions('manage:candidates', 'schedule:interviews')
  @ApiOperation({
    summary: 'Assign candidate to main interview',
    description:
      "Assign a candidate to the main interview flow (sets main status to 'interview' and sub-status to 'interview_assigned'). This mirrors the candidate-projects send-for-interview API but is available on the Screenings module.",
  })
  @ApiResponse({ status: 201, description: 'Candidate assigned to interview successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Candidate or project not found' })
  assignToMainInterview(@Body() body: AssignToMainInterviewDto, @Request() req: any) {
    return this.screeningsService.assignToMainInterview(body, req.user?.sub ?? req.user?.userId ?? null);
  }
}
