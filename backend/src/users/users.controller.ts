import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { QueryUsersDto } from './dto/query-users.dto';

import { Permissions } from '../auth/rbac/permissions.decorator';
import { UserWithRoles, PaginatedUsers } from './types';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions('manage:users')
  @ApiOperation({
    summary: 'Create a new user',
    description:
      'Create a new user with roles and permissions. Only managers and above can create users.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'user123' },
            email: { type: 'string', example: 'john.doe@affiniks.com' },
            name: { type: 'string', example: 'John Doe' },
            phone: { type: 'string', example: '+1234567890' },
            dateOfBirth: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            userRoles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        message: { type: 'string', example: 'User created successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({ status: 409, description: 'Conflict - User already exists' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async create(
    @Body() createUserDto: CreateUserDto,
    @Request() req,
  ): Promise<{
    success: boolean;
    data: UserWithRoles;
    message: string;
  }> {
    const user = await this.usersService.create(createUserDto, req.user.id);
    return {
      success: true,
      data: user,
      message: 'User created successfully',
    };
  }

  @Get()
  @Permissions('read:users')
  @ApiOperation({
    summary: 'Get all users with pagination and search',
    description:
      'Retrieve a paginated list of users with optional search and filtering.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for name or email',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort field',
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    example: 'desc',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  dateOfBirth: { type: 'string', format: 'date-time' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  userRoles: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        role: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            description: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            total: { type: 'number', example: 50 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 5 },
          },
        },
        message: { type: 'string', example: 'Users retrieved successfully' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findAll(@Query() query: QueryUsersDto): Promise<{
    success: boolean;
    data: PaginatedUsers;
    message: string;
  }> {
    const result = await this.usersService.findAll(query);
    return {
      success: true,
      data: result,
      message: 'Users retrieved successfully',
    };
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Retrieve current user profile with analytics and detailed information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            mobileNumber: { type: 'string' },
            countryCode: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date-time' },
            profileImage: { type: 'string' },
            location: { type: 'string' },
            timezone: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
            permissions: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            lastLogin: { type: 'string', format: 'date-time' },
            stats: {
              type: 'object',
              properties: {
                candidatesManaged: { type: 'number' },
                projectsCreated: { type: 'number' },
                documentsVerified: { type: 'number' },
              },
            },
          },
        },
        message: { type: 'string', example: 'Profile retrieved successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    const userId = req.user.id;
    const profile = await this.usersService.getUserProfile(userId);
    return {
      success: true,
      data: profile,
      message: 'Profile retrieved successfully',
    };
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Update current user profile information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(@Request() req, @Body() updateData: UpdateUserDto) {
    const userId = req.user.id;
    const updatedUser = await this.usersService.update(userId, updateData);
    return {
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully',
    };
  }

  @Post('profile/change-password')
  @ApiOperation({
    summary: 'Change current user password',
    description: 'Change password for the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changeProfilePassword(
    @Request() req,
    @Body() changePasswordData: ChangePasswordDto,
  ) {
    const userId = req.user.id;
    await this.usersService.changePassword(userId, changePasswordData);
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  @Delete('profile')
  @ApiOperation({
    summary: 'Delete current user account',
    description: 'Delete the current user account permanently.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAccount(@Request() req) {
    const userId = req.user.id;
    await this.usersService.remove(userId);
    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }

  @Post('profile/upload-image')
  @ApiOperation({
    summary: 'Upload profile image',
    description: 'Upload profile image for the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile image uploaded successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadProfileImage(
    @Request() req,
    @Body() imageData: { profileImage: string },
  ) {
    const userId = req.user.id;
    await this.usersService.update(userId, {
      profileImage: imageData.profileImage,
    });
    return {
      success: true,
      data: { profileImage: imageData.profileImage },
      message: 'Profile image uploaded successfully',
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their ID.',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user123' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            phone: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            userRoles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        message: { type: 'string', example: 'User retrieved successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not Found - User not found' })
  async findOne(@Param('id') id: string): Promise<{
    success: boolean;
    data: UserWithRoles;
    message: string;
  }> {
    const user = await this.usersService.findOne(id);
    return {
      success: true,
      data: user,
      message: 'User retrieved successfully',
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update user',
    description:
      'Update user information. Users can update their own profile, managers can update any user.',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user123' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            phone: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            userRoles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        message: { type: 'string', example: 'User updated successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({ status: 404, description: 'Not Found - User not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ): Promise<{
    success: boolean;
    data: UserWithRoles;
    message: string;
  }> {
    // Check if user is updating their own profile or has manager permissions
    const currentUser = req.user;
    if (
      currentUser.id !== id &&
      !currentUser.roles.includes('Manager') &&
      !currentUser.roles.includes('CEO') &&
      !currentUser.roles.includes('Director')
    ) {
      throw new Error('Insufficient permissions to update this user');
    }

    const user = await this.usersService.update(id, updateUserDto, req.user.id);
    return {
      success: true,
      data: user,
      message: 'User updated successfully',
    };
  }

  @Post(':id/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change user password',
    description:
      'Change user password. Users can only change their own password.',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user123' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Password changed successfully',
            },
          },
        },
        message: { type: 'string', example: 'Password changed successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid password' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Current password incorrect',
  })
  @ApiResponse({ status: 404, description: 'Not Found - User not found' })
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req,
  ) {
    // Users can only change their own password
    const currentUser = req.user;
    if (currentUser.id !== id) {
      throw new Error('You can only change your own password');
    }

    const result = await this.usersService.changePassword(
      id,
      changePasswordDto,
    );
    return {
      success: true,
      data: result,
      message: 'Password changed successfully',
    };
  }

  @Delete(':id')
  @Permissions('manage:users')
  @ApiOperation({
    summary: 'Delete user',
    description: 'Delete a user. Only managers and above can delete users.',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user123' })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'User deleted successfully' },
          },
        },
        message: { type: 'string', example: 'User deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not Found - User not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async remove(@Param('id') id: string, @Request() req) {
    const result = await this.usersService.remove(id, req.user.id);
    return {
      success: true,
      data: result,
      message: 'User deleted successfully',
    };
  }

  @Get(':id/roles')
  @ApiOperation({
    summary: 'Get user roles',
    description: 'Retrieve all roles assigned to a specific user.',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user123' })
  @ApiResponse({
    status: 200,
    description: 'User roles retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { type: 'string' },
          example: ['Manager', 'Recruiter'],
        },
        message: {
          type: 'string',
          example: 'User roles retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not Found - User not found' })
  async getUserRoles(@Param('id') id: string) {
    const roles = await this.usersService.getUserRoles(id);
    return {
      success: true,
      data: roles,
      message: 'User roles retrieved successfully',
    };
  }

  @Get(':id/permissions')
  @ApiOperation({
    summary: 'Get user permissions',
    description:
      'Retrieve all permissions assigned to a specific user through their roles.',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user123' })
  @ApiResponse({
    status: 200,
    description: 'User permissions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { type: 'string' },
          example: ['read:projects', 'manage:users'],
        },
        message: {
          type: 'string',
          example: 'User permissions retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not Found - User not found' })
  async getUserPermissions(@Param('id') id: string) {
    const permissions = await this.usersService.getUserPermissions(id);
    return {
      success: true,
      data: permissions,
      message: 'User permissions retrieved successfully',
    };
  }
}
