import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SystemService } from './system.service';
import { SystemConfigResponse } from './dto/system-config.dto';

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('config')
  @ApiOperation({
    summary: 'Get system configuration',
    description:
      'Retrieve all system-wide configuration including roles, constants, and UI configurations. Supports partial loading via parts query.',
  })
  @ApiQuery({
    name: 'parts',
    required: false,
    description: 'Comma-separated parts to include (e.g. roles,constants)',
  })
  @ApiResponse({
    status: 200,
    description: 'System configuration retrieved successfully',
    type: SystemConfigResponse,
  })
  async getSystemConfig(
    @Query('parts') parts?: string,
  ): Promise<SystemConfigResponse> {
    const requestedParts = parts ? parts.split(',') : [];
    return this.systemService.getSystemConfig(requestedParts);
  }
}
