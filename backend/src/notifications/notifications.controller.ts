import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import {
  NotificationResponseDto,
  NotificationBadgeResponseDto,
  PaginatedNotificationsResponseDto,
} from './dto/notification-response.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    type: PaginatedNotificationsResponseDto,
  })
  async getNotifications(
    @Query() query: QueryNotificationsDto,
    @Req() req: any,
  ): Promise<{
    success: boolean;
    data: PaginatedNotificationsResponseDto;
    message: string;
  }> {
    const userId = req.user.id;
    const data = await this.notificationsService.getUserNotifications(
      userId,
      query,
    );

    return {
      success: true,
      data,
      message: 'Notifications retrieved successfully',
    };
  }

  @Get('badge')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    type: NotificationBadgeResponseDto,
  })
  async getBadge(@Req() req: any): Promise<{
    success: boolean;
    data: NotificationBadgeResponseDto;
    message: string;
  }> {
    const userId = req.user.id;
    const unread = await this.notificationsService.getUnreadCount(userId);

    return {
      success: true,
      data: { unread },
      message: 'Unread count retrieved successfully',
    };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read successfully',
    type: NotificationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found or access denied',
  })
  async markAsRead(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{
    success: boolean;
    data: NotificationResponseDto;
    message: string;
  }> {
    const userId = req.user.id;
    const data = await this.notificationsService.markAsRead(id, userId);

    return {
      success: true,
      data,
      message: 'Notification marked as read successfully',
    };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            count: { type: 'number' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async markAllAsRead(
    @Req() req: any,
  ): Promise<{ success: boolean; data: { count: number }; message: string }> {
    const userId = req.user.id;
    const data = await this.notificationsService.markAllAsRead(userId);

    return {
      success: true,
      data,
      message: `${data.count} notifications marked as read successfully`,
    };
  }
}
