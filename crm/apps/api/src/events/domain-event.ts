import { EntityType } from '@prisma/client';
import { DomainEventName } from './event-names';

/**
 * پاکت استاندارد یک رویداد دامنه. همه‌ی رویدادها این شکل را دارند تا شنونده‌های
 * cross-cutting (Timeline/Audit/Workflow) بتوانند یکنواخت پردازش کنند.
 */
export interface DomainEvent<P = Record<string, unknown>> {
  /** نام رویداد (کانال) */
  name: DomainEventName;
  /** زمان وقوع */
  occurredAt: Date;
  /** کاربر عامل (در صورت وجود) */
  actorId?: string | null;
  /** نوع موجودیت مرجع */
  entityType: EntityType;
  /** شناسه‌ی موجودیت مرجع */
  entityId: string;
  /** عنوان کوتاه انسان‌خوان (برای Timeline) */
  title?: string;
  /** داده‌ی ساخت‌یافته‌ی رویداد */
  payload: P;
  /** شناسه‌ی همبستگی برای ردگیری زنجیره‌ای (اختیاری) */
  correlationId?: string;
}

/** ورودی انتشار — occurredAt در صورت نبود به‌صورت خودکار مقداردهی می‌شود. */
export type PublishInput<P = Record<string, unknown>> = Omit<DomainEvent<P>, 'occurredAt'> & {
  occurredAt?: Date;
};
