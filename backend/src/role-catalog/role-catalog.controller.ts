import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RoleCatalogService } from './role-catalog.service';
import { QueryRolesDto } from './dto/query-roles.dto';
import { CreateRoleCatalogDto } from './dto/create-role-catalog.dto';
import { UpdateRoleCatalogDto } from './dto/update-role-catalog.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/rbac/permissions.guard';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('Role Catalog')
@Controller('role-catalog')
export class RoleCatalogController {
  constructor(private readonly roleCatalogService: RoleCatalogService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all healthcare roles with filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'List of healthcare roles retrieved successfully',
  })
  async findAll(@Query() queryDto: QueryRolesDto) {
    const result = await this.roleCatalogService.findAll(queryDto);
    return {
      success: true,
      data: result,
      message: 'Roles retrieved successfully',
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    PERMISSIONS.MANAGE_MASTER_CATALOG,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
  )
  @ApiOperation({ summary: 'Create a role catalog entry' })
  @ApiResponse({ status: 201, description: 'Role created' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  async create(@Body() dto: CreateRoleCatalogDto) {
    const data = await this.roleCatalogService.create(dto);
    return {
      success: true,
      data,
      message: 'Role catalog entry created successfully',
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    PERMISSIONS.MANAGE_MASTER_CATALOG,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
  )
  @ApiOperation({ summary: 'Update a role catalog entry' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateRoleCatalogDto) {
    const data = await this.roleCatalogService.update(id, dto);
    return {
      success: true,
      data,
      message: 'Role catalog entry updated successfully',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    PERMISSIONS.MANAGE_MASTER_CATALOG,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
  )
  @ApiOperation({
    summary: 'Soft-delete a role catalog entry (sets isActive=false)',
  })
  @ApiResponse({ status: 200, description: 'Role soft-deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async softDelete(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    const data = await this.roleCatalogService.softDelete(id, req.user.id);
    return {
      success: true,
      data,
      message: 'Role catalog entry deleted successfully',
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a specific healthcare role by ID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id') id: string) {
    const role = await this.roleCatalogService.findOne(id);
    if (!role) {
      return {
        success: false,
        data: null,
        message: 'Role not found',
      };
    }

    return {
      success: true,
      data: role,
      message: 'Role retrieved successfully',
    };
  }

  @Get(':id/recommended-qualifications')
  @Public()
  @ApiOperation({
    summary: 'Get recommended qualifications for a specific role',
  })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiQuery({
    name: 'countryCode',
    required: false,
    description: 'Country code for localized recommendations',
  })
  @ApiResponse({
    status: 200,
    description: 'Recommended qualifications retrieved successfully',
  })
  async getRecommendedQualifications(
    @Param('id') roleId: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const qualifications =
      await this.roleCatalogService.getRecommendedQualifications(
        roleId,
        countryCode,
      );
    return {
      success: true,
      data: qualifications,
      message: 'Recommended qualifications retrieved successfully',
    };
  }
}
