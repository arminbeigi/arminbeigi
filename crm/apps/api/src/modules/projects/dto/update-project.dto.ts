import { OmitType, PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

/** به‌روزرسانی: مشتری و اقلام از مسیرهای جدا مدیریت می‌شوند */
export class UpdateProjectDto extends PartialType(
  OmitType(CreateProjectDto, ['items', 'customerId'] as const),
) {
  @ApiPropertyOptional({ description: 'هزینه نهایی (ریال)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  finalIrr?: number;

  @ApiPropertyOptional({ description: 'زمان تکمیل (ISO)' })
  @IsOptional()
  @IsDateString()
  completedAt?: string;
}
