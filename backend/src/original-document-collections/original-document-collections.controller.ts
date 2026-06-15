import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/rbac/permissions.guard';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { OriginalDocumentCollectionsService } from './original-document-collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ListCollectionsQueryDto } from './dto/list-collections-query.dto';
import { ListEventMergesQueryDto } from './dto/list-event-merges-query.dto';
import { SubmitToLockerDto } from './dto/submit-to-locker.dto';
import { CheckLockerFileNumberQueryDto } from './dto/check-locker-file-number-query.dto';

@ApiTags('Original Document Collections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('original-document-collections')
export class OriginalDocumentCollectionsController {
  constructor(
    private readonly collectionsService: OriginalDocumentCollectionsService,
  ) {}

  @Get()
  @Permissions('read:documents')
  @ApiOperation({ summary: 'List original document collections (one per candidate)' })
  findAll(@Query() query: ListCollectionsQueryDto) {
    return this.collectionsService.findAll(query);
  }

  @Get('stats')
  @Permissions('read:documents')
  @ApiOperation({ summary: 'Get original document intake statistics' })
  getStats() {
    return this.collectionsService.getStats();
  }

  @Get('export')
  @Permissions('read:documents')
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="original-document-collections.csv"',
  )
  @ApiOperation({ summary: 'Export collection register as CSV' })
  async exportCsv(@Query() query: ListCollectionsQueryDto) {
    return this.collectionsService.exportCsv(query);
  }

  @Get('check-locker-file-number')
  @Permissions('read:documents')
  @ApiOperation({ summary: 'Check whether a locker file number is available' })
  checkLockerFileNumber(@Query() query: CheckLockerFileNumberQueryDto) {
    return this.collectionsService.checkLockerFileNumberAvailability(query);
  }

  @Get('candidates/:candidateId')
  @Permissions('read:documents')
  @ApiOperation({ summary: 'Get collection and intake events for a candidate' })
  findByCandidate(@Param('candidateId') candidateId: string) {
    return this.collectionsService.findByCandidate(candidateId);
  }

  @Get(':id/event-merges')
  @Permissions('read:documents')
  @ApiOperation({ summary: 'Get merged scan PDFs uploaded per intake event' })
  getEventMerges(
    @Param('id') id: string,
    @Query() query: ListEventMergesQueryDto,
  ) {
    return this.collectionsService.getEventMerges(id, query);
  }

  @Get(':id')
  @Permissions('read:documents')
  @ApiOperation({ summary: 'Get collection detail with intake events' })
  findOne(@Param('id') id: string) {
    return this.collectionsService.findOne(id);
  }

  @Post()
  @Permissions('write:documents')
  @ApiOperation({ summary: 'Create collection and first intake event for candidate' })
  create(@Body() dto: CreateCollectionDto, @Req() req: { user: { id: string } }) {
    return this.collectionsService.create(dto, req.user.id);
  }

  @Post(':id/events')
  @Permissions('write:documents')
  @ApiOperation({ summary: 'Add a new intake event to an existing collection' })
  addEvent(
    @Param('id') id: string,
    @Body() dto: CreateEventDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.collectionsService.addEvent(id, dto, req.user.id);
  }

  @Patch(':id/events/:eventId')
  @Permissions('write:documents')
  @ApiOperation({ summary: 'Update intake event metadata and checklist' })
  updateEvent(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.collectionsService.updateEvent(id, eventId, dto);
  }

  @Post(':id/events/:eventId/upload-merge')
  @Permissions('write:documents')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 20))
  @ApiOperation({
    summary:
      'Upload merged scan for a single intake event and rebuild collection merge',
  })
  uploadEventMerge(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: { user: { id: string } },
  ) {
    return this.collectionsService.uploadEventMerge(
      id,
      eventId,
      files,
      req.user.id,
    );
  }

  @Post(':id/rebuild-merge')
  @Permissions('write:documents')
  @ApiOperation({
    summary: 'Rebuild collection merged PDF from all event merged scans',
  })
  rebuildMerge(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.collectionsService.rebuildCollectionMergeFromEvents(
      id,
      req.user.id,
    );
  }

  @Post(':id/upload-merge')
  @Permissions('write:documents')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 20))
  @ApiOperation({ summary: 'Upload merged scan at collection level (replaces prior merge)' })
  uploadMerge(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: { user: { id: string } },
  ) {
    return this.collectionsService.uploadMerge(id, files, req.user.id);
  }

  @Post(':id/submit-to-locker')
  @Permissions('write:documents')
  @ApiOperation({ summary: 'Submit physical originals to locker' })
  submitToLocker(
    @Param('id') id: string,
    @Body() dto: SubmitToLockerDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.collectionsService.submitToLocker(id, dto, req.user.id);
  }

  @Post(':id/complete')
  @Permissions('write:documents')
  @ApiOperation({ summary: 'Mark collection as completed' })
  complete(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.collectionsService.complete(id, req.user.id);
  }
}
