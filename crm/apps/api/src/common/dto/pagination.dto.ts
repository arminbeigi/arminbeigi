import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** پارامترهای مشترک صفحه‌بندی و جست‌وجو */
export class PaginationDto {
  @ApiPropertyOptional({ default: 1, description: 'شماره صفحه' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100, description: 'تعداد در هر صفحه' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ description: 'عبارت جست‌وجو' })
  @IsOptional()
  @IsString()
  q?: string;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

/** ساختار پاسخ صفحه‌بندی‌شده */
export class PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.meta = { total, page, limit, pages: Math.ceil(total / limit) || 1 };
  }
}
