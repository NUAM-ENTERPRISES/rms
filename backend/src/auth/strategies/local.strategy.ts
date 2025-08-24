import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<any> {
    try {
      console.log('🔍 LocalStrategy: Starting validation for email:', email);

      // Test database connection first
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

      console.log('🔍 LocalStrategy: User found:', !!user);

      if (!user) {
        console.log('❌ LocalStrategy: User not found');
        throw new UnauthorizedException('Invalid credentials');
      }

      console.log('🔍 LocalStrategy: Comparing password...');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('🔍 LocalStrategy: Password valid:', isPasswordValid);

      if (isPasswordValid) {
        const { password: _, ...result } = user;
        console.log('✅ LocalStrategy: Validation successful');
        return result;
      } else {
        console.log('❌ LocalStrategy: Invalid password');
        throw new UnauthorizedException('Invalid credentials');
      }
    } catch (error) {
      console.error('❌ LocalStrategy: Error during validation:', error);
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
