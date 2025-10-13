import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
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
      'Retrieve all system-wide configuration including roles, constants, and UI configurations.',
  })
  @ApiResponse({
    status: 200,
    description: 'System configuration retrieved successfully',
    type: SystemConfigResponse,
  })
  async getSystemConfig(): Promise<SystemConfigResponse> {
    return this.systemService.getSystemConfig();
  }
}
