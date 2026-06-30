import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateDealItemDto } from './create-deal-item.dto';

export class CreateDealDto {
  @ApiProperty({ example: 'فروش موتورخانه مجتمع آرین' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiProperty({ description: 'شناسه مشتری' })
  @IsString()
  customerId: string;

  @ApiPropertyOptional({ description: 'شناسه پایپ‌لاین (پیش‌فرض: پایپ‌لاین اصلی)' })
  @IsOptional()
  @IsString()
  pipelineId?: string;

  @ApiPropertyOptional({ description: 'شناسه مرحله (پیش‌فرض: اولین مرحله)' })
  @IsOptional()
  @IsString()
  stageId?: string;

  @ApiPropertyOptional({ description: 'شناسه کارشناس (پیش‌فرض: کاربر جاری)' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'شناسه پروژه مرتبط' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'مبلغ (ریال) — در صورت داشتن اقلام، خودکار محاسبه می‌شود' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountIrr?: number;

  @ApiPropertyOptional({ description: 'تاریخ احتمالی بستن (ISO)' })
  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @ApiPropertyOptional({ type: [CreateDealItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateDealItemDto)
  items?: CreateDealItemDto[];
}
