import { Injectable } from '@nestjs/common';
import {
  BoilerKind,
  Brand,
  FuelType,
  Prisma,
  Product,
  ProductCategory,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const BRAND_SELECT = { id: true, name: true, nameFa: true } satisfies Prisma.BrandSelect;
const PRODUCT_INCLUDE = { brand: { select: BRAND_SELECT } } satisfies Prisma.ProductInclude;

export interface ProductFilters {
  category?: ProductCategory;
  fuelType?: FuelType;
  boilerKind?: BoilerKind;
  brandId?: string;
  isActive?: boolean;
}

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── برندها ──────────────────────────────────────────────────────────────────
  createBrand(data: Prisma.BrandCreateInput): Promise<Brand> {
    return this.prisma.brand.create({ data });
  }

  listBrands(): Promise<Brand[]> {
    return this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  // ── محصولات ─────────────────────────────────────────────────────────────────
  create(data: Prisma.ProductCreateInput): Promise<Product> {
    return this.prisma.product.create({ data, include: PRODUCT_INCLUDE });
  }

  findById(id: string) {
    return this.prisma.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
  }

  update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return this.prisma.product.update({ where: { id }, data, include: PRODUCT_INCLUDE });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.delete({ where: { id } });
  }

  async list(params: {
    filters: ProductFilters;
    skip: number;
    take: number;
  }): Promise<{ data: Product[]; total: number }> {
    const where = this.toWhere(params.filters);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, total };
  }

  /** جست‌وجوی فازی روی نام (فارسی) و SKU (لاتین) با trigram */
  async fuzzySearchIds(params: {
    q: string;
    filters: ProductFilters;
    skip: number;
    take: number;
  }): Promise<{ ids: string[]; total: number }> {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`(fa_normalize("name") % fa_normalize(${params.q}) OR "sku" % ${params.q} OR "sku" ILIKE ${'%' + params.q + '%'})`,
    ];
    const f = params.filters;
    if (f.category) conditions.push(Prisma.sql`"category" = ${f.category}::"ProductCategory"`);
    if (f.fuelType) conditions.push(Prisma.sql`"fuelType" = ${f.fuelType}::"FuelType"`);
    if (f.boilerKind) conditions.push(Prisma.sql`"boilerKind" = ${f.boilerKind}::"BoilerKind"`);
    if (f.brandId) conditions.push(Prisma.sql`"brandId" = ${f.brandId}`);
    if (f.isActive !== undefined) conditions.push(Prisma.sql`"isActive" = ${f.isActive}`);
    const where = Prisma.join(conditions, ' AND ');

    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM "Product"
      WHERE ${where}
      ORDER BY GREATEST(
        similarity(fa_normalize("name"), fa_normalize(${params.q})),
        similarity("sku", ${params.q})
      ) DESC
      LIMIT ${params.take} OFFSET ${params.skip}
    `);
    const countRows = await this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT count(*)::bigint AS count FROM "Product" WHERE ${where}
    `);
    return { ids: rows.map((r) => r.id), total: Number(countRows[0]?.count ?? 0) };
  }

  async findManyByIdsOrdered(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      include: PRODUCT_INCLUDE,
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter((x): x is NonNullable<typeof x> => Boolean(x));
  }

  private toWhere(f: ProductFilters): Prisma.ProductWhereInput {
    return {
      ...(f.category ? { category: f.category } : {}),
      ...(f.fuelType ? { fuelType: f.fuelType } : {}),
      ...(f.boilerKind ? { boilerKind: f.boilerKind } : {}),
      ...(f.brandId ? { brandId: f.brandId } : {}),
      ...(f.isActive !== undefined ? { isActive: f.isActive } : {}),
    };
  }
}
