import { Module, Global } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { SystemConfigController } from './system-config.controller';
import { PrismaService } from '../database/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Global() // Make it available everywhere
@Module({
  imports: [AuthModule],
  controllers: [SystemConfigController],
  providers: [SystemConfigService, PrismaService],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
