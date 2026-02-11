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
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { RequestResubmissionDto } from './dto/request-resubmission.dto';
import { ReuseDocumentDto } from './dto/reuse-document.dto';
import { ReuploadDocumentDto } from './dto/reupload-document.dto';
import { UploadOfferLetterDto } from './dto/upload-offer-letter.dto';
import { VerifyOfferLetterDto } from './dto/verify-offer-letter.dto';
import { ForwardToClientDto } from './dto/forward-to-client.dto';
import { BulkForwardToClientDto } from './dto/bulk-forward-to-client.dto';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { UploadService } from '../upload/upload.service';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  @Permissions('write:documents')
  @ApiOperation({
    summary: 'Upload a new document',
    description:
      'Upload a new document for a candidate. Automatically sets status to pending verification.',
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
  })
  async create(@Body() createDocumentDto: CreateDocumentDto, @Request() req) {
    const document = await this.documentsService.create(
      createDocumentDto,
      req.user.sub,
    );
    return {
      success: true,
      data: document,
      message: 'Document uploaded successfully',
    };
  }

  @Post('offer-letter')
  @Permissions('write:documents')
  @ApiOperation({
    summary: 'Upload an offer letter',
    description:
      'Upload an offer letter for a candidate and project. Creates document and links it to the nomination.',
  })
  @ApiResponse({
    status: 201,
    description: 'Offer letter uploaded successfully',
  })
  async uploadOfferLetter(
    @Body() uploadDto: UploadOfferLetterDto,
    @Request() req,
  ) {
    const result = await this.documentsService.uploadOfferLetter(
      uploadDto,
      req.user.sub,
    );
    return {
      success: true,
      data: result,
      message: 'Offer letter uploaded successfully',
    };
  }

  @Post('verify-offer-letter')
  @Permissions(PERMISSIONS.WRITE_PROCESSING)
  @ApiOperation({
    summary: 'Verify an offer letter and move to processing',
    description:
      'Verify an offer letter document and set the offer_letter step to completed. HRD will not be auto-started; HRD starts only when HRD step documents are verified. Only for processing users.',
  })
  @ApiResponse({
    status: 200,
    description: 'Offer letter verified and candidate moved to processing',
  })
  async verifyOfferLetter(
    @Body() verifyDto: VerifyOfferLetterDto,
    @Request() req,
  ) {
    const result = await this.documentsService.verifyOfferLetter(
      verifyDto,
      req.user.sub,
    );
    return {
      success: true,
      data: result,
      message: 'Offer letter verified and candidate moved to processing',
    };
  }

  @Get()
  @Permissions('read:documents')
  @ApiOperation({
    summary: 'Get all documents',
    description: 'Retrieve all documents with pagination and optional filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
  })
  async findAll(@Query() query: QueryDocumentsDto) {
    const result = await this.documentsService.findAll(query);
    return {
      success: true,
      data: result,
    };
  }

  @Get('verification-candidates')
  @Permissions('read:documents')
  @ApiOperation({
    summary: 'Get candidates for document verification',
    description:
      'Retrieve candidates who need document verification (pending documents, submitted, verification in progress, rejected)',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification candidates retrieved successfully',
  })
  @ApiQuery({ name: 'recruiterId', required: false, description: 'Filter results to a specific recruiter by id' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Optional project id to filter candidates to a specific project' })
  @ApiQuery({ name: 'roleCatalogId', required: false, description: 'Optional role catalog id to filter by project role' })
  @ApiQuery({ name: 'screening', required: false, description: 'Filter only candidates with screening data', type: Boolean })
  async getVerificationCandidates(@Query() query: any) {
    const result = await this.documentsService.getVerificationCandidates(query);
    return {
      success: true,
      data: result,
      message: 'Verification candidates retrieved successfully',
    };
  }

  @Get('verified-rejected-documents')
  @Permissions('read:documents')
  @ApiOperation({
    summary: 'Get verified/rejected document verifications',
    description:
      "Retrieve paginated list of document verifications with status 'verified' or 'rejected'. Supports search, recruiter filter, pagination and returns counts for both statuses.",
  })
  @ApiQuery({ name: 'status', required: false, description: "Filter by status: 'verified' | 'rejected' | 'both'. Defaults to 'verified' if omitted." })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for candidate name, project title or document file name' })
  @ApiQuery({ name: 'recruiterId', required: false, description: 'Optional recruiter id to scope results' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Optional project id to filter results to a specific project' })
  @ApiQuery({ name: 'roleCatalogId', required: false, description: 'Optional role catalog id to filter results to a specific role' })
  @ApiQuery({ name: 'screening', required: false, description: 'Filter only candidates with screening data', type: Boolean })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  async getVerifiedRejectedDocuments(@Query() query: any) {
    const result = await this.documentsService.getVerifiedRejectedDocuments(query);

    return {
      success: true,
      data: result,
      message: 'Verified/rejected document verifications retrieved successfully',
    };
  }

  @Get('recruiter-documents')
  @Permissions('read:documents')
  @ApiOperation({
    summary: 'Get pending documents for recruiter candidates',
    description:
      'Retrieve candidates assigned to a recruiter who have pending documents, including project details and upload progress.',
  })
  @ApiQuery({ name: 'recruiterId', required: false, description: 'Filter results to a specific recruiter by id' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for candidate name or project title' })
  @ApiQuery({ name: 'status', required: false, description: "Optional filter: 'InScreening' to see candidates in screening phase" })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter results by project id' })
  @ApiQuery({ name: 'roleCatalogId', required: false, description: 'Filter results by role catalog id' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  async getRecruiterDocuments(@Query() query: any, @Request() req) {
    const recruiterId = query.recruiterId || req.user.sub;
    const result = await this.documentsService.getRecruiterPendingDocuments({
      ...query,
      recruiterId,
    });
    return {
      success: true,
      data: result,
      message: 'Recruiter pending documents retrieved successfully',
    };
  }

  @Get('recruiter-verified-rejected-documents')
  @Permissions('read:documents')
  @ApiOperation({
    summary: 'Get verified/rejected documents for recruiter candidates',
    description:
      'Retrieve candidates assigned to a recruiter who have verified or rejected documents, including project details, upload progress and counts.',
  })
  @ApiQuery({ name: 'recruiterId', required: false, description: 'Filter results to a specific recruiter by id' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for candidate name or project title' })
  @ApiQuery({ name: 'status', required: false, description: "Filter by status: 'verified' | 'rejected' | 'pending_documents' | 'InScreening'. Defaults to 'verified'." })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter results by project id' })
  @ApiQuery({ name: 'roleCatalogId', required: false, description: 'Filter results by role catalog id' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  async getRecruiterVerifiedRejectedDocuments(@Query() query: any, @Request() req) {
    const recruiterId = query.recruiterId || req.user.sub;
    const result = await this.documentsService.getRecruiterVerifiedRejectedDocuments({
      ...query,
      recruiterId,
    });
    return {
      success: true,
      data: result,
      message: 'Recruiter verified/rejected documents retrieved successfully',
    };
  }

  @Get('stats')
  @Permissions('read:documents')
  @ApiOperation({
    summary: 'Get document statistics',
    description: 'Retrieve comprehensive document statistics and metrics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStats() {
    const stats = await this.documentsService.getStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('analytics/professional')
  @Permissions('read:documents')
  @ApiOperation({
    summary: 'Get professional documentation analytics',
    description:
      'Retrieve all document verifications with candidate and verifier information for analytics dashboard.',
  })
  @ApiResponse({
    status: 200,
    description: 'Professional analytics retrieved successfully',
  })
  async getProfessionalAnalytics() {
    const data = await this.documentsService.getProfessionalAnalytics();
    return {
      success: true,
      data,
      message: 'Professional analytics retrieved successfully',
    };
  }

  @Get('summary/:candidateProjectMapId')
  @Permissions('read:documents')
  @ApiOperation({
    summary: 'Get document verification summary for a candidate-project',
    description:
      'Retrieve document verification status summary for a specific project nomination.',
  })
  @ApiParam({
    name: 'candidateProjectMapId',
    description: 'Candidate Project Map ID',
    example: 'cpm_123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Summary retrieved successfully',
  })
  async getDocumentSummary(@Param('candidateProjectMapId') id: string) {
    const summary = await this.documentsService.getDocumentSummary(id);
    return {
      success: true,
      data: summary,
    };
  }

  @Get('merged')
  @Permissions('read:documents')
  @ApiOperation({
    summary: 'Get list of merged documents',
    description: 'Retrieve list of all merged PDFs generated for candidates.',
  })
  @ApiQuery({ name: 'candidateId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'roleCatalogId', required: false })
  async getMergedDocuments(
    @Query('candidateId') candidateId?: string,
    @Query('projectId') projectId?: string,
    @Query('roleCatalogId') roleCatalogId?: string,
  ) {
    const data = await this.documentsService.getMergedDocuments({ 
      candidateId, 
      projectId,
      roleCatalogId
    });
    return {
      success: true,
      data,
    };
  }

  @Get('merge-verified')
  @Permissions('read:documents')
  @ApiOperation({
    summary: 'Merge all verified documents into a single PDF',
    description:
      'Downloads all verified documents for a candidate in a specific project and role and merges them into one PDF file.',
  })
  @ApiQuery({ name: 'candidateId', required: true, description: 'Candidate ID' })
  @ApiQuery({ name: 'projectId', required: true, description: 'Project ID' })
  @ApiQuery({
    name: 'roleCatalogId',
    required: false,
    description: 'Optional Role Catalog ID to filter documents by role',
  })
  @ApiResponse({ status: 200, description: 'Merged PDF file' })
  async mergeVerifiedDocuments(
    @Query('candidateId') candidateId: string,
    @Query('projectId') projectId: string,
    @Query('roleCatalogId') roleCatalogId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.documentsService.mergeVerifiedDocuments(
      candidateId,
      projectId,
      roleCatalogId,
    );

    // 1. Upload the merged PDF to storage
    const fileName = `merged_${candidateId}_${projectId}_${roleCatalogId || 'all'}.pdf`;
    const uploadResult = await this.uploadService.uploadBuffer(
      buffer,
      `merged-documents/${candidateId}`,
      fileName,
      'application/pdf',
    );

    // 2. Save/Update record in DB
    await this.documentsService.saveMergedDocument({
      candidateId,
      projectId,
      roleCatalogId,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${uploadResult.fileName}"`,
      'Content-Length': buffer.length,
    });

    return new StreamableFile(buffer);
  }

  @Post('forward-to-client')
  @Permissions('write:documents')
  @ApiOperation({
    summary: 'Forward documents to client via email',
    description: 'Send merged or individual verified documents to a client email address using a template.',
  })
  @ApiResponse({ status: 200, description: 'Documents queued for delivery' })
  @ApiResponse({ status: 400, description: 'No merged document found or invalid document IDs' })
  async forwardToClient(
    @Body() forwardDto: ForwardToClientDto,
    @Request() req,
  ) {
    return this.documentsService.forwardToClient(forwardDto, req.user.sub);
  }

  @Post('bulk-forward')
  @Permissions('write:documents')
  @ApiOperation({
    summary: 'Forward multiple candidates documents to client in bulk',
    description: 'Send merged or individual verified documents for multiple candidates to a client email address.',
  })
  @ApiResponse({ status: 200, description: 'Bulk documents queued for delivery' })
  async bulkForward(
    @Body() bulkForwardDto: BulkForwardToClientDto,
    @Request() req,
  ) {
    return this.documentsService.bulkForwardToClient(bulkForwardDto, req.user.sub);
  }

  @Get('forward-latest')
  @Permissions('read:documents')
  @ApiOperation({
    summary: 'Get latest document forward record',
    description: 'Retrieve the most recent email forwarding status for a candidate/project/role combination.',
  })
  async getDocmentForwardClient(
    @Query('candidateId') candidateId: string,
    @Query('projectId') projectId: string,
    @Query('roleCatalogId') roleCatalogId?: string,
  ) {
    const data = await this.documentsService.getLatestDocumentForward({
      candidateId,
      projectId,
      roleCatalogId,
    });
    return {
      success: true,
      data,
    };
  }

  @Get('forward-history')
  @Permissions('read:documents')
  @ApiOperation({
    summary: 'Get document forward history',
    description: 'Retrieve paginated history of email forwarding for a candidate/project.',
  })
  async getDocuemntForwardClientHistory(
    @Query('candidateId') candidateId: string,
    @Query('projectId') projectId: string,
    @Query('roleCatalogId') roleCatalogId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.documentsService.getDocumentForwardHistory({
      candidateId,
      projectId,
      roleCatalogId,
      search,
      page,
      limit,
    });
    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  @Permissions('read:documents')
  @ApiOperation({
    summary: 'Get a single document by ID',
    description: 'Retrieve detailed information about a specific document.',
  })
  @ApiParam({
    name: 'id',
    description: 'Document ID',
    example: 'doc_123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Document retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async findOne(@Param('id') id: string) {
    const document = await this.documentsService.findOne(id);
    return {
      success: true,
      data: document,
    };
  }

  @Patch(':id')
  @Permissions('write:documents')
  @ApiOperation({
    summary: 'Update a document',
    description: 'Update document metadata (file URL, notes, etc.).',
  })
  @ApiParam({
    name: 'id',
    description: 'Document ID',
    example: 'doc_123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Document updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    const document = await this.documentsService.update(id, updateDocumentDto);
    return {
      success: true,
      data: document,
      message: 'Document updated successfully',
    };
  }

  @Delete(':id')
  @Permissions('manage:documents')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a document',
    description: 'Permanently delete a document.',
  })
  @ApiParam({
    name: 'id',
    description: 'Document ID',
    example: 'doc_123abc',
  })
  @ApiResponse({
    status: 204,
    description: 'Document deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async remove(@Param('id') id: string) {
    await this.documentsService.remove(id);
  }

  @Post(':id/verify')
  @Permissions('verify:documents')
  @ApiOperation({
    summary: 'Verify a document for a specific project',
    description:
      'Verify or reject a document for a specific candidate-project nomination.',
  })
  @ApiParam({
    name: 'id',
    description: 'Document ID',
    example: 'doc_123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Document verified successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async verifyDocument(
    @Param('id') id: string,
    @Body() verifyDto: VerifyDocumentDto,
    @Request() req,
  ) {
    const verification = await this.documentsService.verifyDocument(
      id,
      verifyDto,
      req.user.sub,
    );
    return {
      success: true,
      data: verification,
      message: `Document ${verifyDto.status === 'verified' ? 'verified' : 'rejected'} successfully`,
    };
  }

  @Post(':id/request-resubmission')
  @Permissions('request:resubmission')
  @ApiOperation({
    summary: 'Request document resubmission',
    description:
      'Request candidate to resubmit a document with improved quality or corrections.',
  })
  @ApiParam({
    name: 'id',
    description: 'Document ID',
    example: 'doc_123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Resubmission request sent successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async requestResubmission(
    @Param('id') id: string,
    @Body() requestDto: RequestResubmissionDto,
    @Request() req,
  ) {
    const result = await this.documentsService.requestResubmission(
      id,
      requestDto,
      req.user.sub,
    );
    return {
      success: true,
      data: result,
      message: 'Resubmission request sent successfully',
    };
  }

  @Post(':id/reupload')
  @Permissions('write:documents')
  @ApiOperation({
    summary: 'Re-upload a document',
    description:
      'Re-upload a document after a resubmission request. Updates document status to resubmitted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Document ID',
    example: 'doc_123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Document re-uploaded successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async reupload(
    @Param('id') id: string,
    @Body() reuploadDto: ReuploadDocumentDto,
    @Request() req,
  ) {
    const result = await this.documentsService.reupload(
      id,
      reuploadDto,
      req.user.sub,
    );
    return {
      success: true,
      data: result,
      message: 'Document re-uploaded successfully',
    };
  }

  // ==================== ENHANCED DOCUMENT VERIFICATION ====================

  @Get('candidates/:candidateId/projects')
  @Permissions('read:documents')
  @ApiOperation({
    summary: 'Get candidate projects for document verification',
    description:
      'Retrieve all projects where a candidate is nominated for document verification.',
  })
  @ApiParam({
    name: 'candidateId',
    description: 'Candidate ID',
    example: 'cand_123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate projects retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate not found',
  })
  async getCandidateProjects(@Param('candidateId') candidateId: string) {
    const result =
      await this.documentsService.getCandidateProjects(candidateId);
    return {
      success: true,
      data: result,
      message: 'Candidate projects retrieved successfully',
    };
  }

  @Get('candidates/:candidateId/projects/:projectId/requirements')
  @Permissions('read:documents')
  @ApiOperation({
    summary: 'Get project document requirements for candidate',
    description:
      'Retrieve document requirements and verification status for a specific candidate-project.',
  })
  @ApiParam({
    name: 'candidateId',
    description: 'Candidate ID',
    example: 'cand_123abc',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: 'proj_123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Project requirements retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate or project not found',
  })
  async getCandidateProjectRequirements(
    @Param('candidateId') candidateId: string,
    @Param('projectId') projectId: string,
  ) {
    const result = await this.documentsService.getCandidateProjectRequirements(
      candidateId,
      projectId,
    );
    return {
      success: true,
      data: result,
      message: 'Project requirements retrieved successfully',
    };
  }

  @Get('candidates/:candidateId/projects/:projectId/roles/:roleCatalogId/verifications')
  @Permissions('read:documents')
  @ApiOperation({
    summary: 'Get document verifications and documents for a candidate-project-role',
    description:
      'Retrieve candidate_project_document_verifications and related document details for a specific roleCatalog in a project nomination. Supports pagination and search.',
  })
  @ApiParam({ name: 'candidateId', description: 'Candidate ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'roleCatalogId', description: 'Role Catalog ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for document file name or docType' })
  @ApiQuery({ name: 'status', required: false, description: "Filter by verification status: 'verified' | 'rejected' | 'pending' | 'all' (default 'all')" })
  async getCandidateProjectVerificationsByRole(
    @Param('candidateId') candidateId: string,
    @Param('projectId') projectId: string,
    @Param('roleCatalogId') roleCatalogId: string,
    @Query() query: any,
  ) {
    const result = await this.documentsService.getCandidateProjectVerificationsByRole(
      candidateId,
      projectId,
      roleCatalogId,
      query,
    );
    return {
      success: true,
      data: result,
      message: 'Candidate project verifications retrieved successfully',
    };
  }

  @Post(':documentId/reuse')
  @Permissions('write:documents')
  @ApiOperation({
    summary: 'Reuse existing document for project',
    description: 'Link an existing document to a new project for verification.',
  })
  @ApiParam({
    name: 'documentId',
    description: 'Document ID',
    example: 'doc_123abc',
  })
  @ApiResponse({
    status: 201,
    description: 'Document linked to project successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Document or project not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Document already linked to this project',
  })
  async reuseDocument(
    @Param('documentId') documentId: string,
    @Body() reuseDto: ReuseDocumentDto,
    @Request() req,
  ) {
    const result = await this.documentsService.reuseDocument(
      documentId,
      reuseDto.projectId,
      reuseDto.roleCatalog || reuseDto.roleCatalogId || reuseDto.roleCatelogId,
      req.user.sub,
    );
    return {
      success: true,
      data: result,
      message: 'Document linked to project successfully',
    };
  }

  @Post('complete-verification')
  @Permissions('verify:documents')
  @ApiOperation({
    summary: 'Complete document verification for candidate-project',
    description:
      'Mark all document verification as complete for a candidate-project.',
  })
  @ApiParam({
    name: 'candidateProjectMapId',
    description: 'Candidate Project Map ID',
    example: 'cpm_123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Document verification completed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate project mapping not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Not all required documents are verified',
  })
  async completeVerification(
    @Body() body: { candidateProjectMapId: string },
    @Request() req,
  ) {
    const result = await this.documentsService.completeVerification(
      body.candidateProjectMapId,
      req.user.sub,
    );
    return {
      success: true,
      data: result,
      message: 'Document verification completed successfully',
    };
  }


  @Post('reject-verification')
@Permissions('verify:documents')
@ApiOperation({
  summary: 'Reject document verification for candidate-project',
  description: 'Mark candidate-project document verification as rejected.',
})
@ApiResponse({
  status: 200,
  description: 'Document verification rejected successfully',
})
@ApiResponse({
  status: 404,
  description: 'Candidate project mapping not found',
})
async rejectVerification(
  @Body() body: { candidateProjectMapId: string; reason?: string },
  @Request() req,
) {
  const result = await this.documentsService.rejectVerification(
    body.candidateProjectMapId,
    req.user.sub,
    body.reason,
  );

  return {
    success: true,
    data: result,
    message: 'Document verification rejected successfully',
  };
}
}
