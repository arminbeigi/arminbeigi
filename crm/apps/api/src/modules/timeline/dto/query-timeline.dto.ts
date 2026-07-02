import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/** فیلترهای فهرست تایم‌لاین (به‌علاوه صفحه‌بندی و جست‌وجوی متنی q روی عنوان/شرح). */
export class QueryTimelineDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'نوع موجودیت (CUSTOMER/TICKET/DEAL/…)' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی موجودیت' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'نام رویداد (مثل ticket.created)' })
  @IsOptional()
  @IsString()
  eventName?: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی عامل' })
  @IsOptional()
  @IsString()
  actorId?: string;
}
