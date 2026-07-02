import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationPriority, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  INotificationChannel,
  NOTIFICATION_CHANNELS,
  NotificationPayload,
} from './channels/notification-channel.interface';

export interface DispatchInput {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  priority?: NotificationPriority;
  groupKey?: string | null;
  link?: string | null;
  data?: Record<string, unknown> | null;
  expiresAt?: Date | null;
}

/**
 * مرکز اعلان. یک اعلان را از طریق همه‌ی کانال‌های فعال ارسال می‌کند (in-app + کانال‌های
 * افزونه‌ای مثل email/sms/whatsapp/push). ذخیره و شمارش/خواندن هم اینجاست.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_CHANNELS) private readonly channels: INotificationChannel[],
  ) {}

  /** فهرست کانال‌های فعال (برای نمایش/عیب‌یابی). */
  enabledChannels(): string[] {
    return this.channels.filter((c) => c.isEnabled()).map((c) => c.key);
  }

  /** ارسال اعلان از طریق همه‌ی کانال‌های فعال (best-effort per channel). */
  async dispatch(input: DispatchInput): Promise<void> {
    const payload: NotificationPayload = {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      priority: input.priority ?? 'NORMAL',
      groupKey: input.groupKey ?? null,
      link: input.link ?? null,
      data: input.data ?? null,
      expiresAt: input.expiresAt ?? null,
    };
    await Promise.all(
      this.channels
        .filter((c) => c.isEnabled())
        .map((c) =>
          c.send(payload).catch((err) =>
            this.logger.warn(`کانال ${c.key} خطا داد: ${err instanceof Error ? err.message : String(err)}`),
          ),
        ),
    );
  }

  private notExpired(): Prisma.NotificationWhereInput {
    return { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };
  }

  async list(userId: string, opts: { unread?: boolean; skip: number; take: number }) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(opts.unread ? { readAt: null } : {}),
      ...this.notExpired(),
    };
    const [rows, total, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: opts.skip,
        take: opts.take,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null, ...this.notExpired() } }),
    ]);
    return { rows, total, unread };
  }

  unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null, ...this.notExpired() } });
  }

  async markRead(userId: string, id: string): Promise<{ success: true }> {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async markAllRead(userId: string): Promise<{ count: number }> {
    const res = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { count: res.count };
  }
}
