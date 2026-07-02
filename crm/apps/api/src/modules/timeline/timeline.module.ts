import { Module } from '@nestjs/common';
import { TimelineController } from './timeline.controller';
import { TimelineListener } from './timeline.listener';
import { TimelineRepository } from './timeline.repository';
import { TimelineService } from './timeline.service';

/**
 * ماژول تایم‌لاین یکپارچه. با شنیدن کانال catch-all رویدادهای دامنه، هر رخداد مهم را
 * به‌صورت خودکار ثبت می‌کند. ماژول‌های آینده بدون تغییر، از طریق رویداد متصل می‌شوند.
 */
@Module({
  controllers: [TimelineController],
  providers: [TimelineService, TimelineRepository, TimelineListener],
  exports: [TimelineService],
})
export class TimelineModule {}
