import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { randomBytes, Verify } from 'crypto';
import { SendLoginOtpDto } from './dto/send-login-otp.dto';
import { OtpService } from '../otp/otp.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordWhatsappDto } from './dto/forgot-password-whatsapp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { assertUserNotBlocked } from './assert-user-not-blocked';

const REFRESH_DAYS = Number(process.env.JWT_REFRESH_DAYS ?? 7);
const REFRESH_MS = REFRESH_DAYS * 24 * 60 * 60 * 1000;

interface SessionMeta {
  ipAddress?: string;
  userAgent?: string;
}

function normalizeIp(ip?: string): string | null {
  if (!ip) return null;
  // IPv6 loopback → localhost
  if (ip === '::1') return '127.0.0.1';
  // IPv4-mapped IPv6 (e.g. ::ffff:192.168.1.1) → plain IPv4
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  return ip;
}

function parseUserAgent(ua?: string): { browser: string; os: string; deviceType: string } {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', deviceType: 'desktop' };

  let browser = 'Unknown';
  if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Edg\/|Edge\//.test(ua)) browser = 'Edge';
  else if (/Chrome/.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome';
  else if (/Firefox/.test(ua)) browser = 'Firefox';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';

  let os = 'Unknown';
  if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone/.test(ua)) os = 'iOS';
  else if (/iPad/.test(ua)) os = 'iPadOS';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  let deviceType = 'desktop';
  if (/Mobile|iPhone|Android/.test(ua)) deviceType = 'mobile';
  else if (/iPad|Tablet/.test(ua)) deviceType = 'tablet';

  return { browser, os, deviceType };
}

