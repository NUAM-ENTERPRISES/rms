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
import { randomBytes } from 'crypto';

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
  ) {}

  async validateUser(email: string, password: string) {
    const user = await (this.prisma as any).user.findUnique({
      where: { email },
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
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.issueAccess({ id: user.id, email: user.email });
    const refresh = await this.issueRefresh(user.id); // { id, value, maxAgeMs }

    // Audit log the login
    await this.auditService.logAuthAction('login', user.id, {
      action: 'user_login',
      email: loginDto.email,
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

  private toUserDTO(user: any) {
    // Get user's team IDs for scope filtering
    const teamIds = user.userTeams?.map((ut: any) => ut.teamId) || [];

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.userRoles.map((ur: any) => ur.role.name),
      permissions: user.userRoles.flatMap((ur: any) =>
        ur.role.rolePermissions.map((rp: any) => rp.permission.key),
      ),
      teamIds,
      userVersion: user.updatedAt.getTime(), // Use updatedAt as version for cache invalidation
    };
  }
}
