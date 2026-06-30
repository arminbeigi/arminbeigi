import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EntityType } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/** فیلترهای فهرست رویدادهای ممیزی */
export class QueryAuditDto extends PaginationDto {
  @ApiPropertyOptional({ enum: EntityType, description: 'فیلتر بر اساس نوع موجودیت' })
  @IsOptional()
  @IsEnum(EntityType)
  entityType?: EntityType;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس شناسه‌ی کاربرِ عامل' })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس نوع عملیات (مثل login_failed)' })
  @IsOptional()
  @IsString()
  action?: string;
}
