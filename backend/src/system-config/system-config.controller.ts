import { Controller, Get, Put, Body, UseGuards, HttpStatus } from '@nestjs/common';
import { SystemConfigService, RNRSettings } from './system-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('system-config')
@UseGuards(JwtAuthGuard)
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  /**
   * Get RNR Settings
   * GET /system-config/rnr-settings
   * Requires: Admin authentication
   */
  @Get('rnr-settings')
  async getRNRSettings() {
    const settings = await this.systemConfigService.getRNRSettings();
    return {
      statusCode: HttpStatus.OK,
      message: 'RNR settings retrieved successfully',
      data: settings,
    };
  }

  /**
   * Update RNR Settings
   * PUT /system-config/rnr-settings
   * Requires: Admin authentication
   * 
   * Example body to change delay to 1 minute:
   * { "delayBetweenReminders": 1 }
   * 
   * Example body to change delay to 4 hours (production):
   * { "delayBetweenReminders": 240 }
   */
  @Put('rnr-settings')
  async updateRNRSettings(@Body() settings: Partial<RNRSettings>) {
    await this.systemConfigService.updateRNRSettings(settings);
    
    // Clear cache to ensure new settings are loaded
    this.systemConfigService.clearCache('RNR_SETTINGS');
    
    const updatedSettings = await this.systemConfigService.getRNRSettings();
    
    return {
      statusCode: HttpStatus.OK,
      message: 'RNR settings updated successfully',
      data: updatedSettings,
    };
  }
}