function newId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `id_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );
}

function newSecret() {
  return randomBytes(64).toString('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
    private otpService: OtpService,
    private notificationsGateway: NotificationsGateway,
  ) { }

  async validateUser(
    countryCode: string,
    mobileNumber: string,
    password: string,
  ) {
    console.log('AuthService.validateUser called for:', countryCode, mobileNumber);
    console.log('Password provided:', password ? 'EXISTS' : 'MISSING');

    const user = await (this.prisma as any).user.findUnique({
      where: {
        countryCode_mobileNumber: {
          countryCode,
          mobileNumber,
        },
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        userTeams: true, // Include team assignments for scope filtering
      },
    });

    if (user) {
      console.log('User found in DB, comparing passwords...');
      console.log('User password in DB starts with:', user.password.substring(0, 10));
      // Try Argon2 first, then bcrypt for backward compatibility
      let isValid = false;

      // Check if password looks like Argon2 hash (starts with $argon2)
      if (user.password.startsWith('$argon2')) {
        try {
          isValid = await argon2.verify(user.password, password);
          console.log('Argon2 verification result:', isValid);
        } catch (error) {
          console.error('Argon2 verify error:', error);
          isValid = false;
        }
      } else {
        try {
          isValid = await bcrypt.compare(password, user.password);
          console.log('Bcrypt verification result:', isValid);
        } catch (bcryptError) {
          console.error('Bcrypt compare error:', bcryptError);
          isValid = false;
        }
      }

      console.log('Final password comparison result:', isValid);
      if (isValid) {
        assertUserNotBlocked(user);
        const { password: _, ...result } = user;
        return result;
      }
    } else {
      console.log('User NOT found in DB for:', countryCode, mobileNumber);
    }
    return null;
  }

  async login(loginDto: LoginDto, meta?: SessionMeta) {
    const user = await this.validateUser(
      loginDto.countryCode,
      loginDto.mobileNumber,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const refresh = await this.issueRefresh(user.id); // { id, value, maxAgeMs }

    // Create session record
    const sessionId = await this.createSession(user.id, refresh.id, meta);
    const accessToken = this.issueAccess({ id: user.id, email: user.email }, sessionId);

    // Audit log the login
    await this.auditService.logAuthAction('login', user.id, {
      action: 'user_login',
      countryCode: loginDto.countryCode,
      mobileNumber: loginDto.mobileNumber,
      timestamp: new Date(),
    });

    return {
      accessToken,
      user: this.toUserDTO(user),
      refresh,
    };
  }

  async rotate(rfi: string | undefined, rft: string | undefined) {
    if (!rfi || !rft) throw new UnauthorizedException('Missing refresh cookie');

    // Fetch by id
    const row = await (this.prisma as any).refreshToken.findUnique({
      where: { id: rfi },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
            userTeams: true, // Include team assignments for scope filtering
          },
        },
      },
    });

    if (!row || row.revokedAt || row.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    assertUserNotBlocked(row.user);

    // Verify secret value
    const ok = await argon2.verify(row.hash, rft);
    if (!ok) {
      await this.revokeFamily(row.familyId); // suspected replay/tamper
      throw new UnauthorizedException('Refresh token mismatch');
    }

    // Rotate within a transaction
    const next = await this.rotateInTx(row);

    // Find the active session for this token and update its refreshTokenId to the new one.
    // If none exists (legacy / data drift), create one so the access token always carries `sid`
    // and session activity pings can resolve the row.
    const session = await (this.prisma as any).userSession.findFirst({
      where: { refreshTokenId: row.id, isActive: true },
    });

    let accessSessionId: string;
    if (session) {
      await (this.prisma as any).userSession.update({
        where: { id: session.id },
        data: { refreshTokenId: next.id },
      });
      accessSessionId = session.id;
    } else {
      accessSessionId = await this.createSession(row.userId, next.id, undefined);
    }

    const accessToken = this.issueAccess(
      { id: row.userId, email: row.user.email },
      accessSessionId,
    );
    return {
      accessToken,
      user: this.toUserDTO(row.user),
      next,
    }; // next: { id, value, maxAgeMs }
  }

  async revokeFamilyByTokenId(rfi: string | undefined) {
    if (!rfi) return;
    const row = await (this.prisma as any).refreshToken.findUnique({
      where: { id: rfi },
    });
    if (row) {
      await this.revokeFamily(row.familyId);
      await (this.prisma as any).userSession.updateMany({
        where: { refreshTokenId: rfi },
        data: { isActive: false },
      });
    }
  }

  async logoutCurrentSession(params: {
    userId?: string;
    sessionId?: string;
    refreshTokenId?: string;
  }) {
    const { userId, sessionId, refreshTokenId } = params;

    // Best-effort: revoke refresh family (cookie-based web flow)
    await this.revokeFamilyByTokenId(refreshTokenId);

    // Reliable: end the current session by JWT sid (per LOGIN_SESSION_IMPLEMENTATION)
    if (userId && sessionId) {
      await (this.prisma as any).userSession.updateMany({
        where: { id: sessionId, userId },
        data: { isActive: false },
      });

      // Notify admin monitoring page of session end
      this.notificationsGateway
        .broadcastToAdmins('session:updated', { type: 'session_ended', userId, sessionId })
        .catch(() => {/* non-critical */});
    }

    if (userId) {
      await this.auditService.logAuthAction('logout', userId, {
        action: 'user_logout',
        timestamp: new Date(),
        ...(sessionId ? { sessionId } : {}),
      });
    }

    return { success: true, message: 'Logout successful' };
  }


  async sendLoginOtp(sendLoginOtpDto: SendLoginOtpDto) {
    const { countryCode, mobileNumber } = sendLoginOtpDto;
    // Validate user exists
    const user = await (this.prisma as any).user.findUnique({
      where: {
        countryCode_mobileNumber: {
          countryCode: countryCode,
          mobileNumber: mobileNumber,
        },
      },
    });

    console.log('User found for OTP:', user);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    assertUserNotBlocked(user);

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP

    // Optionally, store the OTP hash and expiration in the database for verification later
    const otpHash = await argon2.hash(otp);
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes

    await (this.prisma as any).user.update({
      where: { id: user.id },
      data: {
        otp: otpHash,
        otpExpiresAt: otpExpiresAt,
      },
    });

    // Send OTP via MSG91
    const smsSent = await this.otpService.sendOtp(countryCode, mobileNumber, otp);
    if (!smsSent) throw new Error('Failed to send OTP SMS');

    return true;
  }

  async sendLoginWhatsappOtp(sendLoginOtpDto: SendLoginOtpDto) {
    const { countryCode, mobileNumber } = sendLoginOtpDto;
    // Validate user exists
    const user = await (this.prisma as any).user.findUnique({
      where: {
        countryCode_mobileNumber: {
          countryCode: countryCode,
          mobileNumber: mobileNumber,
        },
      },
    });

    console.log('User found for WhatsApp OTP:', user);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    assertUserNotBlocked(user);

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP

    // Optionally, store the OTP hash and expiration in the database for verification later
    const otpHash = await argon2.hash(otp);
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes

    await (this.prisma as any).user.update({
      where: { id: user.id },
      data: {
        otp: otpHash,
        otpExpiresAt: otpExpiresAt,
      },
    });

    // Send OTP via MSG91 WhatsApp
    const whatsappSent = await this.otpService.sendWhatsappOtp(countryCode, mobileNumber, otp);
    if (!whatsappSent) throw new Error('Failed to send OTP via WhatsApp');

    return true;
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto, meta?: SessionMeta) {
    const { countryCode, mobileNumber, otp } = verifyOtpDto;
    // Find user by country code and phone
    const user = await (this.prisma as any).user.findUnique({
      where: {
        countryCode_mobileNumber: {
          countryCode,
          mobileNumber,
        },
      },
    });

    if (!user || !user.otp || !user.otpExpiresAt) {
      throw new BadRequestException('Invalid OTP or user not found');
    }

    // Check if OTP is expired
    if (user.otpExpiresAt < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    // Verify the OTP
    const isOtpValid = await argon2.verify(user.otp, otp);
    if (!isOtpValid) {
      throw new BadRequestException('Invalid OTP');
    }

    assertUserNotBlocked(user);

    // Clear OTP fields after successful verification
    await (this.prisma as any).user.update({
      where: { id: user.id },
      data: {
        otp: null,
        otpExpiresAt: null,
      },
    });

    // Re-fetch the user including relations needed for DTO (roles, permissions, teams)
    const fullUser = await (this.prisma as any).user.findUnique({
      where: { id: user.id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        userTeams: true,
      },
    });

    if (!fullUser) {
      // Unexpected - user was present earlier but not found now
      throw new BadRequestException('User not found after OTP verification');
    }

    // Issue tokens upon successful OTP verification
    const refresh = await this.issueRefresh(fullUser.id); // { id, value, maxAgeMs }

    // Create session record
    const sessionId = await this.createSession(fullUser.id, refresh.id, meta);
    const accessToken = this.issueAccess({ id: fullUser.id, email: fullUser.email }, sessionId);

    return {
      accessToken,
      user: this.toUserDTO(fullUser),
      refresh,
    };

  }

  async sendForgotPasswordOtp(dto: ForgotPasswordWhatsappDto) {
    const { countryCode, mobileNumber } = dto;

    // 1. Verify user exists
    const user = await (this.prisma as any).user.findUnique({
      where: {
        countryCode_mobileNumber: {
          countryCode,
          mobileNumber,
        },
      },
    });

    if (!user) {
      throw new BadRequestException('User with this mobile number does not exist');
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await argon2.hash(otp);

    // 3. Save hashed OTP and expiry (10 min)
    await (this.prisma as any).user.update({
      where: { id: user.id },
      data: {
        otp: hashedOtp,
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // 4. Send OTP via WhatsApp
    const whatsappSent = await this.otpService.sendWhatsappOtp(
      countryCode,
      mobileNumber,
      otp,
    );

    if (!whatsappSent) {
      throw new BadRequestException('Failed to send OTP via WhatsApp');
    }

    return { success: true, message: 'OTP sent successfully' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { countryCode, mobileNumber, otp, newPassword } = dto;

    // 1. Find user
    const user = await (this.prisma as any).user.findUnique({
      where: {
        countryCode_mobileNumber: {
          countryCode,
          mobileNumber,
        },
      },
    });

    if (!user || !user.otp || !user.otpExpiresAt) {
      throw new BadRequestException('Invalid request or user not found');
    }

    // 2. Check expiry
    if (user.otpExpiresAt < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    // 3. Verify OTP
    const isOtpValid = await argon2.verify(user.otp, otp);
    if (!isOtpValid) {
      throw new BadRequestException('Invalid OTP');
    }

    // 4. Update password and clear OTP
    const hashedPassword = await argon2.hash(newPassword);

    await (this.prisma as any).user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        otp: null,
        otpExpiresAt: null,
        userVersion: { increment: 1 },
      },
    });

    // 5. Log audit action
    await this.auditService.logAuthAction('password_change', user.id, {
      action: 'password_reset',
      source: 'mobile_forgot_password',
      timestamp: new Date(),
    });

    return { success: true, message: 'Password has been reset successfully' };
  }


  async logout(userId: string) {
    // Revoke all refresh tokens for the user
    await this.revokeRefreshTokenFamily(userId);

    // Deactivate all sessions for the user
    await (this.prisma as any).userSession.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    // Audit log the logout
    await this.auditService.logAuthAction('logout', userId, {
      action: 'user_logout',
      timestamp: new Date(),
    });

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  private issueAccess(user: { id: string; email: string }, sessionId?: string) {
    return this.jwtService.sign(
      { sub: user.id, email: user.email, ...(sessionId ? { sid: sessionId } : {}) },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
      },
    );
  }

  private async issueRefresh(userId: string) {
    const id = newId();
    const familyId = newId();
    const value = newSecret();
    const hash = await argon2.hash(value);

    await (this.prisma as any).refreshToken.create({
      data: {
        id,
        userId,
        familyId,
        hash,
        expiresAt: new Date(Date.now() + REFRESH_MS),
      },
    });

    return { id, value, maxAgeMs: REFRESH_MS };
  }

  private async rotateInTx(current: {
    id: string;
    userId: string;
    familyId: string;
  }) {
    const id = newId();
    const value = newSecret();
    const hash = await argon2.hash(value);
    const expiresAt = new Date(Date.now() + REFRESH_MS);

    await (this.prisma as any).$transaction([
      (this.prisma as any).refreshToken.update({
        where: { id: current.id },
        data: { revokedAt: new Date() },
      }),
      (this.prisma as any).refreshToken.create({
        data: {
          id,
          userId: current.userId,
          familyId: current.familyId,
          hash,
          expiresAt,
        },
      }),
    ]);

    return { id, value, maxAgeMs: REFRESH_MS };
  }

  private async revokeFamily(familyId: string) {
    await (this.prisma as any).refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeRefreshTokenFamily(
    familyIdOrUserId: string,
  ): Promise<void> {
    // Check if it's a familyId or userId
    const isFamilyId = familyIdOrUserId.length === 25; // CUID length

    if (isFamilyId) {
      // Revoke by family ID
      await (this.prisma as any).refreshToken.updateMany({
        where: { familyId: familyIdOrUserId },
        data: { revokedAt: new Date() },
      });
    } else {
      // Revoke by user ID
      await (this.prisma as any).refreshToken.updateMany({
        where: { userId: familyIdOrUserId },
        data: { revokedAt: new Date() },
      });
    }
  }

  async mobileRotate(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    // Find the refresh token by value (hash)
    const tokens = await (this.prisma as any).refreshToken.findMany({
      where: { 
        revokedAt: null,
        expiresAt: { gt: new Date() } 
      },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
            userTeams: true,
          },
        },
      },
    });

    // Find the matching token by verifying the hash
    let matchedToken: any = null;
    for (const token of tokens) {
      try {
        const isMatch = await argon2.verify(token.hash, refreshToken);
        if (isMatch) {
          matchedToken = token;
          break;
        }
      } catch (error) {
        // Continue checking other tokens
        continue;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate the token
    const next = await this.rotateInTx(matchedToken);

    const session = await (this.prisma as any).userSession.findFirst({
      where: { refreshTokenId: matchedToken.id, isActive: true },
    });

    let accessSessionId: string;
    if (session) {
      await (this.prisma as any).userSession.update({
        where: { id: session.id },
        data: { refreshTokenId: next.id },
      });
      accessSessionId = session.id;
    } else {
      accessSessionId = await this.createSession(
        matchedToken.userId,
        next.id,
        undefined,
      );
    }

    const accessToken = this.issueAccess(
      { id: matchedToken.userId, email: matchedToken.user.email },
      accessSessionId,
    );

    return {
      accessToken,
      user: this.toUserDTO(matchedToken.user),
      next,
    };
  }

  async revokeFamilyByToken(refreshToken: string) {
    if (!refreshToken) return;

    // Find the refresh token by value (hash)
    const tokens = await (this.prisma as any).refreshToken.findMany({
      where: { revokedAt: null },
    });

    // Find the matching token by verifying the hash
    let matchedToken: any = null;
    for (const token of tokens) {
      try {
        const isMatch = await argon2.verify(token.hash, refreshToken);
        if (isMatch) {
          matchedToken = token;
          break;
        }
      } catch (error) {
        // Continue checking other tokens
        continue;
      }
    }

    if (matchedToken) {
      await this.revokeFamily(matchedToken.familyId);
      await (this.prisma as any).userSession.updateMany({
        where: { refreshTokenId: matchedToken.id },
        data: { isActive: false },
      });
    }
  }

  private async createSession(userId: string, refreshTokenId: string, meta?: SessionMeta): Promise<string> {
    const { browser, os, deviceType } = parseUserAgent(meta?.userAgent);
    const session = await (this.prisma as any).userSession.create({
      data: {
        userId,
        refreshTokenId,
        ipAddress: normalizeIp(meta?.ipAddress),
        userAgent: meta?.userAgent ?? null,
        browser,
        os,
        deviceType,
        lastActivityAt: new Date(),
        isActive: true,
      },
    });

    // Notify admin monitoring page of new session
    this.notificationsGateway
      .broadcastToAdmins('session:updated', { type: 'session_created', userId, sessionId: session.id })
      .catch(() => {/* non-critical */});

    return session.id;
  }

  private toUserDTO(user: any) {
    // Get user's team IDs for scope filtering
    const teamIds = (user.userTeams ?? []).map((ut: any) => ut.teamId);

    const roles = (user.userRoles ?? []).map((ur: any) => ur.role?.name).filter(Boolean);

    const permissions = (user.userRoles ?? []).flatMap((ur: any) =>
      (ur.role?.rolePermissions ?? []).map((rp: any) => rp.permission?.key).filter(Boolean),
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles,
      permissions,
      teamIds,
      userVersion: user.updatedAt ? user.updatedAt.getTime() : Date.now(), // Use updatedAt as version for cache invalidation
    };
  }
}
