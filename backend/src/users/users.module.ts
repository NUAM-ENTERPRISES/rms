import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { RecruitersController } from './recruiters.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { AuditModule } from '../common/audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../upload/upload.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, AuthModule, UploadModule, NotificationsModule],
  controllers: [UsersController, RecruitersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
