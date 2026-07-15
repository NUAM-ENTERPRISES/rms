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
  UploadedFile,
  UseGuards,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/rbac/permissions.guard';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { CourierShipmentsService } from './courier-shipments.service';
import { AttestationEligibilityQueryDto } from './dto/attestation-eligibility-query.dto';
import { AttestationProjectsQueryDto } from './dto/attestation-projects-query.dto';
import { CreateAttestationUploadDto } from './dto/create-attestation-upload.dto';
import { CreateMergedAttestationUploadDto } from './dto/create-merged-attestation-upload.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { DispatchShipmentDto } from './dto/dispatch-shipment.dto';
import { ListAttestationUploadsQueryDto } from './dto/list-attestation-uploads-query.dto';
import { ListShipmentsQueryDto } from './dto/list-shipments-query.dto';
import { MarkHandoverDto } from './dto/mark-handover.dto';
import { MarkReceivedDto } from './dto/mark-received.dto';
import { UpdateCourierTrackingDto } from './dto/update-courier-tracking.dto';

@ApiTags('Courier Shipments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('courier-shipments')
export class CourierShipmentsController {
  constructor(private readonly courierShipmentsService: CourierShipmentsService) {}

  @Get('stats')
  @Permissions('read:courier_management')
  @ApiOperation({ summary: 'Get courier shipment statistics for dashboard tiles' })
  getStats() {
    return this.courierShipmentsService.getStats();
  }

  @Get('office-addresses')
  @Permissions('read:courier_management')
  @ApiOperation({ summary: 'Get Affiniks office address presets' })
  getOfficeAddresses() {
    return this.courierShipmentsService.getOfficeAddresses();
  }

  @Get('export')
  @Permissions('read:courier_management')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="courier-shipments.csv"')
  @ApiOperation({ summary: 'Export courier legs as CSV' })
  exportCsv(@Query() query: ListShipmentsQueryDto) {
    return this.courierShipmentsService.exportCsv(query);
  }

  @Get('candidate-groups')
  @Permissions('read:courier_management')
  @ApiOperation({
    summary: 'List courier candidates grouped (paginated by unique candidate)',
  })
  findCandidateGroups(@Query() query: ListShipmentsQueryDto) {
    return this.courierShipmentsService.findCandidateGroups(query);
  }

  @Get('candidates/:candidateId/collection-docs')
  @Permissions('read:courier_management')
  @ApiOperation({ summary: 'Get cumulative received documents for courier selection' })
  getCollectionDocs(@Param('candidateId') candidateId: string) {
    return this.courierShipmentsService.getCollectionDocs(candidateId);
  }

  @Get('candidates/:candidateId/pipeline')
  @Permissions('read:courier_management')
  @ApiOperation({ summary: 'Get candidate courier pipeline summary' })
  getPipeline(@Param('candidateId') candidateId: string) {
    return this.courierShipmentsService.getPipeline(candidateId);
  }

  @Get('candidates/:candidateId')
  @Permissions('read:courier_management')
  @ApiOperation({
    summary: 'List all courier legs for a candidate',
    description:
      'Returns the full ordered timeline (not paginated). Per-candidate leg counts are typically small; pipeline and movement UIs need the complete set.',
  })
  findByCandidate(@Param('candidateId') candidateId: string) {
    return this.courierShipmentsService.findByCandidate(candidateId);
  }

  @Get()
  @Permissions('read:courier_management')
  @ApiOperation({ summary: 'List courier shipment legs' })
  findAll(@Query() query: ListShipmentsQueryDto) {
    return this.courierShipmentsService.findAll(query);
  }

  @Get(':id/attestation-projects')
  @Permissions('read:courier_management')
  @ApiOperation({
    summary: 'List processing projects available for attested uploads on this leg',
  })
  getAttestationProjects(
    @Param('id') id: string,
    @Query() query: AttestationProjectsQueryDto,
  ) {
    return this.courierShipmentsService.getAttestationProjects(
      id,
      query.page,
      query.limit,
    );
  }

  @Get(':id/attestation-eligibility')
  @Permissions('read:courier_management')
  @ApiOperation({
    summary:
      'Eligible attested document slots for a project (every original document present on this received leg)',
  })
  getAttestationEligibility(
    @Param('id') id: string,
    @Query() query: AttestationEligibilityQueryDto,
  ) {
    return this.courierShipmentsService.getAttestationEligibility(
      id,
      query.projectId,
    );
  }

  @Get(':id/attestation-uploads')
  @Permissions('read:courier_management')
  @ApiOperation({ summary: 'List attested uploads for a courier leg' })
  listAttestationUploads(
    @Param('id') id: string,
    @Query() query: ListAttestationUploadsQueryDto,
  ) {
    return this.courierShipmentsService.listAttestationUploads(id, query);
  }

  @Get(':id')
  @Permissions('read:courier_management')
  @ApiOperation({ summary: 'Get courier leg detail' })
  findOne(@Param('id') id: string) {
    return this.courierShipmentsService.findOne(id);
  }

  @Post()
  @Permissions('write:courier_management')
  @ApiOperation({ summary: 'Create a draft courier leg' })
  create(
    @Body() dto: CreateShipmentDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.courierShipmentsService.create(dto, req.user.id);
  }

  @Post(':id/attestation-uploads')
  @Permissions('write:courier_management')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['projectId', 'docType', 'file'],
      properties: {
        projectId: { type: 'string' },
        docType: { type: 'string', example: 'degree_certificate_attested' },
        remarks: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary:
      'Upload an individual attested PDF for a project on a received courier leg',
  })
  createAttestationUpload(
    @Param('id') id: string,
    @Body() dto: CreateAttestationUploadDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: { id: string } },
  ) {
    return this.courierShipmentsService.createAttestationUpload(
      id,
      dto,
      file,
      req.user.id,
    );
  }

  @Post(':id/attestation-uploads/merged')
  @Permissions('write:courier_management')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['projectId', 'docTypes', 'file'],
      properties: {
        projectId: { type: 'string' },
        docTypes: {
          type: 'array',
          items: { type: 'string' },
          example: ['sslc_certificate_attested', 'plus_two_certificate_attested'],
        },
        remarks: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary:
      'Upload a single PDF covering two or more attested document types merged together',
  })
  createMergedAttestationUpload(
    @Param('id') id: string,
    @Body() dto: CreateMergedAttestationUploadDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: { id: string } },
  ) {
    return this.courierShipmentsService.createMergedAttestationUpload(
      id,
      dto,
      file,
      req.user.id,
    );
  }

  @Post(':id/dispatch')
  @Permissions('write:courier_management')
  @ApiOperation({ summary: 'Dispatch a courier leg (courier mode)' })
  dispatch(@Param('id') id: string, @Body() dto: DispatchShipmentDto) {
    return this.courierShipmentsService.dispatch(id, dto);
  }

  @Patch(':id/courier-tracking')
  @Permissions('write:courier_management')
  @ApiOperation({
    summary: 'Update courier tracking ID and/or partner on an in-transit leg',
  })
  updateCourierTracking(
    @Param('id') id: string,
    @Body() dto: UpdateCourierTrackingDto,
  ) {
    return this.courierShipmentsService.updateCourierTracking(id, dto);
  }

  @Post(':id/handover')
  @Permissions('write:courier_management')
  @ApiOperation({ summary: 'Confirm direct handover (direct mode)' })
  handover(@Param('id') id: string, @Body() dto: MarkHandoverDto) {
    return this.courierShipmentsService.handover(id, dto);
  }

  @Post(':id/receive')
  @Permissions('write:courier_management')
  @ApiOperation({ summary: 'Mark leg as received at destination' })
  receive(
    @Param('id') id: string,
    @Body() dto: MarkReceivedDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.courierShipmentsService.receive(id, dto, req.user.id);
  }
}
