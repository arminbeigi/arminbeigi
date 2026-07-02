import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { INotificationChannel, NotificationPayload } from './notification-channel.interface';

/**
 * کانال درون‌برنامه‌ای (in-app): اعلان را در جدول Notification ذخیره و از طریق WebSocket
 * به کاربر مقصد push می‌کند. همیشه فعال است.
 */
@Injectable()
export class InAppChannel implements INotificationChannel {
  readonly key = 'in_app';
  private readonly logger = new Logger('InAppChannel');

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  isEnabled(): boolean {
    return true;
  }

  async send(payload: NotificationPayload): Promise<void> {
    try {
      const notif = await this.prisma.notification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          priority: payload.priority,
          title: payload.title,
          body: payload.body ?? null,
          groupKey: payload.groupKey ?? null,
          link: payload.link ?? null,
          data: (payload.data ?? undefined) as never,
          expiresAt: payload.expiresAt ?? null,
        },
      });
      // push زنده به کاربر مقصد
      this.realtime.emitToUser(payload.userId, 'notification:new', {
        id: notif.id,
        type: notif.type,
        priority: notif.priority,
        title: notif.title,
        link: notif.link,
        createdAt: notif.createdAt,
      });
    } catch (err) {
      this.logger.warn(`ثبت اعلان in-app ناموفق بود: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
