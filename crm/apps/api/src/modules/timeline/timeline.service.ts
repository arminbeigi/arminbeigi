import { Injectable, Logger } from '@nestjs/common';
import { Prisma, TimelineEntry } from '@prisma/client';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { DomainEvent } from '../../events/domain-event';
import { DOMAIN_EVENT_LABELS } from '../../events/event-names';
import { QueryTimelineDto } from './dto/query-timeline.dto';
import { TimelineRepository } from './timeline.repository';

/**
 * سرویس تایم‌لاین — رویدادهای دامنه را به ورودی‌های تایم‌لاین تبدیل و ذخیره می‌کند،
 * و فهرست فیلترشده/جست‌وجوپذیر/صفحه‌بندی‌شده ارائه می‌دهد.
 */
@Injectable()
export class TimelineService {
  private readonly logger = new Logger('Timeline');

  constructor(private readonly repo: TimelineRepository) {}

  /** ثبت یک رخداد در تایم‌لاین از روی رویداد دامنه (best-effort، شکست‌ناپذیر). */
  async recordFromEvent(event: DomainEvent): Promise<TimelineEntry | null> {
    try {
      const actorName = event.actorId ? await this.repo.actorName(event.actorId) : null;
      const title = event.title ?? DOMAIN_EVENT_LABELS[event.name] ?? event.name;
      return await this.repo.create({
        occurredAt: event.occurredAt,
        eventName: event.name,
        entityType: event.entityType,
        entityId: event.entityId,
        actorId: event.actorId ?? null,
        actorName,
        title,
        meta: event.payload as Prisma.InputJsonValue,
      });
    } catch (err) {
      this.logger.warn(
        `ثبت تایم‌لاین برای ${event.name} ناموفق بود: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  async list(query: QueryTimelineDto): Promise<PaginatedResult<TimelineEntry>> {
    const where: Prisma.TimelineEntryWhereInput = {
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.eventName ? { eventName: query.eventName } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { summary: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const { rows, total } = await this.repo.list({ where, skip: query.skip, take: query.limit });
    return new PaginatedResult(rows, total, query.page, query.limit);
  }
}
