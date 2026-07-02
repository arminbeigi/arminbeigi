import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Allow,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** یک شرط گردش‌کار: field/op/value */
export class WorkflowConditionDto {
  @ApiProperty({ description: 'فیلد (payload یا entityType/entityId/actorId)', example: 'priority' })
  @IsString()
  field!: string;

  @ApiProperty({ enum: ['eq', 'ne', 'in', 'contains', 'gt', 'lt'] })
  @IsIn(['eq', 'ne', 'in', 'contains', 'gt', 'lt'])
  op!: string;

  @ApiProperty({ description: 'مقدار مقایسه' })
  @Allow() // بدون تبدیل/حذف — هر JSON مجاز است
  value!: unknown;
}

/** یک اکشن گردش‌کار: type/params/delayMs/retries */
export class WorkflowActionDto {
  @ApiProperty({ description: 'نوع اکشن (از /workflows/actions)', example: 'notify' })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ description: 'پارامترهای اکشن (JSON آزاد)' })
  @Allow()
  params?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'تأخیر پیش از اجرا (ms، سقف اجرایی ۱۰s)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  delayMs?: number;

  @ApiPropertyOptional({ description: 'تعداد تلاش مجدد در صورت خطا' })
  @IsOptional()
  @IsInt()
  @Min(0)
  retries?: number;
}

/** ساخت گردش‌کار (trigger + شرط‌ها + اکشن‌ها). */
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

  @ApiPropertyOptional({ type: [WorkflowConditionDto], description: 'شرط‌ها (AND)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowConditionDto)
  conditions?: WorkflowConditionDto[];

  @ApiPropertyOptional({ type: [WorkflowActionDto], description: 'اکشن‌ها (به‌ترتیب اجرا)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowActionDto)
  actions?: WorkflowActionDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWorkflowDto extends PartialType(CreateWorkflowDto) {}
