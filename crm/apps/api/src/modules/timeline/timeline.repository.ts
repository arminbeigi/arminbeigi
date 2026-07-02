import { Injectable } from '@nestjs/common';
import { Prisma, TimelineEntry } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface TimelineListFilters {
  where: Prisma.TimelineEntryWhereInput;
  skip: number;
  take: number;
}

@Injectable()
export class TimelineRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.TimelineEntryCreateInput): Promise<TimelineEntry> {
    return this.prisma.timelineEntry.create({ data });
  }

  async list(filters: TimelineListFilters): Promise<{ rows: TimelineEntry[]; total: number }> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.timelineEntry.findMany({
        where: filters.where,
        orderBy: { occurredAt: 'desc' },
        skip: filters.skip,
        take: filters.take,
      }),
      this.prisma.timelineEntry.count({ where: filters.where }),
    ]);
    return { rows, total };
  }

  /** نام عاملِ رخداد را برای denormalize کردن می‌خواند (lookup سبک روی PK). */
  async actorName(actorId: string): Promise<string | null> {
    const u = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { fullName: true },
    });
    return u?.fullName ?? null;
  }
}
