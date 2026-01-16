import { Controller, Get, Put, Body, UseGuards, HttpStatus } from '@nestjs/common';
import { SystemConfigService, RNRSettings, HRDSettings } from './system-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/rbac/permissions.guard';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@Controller('system-config')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  /**
   * Get RNR Settings
   * GET /system-config/rnr-settings
   * Requires: Admin authentication
   */
  @Get('rnr-settings')
  @Permissions(PERMISSIONS.READ_SYSTEM_CONFIG)
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
  @Permissions(PERMISSIONS.MANAGE_SYSTEM_CONFIG)
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

  /**
   * Get HRD Settings
   * GET /system-config/hrd-settings
   */
  @Get('hrd-settings')
  @Permissions(PERMISSIONS.READ_SYSTEM_CONFIG)
  async getHRDSettings() {
    const settings = await this.systemConfigService.getHRDSettings();
    return {
      statusCode: HttpStatus.OK,
      message: 'HRD settings retrieved successfully',
      data: settings,
    };
  }

  /**
   * Update HRD Settings
   * PUT /system-config/hrd-settings
   */
  @Put('hrd-settings')
  @Permissions(PERMISSIONS.MANAGE_SYSTEM_CONFIG)
  async updateHRDSettings(@Body() settings: Partial<HRDSettings>) {
    await this.systemConfigService.updateHRDSettings(settings);

    // Clear cache to ensure new settings are loaded
    this.systemConfigService.clearCache('HRD_SETTINGS');

    const updatedSettings = await this.systemConfigService.getHRDSettings();

    return {
      statusCode: HttpStatus.OK,
      message: 'HRD settings updated successfully',
      data: updatedSettings,
    };
  }
}

