import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DealStage, DealStatus, Pipeline, Prisma } from '@prisma/client';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateDealItemDto } from './dto/create-deal-item.dto';
import { CreateDealDto } from './dto/create-deal.dto';
import { DealResponseDto } from './dto/deal-response.dto';
import { MoveDealDto } from './dto/move-deal.dto';
import { QueryDealsDto } from './dto/query-deals.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { AuditService } from '../../modules/audit/audit.service';
import { DealFilters, DealsRepository } from './deals.repository';

interface AmountLine {
  quantity?: number;
  unitIrr?: number | Prisma.Decimal | null;
  discount?: number | Prisma.Decimal | null;
}

@Injectable()
export class DealsService {
  constructor(
    private readonly repo: DealsRepository,
    private readonly audit: AuditService,
  ) {}

  listPipelines(): Promise<(Pipeline & { stages: DealStage[] })[]> {
    return this.repo.listPipelines();
  }

  async create(dto: CreateDealDto, currentUserId: string): Promise<DealResponseDto> {
    const { customerId, pipelineId, stageId, ownerId, projectId, items, expectedAt, amountIrr, ...rest } =
      dto;

    // حل پایپ‌لاین و مرحله‌ی پیش‌فرض
    const pipeline = pipelineId
      ? { id: pipelineId }
      : await this.repo.getDefaultPipeline();
    if (!pipeline) throw new BadRequestException('پایپ‌لاین پیش‌فرض تعریف نشده است');

    let resolvedStageId = stageId;
    if (!resolvedStageId) {
      const first = await this.repo.getFirstStage(pipeline.id);
      if (!first) throw new BadRequestException('پایپ‌لاین مرحله‌ای ندارد');
      resolvedStageId = first.id;
    }

    const computedAmount = items?.length ? this.computeAmount(items) : new Prisma.Decimal(amountIrr ?? 0);

    const base: Prisma.DealCreateInput = {
      ...rest,
      amountIrr: computedAmount,
      ...(expectedAt ? { expectedAt: new Date(expectedAt) } : {}),
      customer: { connect: { id: customerId } },
      pipeline: { connect: { id: pipeline.id } },
      stage: { connect: { id: resolvedStageId } },
      owner: { connect: { id: ownerId ?? currentUserId } },
      ...(projectId ? { project: { connect: { id: projectId } } } : {}),
    };

    try {
      const created = await this.repo.create({ base, items: items ?? [] });
      return DealResponseDto.from(created);
    } catch (e) {
      throw this.translatePrismaError(e);
    }
  }

  async findOne(id: string): Promise<DealResponseDto> {
    const deal = await this.repo.findById(id);
    if (!deal) throw new NotFoundException('معامله یافت نشد');
    return DealResponseDto.from(deal);
  }

  async search(query: QueryDealsDto): Promise<PaginatedResult<DealResponseDto>> {
    const filters: DealFilters = {
      pipelineId: query.pipelineId,
      stageId: query.stageId,
      status: query.status,
      customerId: query.customerId,
      ownerId: query.ownerId,
    };
    const q = query.q?.trim();
    if (q) {
      const { ids, total } = await this.repo.fuzzySearchIds({
        q,
        filters,
        skip: query.skip,
        take: query.limit,
      });
      const rows = await this.repo.findManyByIdsOrdered(ids);
      return new PaginatedResult(rows.map(DealResponseDto.from), total, query.page, query.limit);
    }
    const { data, total } = await this.repo.list({ filters, skip: query.skip, take: query.limit });
    return new PaginatedResult(data.map(DealResponseDto.from), total, query.page, query.limit);
  }

  async update(id: string, dto: UpdateDealDto): Promise<DealResponseDto> {
    await this.ensureExists(id);
    const { ownerId, projectId, expectedAt, amountIrr, ...rest } = dto;
    const data: Prisma.DealUpdateInput = { ...rest };
    if (ownerId) data.owner = { connect: { id: ownerId } };
    if (projectId) data.project = { connect: { id: projectId } };
    if (expectedAt) data.expectedAt = new Date(expectedAt);
    if (amountIrr !== undefined) data.amountIrr = amountIrr;
    try {
      const updated = await this.repo.update(id, data);
      return DealResponseDto.from(updated);
    } catch (e) {
      throw this.translatePrismaError(e);
    }
  }

  /** حرکت در کانبان؛ مرحله‌ی برنده/بازنده وضعیت و closedAt را خودکار تنظیم می‌کند */
  async move(id: string, dto: MoveDealDto): Promise<DealResponseDto> {
    const deal = await this.repo.findById(id);
    if (!deal) throw new NotFoundException('معامله یافت نشد');

    const stage = await this.repo.getStage(dto.stageId);
    if (!stage) throw new NotFoundException('مرحله یافت نشد');
    if (stage.pipelineId !== deal.pipelineId) {
      throw new BadRequestException('مرحله متعلق به پایپ‌لاین این معامله نیست');
    }

    const data: Prisma.DealUpdateInput = { stage: { connect: { id: stage.id } } };
    if (stage.isWon) {
      data.status = DealStatus.WON;
      data.closedAt = new Date();
      data.lostReason = null;
    } else if (stage.isLost) {
      if (!dto.lostReason) throw new BadRequestException('دلیل ازدست‌رفتن الزامی است');
      data.status = DealStatus.LOST;
      data.closedAt = new Date();
      data.lostReason = dto.lostReason;
    } else {
      data.status = DealStatus.OPEN;
      data.closedAt = null;
      data.lostReason = null;
    }

    const updated = await this.repo.update(id, data);
    return DealResponseDto.from(updated);
  }

  async remove(id: string, actorId?: string): Promise<{ success: true }> {
    await this.ensureExists(id);
    await this.repo.delete(id);
    await this.audit.record({ actorId, action: 'deleted', entityType: 'DEAL', entityId: id });
    return { success: true };
  }

  async addItem(dealId: string, dto: CreateDealItemDto): Promise<DealResponseDto> {
    await this.ensureExists(dealId);
    try {
      await this.repo.addItem(dealId, dto);
    } catch (e) {
      throw this.translatePrismaError(e);
    }
    await this.recomputeAmount(dealId);
    return this.findOne(dealId);
  }

  async removeItem(dealId: string, itemId: string): Promise<DealResponseDto> {
    const item = await this.repo.findItem(dealId, itemId);
    if (!item) throw new NotFoundException('قلم معامله یافت نشد');
    await this.repo.deleteItem(itemId);
    await this.recomputeAmount(dealId);
    return this.findOne(dealId);
  }

  // ── کمکی‌ها ─────────────────────────────────────────────────────────────────
  private async recomputeAmount(dealId: string): Promise<void> {
    const items = await this.repo.findItems(dealId);
    await this.repo.setAmount(dealId, this.computeAmount(items));
  }

  private computeAmount(items: AmountLine[]): Prisma.Decimal {
    return items.reduce((total, it) => {
      const unit = new Prisma.Decimal(it.unitIrr ?? 0);
      const disc = new Prisma.Decimal(it.discount ?? 0);
      return total.plus(unit.mul(it.quantity ?? 1).minus(disc));
    }, new Prisma.Decimal(0));
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.repo.findById(id);
    if (!found) throw new NotFoundException('معامله یافت نشد');
  }

  private translatePrismaError(e: unknown): Error {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') return new NotFoundException('مشتری/مرحله/کارشناس/محصول مرتبط یافت نشد');
    }
    return e instanceof Error ? e : new Error('خطای ناشناخته');
  }
}
