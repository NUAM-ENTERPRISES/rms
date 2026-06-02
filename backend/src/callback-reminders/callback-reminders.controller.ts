import { Controller, Get, Delete, Request, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Permissions } from '../auth/rbac/permissions.decorator';
import { CallbackRemindersService } from './callback-reminders.service';

@ApiTags('Callback Reminders')
@ApiBearerAuth()
@Controller('callback-reminders')
export class CallbackRemindersController {
  constructor(private readonly callbackRemindersService: CallbackRemindersService) {}

  @Get('my-reminders')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get my active callback reminders',
    description:
      'Get all active callback reminders for the current recruiter. These are scheduled callback follow-ups.',
  })
  @ApiResponse({
    status: 200,
    description: 'Callback reminders retrieved successfully',
  })
  async getMyReminders(@Request() req): Promise<{ success: boolean; data: any[]; message: string }> {
    const recruiterId = req.user.id;
    const data = await this.callbackRemindersService.getRecruiterCallbackReminders(
      recruiterId,
    );

    return {
      success: true,
      data,
      message: 'Callback reminders retrieved successfully',
    };
  }

  @Delete(':reminderId/dismiss')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Dismiss a callback reminder',
    description:
      'Mark an active callback reminder as handled by the recruiter.',
  })
  @ApiParam({
    name: 'reminderId',
    description: 'Callback reminder ID',
    example: 'reminder_123',
  })
  @ApiResponse({
    status: 200,
    description: 'Callback reminder dismissed successfully',
  })
  async dismissReminder(@Param('reminderId') reminderId: string, @Request() req): Promise<{ success: boolean; message: string }> {
    const recruiterId = req.user.id;
    await this.callbackRemindersService.dismissReminder(reminderId, recruiterId);
    return {
      success: true,
      message: 'Callback reminder dismissed successfully',
    };
  }
}
