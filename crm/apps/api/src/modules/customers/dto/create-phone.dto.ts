import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePhoneDto {
  @ApiProperty({ example: '۰۹۱۲۳۴۵۶۷۸۹', description: 'شماره خام (ارقام فارسی هم پذیرفته می‌شود)' })
  @IsString()
  @MinLength(4)
  number: string;

  @ApiPropertyOptional({ example: 'موبایل' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
