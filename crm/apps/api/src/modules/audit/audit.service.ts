import { Injectable, Logger } from '@nestjs/common';
import { EntityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** ورودی ثبت یک رویداد ممیزی */
export interface AuditEvent {
  actorId?: string | null;
  action: string; // login_success، login_failed، account_locked، deleted، …
  entityType: EntityType;
  entityId: string;
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
