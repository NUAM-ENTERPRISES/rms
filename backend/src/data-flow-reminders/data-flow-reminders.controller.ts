import { Controller, Get, Delete, Request, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DataFlowRemindersService } from './data-flow-reminders.service';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Data Flow Reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('data-flow-reminders')
export class DataFlowRemindersController {
  constructor(private readonly dataFlowRemindersService: DataFlowRemindersService) {}

  @Get('data-flow-scheduler')
  @Permissions(PERMISSIONS.READ_PROCESSING)
  @ApiOperation({ summary: 'Get Data Flow scheduler entries', description: 'Get Data Flow scheduler reminders for the current processing user. Returns reminders that have been sent (sentAt != null). Supports pagination via `page` and `limit` query params.' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'Data Flow scheduler entries retrieved successfully' })
  async getScheduler(@Request() req: any) {
    const page = Math.max(1, parseInt(req.query?.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query?.limit, 10) || 20));

    const result = await this.dataFlowRemindersService.getMyReminders(req.user.id, { sentOnly: true, page, limit });

    return {
      success: true,
      data: {
        items: result.items,
        total: result.total,
        page,
        limit,
      },
      message: 'Data Flow scheduler entries retrieved successfully',
    };
  }

  @Delete(':reminderId/dismiss')
  @Permissions(PERMISSIONS.WRITE_PROCESSING)
  @ApiOperation({ summary: 'Dismiss a Data Flow reminder', description: 'Mark a Data Flow reminder as dismissed/handled by the processing user.' })
  @ApiParam({ name: 'reminderId', description: 'Data Flow Reminder ID' })
  @ApiResponse({ status: 200, description: 'Reminder dismissed successfully' })
  async dismissReminder(@Param('reminderId') reminderId: string, @Request() req: any) {
    await this.dataFlowRemindersService.dismissReminder(reminderId, req.user.id);
    return { success: true, message: 'Data Flow reminder dismissed successfully' };
  }
}
