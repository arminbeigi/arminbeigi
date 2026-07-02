import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketCategory, TicketPriority } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * ساخت تیکت پشتیبانی.
 * اگر category یا priority داده نشود، با دسته‌بندِ هوشمند (AI) از روی موضوع/توضیحات پر می‌شود.
 */
export class CreateTicketDto {
  @ApiProperty({ description: 'موضوع تیکت', example: 'پکیج آب گرم نمی‌دهد' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ description: 'شناسه‌ی مشتری' })
  @IsString()
  customerId!: string;

  @ApiPropertyOptional({ description: 'شرح مشکل' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: TicketCategory, description: 'دسته (در صورت نبود، خودکار تشخیص داده می‌شود)' })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiPropertyOptional({ enum: TicketPriority, description: 'اولویت (در صورت نبود، خودکار تشخیص داده می‌شود)' })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'شناسه‌ی پروژه‌ی مرتبط' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی مسئول/تکنسین' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'مهلت SLA (ISO)' })
  @IsOptional()
  @IsDateString()
  slaDueAt?: string;
}
