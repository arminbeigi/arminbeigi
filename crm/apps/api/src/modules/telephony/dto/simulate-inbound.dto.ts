import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

/** شبیه‌سازی تماس ورودی (فقط حالت Mock) — برای آزمون و دموی خط لوله‌ی تماس */
export class SimulateInboundDto {
  @ApiProperty({ description: 'شماره تماس‌گیرنده', example: '09123456789' })
  @IsString()
  @MinLength(3)
  fromNumber: string;

  @ApiPropertyOptional({ description: 'شماره‌ای که گرفته شده (DID)' })
  @IsOptional()
  @IsString()
  did?: string;

  @ApiPropertyOptional({ description: 'صف ورودی' })
  @IsOptional()
  @IsString()
  queue?: string;

  @ApiPropertyOptional({ description: 'داخلی اپراتور پاسخگو' })
  @IsOptional()
  @IsString()
  agentExtension?: string;

  @ApiPropertyOptional({ description: 'تماس پاسخ داده شود و قطع گردد؟', default: false })
  @IsOptional()
  @IsBoolean()
  answer?: boolean;

  @ApiPropertyOptional({ description: 'مدت مکالمه (ثانیه) در صورت پاسخ' })
  @IsOptional()
  @IsInt()
  @Min(0)
  talkSeconds?: number;

  @ApiPropertyOptional({ description: 'مسیر فایل ضبط (برای آزمون همگام‌سازی)' })
  @IsOptional()
  @IsString()
  recordingPath?: string;
}
