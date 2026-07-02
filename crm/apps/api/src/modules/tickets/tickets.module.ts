import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { TicketsController } from './tickets.controller';
import { TicketsRepository } from './tickets.repository';
import { TicketsService } from './tickets.service';

/**
 * ماژول پشتیبانی/تیکت‌ها.
 * - AiModule: دسته‌بندی هوشمند تیکت (دسته/اولویت/قطعه).
 * - RealtimeModule: انتشار رویدادهای زنده‌ی تیکت (ساخت/به‌روزرسانی).
 * AuditModule سراسری است و نیازی به import ندارد.
 */
@Module({
  imports: [AiModule, RealtimeModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService],
})
export class TicketsModule {}
