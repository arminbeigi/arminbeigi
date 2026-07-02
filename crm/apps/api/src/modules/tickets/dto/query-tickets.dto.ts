import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { IsBooleanString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/** فیلترهای فهرست تیکت‌ها (به‌علاوه صفحه‌بندی و جست‌وجوی متنی q). */
export class QueryTicketsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ enum: TicketCategory })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس مشتری' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس مسئول' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'فقط تیکت‌های منتسب به من', enum: ['true', 'false'] })
  @IsOptional()
  @IsBooleanString()
  mine?: string;

  @ApiPropertyOptional({ description: 'فقط تیکت‌های باز (نه RESOLVED/CLOSED)', enum: ['true', 'false'] })
  @IsOptional()
  @IsBooleanString()
  open?: string;
}
