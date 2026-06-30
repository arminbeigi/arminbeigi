import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CallDirection, CallStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

/**
 * رویداد تماس از Issabel/AMI (فاز ۴) یا ثبت دستی.
 * idempotent روی uniqueId — ارسال چندباره برای یک تماس، همان رکورد را به‌روزرسانی می‌کند.
 */
export class IngestCallDto {
  @ApiProperty({ description: 'شناسه یکتای تماس (Asterisk Uniqueid)' })
  @IsString()
  @MinLength(1)
  uniqueId: string;

  @ApiProperty({ enum: CallDirection })
  @IsEnum(CallDirection, { message: 'جهت تماس نامعتبر است' })
  direction: CallDirection;

  @ApiProperty({ example: '09123456789' })
  @IsString()
  fromNumber: string;

  @ApiProperty({ example: '02191000000' })
  @IsString()
  toNumber: string;

  @ApiPropertyOptional({ enum: CallStatus })
  @IsOptional()
  @IsEnum(CallStatus)
  status?: CallStatus;

  @ApiPropertyOptional({ description: 'شماره‌ای که مشتری گرفته (DID)' })
  @IsOptional()
  @IsString()
  did?: string;

  @ApiPropertyOptional({ description: 'صف ورودی' })
  @IsOptional()
  @IsString()
  queue?: string;

  @ApiPropertyOptional({ description: 'کانال Asterisk' })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional({ description: 'شناسه تماس زنجیره‌ای/ترنسفر' })
  @IsOptional()
  @IsString()
  linkedId?: string;

  @ApiPropertyOptional({ description: 'داخلی اپراتور پاسخگو' })
  @IsOptional()
  @IsString()
  agentExtension?: string;

  @ApiPropertyOptional({ description: 'تخصیص صریح مشتری (در غیر این صورت خودکار تطبیق می‌شود)' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() startedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() answeredAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endedAt?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) waitSeconds?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) talkSeconds?: number;

  @ApiPropertyOptional({ description: 'مسیر فایل ضبط روی سرور Asterisk' })
  @IsOptional()
  @IsString()
  recordingPath?: string;

  @ApiPropertyOptional({ description: 'آدرس همگام‌شده‌ی فایل ضبط' })
  @IsOptional()
  @IsString()
  recordingUrl?: string;
}
