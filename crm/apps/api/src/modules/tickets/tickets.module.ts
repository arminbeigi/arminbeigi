import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { TicketsController } from './tickets.controller';
import { TicketsRepository } from './tickets.repository';
import { TicketsService } from './tickets.service';

/**
 * ماژول پشتیبانی/تیکت‌ها.
 * - AiModule: دسته‌بندی هوشمند تیکت (دسته/اولویت/قطعه).
 * - رویدادها از طریق DomainEventBus (سراسری) منتشر می‌شوند؛ realtime/timeline/notification
 *   به‌صورت شنونده واکنش می‌دهند (بدون وابستگی مستقیم بین ماژول‌ها).
 * AuditModule و EventsModule سراسری‌اند و نیازی به import ندارند.
 */
@Module({
  imports: [AiModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService],
})
export class TicketsModule {}
