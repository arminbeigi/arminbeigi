import { Injectable } from '@nestjs/common';
import { Deal, DealStage, DealStatus, Pipeline, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const STAGE_SELECT = {
  id: true,
  key: true,
  name: true,
  order: true,
  isWon: true,
  isLost: true,
} satisfies Prisma.DealStageSelect;

const DETAIL_INCLUDE = {
  items: { include: { product: { select: { id: true, name: true, sku: true } } } },
  customer: { select: { id: true, displayName: true } },
  owner: { select: { id: true, fullName: true } },
  stage: { select: STAGE_SELECT },
  pipeline: { select: { id: true, name: true } },
} satisfies Prisma.DealInclude;

const LIST_INCLUDE = {
  customer: { select: { id: true, displayName: true } },
  owner: { select: { id: true, fullName: true } },
  stage: { select: STAGE_SELECT },
  pipeline: { select: { id: true, name: true } },
} satisfies Prisma.DealInclude;

export interface DealFilters {
  pipelineId?: string;
  stageId?: string;
  status?: DealStatus;
  customerId?: string;
  ownerId?: string;
}

export interface DealItemInput {
  title: string;
  productId?: string;
  quantity?: number;
  unitIrr?: number;
  discount?: number;
}

@Injectable()
export class DealsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── پایپ‌لاین/مراحل ──────────────────────────────────────────────────────────
  listPipelines(): Promise<(Pipeline & { stages: DealStage[] })[]> {
    return this.prisma.pipeline.findMany({
      include: { stages: { orderBy: { order: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  getDefaultPipeline() {
    return this.prisma.pipeline.findFirst({ where: { isDefault: true } });
  }

  getFirstStage(pipelineId: string) {
    return this.prisma.dealStage.findFirst({
      where: { pipelineId },
      orderBy: { order: 'asc' },
    });
  }

  getStage(stageId: string) {
    return this.prisma.dealStage.findUnique({ where: { id: stageId } });
  }

  // ── معاملات ─────────────────────────────────────────────────────────────────
  create(data: { base: Prisma.DealCreateInput; items: DealItemInput[] }): Promise<Deal> {
    return this.prisma.deal.create({
      data: {
        ...data.base,
        items: data.items.length
          ? {
              create: data.items.map((it) => ({
                title: it.title,
                quantity: it.quantity ?? 1,
                unitIrr: it.unitIrr ?? 0,
                discount: it.discount ?? 0,
                ...(it.productId ? { product: { connect: { id: it.productId } } } : {}),
              })),
            }
          : undefined,
      },
      include: DETAIL_INCLUDE,
    });
  }

  findById(id: string) {
    return this.prisma.deal.findUnique({ where: { id }, include: DETAIL_INCLUDE });
  }

  update(id: string, data: Prisma.DealUpdateInput): Promise<Deal> {
    return this.prisma.deal.update({ where: { id }, data, include: DETAIL_INCLUDE });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.deal.delete({ where: { id } });
  }

  async list(params: {
    filters: DealFilters;
    skip: number;
    take: number;
  }): Promise<{ data: Deal[]; total: number }> {
    const where = this.toWhere(params.filters);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.deal.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.deal.count({ where }),
    ]);
    return { data, total };
  }

  async fuzzySearchIds(params: {
    q: string;
    filters: DealFilters;
    skip: number;
    take: number;
  }): Promise<{ ids: string[]; total: number }> {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`fa_normalize("title") % fa_normalize(${params.q})`,
    ];
    const f = params.filters;
    if (f.pipelineId) conditions.push(Prisma.sql`"pipelineId" = ${f.pipelineId}`);
    if (f.stageId) conditions.push(Prisma.sql`"stageId" = ${f.stageId}`);
    if (f.status) conditions.push(Prisma.sql`"status" = ${f.status}::"DealStatus"`);
    if (f.customerId) conditions.push(Prisma.sql`"customerId" = ${f.customerId}`);
    if (f.ownerId) conditions.push(Prisma.sql`"ownerId" = ${f.ownerId}`);
    const where = Prisma.join(conditions, ' AND ');

    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM "Deal"
      WHERE ${where}
      ORDER BY similarity(fa_normalize("title"), fa_normalize(${params.q})) DESC
      LIMIT ${params.take} OFFSET ${params.skip}
    `);
    const countRows = await this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT count(*)::bigint AS count FROM "Deal" WHERE ${where}
    `);
    return { ids: rows.map((r) => r.id), total: Number(countRows[0]?.count ?? 0) };
  }

  async findManyByIdsOrdered(ids: string[]): Promise<Deal[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.deal.findMany({
      where: { id: { in: ids } },
      include: LIST_INCLUDE,
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter((x): x is NonNullable<typeof x> => Boolean(x));
  }

  // ── اقلام ───────────────────────────────────────────────────────────────────
  addItem(dealId: string, it: DealItemInput) {
    return this.prisma.dealItem.create({
      data: {
        deal: { connect: { id: dealId } },
        title: it.title,
        quantity: it.quantity ?? 1,
        unitIrr: it.unitIrr ?? 0,
        discount: it.discount ?? 0,
        ...(it.productId ? { product: { connect: { id: it.productId } } } : {}),
      },
    });
  }

  findItem(dealId: string, itemId: string) {
    return this.prisma.dealItem.findFirst({ where: { id: itemId, dealId } });
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.prisma.dealItem.delete({ where: { id: itemId } });
  }

  findItems(dealId: string) {
    return this.prisma.dealItem.findMany({ where: { dealId } });
  }

  setAmount(dealId: string, amountIrr: Prisma.Decimal): Promise<Deal> {
    return this.prisma.deal.update({ where: { id: dealId }, data: { amountIrr } });
  }

  private toWhere(f: DealFilters): Prisma.DealWhereInput {
    return {
      ...(f.pipelineId ? { pipelineId: f.pipelineId } : {}),
      ...(f.stageId ? { stageId: f.stageId } : {}),
      ...(f.status ? { status: f.status } : {}),
      ...(f.customerId ? { customerId: f.customerId } : {}),
      ...(f.ownerId ? { ownerId: f.ownerId } : {}),
    };
  }
}
