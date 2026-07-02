import { Injectable, Logger } from '@nestjs/common';
import { EntityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** ورودی ثبت یک رویداد ممیزی سازمانی */
export interface AuditEvent {
  actorId?: string | null;
  action: string; // login_success، login_failed، account_locked، deleted، updated …
  entityType: EntityType;
  entityId: string;
  /** مقدار پیشین (برای تغییرات) */
  oldValue?: Prisma.InputJsonValue;
  /** مقدار جدید */
  newValue?: Prisma.InputJsonValue;
  /** IP عاملِ رخداد */
  ip?: string | null;
  /** دلیل تغییر (اختیاری) */
  reason?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/**
 * سرویس ممیزی (Audit Trail) — رویدادهای حساس را در جدول ActivityLog ثبت می‌کند.
 * اصل کلیدی: ثبت ممیزی هرگز نباید جریان اصلی را بشکند؛ خطاها فقط لاگ می‌شوند.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** ثبت best-effort یک رویداد؛ در صورت خطا فقط هشدار لاگ می‌شود (throw نمی‌کند). */
  async record(event: AuditEvent): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          actorId: event.actorId ?? null,
          action: event.action,
          entityType: event.entityType,
          entityId: event.entityId,
          oldValue: event.oldValue,
          newValue: event.newValue,
          ip: event.ip ?? null,
          reason: event.reason ?? null,
          metadata: event.metadata,
        },
      });
    } catch (err) {
      this.logger.warn(
        `ثبت رویداد ممیزی ناموفق بود (${event.action}/${event.entityType}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
