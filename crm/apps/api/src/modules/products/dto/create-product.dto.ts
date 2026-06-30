import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BoilerKind, FuelType, ProductCategory } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'BDR-G124', description: 'کد محصول (SKU، لاتین)' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sku: string;

  @ApiProperty({ example: 'دیگ چدنی بودروس G124' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: ProductCategory, example: ProductCategory.BOILER })
  @IsEnum(ProductCategory, { message: 'دسته‌ی محصول نامعتبر است' })
  category: ProductCategory;

  @ApiPropertyOptional({ enum: BoilerKind, default: BoilerKind.NONE })
  @IsOptional()
  @IsEnum(BoilerKind, { message: 'نوع دیگ نامعتبر است' })
  boilerKind?: BoilerKind;

  @ApiPropertyOptional({ enum: FuelType, default: FuelType.NONE })
  @IsOptional()
  @IsEnum(FuelType, { message: 'نوع سوخت نامعتبر است' })
  fuelType?: FuelType;

  @ApiPropertyOptional({ description: 'شناسه برند' })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  // ── مشخصات فنی HVAC ─────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'ظرفیت حرارتی (kcal/h)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  capacityKcal?: number;

  @ApiPropertyOptional({ description: 'ظرفیت (kW)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  capacityKw?: number;

  @ApiPropertyOptional({ description: 'راندمان (٪)' })
  @IsOptional()
  @IsNumber()
  efficiency?: number;

  @ApiPropertyOptional({ description: 'فشار کاری (bar)' })
  @IsOptional()
  @IsNumber()
  pressureBar?: number;

  @ApiPropertyOptional({ description: 'دبی (m³/h)' })
  @IsOptional()
  @IsNumber()
  flowRate?: number;

  @ApiPropertyOptional({ description: 'ارتفاع آبدهی (m)' })
  @IsOptional()
  @IsNumber()
  headMeter?: number;

  @ApiPropertyOptional({ description: 'حجم (لیتر)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  capacityLit?: number;

  @ApiPropertyOptional({ description: 'جنس (چدن/فولاد/استیل)' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ description: 'تعداد پره' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  sections?: number;

  @ApiPropertyOptional({ description: 'مشخصات تکمیلی (JSON آزاد)' })
  @IsOptional()
  @IsObject()
  specs?: Record<string, unknown>;

  // ── قیمت و موجودی ───────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'قیمت (ریال)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceIrr?: number;

  @ApiPropertyOptional({ description: 'موجودی', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQty?: number;

  @ApiPropertyOptional({ description: 'گارانتی (ماه)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  warrantyMo?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
