import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/rbac/permissions.guard';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { CourierShipmentsService } from './courier-shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { DispatchShipmentDto } from './dto/dispatch-shipment.dto';
import { ListShipmentsQueryDto } from './dto/list-shipments-query.dto';
import { MarkHandoverDto } from './dto/mark-handover.dto';
import { MarkReceivedDto } from './dto/mark-received.dto';

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
  @ApiOperation({ summary: 'List all courier legs for a candidate' })
  findByCandidate(@Param('candidateId') candidateId: string) {
    return this.courierShipmentsService.findByCandidate(candidateId);
  }

  @Get()
  @Permissions('read:courier_management')
  @ApiOperation({ summary: 'List courier shipment legs' })
  findAll(@Query() query: ListShipmentsQueryDto) {
    return this.courierShipmentsService.findAll(query);
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

  @Post(':id/dispatch')
  @Permissions('write:courier_management')
  @ApiOperation({ summary: 'Dispatch a courier leg (courier mode)' })
  dispatch(@Param('id') id: string, @Body() dto: DispatchShipmentDto) {
    return this.courierShipmentsService.dispatch(id, dto);
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
