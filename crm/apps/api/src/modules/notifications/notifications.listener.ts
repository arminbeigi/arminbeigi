import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent } from '../../events/domain-event';
import { DomainEvents } from '../../events/event-names';
import { NotificationsService } from './notifications.service';

/**
 * شنونده‌ی اعلان — رویدادهای دامنه را به اعلان‌های کاربر تبدیل می‌کند.
 * ماژول‌های آینده صرفاً با انتشار رویداد، اعلان تولید می‌کنند.
 */
@Injectable()
export class NotificationsListener {
  constructor(private readonly notifications: NotificationsService) {}

  /** واگذاری تیکت ⇒ اعلان به مسئول جدید. */
  @OnEvent(DomainEvents.TicketAssigned, { async: true })
  async onTicketAssigned(e: DomainEvent<{ to?: string | null }>): Promise<void> {
    const assigneeId = e.payload?.to;
    if (!assigneeId) return;
    await this.notifications.dispatch({
      userId: assigneeId,
      type: 'ticket:assigned',
      priority: 'HIGH',
      title: 'تیکت جدید به شما واگذار شد',
      body: e.title,
      link: `/dashboard/tickets/${e.entityId}`,
      groupKey: `ticket:${e.entityId}`,
      data: { ticketId: e.entityId },
    });
  }
}
