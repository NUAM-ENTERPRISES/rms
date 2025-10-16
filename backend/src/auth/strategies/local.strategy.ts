import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    // Note: passport-local only supports usernameField, so we pass countryCode+phone as one field
    // and parse it in the validate method
    super({ usernameField: 'mobileNumber', passReqToCallback: true });
  }

  async validate(
    req: any,
    mobileNumber: string,
    password: string,
  ): Promise<any> {
    try {
      const countryCode = req.body.countryCode;

      if (!countryCode) {
        throw new UnauthorizedException('Country code is required');
      }

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
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (isPasswordValid) {
        const { password: _, ...result } = user;
        return result;
      } else {
        throw new UnauthorizedException('Invalid credentials');
      }
    } catch (error) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
