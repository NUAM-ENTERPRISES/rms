import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  health() {
    return { status: 'ok' };
  }

  @Get('test-db')
  @Public()
  async testDatabase() {
    try {
      const userCount = await this.prisma.user.count();
      return {
        success: true,
        userCount,
        message: 'Database connection successful',
      };
    } catch (error) {
      console.error('Database test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Database connection failed',
      };
    }
  }
}
