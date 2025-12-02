import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Request,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProcessingService } from './processing.service';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { QueryProcessingCandidatesDto } from './dto/query-processing-candidates.dto';
import { UpdateProcessingStepDto } from './dto/update-processing-step.dto';
import { ProcessingStepKey } from '@prisma/client';

@ApiTags('processing')
@Controller('processing')
export class ProcessingController {
  constructor(private readonly processingService: ProcessingService) {}

  @Get('candidates')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({
    summary: 'List candidates currently in processing',
    description:
      'Returns paginated list of selected/passed candidates the processing executive must follow up.',
  })
  list(@Query() query: QueryProcessingCandidatesDto) {
    return this.processingService.listCandidates(query);
  }

  @Get(':candidateProjectMapId')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({
    summary: 'Get processing detail for a candidate project mapping',
  })
  detail(@Param('candidateProjectMapId') candidateProjectMapId: string) {
    return this.processingService.getDetail(candidateProjectMapId);
  }

  @Get(':candidateProjectMapId/history')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({
    summary: 'Get processing status history for a candidate-project mapping',
  })
  history(@Param('candidateProjectMapId') candidateProjectMapId: string) {
    return this.processingService.getHistory(candidateProjectMapId);
  }

  @Patch(':candidateProjectMapId/steps/:stepKey')
  @Permissions(PERMISSIONS.WRITE_PROCESSING)
  @ApiOperation({
    summary: 'Update a processing step status',
  })
  updateStep(
    @Param('candidateProjectMapId') candidateProjectMapId: string,
    @Param('stepKey') stepKey: string,
    @Body() dto: UpdateProcessingStepDto,
    @Request() req,
  ) {
    const normalizedKey = this.normalizeStepKey(stepKey);
    return this.processingService.updateStep(
      candidateProjectMapId,
      normalizedKey,
      dto,
      { id: req.user.id, name: req.user.name },
    );
  }

  private normalizeStepKey(param: string): ProcessingStepKey {
    const formatted = param.replace(/-/g, '_').toUpperCase();
    if (
      !Object.values(ProcessingStepKey).includes(formatted as ProcessingStepKey)
    ) {
      throw new BadRequestException(`Invalid processing step key ${param}`);
    }
    return formatted as ProcessingStepKey;
  }
}
