import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Brand, Prisma } from '@prisma/client';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { AuditService } from '../../modules/audit/audit.service';
import { ProductFilters, ProductsRepository } from './products.repository';
import { CreateBrandDto } from './dto/create-brand.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly audit: AuditService,
  ) {}

  // ── برندها ──────────────────────────────────────────────────────────────────
  async createBrand(dto: CreateBrandDto): Promise<Brand> {
    try {
      return await this.repo.createBrand(dto);
    } catch (e) {
      throw this.translatePrismaError(e);
    }
  }

  listBrands(): Promise<Brand[]> {
    return this.repo.listBrands();
  }

  // ── محصولات ─────────────────────────────────────────────────────────────────
  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    const { brandId, specs, ...rest } = dto;
    const data: Prisma.ProductCreateInput = {
      ...rest,
      ...(specs !== undefined ? { specs: specs as Prisma.InputJsonValue } : {}),
      ...(brandId ? { brand: { connect: { id: brandId } } } : {}),
    };
    try {
      const created = await this.repo.create(data);
      return ProductResponseDto.from(created);
    } catch (e) {
      throw this.translatePrismaError(e);
    }
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.repo.findById(id);
    if (!product) throw new NotFoundException('محصول یافت نشد');
    return ProductResponseDto.from(product);
  }

  async search(query: QueryProductsDto): Promise<PaginatedResult<ProductResponseDto>> {
    const filters: ProductFilters = {
      category: query.category,
      fuelType: query.fuelType,
      boilerKind: query.boilerKind,
      brandId: query.brandId,
      isActive: query.isActive,
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
      return new PaginatedResult(rows.map(ProductResponseDto.from), total, query.page, query.limit);
    }
    const { data, total } = await this.repo.list({ filters, skip: query.skip, take: query.limit });
    return new PaginatedResult(data.map(ProductResponseDto.from), total, query.page, query.limit);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    await this.ensureExists(id);
    const { brandId, specs, ...rest } = dto;
    const data: Prisma.ProductUpdateInput = {
      ...rest,
      ...(specs !== undefined ? { specs: specs as Prisma.InputJsonValue } : {}),
      ...(brandId ? { brand: { connect: { id: brandId } } } : {}),
    };
    try {
      const updated = await this.repo.update(id, data);
      return ProductResponseDto.from(updated);
    } catch (e) {
      throw this.translatePrismaError(e);
    }
  }

  async remove(id: string, actorId?: string): Promise<{ success: true }> {
    await this.ensureExists(id);
    await this.repo.delete(id);
    await this.audit.record({ actorId, action: 'deleted', entityType: 'PRODUCT', entityId: id });
    return { success: true };
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.repo.findById(id);
    if (!found) throw new NotFoundException('محصول یافت نشد');
  }

  private translatePrismaError(e: unknown): Error {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') return new ConflictException('کد محصول (SKU) یا نام برند تکراری است');
      if (e.code === 'P2025') return new NotFoundException('برند یا رکورد مرتبط یافت نشد');
    }
    return e instanceof Error ? e : new Error('خطای ناشناخته');
  }
}
