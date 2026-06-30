import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus, CustomerType, LeadSource } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreatePhoneDto } from './create-phone.dto';

export class CreateCustomerDto {
  @ApiProperty({ enum: CustomerType, example: CustomerType.RESIDENTIAL })
  @IsEnum(CustomerType, { message: 'نوع مشتری نامعتبر است' })
  type: CustomerType;

  @ApiProperty({ example: 'شرکت تأسیساتی آریا' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  displayName: string;

  @ApiPropertyOptional({ example: 'علی' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'رضایی' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'شرکت تأسیساتی آریا' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'کد ملی' })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional({ description: 'کد اقتصادی (B2B)' })
  @IsOptional()
  @IsString()
  economicCode?: string;

  @ApiPropertyOptional({ enum: CustomerStatus, default: CustomerStatus.LEAD })
  @IsOptional()
  @IsEnum(CustomerStatus, { message: 'وضعیت مشتری نامعتبر است' })
  status?: CustomerStatus;

  @ApiPropertyOptional({ enum: LeadSource, default: LeadSource.OTHER })
  @IsOptional()
  @IsEnum(LeadSource, { message: 'منبع سرنخ نامعتبر است' })
  source?: LeadSource;

  @ApiPropertyOptional({ description: 'یادداشت آزاد' })
  @IsOptional()
  @IsString()
  notesText?: string;

  @ApiPropertyOptional({ description: 'شناسه کارشناس مسئول (پیش‌فرض: کاربر جاری)' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ type: [CreatePhoneDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreatePhoneDto)
  phones?: CreatePhoneDto[];
}
