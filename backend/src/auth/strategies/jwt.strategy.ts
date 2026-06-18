import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { assertUserNotBlocked } from '../assert-user-not-blocked';
import { collectEffectivePermissions } from '../rbac/documents-control-permissions.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
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
        userPermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    assertUserNotBlocked(user);

    const roles = user.userRoles.map((ur) => ur.role.name);
    const rolePermissionKeys = user.userRoles.flatMap((ur) =>
      ur.role.rolePermissions.map((rp) => rp.permission.key),
    );
    const directPermissionKeys = user.userPermissions.map(
      (up) => up.permission.key,
    );
    const permissions = collectEffectivePermissions(
      rolePermissionKeys,
      directPermissionKeys,
    );

    return {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      roles,
      permissions,
      sid: payload.sid ?? null,
    };
  }
}
