import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user with email and password. Returns access token and sets refresh token as httpOnly cookie.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'user123' },
                email: { type: 'string', example: 'user@example.com' },
                name: { type: 'string', example: 'John Doe' },
                roles: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['Manager'],
                },
                permissions: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['read:all', 'manage:users'],
                },
              },
            },
          },
        },
        message: { type: 'string', example: 'Login successful' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // Set refresh token as httpOnly cookie
    if (result.success && result.data.refreshToken) {
      res.cookie('rft', result.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Refresh access token using refresh token from httpOnly cookie. Returns new access token and rotates refresh token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'user123' },
                email: { type: 'string', example: 'user@example.com' },
                name: { type: 'string', example: 'John Doe' },
                roles: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['Manager'],
                },
                permissions: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['read:all', 'manage:users'],
                },
              },
            },
          },
        },
        message: { type: 'string', example: 'Token refreshed successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Request() req, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.refreshToken(req);

    // Set new refresh token as httpOnly cookie
    if (result.success && result.data.refreshToken) {
      res.cookie('rft', result.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'User logout',
    description:
      'Logout user and revoke all refresh tokens. Clears refresh token cookie.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Logout successful' },
      },
    },
  })
  async logout(@Request() req, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logout(req.user.id);

    // Clear refresh token cookie
    res.clearCookie('rft', {
      path: '/api/v1/auth',
    });

    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user information',
    description:
      'Get current authenticated user details including roles and permissions.',
  })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'user123' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe' },
            roles: {
              type: 'array',
              items: { type: 'string' },
              example: ['Manager'],
            },
            permissions: {
              type: 'array',
              items: { type: 'string' },
              example: ['read:all', 'manage:users'],
            },
          },
        },
        message: {
          type: 'string',
          example: 'User information retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Request() req) {
    // User data is already attached by JWT strategy
    return {
      success: true,
      data: req.user,
      message: 'User information retrieved successfully',
    };
  }
}
