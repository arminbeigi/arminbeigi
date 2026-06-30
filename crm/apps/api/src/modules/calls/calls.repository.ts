import { Injectable } from '@nestjs/common';
import { Call, CallDirection, CallStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const INCLUDE = {
  customer: {
    select: { id: true, displayName: true, type: true, status: true, leadScore: true },
  },
  agent: { select: { id: true, fullName: true } },
} satisfies Prisma.CallInclude;

export interface CallFilters {
  direction?: CallDirection;
  status?: CallStatus;
  agentId?: string;
  customerId?: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class CallsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** idempotent: ساخت در اولین رویداد، به‌روزرسانی در رویدادهای بعدی همان تماس */
  upsertByUniqueId(
    uniqueId: string,
    create: Prisma.CallCreateInput,
    update: Prisma.CallUpdateInput,
  ): Promise<Call> {
    return this.prisma.call.upsert({ where: { uniqueId }, create, update, include: INCLUDE });
  }

  findByUniqueId(uniqueId: string) {
    return this.prisma.call.findUnique({ where: { uniqueId }, include: INCLUDE });
  }

  findById(id: string) {
    return this.prisma.call.findUnique({ where: { id }, include: INCLUDE });
  }

  update(id: string, data: Prisma.CallUpdateInput): Promise<Call> {
    return this.prisma.call.update({ where: { id }, data, include: INCLUDE });
  }

  async list(params: {
    filters: CallFilters;
    skip: number;
    take: number;
  }): Promise<{ data: Call[]; total: number }> {
    const f = params.filters;
    const where: Prisma.CallWhereInput = {
      ...(f.direction ? { direction: f.direction } : {}),
      ...(f.status ? { status: f.status } : {}),
      ...(f.agentId ? { agentId: f.agentId } : {}),
      ...(f.customerId ? { customerId: f.customerId } : {}),
      ...(f.from || f.to
        ? { startedAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.call.findMany({
        where,
        include: INCLUDE,
        orderBy: { startedAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.call.count({ where }),
    ]);
    return { data, total };
  }
}
