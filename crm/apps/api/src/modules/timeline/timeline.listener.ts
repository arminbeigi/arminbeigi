import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent } from '../../events/domain-event';
import { ALL_DOMAIN_EVENTS } from '../../events/event-names';
import { TimelineService } from './timeline.service';

/**
 * شنونده‌ی عمومی تایم‌لاین — هر رویداد دامنه‌ای که منتشر شود، به‌صورت خودکار یک ورودی
 * تایم‌لاین می‌سازد. ماژول‌های آینده صرفاً با انتشار رویداد، به تایم‌لاین متصل می‌شوند.
 */
@Injectable()
export class TimelineListener {
  constructor(private readonly timeline: TimelineService) {}

  @OnEvent(ALL_DOMAIN_EVENTS, { async: true })
  async onDomainEvent(event: DomainEvent): Promise<void> {
    await this.timeline.recordFromEvent(event);
  }
}
