import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { RnrRemindersService } from './rnr-reminders.service';
import { Permissions } from '../auth/rbac/permissions.decorator';

@ApiTags('RNR Reminders')
@ApiBearerAuth()
@Controller('rnr-reminders')
export class RnrRemindersController {
  constructor(private readonly rnrRemindersService: RnrRemindersService) {}

  @Get('my-reminders')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Get my active RNR reminders',
    description:
      'Get all active RNR reminders for the current recruiter. These are candidates they need to follow up with.',
  })
  @ApiResponse({
    status: 200,
    description: 'RNR reminders retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'reminder_123' },
              candidateId: { type: 'string', example: 'candidate_456' },
              candidate: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  firstName: { type: 'string', example: 'John' },
                  lastName: { type: 'string', example: 'Doe' },
                  countryCode: { type: 'string', example: '+91' },
                  mobileNumber: { type: 'string', example: '9876543210' },
                },
              },
              scheduledFor: {
                type: 'string',
                format: 'date-time',
                example: '2025-11-12T15:00:00.000Z',
              },
              status: { type: 'string', example: 'pending' },
              reminderCount: { type: 'number', example: 1 },
            },
          },
        },
        message: { type: 'string', example: 'Reminders retrieved successfully' },
      },
    },
  })
  async getMyReminders(@Request() req): Promise<{
    success: boolean;
    data: any[];
    message: string;
  }> {
    const recruiterId = req.user.id; // Get logged-in user ID
    const data = await this.rnrRemindersService.getRecruiterRNRReminders(
      recruiterId,
    );

    return {
      success: true,
      data,
      message: 'RNR reminders retrieved successfully',
    };
  }

  @Delete(':reminderId/dismiss')
  @Permissions('read:candidates')
  @ApiOperation({
    summary: 'Dismiss an RNR reminder',
    description:
      'Mark an RNR reminder as dismissed/handled. Use this when the recruiter has followed up with the candidate.',
  })
  @ApiParam({
    name: 'reminderId',
    description: 'RNR Reminder ID',
    example: 'reminder_123',
  })
  @ApiResponse({
    status: 200,
    description: 'Reminder dismissed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Reminder not found',
  })
  async dismissReminder(
    @Param('reminderId') reminderId: string,
    @Request() req,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const recruiterId = req.user.id;
    await this.rnrRemindersService.dismissReminder(reminderId, recruiterId);

    return {
      success: true,
      message: 'RNR reminder dismissed successfully',
    };
  }
}
