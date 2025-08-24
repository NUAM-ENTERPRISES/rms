import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-db')
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
        error: error.message,
        message: 'Database connection failed',
      };
    }
  }
}
