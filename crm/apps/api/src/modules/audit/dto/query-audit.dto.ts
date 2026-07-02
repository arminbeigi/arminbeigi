import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { EntityType } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/** فیلترهای فهرست رویدادهای ممیزی */
export class QueryAuditDto extends PaginationDto {
  @ApiPropertyOptional({ enum: EntityType, description: 'فیلتر بر اساس نوع موجودیت' })
  @IsOptional()
  @IsEnum(EntityType)
  entityType?: EntityType;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس شناسه‌ی موجودیت' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس شناسه‌ی کاربرِ عامل' })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس نوع عملیات (مثل login_failed)' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'از تاریخ (ISO)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'تا تاریخ (ISO)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
