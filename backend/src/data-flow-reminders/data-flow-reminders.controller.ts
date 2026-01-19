import { Controller, Get, Delete, Request, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Get Data Flow scheduler entries', description: 'Get all Data Flow scheduler reminders for the current processing user.' })
  @ApiResponse({ status: 200, description: 'Data Flow scheduler entries retrieved successfully' })
  async getScheduler(@Request() req: any) {
    const data = await this.dataFlowRemindersService.getMyReminders(req.user.id);
    return { success: true, data, message: 'Data Flow scheduler entries retrieved successfully' };
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
