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
import { CandidateProjectsService } from './candidate-projects.service';
import { CreateCandidateProjectDto } from './dto/create-candidate-project.dto';
import { UpdateCandidateProjectDto } from './dto/update-candidate-project.dto';
import { QueryCandidateProjectsDto } from './dto/query-candidate-projects.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { SendForInterviewDto } from './dto/send-for-interview.dto';
import { BulkSendForInterviewDto } from './dto/bulk-send-for-interview.dto';
import { SendToScreeningDto } from './dto/send-to-screening.dto';
import { ApproveForClientInterviewDto } from './dto/approve-for-client-interview.dto';
import { BulkCheckEligibilityDto } from './dto/bulk-check-eligibility.dto';
import { Permissions } from '../auth/rbac/permissions.decorator';

@ApiTags('Candidate Projects')
@ApiBearerAuth()
@Controller('candidate-projects')
export class CandidateProjectsController {
  constructor(
    private readonly candidateProjectsService: CandidateProjectsService,
  ) {}

  @Post('assign')
  @Permissions('manage:projects', 'manage:candidates')
  @ApiOperation({
    summary: 'Assign candidate to project',
    description:
      'Create a new candidate-project assignment with nominated status',
  })
  @ApiResponse({
    status: 201,
    description: 'Candidate successfully assigned to project',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Candidate already assigned to project',
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate, project, role, or recruiter not found',
  })
  async assignCandidateToProject(
    @Body() createDto: CreateCandidateProjectDto,
    @Request() req: any,
  ) {
    const result = await this.candidateProjectsService.assignCandidateToProject(
      createDto,
      req.user.sub,
    );
    return {
      success: true,
      data: result,
      message: 'Candidate successfully assigned to project',
    };
  }

  @Post('send-for-verification')
  @Permissions('manage:projects', 'manage:candidates')
  @ApiOperation({
    summary: 'Send candidate for document verification',
    description:
      'Creates candidate-project assignment (if not exists) and updates status to verification_in_progress',
  })
  @ApiResponse({
    status: 201,
    description: 'Candidate sent for verification successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate or project not found',
  })
  async sendForVerification(
    @Body() dto: CreateCandidateProjectDto,
    @Request() req: any,
  ) {
    const result = await this.candidateProjectsService.sendForVerification(
      dto,
      req.user.sub,
    );
    return {
      success: true,
      data: result,
      message: 'Candidate sent for verification successfully',
    };
  }

  @Post('send-for-screening')
  @Permissions('manage:candidates', 'schedule:screenings')
  @ApiOperation({
    summary: 'Send candidate for screening',
    description:
      'Creates candidate-project assignment (if not exists) and updates status to interview / screening_assigned',
  })
  @ApiResponse({
    status: 201,
    description: 'Candidate sent for screening successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate or project not found',
  })
  async sendForScreening(
    @Body() dto: CreateCandidateProjectDto,
    @Request() req: any,
  ) {
    const result = await this.candidateProjectsService.sendForScreening(
      dto,
      req.user.sub,
    );
    return {
      success: true,
      data: result,
      message: 'Candidate sent for screening successfully',
    };
  }

  @Get()
  @Permissions('read:projects', 'read:candidates')
  @ApiOperation({
    summary: 'Get all candidate-project assignments',
    description:
      'Retrieve paginated list of candidate-project assignments with filters',
  })
  @ApiResponse({
    status: 200,
    description: 'List of candidate-project assignments retrieved successfully',
  })
  async findAll(@Query() queryDto: QueryCandidateProjectsDto) {
    const result = await this.candidateProjectsService.findAll(queryDto);
    return {
      success: true,
      ...result,
    };
  }

