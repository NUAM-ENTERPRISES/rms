import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
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
      },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const { refreshToken, jti, familyId } = await this.generateRefreshToken(
      user.id,
    );

    // Return access token and user data
    // Note: We'll handle cookies in the controller using interceptors
    return {
      success: true,
      data: {
        accessToken,
        refreshToken, // Include refresh token in response for now
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.userRoles.map((ur) => ur.role.name),
          permissions: user.userRoles.flatMap((ur) =>
            ur.role.rolePermissions.map((rp) => rp.permission.key),
          ),
        },
      },
      message: 'Login successful',
    };
  }

  async refreshToken(req: Request) {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.rft;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    try {
      // Verify and rotate refresh token
      const { newAccessToken, newRefreshToken, jti, familyId } =
        await this.rotateRefreshToken(refreshToken);

      // Get user data
      const user = await this.getUserWithRolesAndPermissions(jti);

      return {
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken, // Include in response for interceptor to set cookie
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: user.userRoles.map((ur) => ur.role.name),
            permissions: user.userRoles.flatMap((ur) =>
              ur.role.rolePermissions.map((rp) => rp.permission.key),
            ),
          },
        },
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    // Revoke all refresh tokens for the user
    await this.revokeRefreshTokenFamily(userId);

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  private generateAccessToken(user: { id: string; email: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
    });
  }

  private async generateRefreshToken(userId: string): Promise<{
    refreshToken: string;
    jti: string;
    familyId: string;
  }> {
    const jti = this.generateJti();
    const familyId = this.generateFamilyId();
    const refreshToken = this.generateSecureToken();
    const tokenHash = await bcrypt.hash(refreshToken, 10); // Use bcrypt for hash

    // Store in database
    await this.prisma.refreshToken.create({
      data: {
        jti,
        familyId,
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + this.getRefreshTokenExpiry()),
      },
    });

    return { refreshToken, jti, familyId };
  }

  private async rotateRefreshToken(oldRefreshToken: string): Promise<{
    newAccessToken: string;
    newRefreshToken: string;
    jti: string;
    familyId: string;
  }> {
    // Find the old token
    const oldTokenRecord = await this.findRefreshTokenByValue(oldRefreshToken);
    if (!oldTokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired or revoked
    if (oldTokenRecord.expiresAt < new Date() || oldTokenRecord.revokedAt) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    // Revoke the old token family
    await this.revokeRefreshTokenFamily(oldTokenRecord.familyId);

    // Generate new tokens
    const newAccessToken = this.generateAccessToken({
      id: oldTokenRecord.userId,
      email: oldTokenRecord.user.email,
    });
    const {
      refreshToken: newRefreshToken,
      jti,
      familyId,
    } = await this.generateRefreshToken(oldTokenRecord.userId);

    return { newAccessToken, newRefreshToken, jti, familyId };
  }

  private async findRefreshTokenByValue(refreshToken: string) {
    // Find all tokens for the user and verify against each one
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
      include: { user: true },
    });

    for (const token of tokens) {
      if (await bcrypt.compare(refreshToken, token.tokenHash)) {
        // Use bcrypt for comparison
        return token;
      }
    }

    return null;
  }

  private async revokeRefreshTokenFamily(
    familyIdOrUserId: string,
  ): Promise<void> {
    // Check if it's a familyId or userId
    const isFamilyId = familyIdOrUserId.length === 25; // CUID length

    if (isFamilyId) {
      // Revoke by family ID
      await this.prisma.refreshToken.updateMany({
        where: { familyId: familyIdOrUserId },
        data: { revokedAt: new Date() },
      });
    } else {
      // Revoke by user ID
      await this.prisma.refreshToken.updateMany({
        where: { userId: familyIdOrUserId },
        data: { revokedAt: new Date() },
      });
    }
  }

  private async getUserWithRolesAndPermissions(jti: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        refreshTokens: {
          some: { jti },
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
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie('rft', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: this.getRefreshTokenExpiry(),
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('rft', {
      path: '/api/v1/auth',
    });
  }

  private generateJti(): string {
    return `jti_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFamilyId(): string {
    return `fam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSecureToken(): string {
    return require('crypto').randomBytes(64).toString('hex');
  }

  private getRefreshTokenExpiry(): number {
    const days = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    );
    return days * 24 * 60 * 60 * 1000;
  }
}
