import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateDealItemDto {
  @ApiProperty({ example: 'دیگ چدنی ۸ پره' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ description: 'شناسه محصول کاتالوگ' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'قیمت واحد (ریال)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitIrr?: number;

  @ApiPropertyOptional({ description: 'تخفیف (ریال)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}