  @Get('project/:projectId')
  @Permissions('read:projects')
  @ApiOperation({
    summary: 'Get candidates for a project',
    description: 'Retrieve all candidates assigned to a specific project',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project candidates retrieved successfully',
  })
  async getProjectCandidates(
    @Param('projectId') projectId: string,
    @Query() queryDto: QueryCandidateProjectsDto,
  ) {
    const result = await this.candidateProjectsService.getProjectCandidates(
      projectId,
      queryDto,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get('candidate/:candidateId')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get projects for a candidate',
    description: 'Retrieve all projects a candidate is assigned to',
  })
  @ApiParam({ name: 'candidateId', description: 'Candidate ID' })
  @ApiResponse({
    status: 200,
    description: 'Candidate projects retrieved successfully',
  })
  async getCandidateProjects(
    @Param('candidateId') candidateId: string,
    @Query() queryDto: QueryCandidateProjectsDto,
  ) {
    const result = await this.candidateProjectsService.getCandidateProjects(
      candidateId,
      queryDto,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get('eligibility-check')
  @Permissions('read:projects', 'read:candidates')
  @ApiOperation({
    summary: 'Check candidate eligibility for a project',
    description:
      'Check if a candidate is eligible for a project based on age, gender, and experience requirements.',
  })
  @ApiQuery({ name: 'candidateId', description: 'Candidate ID' })
  @ApiQuery({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Eligibility check completed successfully',
  })
  async checkEligibility(
    @Query('candidateId') candidateId: string,
    @Query('projectId') projectId: string,
  ) {
    const result = await this.candidateProjectsService.checkEligibility(
      candidateId,
      projectId,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post('bulk-eligibility-check')
  @HttpCode(HttpStatus.OK)
  @Permissions('read:projects', 'read:candidates')
  @ApiOperation({
    summary: 'Bulk check candidate eligibility for a project',
    description:
      'Check eligibility for multiple candidates at once. Returns only candidates who are NOT eligible with reasons.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk eligibility check completed successfully',
  })
  async bulkCheckEligibility(@Body() dto: BulkCheckEligibilityDto) {
    const result = await this.candidateProjectsService.checkBulkEligibility(
      dto,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  @Permissions('read:projects', 'read:candidates')
  @ApiOperation({
    summary: 'Get candidate-project assignment details',
    description: 'Retrieve detailed information about a specific assignment',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({
    status: 200,
    description: 'Assignment details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Assignment not found',
  })
  async findOne(@Param('id') id: string) {
    const result = await this.candidateProjectsService.findOne(id);
    return {
      success: true,
      data: result,
    };
  }

  @Get(':id/status-history')
  @Permissions('read:projects', 'read:candidates')
  @ApiOperation({
    summary: 'Get status change history',
    description:
      'Retrieve the complete status change history for an assignment',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({
    status: 200,
    description: 'Status history retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Assignment not found',
  })
  async getStatusHistory(@Param('id') id: string) {
    const result = await this.candidateProjectsService.getStatusHistory(id);
    return {
      success: true,
      data: result,
    };
  }

  @Patch(':id')
  @Permissions('manage:projects', 'manage:candidates')
  @ApiOperation({
    summary: 'Update candidate-project assignment',
    description: 'Update assignment details like role or recruiter',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({
    status: 200,
    description: 'Assignment updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Assignment not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCandidateProjectDto,
    @Request() req: any,
  ) {
    const result = await this.candidateProjectsService.update(
      id,
      updateDto,
      req.user.sub,
    );
    return {
      success: true,
      data: result,
      message: 'Assignment updated successfully',
    };
  }

  @Patch(':id/status')
  @Permissions('manage:projects', 'manage:candidates')
  @ApiOperation({
    summary: 'Update project status',
    description: 'Change the project status of a candidate assignment',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Assignment or status not found',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateProjectStatusDto,
    @Request() req: any,
  ) {
    const result = await this.candidateProjectsService.updateStatus(
      id,
      updateStatusDto,
      req.user.sub,
    );
    return {
      success: true,
      data: result,
      message: 'Status updated successfully',
    };
  }

  @Delete(':id')
  @Permissions('manage:projects', 'manage:candidates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove candidate from project',
    description: 'Delete a candidate-project assignment',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({
    status: 200,
    description: 'Assignment deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Assignment not found',
  })
  async remove(@Param('id') id: string) {
    const result = await this.candidateProjectsService.remove(id);
    return {
      success: true,
      message: result.message,
    };
  }

/*
  @Post(':id/send-to-screening')
  @Permissions('manage:candidates', 'schedule:screenings')
  @ApiOperation({
    summary: 'Send candidate to screening',
    description:
      'Assigns a candidate to a screening with a selected Interview Coordinator. Creates a screening record and notifies the coordinator.',
  })
  @ApiParam({ name: 'id', description: 'Candidate-Project Map ID' })
  @ApiResponse({
    status: 201,
    description: 'Candidate sent to screening successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input or status' })
  @ApiResponse({
    status: 404,
    description: 'Candidate-project or coordinator not found',
  })
  async sendToScreening(
    @Param('id') id: string,
    @Body() dto: SendToScreeningDto,
    @Request() req: any,
  ) {
    const data = await this.candidateProjectsService.sendToScreening(
      id,
      dto.coordinatorId,
      req.user.userId,
      dto.scheduledTime,
      dto.meetingLink,
    );
    return {
      success: true,
      data,
      message: 'Candidate sent to screening successfully',
    };
  }
*/

  @Post(':id/approve-for-client-interview')
  @Permissions('approve:candidates')
  @ApiOperation({
    summary: 'Approve candidate for client interview (skip screening interview)',
    description:
      'Directly approve a candidate for client interview without conducting a screening interview. Can only be done from documents_verified status.',
  })
  @ApiParam({ name: 'id', description: 'Candidate-Project Map ID' })
  @ApiResponse({
    status: 200,
    description: 'Candidate approved for client interview',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition',
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate-project not found',
  })
  async approveForClientInterview(
    @Param('id') id: string,
    @Body() dto: ApproveForClientInterviewDto,
    @Request() req: any,
  ) {
    const data = await this.candidateProjectsService.approveForClientInterview(
      id,
      req.user.userId,
      dto.notes,
    );
    return {
      success: true,
      data,
      message: 'Candidate approved for client interview',
    };
  }

  @Post('send-for-interview')
  @Permissions('manage:candidates', 'schedule:interviews')
  @ApiOperation({
    summary: 'Send candidate for interview (screening or client)',
    description:
      "Creates/updates candidate-project assignment, sets main stage to 'interview' and sub-status to either 'interview_assigned' or 'screening_assigned' depending on type",
  })
  @ApiResponse({ status: 201, description: 'Candidate sent for interview successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async sendForInterview(@Body() dto: SendForInterviewDto, @Request() req: any) {
    const data = await this.candidateProjectsService.sendForInterview(
      dto,
      req.user.sub,
    );

    return {
      success: true,
      data,
      message: 'Candidate sent for interview successfully',
    };
  }

  @Post('bulk-send-for-interview')
  @Permissions('manage:candidates', 'schedule:interviews')
  @ApiOperation({
    summary: 'Bulk send candidates for interview (screening or client)',
    description:
      "Bulk version of send-for-interview. Creates/updates candidate-project assignments for multiple candidates.",
  })
  @ApiResponse({ status: 200, description: 'Bulk operation completed' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async bulkSendForInterview(@Body() dto: BulkSendForInterviewDto, @Request() req: any) {
    const result = await this.candidateProjectsService.bulkSendForInterview(
      dto,
      req.user.sub,
    );

    return {
      success: true,
      data: result,
      message: 'Bulk interview assignment completed',
    };
  }
}
