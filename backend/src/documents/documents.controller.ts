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
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { RequestResubmissionDto } from './dto/request-resubmission.dto';
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
  async getVerificationCandidates(@Query() query: any) {
    const result = await this.documentsService.getVerificationCandidates(query);
    return {
      success: true,
      data: result,
      message: 'Verification candidates retrieved successfully',
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
}
