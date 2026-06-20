import {
  Controller,
  Get,
  Delete,
  Param,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CallbackRemindersService } from './callback-reminders.service';
import { Permissions } from '../auth/rbac/permissions.decorator';

@ApiTags('Callback Reminders')
@ApiBearerAuth()
@Controller('callback-reminders')
export class CallbackRemindersController {
  constructor(
    private readonly callbackRemindersService: CallbackRemindersService,
  ) {}

  @Get('my-reminders')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get my active callback reminders',
    description:
      'Active scheduled callback reminders for the logged-in recruiter.',
  })
  @ApiResponse({ status: 200, description: 'Callback reminders retrieved' })
  async getMyReminders(@Request() req): Promise<{
    success: boolean;
    data: unknown[];
    message: string;
  }> {
    const recruiterId = req.user.id;
    const data =
      await this.callbackRemindersService.getRecruiterCallbackReminders(
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
  @ApiOperation({ summary: 'Dismiss a callback reminder' })
  @ApiParam({ name: 'reminderId', description: 'Callback reminder ID' })
  @ApiResponse({ status: 200, description: 'Reminder dismissed' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  async dismissReminder(
    @Param('reminderId') reminderId: string,
    @Request() req,
  ): Promise<{ success: boolean; message: string }> {
    const recruiterId = req.user.id;
    await this.callbackRemindersService.dismissReminder(reminderId, recruiterId);

    return {
      success: true,
      message: 'Callback reminder dismissed successfully',
    };
  }
}
