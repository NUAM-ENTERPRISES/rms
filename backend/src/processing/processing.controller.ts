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
  ApiBody,
} from '@nestjs/swagger';
import { CompleteProcessingStepDto } from './dto/complete-processing-step.dto';
import { ProcessingService } from './processing.service';
import { TransferToProcessingDto } from './dto/transfer-to-processing.dto';
import { UpdateProcessingStepDto } from './dto/update-processing-step.dto';
import { QueryCandidatesToTransferDto } from './dto/query-candidates-to-transfer.dto';
import { QueryAllProcessingCandidatesDto } from './dto/query-all-processing-candidates.dto';
import { ProcessingDocumentReuploadDto } from './dto/processing-document-reupload.dto';
import { VerifyProcessingDocumentDto } from './dto/verify-processing-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/rbac/permissions.guard';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { CompleteProcessingDto } from './dto/complete-processing.dto';
import { SubmitProcessingStepDateDto } from './dto/submit-processing-step-date.dto';
import { HrdRemindersService } from '../hrd-reminders/hrd-reminders.service';
import { DataFlowRemindersService } from '../data-flow-reminders/data-flow-reminders.service';

@ApiTags('Processing Department')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('processing')

export class ProcessingController {
  constructor(
    private readonly processingService: ProcessingService,
    private readonly hrdRemindersService: HrdRemindersService,
    private readonly dataFlowRemindersService: DataFlowRemindersService,
  ) {}

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
    description: 'Retrieve all details including candidate info, project info, role info. Note: document verifications and processing history are excluded for performance; use dedicated endpoints: /processing/candidate/:processingId/all-project-documents and /processing/candidate/:processingId/history.',
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

  @Get('candidate/:processingId/all-project-documents')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({
    summary: 'Get verified documents for a processing candidate',
    description: 'Retrieve verified documents for the candidate and project; includes project document verifications and common candidate documents (e.g., PAN, Aadhaar). Supports pagination and search.',
  })
  @ApiParam({ name: 'processingId', type: 'string' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'search', required: false, description: 'Search term to match document fileName or docType' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Candidate documents retrieved successfully',
  })
  async getCandidateAllProjectDocuments(@Param('processingId') processingId: string, @Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    const data = await this.processingService.getCandidateAllProjectDocuments(processingId, { page, limit, search });
    return {
      success: true,
      data,
      message: 'Candidate documents retrieved successfully',
    };
  }

  @Get('candidate/:processingId/history')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({
    summary: 'Get processing history for a processing candidate',
    description: 'Retrieve processing history entries for the given processing candidate id. Supports pagination and search across notes, step, status and performer names.',
  })
  @ApiParam({ name: 'processingId', type: 'string' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'search', required: false, description: 'Search term to match notes, step, status or performer names' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Processing history retrieved successfully',
  })
  async getProcessingCandidateHistory(@Param('processingId') processingId: string, @Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    const data = await this.processingService.getProcessingCandidateHistory(processingId, { page, limit, search });
    return {
      success: true,
      data,
      message: 'Processing history retrieved successfully',
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

  @Post('documents/reupload')
  @Permissions(PERMISSIONS.WRITE_PROCESSING)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Processing-level document re-upload (replace existing document)',
    description: 'Replace an already uploaded document: soft-delete old document and its verifications, add history, create new document and verification, and attach to processing step if provided.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Document replaced and new document created with history' })
  async processingDocumentReupload(@Body() dto: ProcessingDocumentReuploadDto, @Req() req: any) {
    const result = await this.processingService.processingDocumentReupload(
      dto,
      req.user.id,
    );
    return { success: true, data: result, message: 'Document re-upload (processing) completed' };
  }

