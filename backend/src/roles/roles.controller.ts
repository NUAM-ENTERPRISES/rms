import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRolesDto } from './dto/query-roles.dto';
import { QueryRoleUsersDto } from './dto/query-role-users.dto';
import { Permissions } from '../auth/rbac/permissions.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('read:roles')
  @ApiOperation({ summary: 'Get paginated roles with their permissions' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of roles with their permissions',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findAll(@Query() query: QueryRolesDto) {
    const data = await this.rolesService.findAll(query);
    return {
      success: true,
      data,
      message: 'Roles retrieved successfully',
    };
  }

  @Get('permissions')
  @Permissions('read:roles')
  @ApiOperation({ summary: 'Get all permissions in the catalog' })
  @ApiResponse({
    status: 200,
    description: 'List of permission catalog entries',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findAllPermissions() {
    const permissions = await this.rolesService.findAllPermissions();
    return {
      success: true,
      data: permissions,
      message: 'Permissions retrieved successfully',
    };
  }

  @Get('user/:userId')
  @Permissions('read:users')
  @ApiOperation({ summary: 'Get roles assigned to a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User roles retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getUserRoles(@Param('userId') userId: string) {
    const roles = await this.rolesService.getUserRoles(userId);
    return {
      success: true,
      data: roles,
      message: 'User roles retrieved successfully',
    };
  }

  @Get(':id/users')
  @Permissions('read:roles')
  @ApiOperation({ summary: 'Get users assigned to a role (paginated)' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({
    status: 200,
    description: 'Assigned users retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Not Found - Role not found' })
  async findAssignedUsers(
    @Param('id') id: string,
    @Query() query: QueryRoleUsersDto,
  ) {
    const data = await this.rolesService.findAssignedUsers(id, query);
    return {
      success: true,
      data,
      message: 'Assigned users retrieved successfully',
    };
  }

  @Get(':id')
  @Permissions('read:roles')
  @ApiOperation({ summary: 'Get a single role with permissions' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Not Found - Role not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findOne(@Param('id') id: string) {
    const role = await this.rolesService.findOne(id);
    return {
      success: true,
      data: role,
      message: 'Role retrieved successfully',
    };
  }

  @Post()
  @Permissions('manage:roles')
  @ApiOperation({ summary: 'Create a custom role with permissions' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({ status: 409, description: 'Conflict - Role name exists' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async createRole(
    @Body() createRoleDto: CreateRoleDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.rolesService.createRole(createRoleDto, req.user.id);
  }

  @Patch(':id')
  @Permissions('manage:roles')
  @ApiOperation({ summary: 'Update a custom role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - System role or no access' })
  @ApiResponse({ status: 404, description: 'Not Found - Role not found' })
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.rolesService.updateRole(id, updateRoleDto);
  }

  @Delete(':id')
  @Permissions('manage:roles')
  @ApiOperation({ summary: 'Delete a custom role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - System role or no access' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Role still assigned to users',
  })
  @ApiResponse({ status: 404, description: 'Not Found - Role not found' })
  async deleteRole(@Param('id') id: string) {
    return this.rolesService.deleteRole(id);
  }

  @Post('assign')
  @Permissions('manage:users')
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiResponse({
    status: 201,
    description: 'Role assigned successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User or role not found',
  })
  @ApiResponse({ status: 409, description: 'Conflict - Role already assigned' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async assignRole(@Body() assignRoleDto: AssignRoleDto) {
    return this.rolesService.assignRoleToUser(assignRoleDto);
  }

  @Delete(':userId/:roleId')
  @Permissions('manage:users')
  @ApiOperation({ summary: 'Remove a role from a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: 200,
    description: 'Role removed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User role assignment not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async removeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.rolesService.removeRoleFromUser(userId, roleId);
  }
}
