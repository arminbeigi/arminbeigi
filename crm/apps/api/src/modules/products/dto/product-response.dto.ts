import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Brand, Product } from '@prisma/client';

type ProductWithBrand = Product & { brand?: Pick<Brand, 'id' | 'name' | 'nameFa'> | null };

export class ProductResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() sku: string;
  @ApiProperty() name: string;
  @ApiProperty() category: string;
  @ApiProperty() boilerKind: string;
  @ApiProperty() fuelType: string;
  @ApiPropertyOptional() brandId: string | null;
  @ApiPropertyOptional() brandName: string | null;
  @ApiPropertyOptional() description: string | null;

  @ApiPropertyOptional() capacityKcal: number | null;
  @ApiPropertyOptional() capacityKw: number | null;
  @ApiPropertyOptional() efficiency: number | null;
  @ApiPropertyOptional() pressureBar: number | null;
  @ApiPropertyOptional() flowRate: number | null;
  @ApiPropertyOptional() headMeter: number | null;
  @ApiPropertyOptional() capacityLit: number | null;
  @ApiPropertyOptional() material: string | null;
  @ApiPropertyOptional() sections: number | null;
  @ApiPropertyOptional() specs: unknown;

  @ApiPropertyOptional({ description: 'قیمت (ریال) به‌صورت رشته برای دقت' })
  priceIrr: string | null;
  @ApiProperty() stockQty: number;
  @ApiPropertyOptional() warrantyMo: number | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static from(p: ProductWithBrand): ProductResponseDto {
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      boilerKind: p.boilerKind,
      fuelType: p.fuelType,
      brandId: p.brandId,
      brandName: p.brand?.nameFa ?? p.brand?.name ?? null,
      description: p.description,
      capacityKcal: p.capacityKcal,
      capacityKw: p.capacityKw,
      efficiency: p.efficiency,
      pressureBar: p.pressureBar,
      flowRate: p.flowRate,
      headMeter: p.headMeter,
      capacityLit: p.capacityLit,
      material: p.material,
      sections: p.sections,
      specs: p.specs,
      priceIrr: p.priceIrr ? p.priceIrr.toString() : null,
      stockQty: p.stockQty,
      warrantyMo: p.warrantyMo,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