  @Post('documents/verify')
  @Permissions(PERMISSIONS.WRITE_PROCESSING)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify a document in the context of processing',
    description: 'Updates document status to verified, ensures project-level verification is verified, and creates step-document link with history.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Document verified successfully' })
  async verifyProcessingDocument(@Body() dto: VerifyProcessingDocumentDto, @Req() req: any) {
    const result = await this.processingService.verifyProcessingDocument(
      dto,
      req.user.id,
    );
    return { success: true, data: result, message: 'Document verified successfully' };
  }

  @Get('steps/:processingId')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({ summary: 'Get processing steps for a candidate', description: 'List steps for a processing candidate' })
  async getStepsForProcessingCandidate(@Param('processingId') processingId: string) {
    const data = await this.processingService.getProcessingSteps(processingId);
    return { success: true, data, message: 'Processing steps retrieved' };
  }

  @Get('steps/:processingId/hrd-requirements')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({ summary: 'Get HRD requirements for a processing candidate', description: 'Merged global + country HRD document rules and existing processing_documents.' })
  @ApiQuery({ name: 'docType', required: false, description: 'Optional document type to filter required documents, processing_documents and candidate documents' })
  async getHrdRequirements(@Param('processingId') processingId: string, @Query('docType') docType?: string) {
    const data = await this.processingService.getHrdRequirements(processingId, docType);
    return { success: true, data, message: 'HRD requirements retrieved' };
  }

  @Get('steps/:processingId/document-received-requirements')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({ summary: 'Get Documents Received requirements for a processing candidate', description: 'Merged global + country Documents Received document rules and existing processing_documents. Same response shape as HRD.' })
  @ApiQuery({ name: 'docType', required: false, description: 'Optional document type to filter required documents, processing_documents and candidate documents' })
  async getDocumentReceivedRequirements(@Param('processingId') processingId: string, @Query('docType') docType?: string) {
    const data = await this.processingService.getDocumentReceivedRequirements(processingId, docType);
    return { success: true, data, message: 'Documents Received requirements retrieved' };
  }

  @Get('steps/:processingId/visa-requirements')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({ summary: 'Get Visa requirements for a processing candidate', description: "Merged global + country Visa document rules and existing processing_documents. Same response shape as HRD." })
  @ApiQuery({ name: 'docType', required: false, description: 'Optional document type to filter required documents, processing_documents and candidate documents' })
  async getVisaRequirements(@Param('processingId') processingId: string, @Query('docType') docType?: string) {
    const data = await this.processingService.getVisaRequirements(processingId, docType);
    return { success: true, data, message: 'Visa requirements retrieved' };
  }

  @Get('steps/:processingId/emigration-requirements')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({ summary: 'Get Emigration requirements for a processing candidate', description: "Merged global + country Emigration document rules and existing processing_documents. Same response shape as HRD." })
  @ApiQuery({ name: 'docType', required: false, description: 'Optional document type to filter required documents, processing_documents and candidate documents' })
  async getEmigrationRequirements(@Param('processingId') processingId: string, @Query('docType') docType?: string) {
    const data = await this.processingService.getEmigrationRequirements(processingId, docType);
    return { success: true, data, message: 'Emigration requirements retrieved' };
  }

  @Get('steps/:processingId/council-registration-requirements')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({ summary: 'Get Council Registration requirements for a processing candidate', description: "Merged global + country Council Registration document rules and existing processing_documents. Same response shape as HRD." })
  @ApiQuery({ name: 'docType', required: false, description: 'Optional document type to filter required documents, processing_documents and candidate documents' })
  async getCouncilRegistrationRequirements(@Param('processingId') processingId: string, @Query('docType') docType?: string) {
    const data = await this.processingService.getCouncilRegistrationRequirements(processingId, docType);
    return { success: true, data, message: 'Council Registration requirements retrieved' };
  }

  @Get('steps/:processingId/document-attestation-requirements')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({ summary: 'Get Document Attestation requirements for a processing candidate', description: 'Merged global + country Document Attestation document rules and existing processing_documents. Same response shape as HRD.' })
  @ApiQuery({ name: 'docType', required: false, description: 'Optional document type to filter required documents, processing_documents and candidate documents' })
  async getDocumentAttestationRequirements(@Param('processingId') processingId: string, @Query('docType') docType?: string) {
    const data = await this.processingService.getDocumentAttestationRequirements(processingId, docType);
    return { success: true, data, message: 'Document Attestation requirements retrieved' };
  }

  @Get('steps/:processingId/medical-requirements')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({ summary: 'Get Medical requirements for a processing candidate', description: 'Merged global + country Medical document rules and existing processing_documents. Same response shape as HRD.' })
  @ApiQuery({ name: 'docType', required: false, description: 'Optional document type to filter required documents, processing_documents and candidate documents' })
  async getMedicalRequirements(@Param('processingId') processingId: string, @Query('docType') docType?: string) {
    const data = await this.processingService.getMedicalRequirements(processingId, docType);
    return { success: true, data, message: 'Medical requirements retrieved' };
  }

  @Get('steps/:processingId/biometric-requirements')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({ summary: 'Get Biometric requirements for a processing candidate', description: 'Merged global + country Biometric document rules and existing processing_documents. Same response shape as HRD.' })
  @ApiQuery({ name: 'docType', required: false, description: 'Optional document type to filter required documents, processing_documents and candidate documents' })
  async getBiometricRequirements(@Param('processingId') processingId: string, @Query('docType') docType?: string) {
    const data = await this.processingService.getBiometricRequirements(processingId, docType);
    return { success: true, data, message: 'Biometric requirements retrieved' };
  }

  @Get('steps/:processingId/eligibility-requirements')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({ summary: 'Get Eligibility requirements for a processing candidate', description: 'Merged global + country Eligibility document rules and existing processing_documents. Same response shape as HRD/Data Flow.' })
  @ApiQuery({ name: 'docType', required: false, description: 'Optional document type to filter required documents, processing_documents and candidate documents' })
  async getEligibilityRequirements(@Param('processingId') processingId: string, @Query('docType') docType?: string) {
    const data = await this.processingService.getEligibilityRequirements(processingId, docType);
    return { success: true, data, message: 'Eligibility requirements retrieved' };
  }

  @Get('steps/:processingId/data-flow-requirements')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({ summary: 'Get Data Flow requirements for a processing candidate', description: 'Merged global + country Data Flow document rules and existing processing_documents.' })
  @ApiQuery({ name: 'docType', required: false, description: 'Optional document type to filter required documents, processing_documents and candidate documents' })
  async getDataFlowRequirements(@Param('processingId') processingId: string, @Query('docType') docType?: string) {
    const data = await this.processingService.getDataFlowRequirements(processingId, docType);
    return { success: true, data, message: 'Data Flow requirements retrieved' };
  }

  @Post('steps/:stepId/status')
  @Permissions(PERMISSIONS.WRITE_PROCESSING)
  @ApiOperation({ summary: 'Update a processing step status' })
  async updateStepStatus(@Param('stepId') stepId: string, @Body() body: UpdateProcessingStepDto, @Req() req: any) {
    const data = await this.processingService.updateProcessingStep(stepId, body, req.user.id);
    return { success: true, data, message: 'Processing step updated' };
  }

  @Post('steps/:stepId/complete')
  @Permissions(PERMISSIONS.WRITE_PROCESSING)
  @ApiOperation({ summary: 'Mark a processing step as complete and move to next step' })
  @ApiBody({ type: CompleteProcessingStepDto, description: 'When completing a medical step provide `isMedicalPassed` (required). Optional: `mofaNumber` and `notes` (stored in processing history or used as cancellation reason).' })
  async completeStep(@Param('stepId') stepId: string, @Body() body: CompleteProcessingStepDto, @Req() req: any) {
    const data = await this.processingService.completeProcessingStep(stepId, req.user.id, body);
    return { success: true, data, message: 'Processing step completed and advanced to next step' };
  }

  @Get('steps/:processingId/prometric-requirements')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({ summary: 'Get Prometric requirements for a processing candidate', description: 'Merged global + country Prometric document rules and existing processing_documents.' })
  @ApiQuery({ name: 'docType', required: false, description: 'Optional document type to filter required documents, processing_documents and candidate documents' })
  async getPrometricRequirements(@Param('processingId') processingId: string, @Query('docType') docType?: string) {
    const data = await this.processingService.getPrometricRequirements(processingId, docType);
    return { success: true, data, message: 'Prometric requirements retrieved' };
  }

  @Get('steps/:processingId/ticket-requirements')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({ summary: 'Get Ticket requirements for a processing candidate', description: "Merged global + country Ticket document rules and existing processing_documents. Same response shape as HRD." })
  @ApiQuery({ name: 'docType', required: false, description: 'Optional document type to filter required documents, processing_documents and candidate documents' })
  async getTicketRequirements(@Param('processingId') processingId: string, @Query('docType') docType?: string) {
    const data = await this.processingService.getTicketRequirements(processingId, docType);
    return { success: true, data, message: 'Ticket requirements retrieved' };
  }

  @Post('steps/:stepId/cancel')
  @Permissions(PERMISSIONS.WRITE_PROCESSING)
  @ApiOperation({ summary: 'Cancel a processing step and the entire processing flow' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Processing step and processing cancelled successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Processing step not found' })
  async cancelStep(@Param('stepId') stepId: string, @Body() body: import('./dto/cancel-processing-step.dto').CancelProcessingStepDto, @Req() req: any) {
    const data = await this.processingService.cancelProcessingStep(stepId, req.user.id, body?.reason);
    return { success: true, data, message: 'Processing step and processing cancelled' };
  }

  @Post('steps/:stepId/submit-date')
  @Permissions(PERMISSIONS.WRITE_PROCESSING)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set submittedAt on a processing step (mark as submitted by candidate)' })
  async submitProcessingStepDate(@Param('stepId') stepId: string, @Body() body: SubmitProcessingStepDateDto, @Req() req: any) {
    const data = await this.processingService.submitProcessingStepDate(stepId, body, req.user.id);
    return { success: true, data, message: 'Processing step submitted date updated' };
  }

  @Post('steps/:stepId/hrd-trigger')
  @Permissions(PERMISSIONS.WRITE_PROCESSING)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger HRD reminder for a step (manual)' })
  async triggerHrdReminder(@Param('stepId') stepId: string, @Req() req: any) {
    const reminder = await this.hrdRemindersService.triggerHRDReminderNow(stepId, req.user.id);
    return { success: true, data: reminder, message: 'HRD reminder triggered' };
  }

  @Post('steps/:stepId/data-flow-trigger')
  @Permissions(PERMISSIONS.WRITE_PROCESSING)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger Data Flow reminder for a step (manual)' })
  async triggerDataFlowReminder(@Param('stepId') stepId: string, @Req() req: any) {
    const reminder = await this.dataFlowRemindersService.triggerDataFlowReminderNow(stepId, req.user.id);
    return { success: true, data: reminder, message: 'Data Flow reminder triggered' };
  }

  @Post('steps/:processingId/sync-status')
  @Permissions(PERMISSIONS.WRITE_PROCESSING)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync processing step statuses for a processing candidate', description: 'Scan steps and update status to `in_progress` if any verified documents are present, or `pending` if none are present.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Processing steps synced successfully' })
  async syncProcessingStepStatuses(@Param('processingId') processingId: string, @Req() req: any) {
    const data = await this.processingService.syncProcessingStepStatuses(processingId, req.user.id);
    return { success: true, data, message: 'Processing step statuses synced successfully' };
  }

  @Post('candidate-hired/:processingId')
  @Permissions(PERMISSIONS.WRITE_PROCESSING)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark processing complete and mark candidate as HIRED (final)' })
  @ApiParam({ name: 'processingId', type: 'string' })
  @ApiBody({ type: CompleteProcessingDto, required: false, description: 'Optional body: { notes?: string } — only `notes` is accepted' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Processing completed and candidate marked as hired' })
  async candidateHired(@Param('processingId') processingId: string, @Body() body: CompleteProcessingDto, @Req() req: any) {
    const data = await this.processingService.completeProcessing(processingId, req.user.id, body);
    return { success: true, data, message: 'Processing completed and candidate marked as hired' };
  }
}
