import { Controller, Get, Query, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MetaService } from './meta.service';
import { QueryMetaLeadsDto } from './dto/query-meta-leads.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/rbac/permissions.guard';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@Controller('meta/leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Meta Leads')
export class MetaLeadsController {
  constructor(private readonly metaService: MetaService) {}

  /**
   * Admin MetaLead history
   * GET /meta/leads
   */
  @Get()
  @Permissions(PERMISSIONS.READ_SYSTEM_CONFIG)
  @ApiOperation({ summary: 'List MetaLead history (admin)' })
  @ApiResponse({ status: 200, description: 'Meta leads retrieved successfully' })
  async listMetaLeads(@Query() query: QueryMetaLeadsDto) {
    const data = await this.metaService.listMetaLeads(query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Meta leads retrieved successfully',
      data,
    };
  }
}
