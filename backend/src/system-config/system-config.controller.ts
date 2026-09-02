import { Controller, Get, Put, Body, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  SystemConfigService,
  RNRSettings,
  HRDSettings,
} from './system-config.service';
import { UpdateOfficeAddressesDto } from './dto/update-office-addresses.dto';
import { UpdateLeadgenChannelsDto } from './dto/update-leadgen-channels.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/rbac/permissions.guard';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@Controller('system-config')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('System Config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  /**
   * Get RNR Settings
   * GET /system-config/rnr-settings
   */
  @Get('rnr-settings')
  @Permissions(
    PERMISSIONS.READ_RNR_SETTINGS,
    PERMISSIONS.MANAGE_RNR_SETTINGS,
    PERMISSIONS.READ_SYSTEM_CONFIG,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
  )
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
   *
   * Example body to change delay to 1 minute:
   * { "delayBetweenReminders": 1 }
   *
   * Example body to change delay to 4 hours (production):
   * { "delayBetweenReminders": 240 }
   */
  @Put('rnr-settings')
  @Permissions(
    PERMISSIONS.MANAGE_RNR_SETTINGS,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
  )
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
  @Permissions(
    PERMISSIONS.READ_HRD_SETTINGS,
    PERMISSIONS.MANAGE_HRD_SETTINGS,
    PERMISSIONS.READ_SYSTEM_CONFIG,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
  )
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
  @Permissions(
    PERMISSIONS.MANAGE_HRD_SETTINGS,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
  )
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

  /**
   * Get Data Flow Settings
   */
  @Get('data-flow-settings')
  @Permissions(PERMISSIONS.READ_SYSTEM_CONFIG, PERMISSIONS.MANAGE_SYSTEM_CONFIG)
  async getDataFlowSettings() {
    const settings = await this.systemConfigService.getDataFlowSettings();
    return {
      statusCode: HttpStatus.OK,
      message: 'Data Flow settings retrieved successfully',
      data: settings,
    };
  }

  /**
   * Update Data Flow Settings
   * PUT /system-config/data-flow-settings
   */
  @Put('data-flow-settings')
  @Permissions(PERMISSIONS.MANAGE_SYSTEM_CONFIG)
  async updateDataFlowSettings(@Body() settings: Partial<HRDSettings>) {
    await this.systemConfigService.updateDataFlowSettings(settings);

    // Clear cache to ensure new settings are loaded
    this.systemConfigService.clearCache('DATA_FLOW_SETTINGS');

    const updatedSettings = await this.systemConfigService.getDataFlowSettings();

    return {
      statusCode: HttpStatus.OK,
      message: 'Data Flow settings updated successfully',
      data: updatedSettings,
    };
  }

  /**
   * Get Leadgen channel enable/disable flags
   * GET /system-config/leadgen-channels-settings
   */
  @Get('leadgen-channels-settings')
  @Permissions(
    PERMISSIONS.READ_LEADGEN_CHANNELS,
    PERMISSIONS.MANAGE_LEADGEN_CHANNELS,
    PERMISSIONS.READ_SYSTEM_CONFIG,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
  )
  @ApiOperation({
    summary:
      'Get Leadgen channel flags (WhatsApp, Instagram, Messenger, Lead Ads)',
  })
  @ApiResponse({
    status: 200,
    description: 'Leadgen channel settings retrieved successfully',
  })
  async getLeadgenChannelsSettings() {
    const settings = await this.systemConfigService.getLeadgenChannelsSettings();
    return {
      statusCode: HttpStatus.OK,
      message: 'Leadgen channel settings retrieved successfully',
      data: settings,
    };
  }

  /**
   * Update Leadgen channel enable/disable flags
   * PUT /system-config/leadgen-channels-settings
   */
  @Put('leadgen-channels-settings')
  @Permissions(
    PERMISSIONS.MANAGE_LEADGEN_CHANNELS,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
  )
  @ApiOperation({
    summary:
      'Update Leadgen channel flags (WhatsApp, Instagram, Messenger, Lead Ads)',
  })
  @ApiResponse({
    status: 200,
    description: 'Leadgen channel settings updated successfully',
  })
  async updateLeadgenChannelsSettings(
    @Body() settings: UpdateLeadgenChannelsDto,
  ) {
    await this.systemConfigService.updateLeadgenChannelsSettings(settings);

    this.systemConfigService.clearCache('META_LEADGEN_SETTINGS');

    const updatedSettings =
      await this.systemConfigService.getLeadgenChannelsSettings();

    return {
      statusCode: HttpStatus.OK,
      message: 'Leadgen channel settings updated successfully',
      data: updatedSettings,
    };
  }

  /**
   * Get Affiniks office address presets
   * GET /system-config/office-addresses
   */
  @Get('office-addresses')
  @Permissions(
    PERMISSIONS.READ_OFFICE_ADDRESSES,
    PERMISSIONS.MANAGE_OFFICE_ADDRESSES,
    PERMISSIONS.READ_SYSTEM_CONFIG,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
  )
  @ApiOperation({ summary: 'Get Affiniks Kochi and Delhi office address presets' })
  @ApiResponse({ status: 200, description: 'Office addresses retrieved successfully' })
  async getOfficeAddresses() {
    const data = await this.systemConfigService.getOfficeAddresses();
    return {
      statusCode: HttpStatus.OK,
      message: 'Office addresses retrieved successfully',
      data,
    };
  }

  /**
   * Update Affiniks office address presets
   * PUT /system-config/office-addresses
   */
  @Put('office-addresses')
  @Permissions(
    PERMISSIONS.MANAGE_OFFICE_ADDRESSES,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
  )
  @ApiOperation({ summary: 'Update Affiniks Kochi and Delhi office address presets' })
  @ApiResponse({ status: 200, description: 'Office addresses updated successfully' })
  async updateOfficeAddresses(@Body() settings: UpdateOfficeAddressesDto) {
    const data = await this.systemConfigService.updateOfficeAddresses(settings);
    return {
      statusCode: HttpStatus.OK,
      message: 'Office addresses updated successfully',
      data,
    };
  }
}
