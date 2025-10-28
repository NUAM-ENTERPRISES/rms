import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PrismaModule } from '../database/prisma.module';
import { AuditModule } from '../common/audit/audit.module';
import { RbacUtil } from './rbac/rbac.util';
import { RolesGuard } from './rbac/roles.guard';
import { PermissionsGuard } from './rbac/permissions.guard';
import { TeamScopeGuard } from './rbac/team-scope.guard';
import { ServerTimingInterceptor } from '../common/interceptors/server-timing.interceptor';
import { OtpService } from 'src/otp/otp.service';
import { OtpModule } from 'src/otp/otp.module';

@Module({
  imports: [
    OtpModule,
    PassportModule,
    PrismaModule,
    AuditModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    LocalStrategy,
    RbacUtil,
    RolesGuard,
    PermissionsGuard,
    TeamScopeGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: ServerTimingInterceptor,
    },
  ],
  exports: [
    AuthService,
    RbacUtil,
    RolesGuard,
    PermissionsGuard,
    TeamScopeGuard,
  ],
})
export class AuthModule {}
