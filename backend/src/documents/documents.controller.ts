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
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { RequestResubmissionDto } from './dto/request-resubmission.dto';
import { ReuseDocumentDto } from './dto/reuse-document.dto';
import { Permissions } from '../auth/rbac/permissions.decorator';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

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
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  async getRecruiterDocuments(@Query() query: any) {
    const result = await this.documentsService.getRecruiterPendingDocuments(query);
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
  @ApiQuery({ name: 'status', required: false, description: "Filter by status: 'verified' | 'rejected' | 'pending_documents'. Defaults to 'verified'." })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  async getRecruiterVerifiedRejectedDocuments(@Query() query: any) {
    const result = await this.documentsService.getRecruiterVerifiedRejectedDocuments(query);
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
      reuseDto.roleCatalogId,
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
