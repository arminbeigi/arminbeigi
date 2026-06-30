import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAuditDto } from './dto/query-audit.dto';

/** نمای یک ردیف ممیزی برای پاسخ API (همراه نام عاملِ رویداد) */
export interface AuditLogView {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryAuditDto): Promise<{ rows: AuditLogView[]; total: number }> {
    const where: Prisma.ActivityLogWhereInput = {
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: query.action } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: { actor: { select: { fullName: true } } },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      rows: rows.map((r) => ({
        id: r.id,
        actorId: r.actorId,
        actorName: r.actor?.fullName ?? null,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        metadata: r.metadata,
        createdAt: r.createdAt,
      })),
      total,
    };
  }
}
