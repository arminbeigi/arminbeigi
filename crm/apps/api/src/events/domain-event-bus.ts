import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent, PublishInput } from './domain-event';
import { ALL_DOMAIN_EVENTS } from './event-names';

/**
 * ناقل رویدادهای دامنه (Domain Event Bus).
 * ماژول‌ها با publish() رویداد منتشر می‌کنند؛ بدون آگاهی از اینکه چه کسی گوش می‌دهد.
 * هر رویداد روی دو کانال منتشر می‌شود:
 *   ۱) نام اختصاصی رویداد (مثل ticket.created) — برای شنونده‌های خاص.
 *   ۲) کانال catch-all (domain.event) — برای شنونده‌های عمومی (Timeline/Audit/Workflow).
 * انتشار async است؛ خطای یک شنونده، publisher یا سایر شنونده‌ها را متوقف نمی‌کند.
 */
@Injectable()
export class DomainEventBus {
  private readonly logger = new Logger('DomainEventBus');

  constructor(private readonly emitter: EventEmitter2) {}

  publish<P = Record<string, unknown>>(input: PublishInput<P>): DomainEvent<P> {
    const event: DomainEvent<P> = { ...input, occurredAt: input.occurredAt ?? new Date() };
    // انتشار روی کانال اختصاصی + کانال catch-all. خطای شنونده‌ها هرگز به publisher نمی‌رسد.
    this.safeEmit(event.name, event);
    this.safeEmit(ALL_DOMAIN_EVENTS, event);
    return event;
  }

  /** انتشار مقاوم: هم throw همگام و هم rejection ناهمگامِ شنونده‌ها مهار می‌شود. */
  private safeEmit<P>(channel: string, event: DomainEvent<P>): void {
    try {
      const result = this.emitter.emitAsync(channel, event) as unknown;
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        void (result as Promise<unknown>).catch((err) =>
          this.logger.warn(`شنونده‌ی ${channel} خطا داد: ${errMsg(err)}`),
        );
      }
    } catch (err) {
      this.logger.warn(`شنونده‌ی ${channel} خطا داد (همگام): ${errMsg(err)}`);
    }
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
