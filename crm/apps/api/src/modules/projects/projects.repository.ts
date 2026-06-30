import { Injectable } from '@nestjs/common';
import { Prisma, Project, ProjectStatus, ProjectType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const DETAIL_INCLUDE = {
  items: { include: { product: { select: { id: true, name: true, sku: true } } } },
  customer: { select: { id: true, displayName: true } },
  manager: { select: { id: true, fullName: true } },
  address: { select: { id: true, title: true, city: true, line: true } },
} satisfies Prisma.ProjectInclude;

const LIST_INCLUDE = {
  customer: { select: { id: true, displayName: true } },
  manager: { select: { id: true, fullName: true } },
} satisfies Prisma.ProjectInclude;

export interface ProjectFilters {
  type?: ProjectType;
  status?: ProjectStatus;
  customerId?: string;
  managerId?: string;
}

export interface ProjectItemInput {
  title: string;
  productId?: string;
  quantity?: number;
  unitIrr?: number;
}

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { base: Prisma.ProjectCreateInput; items: ProjectItemInput[] }): Promise<Project> {
    return this.prisma.project.create({
      data: {
        ...data.base,
        items: data.items.length
          ? {
              create: data.items.map((it) => ({
                title: it.title,
                quantity: it.quantity ?? 1,
                unitIrr: it.unitIrr ?? 0,
                ...(it.productId ? { product: { connect: { id: it.productId } } } : {}),
              })),
            }
          : undefined,
      },
      include: DETAIL_INCLUDE,
    });
  }

  findById(id: string) {
    return this.prisma.project.findUnique({ where: { id }, include: DETAIL_INCLUDE });
  }

  update(id: string, data: Prisma.ProjectUpdateInput): Promise<Project> {
    return this.prisma.project.update({ where: { id }, data, include: DETAIL_INCLUDE });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.project.delete({ where: { id } });
  }

  async list(params: {
    filters: ProjectFilters;
    skip: number;
    take: number;
  }): Promise<{ data: Project[]; total: number }> {
    const where = this.toWhere(params.filters);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.project.count({ where }),
    ]);
    return { data, total };
  }

  async fuzzySearchIds(params: {
    q: string;
    filters: ProjectFilters;
    skip: number;
    take: number;
  }): Promise<{ ids: string[]; total: number }> {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`fa_normalize("title") % fa_normalize(${params.q})`,
    ];
    const f = params.filters;
    if (f.type) conditions.push(Prisma.sql`"type" = ${f.type}::"ProjectType"`);
    if (f.status) conditions.push(Prisma.sql`"status" = ${f.status}::"ProjectStatus"`);
    if (f.customerId) conditions.push(Prisma.sql`"customerId" = ${f.customerId}`);
    if (f.managerId) conditions.push(Prisma.sql`"managerId" = ${f.managerId}`);
    const where = Prisma.join(conditions, ' AND ');

    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM "Project"
      WHERE ${where}
      ORDER BY similarity(fa_normalize("title"), fa_normalize(${params.q})) DESC
      LIMIT ${params.take} OFFSET ${params.skip}
    `);
    const countRows = await this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT count(*)::bigint AS count FROM "Project" WHERE ${where}
    `);
    return { ids: rows.map((r) => r.id), total: Number(countRows[0]?.count ?? 0) };
  }

  async findManyByIdsOrdered(ids: string[]): Promise<Project[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.project.findMany({
      where: { id: { in: ids } },
      include: LIST_INCLUDE,
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter((x): x is NonNullable<typeof x> => Boolean(x));
  }

  // ── اقلام ───────────────────────────────────────────────────────────────────
  addItem(projectId: string, it: ProjectItemInput) {
    return this.prisma.projectItem.create({
      data: {
        project: { connect: { id: projectId } },
        title: it.title,
        quantity: it.quantity ?? 1,
        unitIrr: it.unitIrr ?? 0,
        ...(it.productId ? { product: { connect: { id: it.productId } } } : {}),
      },
    });
  }

  findItem(projectId: string, itemId: string) {
    return this.prisma.projectItem.findFirst({ where: { id: itemId, projectId } });
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.prisma.projectItem.delete({ where: { id: itemId } });
  }

  private toWhere(f: ProjectFilters): Prisma.ProjectWhereInput {
    return {
      ...(f.type ? { type: f.type } : {}),
      ...(f.status ? { status: f.status } : {}),
      ...(f.customerId ? { customerId: f.customerId } : {}),
      ...(f.managerId ? { managerId: f.managerId } : {}),
    };
  }
}
