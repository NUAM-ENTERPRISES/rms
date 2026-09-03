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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { ApproveCatalogValueDto } from './dto/approve-catalog-value.dto';
import { ConfirmImportDto, SetSheetOwnersDto } from './dto/confirm-import.dto';
import { CreateImportBatchDto } from './dto/create-import-batch.dto';
import { UpdateImportRowDto } from './dto/update-import-row.dto';
import { CatalogApprovalService } from './services/catalog-approval.service';
import { CandidateImportService } from './services/candidate-import.service';
import { RecruiterResolutionService } from './services/recruiter-resolution.service';

@ApiTags('Candidate Import')
@ApiBearerAuth()
@Controller('candidate-import')
export class CandidateImportController {
  constructor(
    private readonly candidateImportService: CandidateImportService,
    private readonly catalogApprovalService: CatalogApprovalService,
    private readonly recruiterResolutionService: RecruiterResolutionService,
  ) {}

  @Post('batches')
  @Permissions('import:candidates')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload a recruiter workbook and queue it for parsing',
    description:
      'Returns immediately with a batch id. Poll GET /candidate-import/batches/:id until status leaves "analyzing".',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        defaultRecruiterId: { type: 'string' },
        activeTabsOnly: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Batch queued for analysis.' })
  async createBatch(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateImportBatchDto,
    @Request() req,
  ) {
    const batch = await this.candidateImportService.createBatch(
      file,
      req.user.id,
      {
        defaultRecruiterId: dto.defaultRecruiterId,
        activeTabsOnly: dto.activeTabsOnly,
      },
    );
    return { success: true, batch };
  }

  @Get('recruiters')
  @Permissions('import:candidates')
  @ApiOperation({
    summary: 'List recruiters who can own imported candidates',
  })
  async listRecruiters() {
    const recruiters = await this.recruiterResolutionService.listRecruiters();
    return { success: true, recruiters };
  }

  @Get('batches/:id')
  @Permissions('import:candidates')
  @ApiOperation({
    summary: 'Get a batch with its rows, catalog suggestions and issues',
  })
  async getBatch(@Param('id') id: string, @Request() req) {
    const batch = await this.candidateImportService.getBatch(id, req.user.id);
    return { success: true, batch };
  }

  @Patch('batches/:id/rows/:rowId')
  @Permissions('import:candidates')
  @ApiOperation({ summary: 'Apply reviewer corrections to one parsed row' })
  async updateRow(
    @Param('id') id: string,
    @Param('rowId') rowId: string,
    @Body() dto: UpdateImportRowDto,
  ) {
    await this.candidateImportService.updateRow(id, rowId, dto);
    return { success: true };
  }

  @Patch('batches/:id/sheet-owners')
  @Permissions('import:candidates')
  @ApiOperation({
    summary: 'Assign the owning recruiter for each worksheet tab',
    description:
      'Used when a manager uploads a multi-recruiter workbook. Rows are revalidated afterwards.',
  })
  async setSheetOwners(
    @Param('id') id: string,
    @Body() dto: SetSheetOwnersDto,
  ) {
    await this.candidateImportService.setSheetOwners(id, dto.owners ?? {});
    return { success: true };
  }

  @Post('batches/:id/catalog-values')
  @Permissions('manage:qualifications', 'manage:system_config')
  @ApiOperation({
    summary: 'Create a catalog row or alias that a reviewer approved',
    description:
      'Requires a catalog permission on top of import:candidates, because this writes to the shared catalogs rather than to the batch.',
  })
  async approveCatalogValue(
    @Param('id') _id: string,
    @Body() dto: ApproveCatalogValueDto,
    @Request() req,
  ) {
    const result = await this.catalogApprovalService.approve(
      dto,
      req.user.id,
    );
    return { success: true, result };
  }

  @Post('batches/:id/confirm')
  @Permissions('import:candidates')
  @ApiOperation({
    summary: 'Create candidates for the rows that are ready',
    description:
      'Each row is created independently; a failure is recorded on the row and never aborts the batch.',
  })
  async confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmImportDto,
    @Request() req,
  ) {
    const result = await this.candidateImportService.confirm(
      id,
      dto,
      req.user.id,
    );
    return { success: true, ...result };
  }
}
