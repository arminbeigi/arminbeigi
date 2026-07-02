import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DomainEventBus } from './domain-event-bus';

/**
 * ماژول رویدادهای دامنه — سراسری تا هر ماژولی بتواند DomainEventBus را تزریق کند
 * و هر شنونده‌ای با @OnEvent ثبت شود.
 */
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // بدون wildcard؛ از کانال catch-all اختصاصی (domain.event) استفاده می‌کنیم.
      wildcard: false,
      // اجازه‌ی تعداد بالای شنونده‌ها برای رویدادهای پرکاربرد
      maxListeners: 50,
      verboseMemoryLeak: false,
    }),
  ],
  providers: [DomainEventBus],
  exports: [DomainEventBus],
})
export class EventsModule {}
