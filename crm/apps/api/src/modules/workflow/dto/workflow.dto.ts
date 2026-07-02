import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * ساخت گردش‌کار. conditions/actions به‌صورت JSON آزاد اعتبارسنجی سبک می‌شوند
 * (ساختار دقیق در workflow.types.ts مستند است؛ اکشن ناشناخته هنگام اجرا FAILED لاگ می‌شود).
 */
export class CreateWorkflowDto {
  @ApiProperty({ description: 'نام گردش‌کار', example: 'اطلاع‌رسانی تیکت فوری' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'رویداد تریگر (مثل ticket.created)', example: 'ticket.created' })
  @IsString()
  @MinLength(3)
  triggerEvent!: string;

  @ApiPropertyOptional({ description: 'شرط‌ها: [{field, op, value}] — AND', type: 'array' })
  @IsOptional()
  conditions?: unknown[];

  @ApiPropertyOptional({ description: 'اکشن‌ها: [{type, params?, delayMs?, retries?}]', type: 'array' })
  @IsOptional()
  actions?: unknown[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWorkflowDto extends PartialType(CreateWorkflowDto) {}
