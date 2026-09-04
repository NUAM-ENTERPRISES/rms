import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { PreviewBundlePagesDto } from './dto/preview-bundle-pages.dto';
import { UpdateBundleProfileSuggestionsDto } from './dto/update-bundle-profile-suggestions.dto';
import { UpdateBundleSegmentDto } from './dto/update-bundle-segment.dto';
import { DocumentBundleService } from './services/document-bundle.service';

@ApiTags('Candidate Document Bundles')
@ApiBearerAuth()
@Controller()
export class DocumentBundleController {
  constructor(private readonly documentBundleService: DocumentBundleService) {}

  @Post('candidates/:candidateId/document-bundles')
  @Permissions('ai_classify:candidate_documents')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload a merged PDF and queue it for AI classification',
    description:
      'Returns immediately. Poll GET /candidate-document-bundles/:id until status is "review".',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async createBundle(
    @Param('candidateId') candidateId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    const bundle = await this.documentBundleService.createBundle(
      candidateId,
      file,
      req.user.id,
    );
    return { success: true, bundle };
  }

  @Get('candidates/:candidateId/document-bundles')
  @Permissions('ai_classify:candidate_documents')
  @ApiOperation({ summary: 'List merged PDF bundles for a candidate' })
  async listBundles(@Param('candidateId') candidateId: string) {
    const bundles = await this.documentBundleService.listBundles(candidateId);
    return { success: true, bundles };
  }

  @Get('candidate-document-bundles/:id')
  @Permissions('ai_classify:candidate_documents')
  @ApiOperation({
    summary:
      'Get a bundle with its detected segments and profile suggestions from the resume',
  })
  async getBundle(@Param('id') id: string) {
    const bundle = await this.documentBundleService.getBundle(id);
    return { success: true, bundle };
  }

  @Get('candidate-document-bundles/:id/preview')
  @Permissions('ai_classify:candidate_documents')
  @ApiOperation({
    summary:
      'Download a PDF containing only the requested pages of a merged bundle',
  })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async previewPages(
    @Param('id') id: string,
    @Query() dto: PreviewBundlePagesDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, fileName } = await this.documentBundleService.previewPages(
      id,
      dto.startPage,
      dto.endPage,
    );
    res.set({
      'Content-Disposition': `inline; filename="${fileName}"`,
    });
    return new StreamableFile(buffer);
  }

  @Patch('candidate-document-bundles/:id/segments/:segmentId')
  @Permissions('ai_classify:candidate_documents')
  @ApiOperation({
    summary: 'Correct a detected segment, or confirm/reject it',
  })
  async updateSegment(
    @Param('id') id: string,
    @Param('segmentId') segmentId: string,
    @Body() dto: UpdateBundleSegmentDto,
  ) {
    const segment = await this.documentBundleService.updateSegment(
      id,
      segmentId,
      dto,
    );
    return { success: true, segment };
  }

  @Patch('candidate-document-bundles/:id/profile-suggestions')
  @Permissions('ai_classify:candidate_documents')
  @ApiOperation({
    summary:
      'Update qualifications, work experiences, resume role and identity extracted from the bundle',
  })
  async updateProfileSuggestions(
    @Param('id') id: string,
    @Body() dto: UpdateBundleProfileSuggestionsDto,
  ) {
    const profileSuggestions =
      await this.documentBundleService.updateProfileSuggestions(id, dto);
    return { success: true, profileSuggestions };
  }

  @Post('candidate-document-bundles/:id/apply')
  @Permissions('ai_classify:candidate_documents')
  @ApiOperation({
    summary:
      'Save confirmed allow-listed documents, qualifications, work history and identity fields',
  })
  async applyBundle(@Param('id') id: string, @Request() req) {
    const result = await this.documentBundleService.applyBundle(
      id,
      req.user.id,
    );
    return { success: true, ...result };
  }
}
