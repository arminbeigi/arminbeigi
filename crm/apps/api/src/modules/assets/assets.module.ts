import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

/**
 * ماژول دارایی (تجهیزات HVAC) — منبع واحد حقیقت برای نگهداری/گارانتی/موجودی/قرارداد.
 * رویدادهای asset.created/updated منتشر می‌شوند؛ AuditModule و EventsModule سراسری‌اند.
 */
@Module({
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
