import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiQuery,
  ApiOperation,
} from '@nestjs/swagger';
import { Permissions } from '../../auth/rbac/permissions.decorator';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions('read:audit')
  @ApiOperation({ summary: 'Get audit logs with filtering and pagination' })
  @ApiQuery({
    name: 'entityType',
    required: false,
    description: 'Filter by entity type',
  })
  @ApiQuery({
    name: 'entityId',
    required: false,
    description: 'Filter by entity ID',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user who performed the action',
  })
  @ApiQuery({
    name: 'actionType',
    required: false,
    description: 'Filter by action type',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records to return',
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of records to skip',
    type: Number,
  })
  async getAuditLogs(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('actionType') actionType?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    const logs = await this.auditService.getAuditLogs(
      entityType,
      entityId,
      userId,
      actionType,
      limit,
      offset,
    );

    return {
      success: true,
      data: logs,
      message: 'Audit logs retrieved successfully',
      pagination: {
        limit,
        offset,
        total: logs.length, // Note: This is just the current page count
      },
    };
  }

  @Get('entity')
  @Permissions('read:audit')
  @ApiOperation({ summary: 'Get audit logs for a specific entity' })
  @ApiQuery({ name: 'entityType', required: true, description: 'Entity type' })
  @ApiQuery({ name: 'entityId', required: true, description: 'Entity ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records to return',
    type: Number,
  })
  async getAuditLogsForEntity(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    const logs = await this.auditService.getAuditLogsForEntity(
      entityType,
      entityId,
      limit,
    );

    return {
      success: true,
      data: logs,
      message: `Audit logs for ${entityType} ${entityId} retrieved successfully`,
    };
  }

  @Get('user')
  @Permissions('read:audit')
  @ApiOperation({ summary: 'Get audit logs for a specific user' })
  @ApiQuery({ name: 'userId', required: true, description: 'User ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records to return',
    type: Number,
  })
  async getAuditLogsForUser(
    @Query('userId') userId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    const logs = await this.auditService.getAuditLogsForUser(userId, limit);

    return {
      success: true,
      data: logs,
      message: `Audit logs for user ${userId} retrieved successfully`,
    };
  }
}
