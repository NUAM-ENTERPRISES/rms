import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ProcessingService } from './processing.service';
import { TransferToProcessingDto } from './dto/transfer-to-processing.dto';
import { UpdateProcessingStepDto } from './dto/update-processing-step.dto';
import { QueryCandidatesToTransferDto } from './dto/query-candidates-to-transfer.dto';
import { QueryAllProcessingCandidatesDto } from './dto/query-all-processing-candidates.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/rbac/permissions.guard';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('Processing Department')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('processing')
export class ProcessingController {
  constructor(private readonly processingService: ProcessingService) {}

  @Get('candidates-to-transfer')
  @Permissions(PERMISSIONS.READ_PROCESSING, PERMISSIONS.TRANSFER_TO_PROCESSING)
  @ApiOperation({
    summary: 'Get candidates who passed interview and are ready for processing',
    description: 'Retrieve a paginated list of interviews with outcome "passed" that can be transferred to the processing department.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search by candidate name or project title' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'roleNeededId', required: false })
  @ApiQuery({ name: 'roleCatalogId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['all', 'transferred', 'pending'], description: 'Filter by transfer status', example: 'all' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Candidates ready for transfer retrieved successfully',
  })
  async getCandidatesToTransfer(@Query() query: QueryCandidatesToTransferDto) {
    const data = await this.processingService.getCandidatesToTransfer(query);
    return {
      success: true,
      data,
      message: 'Candidates ready for transfer retrieved successfully',
    };
  }

  @Get('all-candidates')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({
    summary: 'Get all processing candidates with search, filter, and pagination',
    description: 'Retrieve a paginated list of all candidates currently in processing with various filters.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Processing candidates retrieved successfully',
  })
  async getAllProcessingCandidates(@Query() query: QueryAllProcessingCandidatesDto) {
    const data = await this.processingService.getAllProcessingCandidates(query);
    return {
      success: true,
      data,
      message: 'Processing candidates retrieved successfully',
    };
  }

  @Get('candidate-processing-details/:processingId')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({
    summary: 'Get comprehensive processing details for a candidate by processing ID',
    description: 'Retrieve all details including candidate info, project info, role info, document verifications, and processing history.',
  })
  @ApiParam({ name: 'processingId', type: 'string', description: 'The ID of the processing candidate record' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Processing details retrieved successfully',
  })
  async getProcessingDetailsById(@Param('processingId') processingId: string) {
    const data = await this.processingService.getProcessingDetailsById(processingId);
    return {
      success: true,
      data,
      message: 'Processing details retrieved successfully',
    };
  }

  @Get('candidate-history/:candidateId/:projectId/:roleCatalogId')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({
    summary: 'Get processing history for a specific candidate nomination',
    description: 'Retrieve all historical status changes and notes for a candidate in a specific project/role.',
  })
  @ApiParam({ name: 'candidateId', type: 'string' })
  @ApiParam({ name: 'projectId', type: 'string' })
  @ApiParam({ name: 'roleCatalogId', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Processing history retrieved successfully',
  })
  async getProcessingHistory(
    @Param('candidateId') candidateId: string,
    @Param('projectId') projectId: string,
    @Param('roleCatalogId') roleCatalogId: string,
  ) {
    const data = await this.processingService.getProcessingHistory(
      candidateId,
      projectId,
      roleCatalogId,
    );
    return {
      success: true,
      data,
      message: 'Processing history retrieved successfully',
    };
  }

  @Get('project/:projectId')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({
    summary: 'Get processing candidates for a specific project',
    description: 'Retrieve a paginated list of candidates currently in processing for a specific project.',
  })
  @ApiParam({ name: 'projectId', type: 'string' })
  @ApiQuery({ name: 'status', required: false, enum: ['assigned', 'in_progress', 'completed', 'cancelled', 'all'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getProcessingCandidatesByProject(
    @Param('projectId') projectId: string,
    @Query() query: any,
  ) {
    const data = await this.processingService.getProcessingCandidatesByProject(
      projectId,
      query,
    );
    return {
      success: true,
      data,
      message: 'Processing candidates retrieved successfully',
    };
  }

  @Post('transfer-to-processing')
  @Permissions(PERMISSIONS.TRANSFER_TO_PROCESSING)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transfer candidates to processing team',
    description: 'Transfer one or more candidates to a specific processing team member for documentation handling.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Candidates transferred successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            transferredCount: { type: 'number', example: 1 },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  candidateId: { type: 'string', example: 'cand_123' },
                  processingCandidateId: { type: 'string', example: 'proc_456' },
                  status: { type: 'string', example: 'success' },
                },
              },
            },
          },
        },
        message: { type: 'string', example: 'Candidates transferred to processing team successfully' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or status configuration missing',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project, role, or processing user not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Insufficient permissions',
  })
  async transferToProcessing(
    @Body() dto: TransferToProcessingDto,
    @Req() req: any,
  ) {
    const data = await this.processingService.transferToProcessing(
      dto,
      req.user.id,
    );
    return {
      success: true,
      data,
      message: 'Candidates transferred to processing team successfully',
    };
  }

  @Get('steps/:processingId')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({ summary: 'Get processing steps for a candidate', description: 'List steps for a processing candidate' })
  async getStepsForProcessingCandidate(@Param('processingId') processingId: string) {
    const data = await this.processingService.getProcessingSteps(processingId);
    return { success: true, data, message: 'Processing steps retrieved' };
  }

  @Post('steps/:stepId/status')
  @Permissions(PERMISSIONS.WRITE_PROCESSING)
  @ApiOperation({ summary: 'Update a processing step status' })
  async updateStepStatus(@Param('stepId') stepId: string, @Body() body: UpdateProcessingStepDto, @Req() req: any) {
    const data = await this.processingService.updateProcessingStep(stepId, body, req.user.id);
    return { success: true, data, message: 'Processing step updated' };
  }
}
