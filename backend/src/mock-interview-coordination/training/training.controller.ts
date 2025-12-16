import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TrainingService } from './training.service';
import { CreateTrainingAssignmentDto } from './dto/create-training.dto';
import { UpdateTrainingAssignmentDto } from './dto/update-training.dto';
import { CompleteTrainingDto } from './dto/complete-training.dto';
import { CreateTrainingSessionDto } from './dto/create-session.dto';
import { CompleteTrainingSessionDto } from './dto/complete-session.dto';
import { QueryTrainingAssignmentsDto } from './dto/query-training.dto';
import { QueryBasicTrainingDto } from './dto/query-basic-training.dto';
import { SendForInterviewDto } from '../../candidate-projects/dto/send-for-interview.dto';
import { Permissions } from '../../auth/rbac/permissions.decorator';

@ApiTags('Training')
@ApiBearerAuth()
@Controller('training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  // ==================== Training Assignments ====================

  @Post('assignments')
  @Permissions('assign:training')
  @ApiOperation({
    summary: 'Create a new training assignment',
    description:
      'Allows Interview Coordinators to assign training to candidates who need improvement',
  })
  @ApiResponse({
    status: 201,
    description: 'Training assignment created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Candidate-project not found' })
  async createAssignment(
    @Body() createDto: CreateTrainingAssignmentDto,
    @Request() req: any,
  ) {
    const data = await this.trainingService.createAssignment(createDto);
    return {
      success: true,
      data,
      message: 'Training assignment created successfully',
    };
  }

  @Get('assignments')
  @Permissions('read:training')
  @ApiOperation({
    summary: 'Get all training assignments',
    description: 'Retrieve training assignments with optional filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Training assignments retrieved successfully',
  })
  async findAllAssignments(@Query() query: QueryTrainingAssignmentsDto) {
    const data = await this.trainingService.findAllAssignments(query);
    return {
      success: true,
      data,
      message: 'Training assignments retrieved successfully',
    };
  }

  @Get('basic-assignments')
  @Permissions('read:training')
  @ApiOperation({
    summary: 'Get all basic training assignments',
    description: 'Retrieve training assignments where trainingType is "basic" and not linked to a mock interview. Supports pagination and search.',
  })
  @ApiResponse({ status: 200, description: 'Basic training assignments retrieved successfully' })
  async findAllBasicAssignments(@Query() query: QueryBasicTrainingDto) {
    const data = await this.trainingService.findAllBasicTrainings(query);
    return {
      success: true,
      data,
      message: 'Basic training assignments retrieved successfully',
    };
  }

  @Get('assignments/:id')
  @Permissions('read:training')
  @ApiOperation({
    summary: 'Get a single training assignment',
    description: 'Retrieve a specific training assignment with full details',
  })
  @ApiParam({ name: 'id', description: 'Training assignment ID' })
  @ApiResponse({
    status: 200,
    description: 'Training assignment retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Training assignment not found' })
  async findOneAssignment(@Param('id') id: string) {
    const data = await this.trainingService.findOneAssignment(id);
    return {
      success: true,
      data,
      message: 'Training assignment retrieved successfully',
    };
  }

  @Patch('assignments/:id')
  @Permissions('write:training')
  @ApiOperation({
    summary: 'Update a training assignment',
    description: 'Update training assignment details',
  })
  @ApiParam({ name: 'id', description: 'Training assignment ID' })
  @ApiResponse({
    status: 200,
    description: 'Training assignment updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Training assignment not found' })
  async updateAssignment(
    @Param('id') id: string,
    @Body() updateDto: UpdateTrainingAssignmentDto,
  ) {
    const data = await this.trainingService.updateAssignment(id, updateDto);
    return {
      success: true,
      data,
      message: 'Training assignment updated successfully',
    };
  }

  @Post('assignments/:id/start')
  @Permissions('write:training')
  @ApiOperation({
    summary: 'Start training',
    description: 'Mark training as started (in_progress)',
  })
  @ApiParam({ name: 'id', description: 'Training assignment ID' })
  @ApiResponse({ status: 200, description: 'Training started successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async startTraining(@Param('id') id: string, @Request() req: any) {
    const data = await this.trainingService.startTraining(id, req.user.userId);
    return {
      success: true,
      data,
      message: 'Training started successfully',
    };
  }

  @Post('assignments/:id/complete')
  @Permissions('complete:training')
  @ApiOperation({
    summary: 'Complete training',
    description: 'Mark training as completed',
  })
  @ApiParam({ name: 'id', description: 'Training assignment ID' })
  @ApiResponse({ status: 200, description: 'Training completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status' })
  async completeTraining(
    @Param('id') id: string,
    @Body() completeDto: CompleteTrainingDto,
    @Request() req: any,
  ) {
    const data = await this.trainingService.completeTraining(
      id,
      completeDto,
      req.user.userId,
    );
    return {
      success: true,
      data,
      message: 'Training completed successfully',
    };
  }

  @Post('assignments/:id/ready-for-reassessment')
  @Permissions('manage:training')
  @ApiOperation({
    summary: 'Mark candidate as ready for reassessment',
    description:
      'After training completion, mark candidate ready for another mock interview',
  })
  @ApiParam({ name: 'id', description: 'Training assignment ID' })
  @ApiResponse({
    status: 200,
    description: 'Candidate marked ready for reassessment',
  })
  @ApiResponse({ status: 400, description: 'Training not completed yet' })
  async markReadyForReassessment(@Param('id') id: string, @Request() req: any) {
    const data = await this.trainingService.markReadyForReassessment(
      id,
      req.user.userId,
    );
    return {
      success: true,
      data,
      message: 'Candidate marked ready for reassessment',
    };
  }

  @Post('send-for-interview')
  @Permissions('manage:candidates', 'schedule:interviews')
  @ApiOperation({
    summary: 'Send candidate for interview (mock or client)',
    description:
      "Creates/updates candidate-project assignment, sets main stage to 'interview' and sub-status to either 'interview_assigned' or 'mock_interview_assigned' depending on type",
  })
  @ApiResponse({ status: 201, description: 'Candidate sent for interview successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async sendForInterview(
    @Body() dto: SendForInterviewDto,
    @Request() req: any,
  ) {
    const data = await this.trainingService.sendForInterview(dto, req.user.sub);
    return {
      success: true,
      data,
      message: 'Candidate sent for interview successfully',
    };
  }

  @Delete('assignments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('manage:training')
  @ApiOperation({
    summary: 'Delete a training assignment',
    description: 'Delete a training assignment and all its sessions',
  })
  @ApiParam({ name: 'id', description: 'Training assignment ID' })
  @ApiResponse({
    status: 204,
    description: 'Training assignment deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Training assignment not found' })
  async removeAssignment(@Param('id') id: string) {
    await this.trainingService.removeAssignment(id);
    return {
      success: true,
      message: 'Training assignment deleted successfully',
    };
  }

  // ==================== Training Sessions ====================

  @Post('sessions')
  @Permissions('write:training')
  @ApiOperation({
    summary: 'Create a training session',
    description: 'Record a new training session for an assignment',
  })
  @ApiResponse({ status: 201, description: 'Training session created' })
  @ApiResponse({ status: 404, description: 'Training assignment not found' })
  async createSession(@Body() createDto: CreateTrainingSessionDto) {
    const data = await this.trainingService.createSession(createDto);
    return {
      success: true,
      data,
      message: 'Training session created successfully',
    };
  }

  @Get('assignments/:id/sessions')
  @Permissions('read:training')
  @ApiOperation({
    summary: 'Get all sessions for a training assignment',
    description: 'Retrieve all training sessions for a specific assignment',
  })
  @ApiParam({ name: 'id', description: 'Training assignment ID' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  async findSessionsByAssignment(@Param('id') id: string) {
    const data = await this.trainingService.findSessionsByAssignment(id);
    return {
      success: true,
      data,
      message: 'Training sessions retrieved successfully',
    };
  }

  @Get('assignments/:candidateProjectMapId/history')
  @Permissions('read:training')
  @ApiOperation({
    summary: 'Get training history for a candidate-project',
    description: 'Retrieve interviewStatusHistory entries with interviewType = "training" for a candidate-project. Supports pagination and optional status filter.',
  })
  @ApiParam({ name: 'candidateProjectMapId', description: 'Candidate-Project map ID' })
  @ApiResponse({ status: 200, description: 'Training history retrieved successfully' })
  async getTrainingHistory(
    @Param('candidateProjectMapId') candidateProjectMapId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    const q = { page: Number(page), limit: Number(limit), status } as any;
    const data = await this.trainingService.getTrainingHistory(candidateProjectMapId, q);
    return {
      success: true,
      data,
      message: 'Training history retrieved successfully',
    };
  }

  @Patch('sessions/:id')
  @Permissions('write:training')
  @ApiOperation({
    summary: 'Update a training session',
    description: 'Update training session details',
  })
  @ApiParam({ name: 'id', description: 'Training session ID' })
  @ApiResponse({ status: 200, description: 'Session updated successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async updateSession(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateTrainingSessionDto>,
  ) {
    const data = await this.trainingService.updateSession(id, updateDto);
    return {
      success: true,
      data,
      message: 'Training session updated successfully',
    };
  }

  @Post('sessions/:id/complete')
  @Permissions('write:training')
  @ApiOperation({
    summary: 'Complete a training session',
    description:
      'Mark a training session as completed with performance feedback',
  })
  @ApiParam({ name: 'id', description: 'Training session ID' })
  @ApiResponse({ status: 200, description: 'Session completed successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 400, description: 'Session already completed' })
  async completeSession(
    @Param('id') id: string,
    @Body() completeDto: CompleteTrainingSessionDto,
  ) {
    const data = await this.trainingService.completeSession(id, completeDto);
    return {
      success: true,
      data,
      message: 'Training session completed successfully',
    };
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('manage:training')
  @ApiOperation({
    summary: 'Delete a training session',
    description: 'Delete a training session record',
  })
  @ApiParam({ name: 'id', description: 'Training session ID' })
  @ApiResponse({ status: 204, description: 'Session deleted successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async removeSession(@Param('id') id: string) {
    await this.trainingService.removeSession(id);
    return {
      success: true,
      message: 'Training session deleted successfully',
    };
  }
}
