import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { AuditService } from '../../modules/audit/audit.service';
import { DomainEventBus } from '../../events/domain-event-bus';
import { DomainEvents } from '../../events/event-names';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetDto, QueryAssetsDto, UpdateAssetDto } from './dto/asset.dto';

const INCLUDE = {
  customer: { select: { id: true, displayName: true } },
  project: { select: { id: true, title: true } },
  product: { select: { id: true, name: true } },
} satisfies Prisma.AssetInclude;

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: DomainEventBus,
  ) {}

  private async assertRefs(dto: { customerId?: string; projectId?: string; productId?: string }) {
    if (dto.customerId && !(await this.prisma.customer.findUnique({ where: { id: dto.customerId }, select: { id: true } })))
      throw new NotFoundException('مشتری یافت نشد');
    if (dto.projectId && !(await this.prisma.project.findUnique({ where: { id: dto.projectId }, select: { id: true } })))
      throw new NotFoundException('پروژه یافت نشد');
    if (dto.productId && !(await this.prisma.product.findUnique({ where: { id: dto.productId }, select: { id: true } })))
      throw new NotFoundException('محصول یافت نشد');
  }

  async create(dto: CreateAssetDto, actorId: string) {
    await this.assertRefs(dto);
    const asset = await this.prisma.asset.create({
      data: {
        name: dto.name,
        kind: dto.kind,
        status: dto.status ?? 'ACTIVE',
        serialNumber: dto.serialNumber,
        brandName: dto.brandName,
        modelName: dto.modelName,
        location: dto.location,
        notes: dto.notes,
        installedAt: dto.installedAt ? new Date(dto.installedAt) : null,
        warrantyUntil: dto.warrantyUntil ? new Date(dto.warrantyUntil) : null,
        meta: dto.meta,
        customer: { connect: { id: dto.customerId } },
        ...(dto.projectId ? { project: { connect: { id: dto.projectId } } } : {}),
        ...(dto.productId ? { product: { connect: { id: dto.productId } } } : {}),
      },
      include: INCLUDE,
    });
    this.events.publish({
      name: DomainEvents.AssetCreated,
      actorId,
      entityType: 'ASSET',
      entityId: asset.id,
      title: `تجهیز «${asset.name}» ثبت شد`,
      payload: { code: asset.code, kind: asset.kind, customerId: asset.customerId },
    });
    return asset;
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id }, include: INCLUDE });
    if (!asset) throw new NotFoundException('تجهیز یافت نشد');
    return asset;
  }

  async list(query: QueryAssetsDto): Promise<PaginatedResult<unknown>> {
    const where: Prisma.AssetWhereInput = {
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { serialNumber: { contains: query.q, mode: 'insensitive' } },
              { code: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' }, skip: query.skip, take: query.limit }),
      this.prisma.asset.count({ where }),
    ]);
    return new PaginatedResult(rows, total, query.page, query.limit);
  }

  async update(id: string, dto: UpdateAssetDto, actorId: string) {
    await this.ensureExists(id);
    await this.assertRefs(dto);
    const asset = await this.prisma.asset.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.serialNumber !== undefined ? { serialNumber: dto.serialNumber } : {}),
        ...(dto.brandName !== undefined ? { brandName: dto.brandName } : {}),
        ...(dto.modelName !== undefined ? { modelName: dto.modelName } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.installedAt !== undefined ? { installedAt: dto.installedAt ? new Date(dto.installedAt) : null } : {}),
        ...(dto.warrantyUntil !== undefined ? { warrantyUntil: dto.warrantyUntil ? new Date(dto.warrantyUntil) : null } : {}),
        ...(dto.meta !== undefined ? { meta: dto.meta } : {}),
        ...(dto.projectId !== undefined ? (dto.projectId ? { project: { connect: { id: dto.projectId } } } : { project: { disconnect: true } }) : {}),
        ...(dto.productId !== undefined ? (dto.productId ? { product: { connect: { id: dto.productId } } } : { product: { disconnect: true } }) : {}),
      },
      include: INCLUDE,
    });
    this.events.publish({
      name: DomainEvents.AssetUpdated,
      actorId,
      entityType: 'ASSET',
      entityId: id,
      title: `تجهیز «${asset.name}» به‌روزرسانی شد`,
      payload: { code: asset.code, status: asset.status },
    });
    return asset;
  }

  async remove(id: string, actorId: string): Promise<{ success: true }> {
    await this.ensureExists(id);
    await this.prisma.asset.delete({ where: { id } });
    await this.audit.record({ actorId, action: 'deleted', entityType: 'ASSET', entityId: id });
    return { success: true };
  }

  private async ensureExists(id: string): Promise<void> {
    if (!(await this.prisma.asset.findUnique({ where: { id }, select: { id: true } })))
      throw new NotFoundException('تجهیز یافت نشد');
  }
}
