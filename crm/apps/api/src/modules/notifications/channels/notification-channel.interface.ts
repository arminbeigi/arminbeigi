import { NotificationPriority } from '@prisma/client';

/** محموله‌ی اعلان که بین کانال‌ها به اشتراک گذاشته می‌شود. */
export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  priority: NotificationPriority;
  groupKey?: string | null;
  link?: string | null;
  data?: Record<string, unknown> | null;
  expiresAt?: Date | null;
}

/**
 * قرارداد کانال اعلان. کانال in-app به‌صورت پیش‌فرض پیاده شده؛ کانال‌های email/sms/
 * whatsapp/push به‌عنوان plugin ثبت می‌شوند (بدون تغییر هسته).
 */
export interface INotificationChannel {
  /** کلید یکتا: in_app | email | sms | whatsapp | push */
  readonly key: string;
  /** آیا این کانال هم‌اکنون فعال است (بر اساس تنظیمات/پیکربندی). */
  isEnabled(): boolean;
  /** ارسال اعلان از این کانال. باید شکست‌ناپذیر باشد (خطا را بیرون نیندازد). */
  send(payload: NotificationPayload): Promise<void>;
}

/** توکن تزریق برای مجموعه‌ی کانال‌های ثبت‌شده. */
export const NOTIFICATION_CHANNELS = 'NOTIFICATION_CHANNELS';
