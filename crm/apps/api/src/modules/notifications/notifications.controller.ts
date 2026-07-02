import { Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Notification } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('اعلان‌ها')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست اعلان‌های کاربر جاری (با فیلتر خوانده‌نشده)' })
  async list(
    @Query() query: QueryNotificationsDto,
    @CurrentUser('sub') userId: string,
  ): Promise<PaginatedResult<Notification> & { unread: number }> {
    const { rows, total, unread } = await this.notifications.list(userId, {
      unread: query.unread === 'true',
      skip: query.skip,
      take: query.limit,
    });
    const result = new PaginatedResult(rows, total, query.page, query.limit) as PaginatedResult<Notification> & {
      unread: number;
    };
    result.unread = unread;
    return result;
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'تعداد اعلان‌های خوانده‌نشده' })
  async unreadCount(@CurrentUser('sub') userId: string): Promise<{ count: number }> {
    return { count: await this.notifications.unreadCount(userId) };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'علامت‌گذاری یک اعلان به‌عنوان خوانده‌شده' })
  markRead(@Param('id') id: string, @CurrentUser('sub') userId: string): Promise<{ success: true }> {
    return this.notifications.markRead(userId, id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'علامت‌گذاری همه‌ی اعلان‌ها به‌عنوان خوانده‌شده' })
  markAllRead(@CurrentUser('sub') userId: string): Promise<{ count: number }> {
    return this.notifications.markAllRead(userId);
  }
}
