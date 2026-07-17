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
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RoleDepartmentsService } from './role-departments.service';
import { QueryRoleDepartmentDto } from './dto/query-role-department.dto';
import { CreateRoleDepartmentDto } from './dto/create-role-department.dto';
import { UpdateRoleDepartmentDto } from './dto/update-role-department.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/rbac/permissions.guard';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('Role Departments')
@Controller('role-departments')
export class RoleDepartmentsController {
  constructor(private readonly service: RoleDepartmentsService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all role departments (optionally include role catalog)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search departments by name or label',
  })
  @ApiQuery({
    name: 'includeRoles',
    required: false,
    description: 'Include role catalog entries',
    example: true,
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    description: 'Role departments retrieved successfully',
  })
  async findAll(@Query() query: QueryRoleDepartmentDto) {
    const result = await this.service.findAll(query);
    return {
      success: true,
      data: result,
      message: 'Role departments retrieved successfully',
    };
  }

  @Get('ping')
  @Public()
  ping() {
    return { success: true, message: 'role-departments OK' };
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.MANAGE_SYSTEM_CONFIG)
  @ApiOperation({ summary: 'Create a role department' })
  @ApiResponse({ status: 201, description: 'Role department created' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  async create(@Body() dto: CreateRoleDepartmentDto) {
    const data = await this.service.create(dto);
    return {
      success: true,
      data,
      message: 'Role department created successfully',
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.MANAGE_SYSTEM_CONFIG)
  @ApiOperation({ summary: 'Update a role department' })
  @ApiResponse({ status: 200, description: 'Role department updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDepartmentDto,
  ) {
    const data = await this.service.update(id, dto);
    return {
      success: true,
      data,
      message: 'Role department updated successfully',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.MANAGE_SYSTEM_CONFIG)
  @ApiOperation({ summary: 'Soft-delete a role department (sets isActive=false)' })
  @ApiResponse({ status: 200, description: 'Role department soft-deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async softDelete(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    const data = await this.service.softDelete(id, req.user.id);
    return {
      success: true,
      data,
      message: 'Role department deleted successfully',
    };
  }
}
