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
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import type { Response, Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Public()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user with email and password. Returns access token and sets refresh token cookies.',
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
    const { accessToken, user, refresh } =
      await this.authService.login(loginDto);
    this.setRefreshCookies(res, refresh); // writes rfi & rft
    return {
      success: true,
      data: { accessToken, user },
      message: 'Login successful',
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Rotate refresh token and return new access token.',
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
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { rfi, rft } = req.cookies ?? {};
    const { accessToken, user, next } = await this.authService.rotate(rfi, rft);
    this.setRefreshCookies(res, next);
    return {
      success: true,
      data: { accessToken, user },
      message: 'Token refreshed successfully',
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User logout',
    description: 'Revoke refresh token family and clear cookies.',
  })
  @ApiBearerAuth()
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
  async logout(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { rfi } = req.cookies ?? {};
    await this.authService.revokeFamilyByTokenId(rfi);
    res.clearCookie('rfi', { path: '/api/v1/auth' });
    res.clearCookie('rft', { path: '/api/v1/auth' });
    return { success: true, message: 'Logged out' };
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get current user information',
    description: 'Retrieve current user details with roles and permissions.',
  })
  @ApiBearerAuth()
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
    const user = req.user;
    return {
      success: true,
      data: user,
      message: 'User information retrieved successfully',
    };
  }

  private setRefreshCookies(
    res: Response,
    t: { id: string; value: string; maxAgeMs: number },
  ) {
    const common = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/api/v1/auth',
    };
    res.cookie('rfi', t.id, { ...common, maxAge: t.maxAgeMs });
    res.cookie('rft', t.value, { ...common, maxAge: t.maxAgeMs });
  }
}
