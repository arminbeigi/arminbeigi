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
  oldValue: Prisma.JsonValue;
  newValue: Prisma.JsonValue;
  ip: string | null;
  reason: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: QueryAuditDto): Prisma.ActivityLogWhereInput {
    return {
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
  }

  private toView(r: {
    id: string;
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    oldValue: Prisma.JsonValue;
    newValue: Prisma.JsonValue;
    ip: string | null;
    reason: string | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
    actor?: { fullName: string } | null;
  }): AuditLogView {
    return {
      id: r.id,
      actorId: r.actorId,
      actorName: r.actor?.fullName ?? null,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      oldValue: r.oldValue,
      newValue: r.newValue,
      ip: r.ip,
      reason: r.reason,
      metadata: r.metadata,
      createdAt: r.createdAt,
    };
  }

  async list(query: QueryAuditDto): Promise<{ rows: AuditLogView[]; total: number }> {
    const where = this.buildWhere(query);
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
    return { rows: rows.map((r) => this.toView(r)), total };
  }

  /** برای export — تا سقف معقول (بدون صفحه‌بندی، با همان فیلترها). */
  async listForExport(query: QueryAuditDto, max = 10000): Promise<AuditLogView[]> {
    const rows = await this.prisma.activityLog.findMany({
      where: this.buildWhere(query),
      orderBy: { createdAt: 'desc' },
      take: max,
      include: { actor: { select: { fullName: true } } },
    });
    return rows.map((r) => this.toView(r));
  }
}
