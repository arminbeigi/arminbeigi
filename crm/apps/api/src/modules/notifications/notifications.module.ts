import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { InAppChannel } from './channels/in-app.channel';
import { NOTIFICATION_CHANNELS } from './channels/notification-channel.interface';
import { NotificationsController } from './notifications.controller';
import { NotificationsListener } from './notifications.listener';
import { NotificationsService } from './notifications.service';

/**
 * مرکز اعلان. کانال in-app به‌صورت پیش‌فرض ثبت می‌شود؛ کانال‌های email/sms/whatsapp/push
 * از طریق افزونه‌ها (Plugin) به آرایه‌ی NOTIFICATION_CHANNELS اضافه می‌شوند.
 */
@Module({
  imports: [RealtimeModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsListener,
    InAppChannel,
    {
      provide: NOTIFICATION_CHANNELS,
      inject: [InAppChannel],
      useFactory: (inApp: InAppChannel) => [inApp],
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
