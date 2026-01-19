import { Controller, Get, Delete, Request, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Get HRD scheduler entries', description: 'Get all HRD scheduler reminders for the current processing user.' })
  @ApiResponse({ status: 200, description: 'HRD scheduler entries retrieved successfully' })
  async getHrdScheduler(@Request() req: any) {
    const data = await this.hrdRemindersService.getMyReminders(req.user.id);
    return { success: true, data, message: 'HRD scheduler entries retrieved successfully' };
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
