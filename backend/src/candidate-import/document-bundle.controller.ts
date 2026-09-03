import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from '../auth/rbac/permissions.decorator';
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
  @ApiOperation({ summary: 'Get a bundle with its detected segments' })
  async getBundle(@Param('id') id: string) {
    const bundle = await this.documentBundleService.getBundle(id);
    return { success: true, bundle };
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

  @Post('candidate-document-bundles/:id/apply')
  @Permissions('ai_classify:candidate_documents')
  @ApiOperation({
    summary: 'Split the PDF and save confirmed segments as candidate documents',
  })
  async applyBundle(@Param('id') id: string, @Request() req) {
    const result = await this.documentBundleService.applyBundle(
      id,
      req.user.id,
    );
    return { success: true, ...result };
  }
}
