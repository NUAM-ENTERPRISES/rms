import { Controller, Get, Delete, Request, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { HrdRemindersService } from './hrd-reminders.service';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('HRD Reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hrd-reminders')
export class HrdRemindersController {
  constructor(private readonly hrdRemindersService: HrdRemindersService) {}

  @Get('hrd-scheduler')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({ summary: 'Get HRD scheduler entries', description: 'Get HRD scheduler reminders for the current processing user. Returns reminders that have been sent (sentAt != null). Supports pagination via `page` and `limit` query params.' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'HRD scheduler entries retrieved successfully' })
  async getHrdScheduler(@Request() req: any) {
    const page = Math.max(1, parseInt(req.query?.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query?.limit, 10) || 20));

    const result = await this.hrdRemindersService.getMyReminders(req.user.id, { sentOnly: true, page, limit });

    return {
      success: true,
      data: {
        items: result.items,
        total: result.total,
        page,
        limit,
      },
      message: 'HRD scheduler entries retrieved successfully',
    };
  }

  @Delete(':reminderId/dismiss')
  @Permissions(PERMISSIONS.WRITE_PROCESSING)
  @ApiOperation({ summary: 'Dismiss an HRD reminder', description: 'Mark an HRD reminder as dismissed/handled by the processing user.' })
  @ApiParam({ name: 'reminderId', description: 'HRD Reminder ID' })
  @ApiResponse({ status: 200, description: 'Reminder dismissed successfully' })
  async dismissReminder(@Param('reminderId') reminderId: string, @Request() req: any) {
    await this.hrdRemindersService.dismissReminder(reminderId, req.user.id);
    return { success: true, message: 'HRD reminder dismissed successfully' };
  }
}
