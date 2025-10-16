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
import { send } from 'process';
import { SendLoginOtpDto } from './dto/send-login-otp.dto';
import { tryCatch } from 'bullmq';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Public()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user with country code, phone number and password. Returns access token and sets refresh token cookies.',
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
                countryCode: { type: 'string', example: '+91' },
                phone: { type: 'string', example: '9876543210' },
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

  @Post('login-otp')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({
    summary: 'Send login OTP',
    description:
      'Send a one-time password (OTP) to the user\'s phone number for login verification.',
  })
  @ApiBody({ type: SendLoginOtpDto })
  async sendLoginOtp(@Body() sendLoginOtpDto: SendLoginOtpDto) {
    await this.authService.sendLoginOtp(sendLoginOtpDto);
    return {
      success: true,
      message: 'OTP sent successfully',
    };
  }

  @Post('login-whatsapp-otp')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({
    summary: 'Send login WhatsApp OTP',
    description:
      'Send a one-time password (OTP) to the user\'s phone number via WhatsApp for login verification.',
  })
  @ApiBody({ type: SendLoginOtpDto })
  async sendLoginWhatsappOtp(@Body() sendLoginOtpDto: SendLoginOtpDto) {
    await this.authService.sendLoginWhatsappOtp(sendLoginOtpDto);
    return {
      success: true,
      message: 'OTP sent successfully',
    };
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({
    summary: 'Verify login OTP',
    description:
      'Verify the one-time password (OTP) sent to the user\'s phone number and authenticate the user.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        countryCode: {
          type: 'string',
          example: '+1',
          description: 'Country dialing code for the phone number',
        },
        phone: {
          type: 'string',
          example: '4155550123',
          description: 'Recipient phone number without the country code',
        },
        otp: {
          type: 'string',
          example: '123456',
          description: 'The one-time password sent to the user',
        },
      },
      required: ['countryCode', 'phone', 'otp'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified and login successful',
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
        message: { type: 'string', example: 'OTP verified and login successful' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP or phone number' })
  async verifyOtp(
    @Body()
    verifyOtpDto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, user, refresh } = await this.authService.verifyOtp(verifyOtpDto);
    this.setRefreshCookies(res, refresh);
    // writes rfi & rft
    return {
      success: true,
      data: { accessToken, user },
      message: 'OTP verified and login successful',
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
