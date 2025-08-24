import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/rbac/roles.guard';
import { Roles } from '../auth/rbac/roles.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles('Manager', 'CEO', 'Director')
  @ApiOperation({ summary: 'Get all roles with their permissions' })
  @ApiResponse({
    status: 200,
    description: 'List of all roles with their permissions',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              permissions: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findAll() {
    const roles = await this.rolesService.findAll();
    return {
      success: true,
      data: roles,
      message: 'Roles retrieved successfully',
    };
  }

  @Post('assign')
  @Roles('Manager', 'CEO', 'Director')
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiResponse({
    status: 201,
    description: 'Role assigned successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            roleId: { type: 'string' },
            roleName: { type: 'string' },
            userName: { type: 'string' },
            userEmail: { type: 'string' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({ status: 404, description: 'Not Found - User or role not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Role already assigned' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async assignRole(@Body() assignRoleDto: AssignRoleDto) {
    return this.rolesService.assignRoleToUser(assignRoleDto);
  }

  @Delete(':userId/:roleId')
  @Roles('Manager', 'CEO', 'Director')
  @ApiOperation({ summary: 'Remove a role from a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: 200,
    description: 'Role removed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            roleId: { type: 'string' },
            roleName: { type: 'string' },
            userName: { type: 'string' },
            userEmail: { type: 'string' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not Found - User role assignment not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async removeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.rolesService.removeRoleFromUser(userId, roleId);
  }

  @Get('user/:userId')
  @Roles('Manager', 'CEO', 'Director')
  @ApiOperation({ summary: 'Get roles assigned to a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User roles retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              permissions: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getUserRoles(@Param('userId') userId: string) {
    const roles = await this.rolesService.getUserRoles(userId);
    return {
      success: true,
      data: roles,
      message: 'User roles retrieved successfully',
    };
  }
}
