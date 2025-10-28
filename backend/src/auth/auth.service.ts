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
import { OtpService } from 'src/otp/otp.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';

const REFRESH_DAYS = Number(process.env.JWT_REFRESH_DAYS ?? 7);
const REFRESH_MS = REFRESH_DAYS * 24 * 60 * 60 * 1000;

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
  ) { }

  async validateUser(
    countryCode: string,
    mobileNumber: string,
    password: string,
  ) {
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
      // Try Argon2 first, then bcrypt for backward compatibility
      let isValid = false;

      // Check if password looks like Argon2 hash (starts with $argon2)
      if (user.password.startsWith('$argon2')) {
        try {
          isValid = await argon2.verify(user.password, password);
        } catch (error) {
          isValid = false;
        }
      } else {
        try {
          isValid = await bcrypt.compare(password, user.password);
        } catch (bcryptError) {
          isValid = false;
        }
      }

      if (isValid) {
        const { password: _, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(
      loginDto.countryCode,
      loginDto.mobileNumber,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.issueAccess({ id: user.id, email: user.email });
    const refresh = await this.issueRefresh(user.id); // { id, value, maxAgeMs }

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

    // Verify secret value
    const ok = await argon2.verify(row.hash, rft);
    if (!ok) {
      await this.revokeFamily(row.familyId); // suspected replay/tamper
      throw new UnauthorizedException('Refresh token mismatch');
    }

    // Rotate within a transaction
    const next = await this.rotateInTx(row);

    const accessToken = this.issueAccess({
      id: row.userId,
      email: row.user.email,
    });
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
    if (row) await this.revokeFamily(row.familyId);
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
    };

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
    };

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

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
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
    const accessToken = this.issueAccess({ id: fullUser.id, email: fullUser.email });
    const refresh = await this.issueRefresh(fullUser.id); // { id, value, maxAgeMs }

    return {
      accessToken,
      user: this.toUserDTO(fullUser),
      refresh,
    };

  }


  async logout(userId: string) {
    // Revoke all refresh tokens for the user
    await this.revokeRefreshTokenFamily(userId);

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

  private issueAccess(user: { id: string; email: string }) {
    return this.jwtService.sign(
      { sub: user.id, email: user.email },
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

    const accessToken = this.issueAccess({
      id: matchedToken.userId,
      email: matchedToken.user.email,
    });

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
    }
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
